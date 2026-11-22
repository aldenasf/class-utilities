export interface RateLimitResult {
    allowed: boolean;
    shouldWarn: boolean;
    reason?: "user" | "chat";
    cooldownSeconds?: number;
}

export class RateLimiter {
    public static readonly USER_LIMIT = 3;
    public static readonly USER_WINDOW_MS = 15_000;
    public static readonly CHAT_LIMIT = 10;
    public static readonly CHAT_WINDOW_MS = 15_000;
    public static readonly WARNING_COOLDOWN_MS = 15_000;

    public static readonly WARNING_MESSAGE =
        "⏳ *Mohon Tunggu Sebentar*\nJangan mengirim perintah terlalu cepat. Silakan tunggu beberapa detik.";

    private static userTimestamps: Map<string, number[]> = new Map();
    private static chatTimestamps: Map<string, number[]> = new Map();
    private static warningSentAt: Map<string, number> = new Map();
    private static cleanupTimer: NodeJS.Timeout | null = null;

    static {
        this.initAutoCleanup();
    }

    /**
     * Check if a command is allowed under rate limiting rules.
     *
     * @param sender - The user's WhatsApp JID
     * @param chatJid - The chat/group WhatsApp JID
     * @param isExempt - Whether sender is superuser/admin and exempt from limits
     */
    public static check(sender: string, chatJid: string, isExempt: boolean = false): RateLimitResult {
        if (isExempt) {
            return { allowed: true, shouldWarn: false };
        }

        const now = Date.now();

        // 1. Prune timestamps outside the active sliding window
        const userWindowStart = now - this.USER_WINDOW_MS;
        const chatWindowStart = now - this.CHAT_WINDOW_MS;

        const userHistory = (this.userTimestamps.get(sender) || []).filter((t) => t > userWindowStart);
        const chatHistory = (this.chatTimestamps.get(chatJid) || []).filter((t) => t > chatWindowStart);

        this.userTimestamps.set(sender, userHistory);
        this.chatTimestamps.set(chatJid, chatHistory);

        // 2. Evaluate limits
        let violationReason: "user" | "chat" | null = null;
        if (userHistory.length >= this.USER_LIMIT) {
            violationReason = "user";
        } else if (chatHistory.length >= this.CHAT_LIMIT) {
            violationReason = "chat";
        }

        // 3. Handle violation
        if (violationReason) {
            const lastWarned = this.warningSentAt.get(sender) || 0;
            const cooldownSeconds = Math.ceil(
                (violationReason === "user"
                    ? (userHistory[0] + this.USER_WINDOW_MS - now)
                    : (chatHistory[0] + this.CHAT_WINDOW_MS - now)) / 1000
            );

            // Send warning only once within the cooldown window; subsequent spam is silent
            if (now - lastWarned >= this.WARNING_COOLDOWN_MS) {
                this.warningSentAt.set(sender, now);
                return {
                    allowed: false,
                    shouldWarn: true,
                    reason: violationReason,
                    cooldownSeconds: Math.max(1, cooldownSeconds),
                };
            }

            return {
                allowed: false,
                shouldWarn: false,
                reason: violationReason,
                cooldownSeconds: Math.max(1, cooldownSeconds),
            };
        }

        // 4. Record current timestamp
        userHistory.push(now);
        chatHistory.push(now);
        this.userTimestamps.set(sender, userHistory);
        this.chatTimestamps.set(chatJid, chatHistory);

        return { allowed: true, shouldWarn: false };
    }

    /**
     * Purges stale entries to prevent memory accumulation in 24/7 server runs.
     */
    public static cleanup(): void {
        const now = Date.now();
        const userCutoff = now - this.USER_WINDOW_MS;
        const chatCutoff = now - this.CHAT_WINDOW_MS;
        const warnCutoff = now - this.WARNING_COOLDOWN_MS;

        for (const [key, timestamps] of this.userTimestamps.entries()) {
            const valid = timestamps.filter((t) => t > userCutoff);
            if (valid.length === 0) {
                this.userTimestamps.delete(key);
            } else {
                this.userTimestamps.set(key, valid);
            }
        }

        for (const [key, timestamps] of this.chatTimestamps.entries()) {
            const valid = timestamps.filter((t) => t > chatCutoff);
            if (valid.length === 0) {
                this.chatTimestamps.delete(key);
            } else {
                this.chatTimestamps.set(key, valid);
            }
        }

        for (const [key, timestamp] of this.warningSentAt.entries()) {
            if (timestamp <= warnCutoff) {
                this.warningSentAt.delete(key);
            }
        }
    }

    /**
     * Initializes periodic auto-cleanup every 5 minutes with unref() so it does not block node exit.
     */
    private static initAutoCleanup(): void {
        if (this.cleanupTimer) return;
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);
        this.cleanupTimer.unref?.();
    }

    /**
     * Resets all internal stores (primarily for unit tests).
     */
    public static reset(): void {
        this.userTimestamps.clear();
        this.chatTimestamps.clear();
        this.warningSentAt.clear();
    }
}
