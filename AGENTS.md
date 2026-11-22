# AGENTS.md

Instructions, operational conventions, and quality standards for AI coding agents working in this repository.

---

## CLI & Logging Standards (Zero Slop Policy)

### 1. No Decorative Emojis
- **NEVER** use emojis in `console.log()`, `console.info()`, `console.warn()`, `console.error()`, scripts, or CLI/daemon outputs (avoid `🚀`, `✨`, `🎉`, `📦`, `❌`, `⚠️`, `💡`).
- Emojis break monospace alignment, corrupt tabular layouts, cause rendering glitches across minimal terminals and headless SSH sessions, and break shell pipeline parsing (`grep`, `awk`, `cut`).
- Use standard text prefixes when status indicators or categorization are required:
  - ❌ `console.log("🚀 Server running on port 3000...")`
  - ✅ `console.log("[INFO] Server listening on :3000")`
  - ❌ `console.log("✨ Loaded 12 commands successfully!")`
  - ✅ `console.log("[OK] Loaded 12 commands")`
  - ❌ `console.error("❌ Failed to parse Excel file")`
  - ✅ `console.error("[ERROR] Failed to parse Excel file: <reason>")`

### 2. No Conversational Fluff or Cheerleading
- Do not output patronizing, chatty, or human-simulating filler text in CLI tools and test scripts:
  - ❌ *"Hold tight, parsing your schedule now..."*
  - ❌ *"All set! Happy hacking! 🎉"*
  - ❌ *"Oopsie! Something went wrong :("*
  - ✅ Output deterministic facts, states, quantities, durations, and actionable errors.

### 3. Unix Philosophy & Pipeline Friendliness
- **Stream Discipline**:
  - `stdout`: Pure payload or expected data output.
  - `stderr`: Diagnostics, warnings, execution logs, and runtime errors.
- **Machine Parseability**:
  - Keep output clean for downstream tooling and log collectors.
  - Avoid gratuitous decorative separators (`==============================`), ASCII art banners, or boxed borders in CLI logs.
- **Exit Codes**:
  - Always exit with status code `0` on success and non-zero (`1`, `2`, etc.) on failure.
  - Never log an error and exit with code `0`.

### 4. Color & Terminal Discipline
- Use ANSI colors sparingly and semantically (`dim` for secondary metadata, `green` for success, `red` for fatal errors).
- Always check if output is an interactive terminal (`process.stdout.isTTY`) and respect the `NO_COLOR` standard before emitting ANSI escape codes.
