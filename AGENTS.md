# AGENTS.md

Instructions, operational conventions, and quality standards for AI coding agents working in this repository.

---

## 1. Package Manager Standard: pnpm Only

- **Exclusively use `pnpm`**. Never run `npm` or `yarn`.
- This repository is structured as a **pnpm workspace** (root backend + `web/` frontend).
- Common commands:
    - Install dependencies: `pnpm install`
    - Run development server: `pnpm run dev`
    - Build frontend dashboard: `pnpm run build:web`
    - Build entire application: `pnpm run build:all`
    - Database schema push: `pnpm prisma:push` (or `pnpm prisma db push`)
    - Standalone Excel parser test: `pnpm run test:excel`

---

## 2. CLI & Logging Standards (Zero Slop Policy)

### Scope-Based Logging Tags (Zero Slop Policy)

- **NEVER** use emojis in `console.log()`, `console.info()`, `console.warn()`, `console.error()`, scripts, or CLI/daemon outputs (avoid `🚀`, `✨`, `🎉`, `📦`, `❌`, `⚠️`, `💡`).
- Emojis break monospace alignment, corrupt tabular layouts, cause rendering glitches across minimal terminals and headless SSH sessions, and break shell pipeline parsing (`grep`, `awk`, `cut`).
- Use **Scope Tags** as indicators of the origin or subsystem:
    - `[DB]`: Database operations (e.g. `[DB] Database connected (SQLite)`).
    - `[WEB]`: Fastify server & API (e.g. `[WEB] Dashboard & API listening on http://localhost:3000`).
    - `[WA]`: WhatsApp client & bot events (e.g. `[WA] Bot connected successfully`, `[WA] Loaded 8 commands (12 aliases)`).
    - `[SCHEDULER]`: Cron jobs & reminder triggers (e.g. `[SCHEDULER] Initialized for 18:30 WIB (cron: 30 18 * * *)`).
    - `[EXCEL]`: Standalone schedule parser logs.
    - `[FATAL]`: Critical startup or unrecoverable application errors.
- **General / High-Level Application Messages**:
    - Do NOT prefix general status messages with redundant tags:
        - ❌ `console.log("[INFO] Starting Utility Kelas Application")`
        - ✅ `console.log("Starting Utility Kelas Application")`
        - ❌ `console.log("[INFO] Utility Kelas online and ready")`
        - ✅ `console.log("Utility Kelas online and ready")`

### User-Facing WhatsApp Messages vs. Server Logs

- **Internal Server/CLI Logs**: Must strictly follow the Zero Slop Policy with Scope Tags or plain general status text.
- **User-Facing WhatsApp Chat Messages**: Formatted nicely for student readability (clean Markdown asterisks, list bullets, and standard formatting per `README.md`).

### No Conversational Fluff or Cheerleading

- Do not output patronizing, chatty, or human-simulating filler text in CLI tools and test scripts:
    - ❌ _"Hold tight, parsing your schedule now..."_
    - ❌ _"All set! Happy hacking! 🎉"_
    - ❌ _"Oopsie! Something went wrong :("_
    - ✅ Output deterministic facts, states, quantities, durations, and actionable errors.

### Unix Philosophy & Pipeline Friendliness

- **Stream Discipline**:
    - `stdout`: Pure payload or expected data output.
    - `stderr`: Diagnostics, warnings, execution logs, and runtime errors.
- **Machine Parseability**:
    - Keep output clean for downstream tooling and log collectors.
    - Avoid gratuitous decorative separators (`==============================`), ASCII art banners, or boxed borders in CLI logs.
- **Exit Codes**:
    - Always exit with status code `0` on success and non-zero (`1`, `2`, etc.) on failure.
    - Never log an error and exit with code `0`.

---

## 3. Architecture & Code Boundaries

- **Modular Monolith**:
    - Core domain logic lives strictly inside `src/core/` (services for tasks, schedule, piket, reminder).
    - Interfaces are decoupled adapters:
        - `src/interfaces/whatsapp/`: Baileys WhatsApp client and dynamic command dispatcher.
        - `src/interfaces/api/`: Fastify REST API endpoints serving Web Dashboard requests and static assets.
        - `src/interfaces/discord/`: Reserved for Phase 2 Discord bot.
- **Dynamic Command Handler Pattern**:
    - Every WhatsApp command must reside in its own isolated file under `src/interfaces/whatsapp/commands/<category>/<command>.ts`.
    - Commands must implement the standard `Command` interface (`name`, `aliases`, `category`, `description`, `execute`).
    - Never register commands via a monolithic router or giant switch-case.
- **Standalone Excel Parser**:
    - The schedule parser resides in `src/core/excel/` and must remain completely decoupled from HTTP/WhatsApp runtimes.
    - Always verify parser changes using `pnpm run test:excel`.
- **Frontend SPA**:
    - The Web Dashboard is located in `web/` (React + Vite + Tailwind CSS).
    - Production build outputs to `web/dist/`, which is served statically by the Fastify server.

---

## 4. Database & Storage Discipline

- **Database**: SQLite via Prisma ORM (`data/class.db`).
- **Data Persistence**:
    - Database file (`data/class.db`) and WhatsApp authentication session (`data/auth/`) reside inside the `./data/` folder.
    - Never commit files inside `data/` to git (enforced by `.gitignore`).
    - Always run `pnpm prisma:push` and `pnpm prisma:generate` after modifying `prisma/schema.prisma`.

---

## 5. Git Commit Conventions

### Mandatory User Confirmation Before Any Commit

- **NEVER create a git commit automatically without explicit user confirmation.**
- When changes/tasks are completed, the agent must present the summary/diff to the user and ask for confirmation first.
- Only proceed with `git commit` (or `git commit --amend`) after the user explicitly approves.

### Commit Format & Granularity

- Use standard **Conventional Commits**:
    - `feat(<scope>): <description>` for new features or capabilities.
    - `fix(<scope>): <description>` for bug fixes.
    - `chore(<scope>): <description>` for maintenance, configs, or build scripts.
    - `refactor(<scope>): <description>` for code refactoring without behavior changes.
    - `docs(<scope>): <description>` for documentation updates.
- Keep commits granular and scoped to logical units of work.

---

## 6. Domain Knowledge: Block Schedule Structure (Sistem Blok SMK)

- **Weekly Column Layout (Slots 1 to 5)**:
    - In the master Excel schedule, each week contains 5 slot columns (labeled `1`, `2`, `3`, `4`, `5`) plus a room column (`R`).
    - **Crucial Rule**: These 5 slot columns represent the **5 periods of a day**, and this exact daily schedule repeats **every day for the entire week (Monday through Friday)**.
    - Example: If Week 4 has Slot 1 = Sejarah Indonesia, Slot 2 = Bahasa Jawa, Slot 3 = PAI, Slot 4 = PPKN, Slot 5 = PPKN, then students attend Sejarah, B. Jawa, PAI, and PPKN (2 periods) **every single day from Monday to Friday** during that week.
- **Bengkel (Mata Pelajaran Kejuruan)**:
    - If all 5 slots in a week are merged with a single number (e.g. `1`, `2`, `3`), this designates **"Bengkel"** (Mata Pelajaran Kejuruan Praktik) for the entire week, every day from Monday to Friday (e.g., room `Bkl`).
- **Mixed / Partial Merges & L1 (Kewirausahaan)**:
    - Some weeks feature a combination: e.g., 3 slots merged with a number (Kejuruan/Bengkel), and the remaining 2 slots merged with code `L1` (Kewirausahaan).
    - Note on cell merging: Unlike general subjects (which remain unmerged across adjacent cells, e.g. PPKN in slots 4 and 5), `L1` is explicitly merged across the 2 periods it occupies.
- **Daily Schedule Implications**:
    - When returning a daily schedule for any weekday (Monday - Friday) within an active week, returning the 5 resolved slots for that week is correct because that timetable applies to each day of that week.
    - Weekends (Saturday and Sunday) have no KBM (learning activities).

