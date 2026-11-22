import { OutboundQueue } from "../src/interfaces/whatsapp/outbound-queue.js";
import assert from "node:assert";

async function runTests() {
    console.log("[TEST] Starting OutboundQueue unit tests...");
    OutboundQueue.clear();

    const presenceCalls: Array<{ state: string; jid: string }> = [];
    const sendCalls: Array<{ jid: string; content: any; timestamp: number }> = [];

    // Mock WASocket
    const mockSocket: any = {
        sendPresenceUpdate: async (state: string, jid: string) => {
            presenceCalls.push({ state, jid });
        },
        sendMessage: async (jid: string, content: any, options: any) => {
            sendCalls.push({ jid, content, timestamp: Date.now() });
            return { key: { id: "mock_id_" + Math.random() } };
        },
    };

    OutboundQueue.setSocket(mockSocket);

    // Test 1: Enqueue 2 messages and measure sequential execution + presence
    const start = Date.now();
    const p1 = OutboundQueue.enqueue("user1@s.whatsapp.net", { text: "Halo test 1" });
    const p2 = OutboundQueue.enqueue("user2@s.whatsapp.net", { text: "Halo test 2" });

    const [res1, res2] = await Promise.all([p1, p2]);
    const duration = Date.now() - start;

    assert.ok(res1 && res1.key, "Result 1 must resolve with key");
    assert.ok(res2 && res2.key, "Result 2 must resolve with key");
    assert.strictEqual(sendCalls.length, 2, "Both messages must be sent");

    // Presence checks
    const composingCalls = presenceCalls.filter((c) => c.state === "composing");
    const pausedCalls = presenceCalls.filter((c) => c.state === "paused");
    assert.strictEqual(composingCalls.length, 2, "Composing presence must be sent for each message");
    assert.strictEqual(pausedCalls.length, 2, "Paused presence must be sent for each message");

    // Timing check: each message has typing delay (>= 800ms) + trailing gap (>= 500ms)
    // For 2 messages, total duration should be at least ~2000ms
    assert.ok(duration >= 2000, `Expected total duration >= 2000ms for 2 queued messages, got ${duration}ms`);
    console.log(`[TEST] Test 1 passed: 2 messages queued, presence simulated, delivered in ${duration}ms`);

    // Test 2: Error handling when sendMessage rejects
    const failingSocket: any = {
        sendPresenceUpdate: async () => {},
        sendMessage: async () => {
            throw new Error("Simulated network timeout");
        },
    };
    OutboundQueue.setSocket(failingSocket);

    let caughtError = false;
    try {
        await OutboundQueue.enqueue("target@s.whatsapp.net", { text: "Error test" });
    } catch (err: any) {
        caughtError = true;
        assert.strictEqual(err.message, "Simulated network timeout");
    }
    assert.ok(caughtError, "Queue must reject failed item");
    assert.strictEqual(OutboundQueue.getQueueLength(), 0, "Queue must not freeze after error");
    console.log("[TEST] Test 2 passed: Error handled and rejected without freezing queue");

    // Test 3: Queue overflow drops oldest item
    OutboundQueue.clear();
    OutboundQueue.setSocket(null); // Pause queue

    const promises: Promise<any>[] = [];
    for (let i = 0; i < 55; i++) {
        promises.push(
            OutboundQueue.enqueue("overflow@s.whatsapp.net", { text: `Msg ${i}` }).catch((e) => e)
        );
    }

    assert.strictEqual(
        OutboundQueue.getQueueLength(),
        OutboundQueue.MAX_QUEUE_SIZE,
        "Queue should be capped at MAX_QUEUE_SIZE"
    );

    const firstResult = await promises[0];
    assert.ok(firstResult instanceof Error, "Oldest message must be dropped on overflow");
    assert.strictEqual(firstResult.message, "Outbound queue overflow; message dropped");
    console.log("[TEST] Test 3 passed: Queue overflow properly capped and dropped oldest");

    OutboundQueue.clear();
    console.log("[TEST] All OutboundQueue unit tests passed successfully.");
}

runTests().catch((err) => {
    console.error("[FATAL] Test failed:", err);
    process.exit(1);
});
