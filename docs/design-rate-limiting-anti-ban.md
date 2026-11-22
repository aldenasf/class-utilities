# WhatsApp Rate Limiting & Anti-Ban Protection Design Specification

**Status**: Validated & Confirmed  
**Date**: 2026-11-22  
**Target Subsystem**: `src/interfaces/whatsapp/`  

---

## 1. Understanding Summary

- **Objective**: Implement a dual-layer rate limiting and anti-ban protection suite for the Baileys WhatsApp companion client to shield the bot from Meta automated detection and prevent student group spam flooding.
- **Why It Exists**: Unofficial WhatsApp clients run the risk of temporary or permanent phone number bans when responding with instant (0ms) bot-like patterns or transmitting bursts of messages during command spam.
- **Audience & Context**: High school class group (~30–40 students) triggering commands (`.tugas`, `.jadwal`, `.piket`, `.ping`, etc.), class administrators, and automated background schedulers.
- **Inbound Protection**: Sliding-window rate limiting per-user (3 commands / 15s) and per-group burst ceiling (10 commands / 15s). Violations trigger a single cooldown notice per window, followed by silent drops for subsequent spam.
- **Outbound Protection**: Serialized async FIFO message queue with adaptive human pacing (1.0s – 2.5s randomized jitter) and simulated typing indicators (`sendPresenceUpdate("composing", jid)`).
- **Administrative Privileges**: `SUPERUSER` and `ADMIN` senders bypass inbound command rate limits; their outbound responses remain safely queued and paced.
- **Non-Goals**: No external Redis or database tables for ephemeral rate limiting (pure in-memory $O(1)$); no modifications to core business services (`src/core/`).

---

## 2. Assumptions & Constraints

1. **Traffic Scale**: Single class group (~30–40 students) + sporadic direct messages. Command frequency rarely exceeds several commands per minute under normal usage.
2. **Persistence**: Ephemeral in-memory tracking is sufficient; memory auto-prunes stale records via background interval and resets cleanly on daemon restart.
3. **Queue Discipline**: Strict FIFO sequence ensuring a minimum of ~1.5s separation between any two outgoing socket transmissions.
4. **Zero Slop Logging**: Internal logging adheres strictly to the repository's Zero Slop Policy (using tags like `[WA]` or `[RATE-LIMIT]`, no emojis, machine-parseable output).

---

## 3. Decision Log

| # | Topic | Decision | Alternatives Considered | Rationale |
|---|---|---|---|---|
| 1 | **Scope of Protection** | Full Protection Suite (Inbound + Outbound + Presence) | Inbound-only, Outbound-only | Maximum protection against Meta automated bot detection algorithms. |
| 2 | **Violation Handling** | 1 warning notice per cooldown window, then silent drop | Silent drop only, Escalating blocks | Educates legitimate students while preventing the bot from amplifying spam traffic. |
| 3 | **Limit Scope** | Hybrid (per-user + group safety ceiling) | Per-user only, Per-group only | Defends against individual spammers and coordinated group command floods. |
| 4 | **Outbound Pacing** | Adaptive human simulation (1.0s–2.5s jitter + typing) | Fixed delays, Minimal pacing | Eliminates instant 0ms bot signatures while maintaining natural UX. |
| 5 | **Privileges** | Inbound exemption for Superuser & Admins | Equal limits, Multiplied limits | Allows admin operations & troubleshooting during chat floods. |
| 6 | **State Storage** | In-memory sliding window & FIFO queue | SQLite DB, Hybrid | Zero disk I/O overhead; ephemeral state cleans up on restart. |
| 7 | **Architecture Pattern** | Decoupled Modular Managers (Approach 1) | Middleware pipeline, Inline helpers | Clean separation of concerns, testable, and zero socket-proxy risks. |

---

## 4. Final Architecture & Technical Design

### 4.1 File Organization

```
src/interfaces/whatsapp/
├── rate-limiter.ts     # In-memory sliding-window limiter & cooldown manager
├── outbound-queue.ts   # Paced FIFO queue with typing indicator simulation
├── client.ts           # Baileys client integration (wires inbound/outbound)
├── command-loader.ts   # (Existing) Dynamic command registry
└── types.ts            # (Existing) Context and message interfaces
```

### 4.2 Module 1: Inbound Rate Limiter (`RateLimiter`)

Located in `src/interfaces/whatsapp/rate-limiter.ts`:
- **State Storage**:
  - `userBuckets: Map<string, number[]>`: Array of millisecond timestamps for each user JID.
  - `chatBuckets: Map<string, number[]>`: Array of millisecond timestamps for each chat/group JID.
  - `warningDebounce: Map<string, number>`: Tracks when a user was last sent a cooldown warning.
- **Evaluation Flow**:
  1. If sender is `SUPERUSER` or in `ADMIN` list $\to$ return `{ allowed: true }`.
  2. Filter out timestamps older than $now - 15000\text{ms}$ in both user and group buckets.
  3. If user timestamps $\ge 3$ or group timestamps $\ge 10$:
     - Check `warningDebounce.get(sender)`.
     - If $> 15000\text{ms}$ since last warning (or never warned) $\to$ update timestamp and return `{ allowed: false, shouldWarn: true }`.
     - Otherwise $\to$ return `{ allowed: false, shouldWarn: false }` (*silent drop*).
  4. If allowed: append $now$ to user and group buckets and return `{ allowed: true }`.
- **Memory Cleanup**:
  - Background `setInterval` running every 5 minutes deletes empty bucket entries and expired warning records.

### 4.3 Module 2: Outbound Message Queue (`OutboundQueue`)

Located in `src/interfaces/whatsapp/outbound-queue.ts`:
- **Task Structure**:
  ```typescript
  interface QueueTask {
      jid: string;
      content: AnyMessageContent;
      options?: MiscMessageGenerationOptions;
      resolve: (val: any) => void;
      reject: (err: any) => void;
  }
  ```
- **Execution & Pacing**:
  - `enqueue(jid, content, options): Promise<any>` appends to FIFO queue and initiates processing worker if idle.
  - Concurrency is strictly 1 (sequential).
  - Dynamic typing indicator calculation:
    $$\text{duration} = \min(2500, \max(1000, \text{textLength} \times 15))\text{ ms}$$
  - Worker calls `sock.sendPresenceUpdate("composing", jid)`, sleeps $\text{duration}$, clears to `"paused"`, dispatches `sock.sendMessage()`, then sleeps an extra $500\text{ms} - 1200\text{ms}$ trailing jitter before next dequeue.
- **Overflow & Error Handling**:
  - Soft cap at 50 queued items. If exceeded, drops oldest pending items to prevent memory bloat during disconnection or server stalls.
  - Catches send rejections, logs `[WA]` diagnostics, rejects individual task promise, and continues processing subsequent items.

### 4.4 Module 3: Client Integration (`client.ts`)

- In `sock.ev.on("messages.upsert")`:
  - Before command execution, invoke `RateLimiter.check(sender, from, isAdminOrSuperuser)`.
  - If rate limited and `shouldWarn: true`, enqueue warning message and return.
  - If rate limited and `shouldWarn: false`, return immediately.
- In `CommandContext.reply`:
  - Route through `OutboundQueue.enqueue(from, { text: replyText }, { quoted: msg })`.
- In `WhatsAppBot.sendMessage`:
  - Route through `OutboundQueue.enqueue(to, { text })`.
- In `sock.ev.on("connection.update")`:
  - Update socket reference in `OutboundQueue.setSocket(sock)` upon `open`.
  - Pause worker or retain pending queue on `close`.

---

## 5. Verification & Testing Strategy

1. **Unit Testing (`RateLimiter`)**: Verify sliding window timestamp expiry, group aggregate limits, single warning debounce, and admin exemptions.
2. **Pacing Validation (`OutboundQueue`)**: Validate sequential delivery intervals, dynamic typing simulation presence calls, and error handling.
3. **Workspace Build Check**: Execute `pnpm run build:all` to ensure zero TypeScript type regressions.
