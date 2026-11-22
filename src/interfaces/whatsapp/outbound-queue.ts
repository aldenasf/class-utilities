import { WASocket, AnyMessageContent, MiscMessageGenerationOptions } from "@whiskeysockets/baileys";

export interface QueueTask {
    jid: string;
    content: AnyMessageContent;
    options?: MiscMessageGenerationOptions;
    resolve: (val: any) => void;
    reject: (err: any) => void;
}

export class OutboundQueue {
    public static readonly MAX_QUEUE_SIZE = 50;

    private static queue: QueueTask[] = [];
    private static isProcessing = false;
    private static socket: WASocket | null = null;
    private static isPaused = false;

    /**
     * Sets or updates the active Baileys socket.
     * When socket is connected, processing resumes if there are pending messages.
     */
    public static setSocket(sock: WASocket | null): void {
        this.socket = sock;
        if (sock) {
            this.isPaused = false;
            if (!this.isProcessing && this.queue.length > 0) {
                this.processQueue();
            }
        } else {
            this.isPaused = true;
        }
    }

    /**
     * Enqueues an outgoing message task for sequential, human-paced dispatch.
     *
     * @param jid - Target chat or user JID
     * @param content - Baileys message payload
     * @param options - Optional generation / quote options
     * @returns Promise resolving to the Baileys sendMessage result
     */
    public static enqueue(
        jid: string,
        content: AnyMessageContent,
        options?: MiscMessageGenerationOptions
    ): Promise<any> {
        if (this.queue.length >= this.MAX_QUEUE_SIZE) {
            const dropped = this.queue.shift();
            if (dropped) {
                console.warn("[WA] Outbound queue overflow. Dropped oldest pending message.");
                dropped.reject(new Error("Outbound queue overflow; message dropped"));
            }
        }

        return new Promise((resolve, reject) => {
            this.queue.push({
                jid,
                content,
                options,
                resolve,
                reject,
            });

            this.processQueue();
        });
    }

    /**
     * Sequential queue worker processing tasks one by one with typing simulation and jitter.
     */
    private static async processQueue(): Promise<void> {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            while (this.queue.length > 0) {
                // If socket is disconnected, pause processing until setSocket() is re-called with an active socket
                if (!this.socket || this.isPaused) {
                    break;
                }

                const task = this.queue.shift();
                if (!task) continue;

                // 1. Calculate dynamic typing simulation based on message length
                const text = (task.content as any)?.text || "";
                const typingDuration = Math.min(2500, Math.max(1000, text.length * 15));
                const jitter = Math.floor(Math.random() * 400) - 200; // +/- 200ms
                const finalTypingDelay = Math.max(800, typingDuration + jitter);

                // 2. Simulate presence (composing state)
                try {
                    await this.socket.sendPresenceUpdate("composing", task.jid);
                } catch {
                    // Non-fatal: presence updates can safely fail without interrupting message delivery
                }

                await this.sleep(finalTypingDelay);

                try {
                    await this.socket.sendPresenceUpdate("paused", task.jid);
                } catch {
                    // Non-fatal
                }

                // 3. Dispatch message
                try {
                    const result = await this.socket.sendMessage(task.jid, task.content, task.options);
                    task.resolve(result);
                } catch (err) {
                    console.error(`[WA] Error dispatching queued message to ${task.jid}:`, err);
                    task.reject(err);
                }

                // 4. Trailing inter-message safety gap (500ms - 1200ms)
                const trailingGap = 500 + Math.floor(Math.random() * 700);
                await this.sleep(trailingGap);
            }
        } finally {
            this.isProcessing = false;
        }
    }

    private static sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Returns current length of pending queue.
     */
    public static getQueueLength(): number {
        return this.queue.length;
    }

    /**
     * Clears all pending queue tasks (for testing / teardown).
     */
    public static clear(): void {
        this.queue = [];
        this.isProcessing = false;
    }
}
