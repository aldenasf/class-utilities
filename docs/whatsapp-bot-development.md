# WhatsApp Bot Development Guide

Comprehensive guide for developers building and extending the WhatsApp bot interface in **Utility Kelas**.

---

## 1. Architectural Overview

The WhatsApp bot interface is built as a decoupled adapter using **[`@whiskeysockets/baileys`](https://github.com/WhiskeySockets/Baileys)**.

### Core Technical Characteristics

- **Direct WebSocket Protocol**: Unlike Puppeteer or Chromium-based alternatives (`whatsapp-web.js`), Baileys interacts directly with WhatsApp Web's encrypted WebSocket endpoints using Noise Protocol handshakes and Google Protocol Buffers (`protobuf`).
- **Low Memory Footprint**: Runs in native Node.js consuming only **~50MB – 100MB RAM**, making it suitable for resource-constrained production servers.
- **Persistent Multi-File Authentication**: Authentication keys, pre-keys, and cryptographic session tokens are persisted inside the local `./data/auth/` directory via `useMultiFileAuthState()`.
- **Dynamic File-Based Command Handler**: Commands are completely isolated and discovered at startup from `src/interfaces/whatsapp/commands/<category>/<command>.ts`.

---

## 2. Directory Structure

```text
src/interfaces/whatsapp/
├── client.ts             # Baileys client initialization, connection lifecycle & event dispatch
├── command-loader.ts     # Dynamic scanner and registry for bot commands
├── types.ts              # Command and CommandContext TypeScript interfaces
└── commands/             # Categorized command implementations
    ├── info/
    │   ├── help.ts       # .help / .menu
    │   └── nb.ts         # .nb (notes manager)
    ├── jadwal/
    │   └── view.ts       # .jadwal / .besok
    ├── piket/
    │   └── view.ts       # .piket
    └── tugas/
        ├── add.ts        # .add (task creation)
        ├── del.ts        # .del (task deletion)
        ├── done.ts       # .done (task completion)
        └── list.ts       # .list (active tasks)
```

---

## 3. Getting Started in Development

### Prerequisites

- Node.js v20+ or v24+
- `pnpm` package manager
- SQLite database initialized (`pnpm prisma:push`)

### Starting the Bot

Run the development watcher:

```bash
pnpm run dev
```

During startup:

1. The server binds to `http://localhost:3000` (Fastify API and Web Dashboard).
2. The bot loader scans `src/interfaces/whatsapp/commands/` and outputs:
    ```text
    [WA] Loaded 8 commands (12 aliases)
    ```
3. If no active session exists in `data/auth/`, an ASCII QR code is rendered in the terminal:

    ```text
    [WA] Scan the following QR code with WhatsApp (Linked Devices):
    <ASCII QR CODE>
    ```

    _Tip: You can also open `http://localhost:3000` to view a high-resolution visual QR code directly in the Web Dashboard._

4. Open WhatsApp on your phone:
    - Navigate to **Settings / Three Dots > Linked Devices > Link a Device**.
    - Point your camera at the QR code.
5. Once authenticated, the bot logs:
    ```text
    [WA] Bot connected successfully
    ```
    Credentials are saved to `data/auth/` and subsequent restarts will reconnect automatically without re-scanning.

---

## 4. How to Create a New Command

Every command must implement the `Command` interface defined in `src/interfaces/whatsapp/types.ts`.

### Command Interface Definition

```typescript
export interface CommandContext {
    client: WASocket;
    msg: proto.IWebMessageInfo;
    from: string; // Remote JID (user phone number or group JID ending in @g.us)
    sender: string; // The user JID who sent the message
    isGroup: boolean; // True if message was sent in a group chat
    args: string[]; // Arguments passed after the command name
    commandText: string; // The raw unparsed message text
    reply: (text: string) => Promise<void>; // Helper to reply to the trigger message
}

export interface Command {
    name: string; // Primary command name (triggered via .<name>)
    aliases?: string[]; // Alternative trigger keywords
    category: string; // Category for grouping in .help
    description: string; // Description shown in .help
    execute: (ctx: CommandContext) => Promise<void>;
}
```

---

### Step-by-Step Example: Creating `.ping` Command

Create a new file at `src/interfaces/whatsapp/commands/info/ping.ts`:

```typescript
import { Command, CommandContext } from "../../types.js";

export const command: Command = {
    name: "ping",
    aliases: ["p", "status"],
    category: "info",
    description: "Check bot latency and operational status",
    execute: async (ctx: CommandContext) => {
        const start = Date.now();
        await ctx.reply("🏓 Pong! Measuring latency...");
        const latency = Date.now() - start;

        await ctx.reply(`⚡ Latency: *${latency}ms*\nHost: *Node.js ${process.version}*`);
    },
};

export default command;
```

### Hot Reloading & Testing

- Because `pnpm run dev` uses `tsx watch`, editing or adding files in `src/interfaces/whatsapp/commands/` automatically reloads the registry.
- Send `.ping` in your WhatsApp chat or group to verify.

---

## 5. Integrating with Core Domain Services

Bot commands **must not** perform raw database queries directly whenever a domain service is available. Always delegate domain logic to `src/core/services/`:

| Domain Feature     | Service Location                        | Methods                                                           |
| ------------------ | --------------------------------------- | ----------------------------------------------------------------- |
| **Tasks / PR**     | `src/core/services/task.service.ts`     | `addTask()`, `getActiveTasks()`, `markTaskDone()`, `deleteTask()` |
| **Schedule**       | `src/core/services/schedule.service.ts` | `getScheduleForDate()`, `getScheduleForWeek()`                    |
| **Piket (Duties)** | `src/core/services/piket.service.ts`    | `getPiketForDay()`, `setPiketForDay()`                            |
| **Daily Digest**   | `src/core/services/reminder.service.ts` | `generateDailyDigest()`                                           |

### Example: Calling `TaskService` inside a Command

```typescript
import { Command, CommandContext } from "../../types.js";
import { TaskService } from "../../../../core/services/task.service.js";

export const command: Command = {
    name: "cleardone",
    category: "tugas",
    description: "Remove all completed tasks",
    execute: async (ctx: CommandContext) => {
        // Access domain service directly
        const completed = await TaskService.getCompletedTasks();
        for (const t of completed) {
            await TaskService.deleteTask(t.id);
        }
        await ctx.reply(`🧹 Cleaned ${completed.length} completed task(s).`);
    },
};
export default command;
```

---

## 6. Message Formatting Standards

### User-Facing WhatsApp Messages

WhatsApp supports standard formatting syntax:

- `*bold*` $\rightarrow$ **bold**
- `_italic_` $\rightarrow$ _italic_
- `~strike~` $\rightarrow$ ~~strikethrough~~
- `monospace` $\rightarrow$ `monospace`
- Emojis (e.g. `✨`, `🧹`, `📚`, `✅`, `⚠️`) **are encouraged** in user-facing WhatsApp messages for student readability and clarity.

### Internal Terminal Logs (Zero Slop Policy)

Per `AGENTS.md`, internal terminal logs must strictly avoid decorative emojis and use the `[WA]` scope tag:

- ✅ `console.log('[WA] Bot connected successfully');`
- ✅ `console.log('[WA] Loaded 8 commands');`
- ❌ `console.log('🚀 Bot WhatsApp siap digunakan! 🎉');`

---

## 7. Testing Commands in Isolation

To verify command loading and syntax without connecting to WhatsApp network, run:

```bash
npx tsx scripts/test-command-loader.ts
```

Output:

```text
Testing Command Registry...
[WA] Loaded 9 commands (13 aliases)
Registered commands: [
  '.help (info)',
  '.ping (info)',
  '.nb (info)',
  '.jadwal (jadwal)',
  ...
]
```

---

## 8. Operational Best Practices & Troubleshooting

### Automatic Group JID Discovery

When the bot receives any command in a group chat, it automatically records the group JID into the SQLite `Setting` table under `class_group_jid`:

```typescript
if (isGroup) {
    await prisma.setting.upsert({
        where: { key: "class_group_jid" },
        update: { value: from },
        create: { key: "class_group_jid", value: from },
    });
}
```

This ensures the daily reminder cron engine knows which group to send digests to without manual configuration.

### Session Reset / Re-authentication

If the bot ever gets logged out or you need to switch the WhatsApp account:

1. Stop the application (`Ctrl + C`).
2. Delete the `./data/auth/` folder:
    ```bash
    rm -rf data/auth
    ```
3. Restart `pnpm run dev` and scan the fresh QR code.

### Disconnect & Auto-reconnect Handling

Baileys emits `connection.update` with `DisconnectReason`. The client handles network drops automatically using exponential reconnection unless the session was explicitly logged out from WhatsApp on your phone.
