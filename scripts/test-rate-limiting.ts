import { RateLimiter } from "../src/interfaces/whatsapp/rate-limiter.js";
import { OutboundQueue } from "../src/interfaces/whatsapp/outbound-queue.js";
import assert from "node:assert";

async function runIntegrationSuite() {
    console.log("[TEST] Running Rate Limiting & Anti-Ban Integration Suite...");

    // ----------------------------------------------------
    // Section 1: Inbound Rate Limiting Verification
    // ----------------------------------------------------
    console.log("[TEST] 1. Testing RateLimiter sliding window and debounce...");
    RateLimiter.reset();

    const senderA = "6281234567890@s.whatsapp.net";
    const senderB = "6289876543210@s.whatsapp.net";
    const groupJid = "120363111111111111@g.us";

    // User A sends 3 commands: all allowed
    for (let i = 1; i <= 3; i++) {
        const res = RateLimiter.check(senderA, groupJid, false);
        assert.strictEqual(res.allowed, true, `Command ${i} should be allowed`);
        assert.strictEqual(res.shouldWarn, false);
    }

    // 4th command: blocked with warning
    const res4 = RateLimiter.check(senderA, groupJid, false);
    assert.strictEqual(res4.allowed, false, "4th command must be throttled");
    assert.strictEqual(res4.shouldWarn, true, "First violation must trigger warning message");

    // 5th command: blocked without warning (silent drop)
    const res5 = RateLimiter.check(senderA, groupJid, false);
    assert.strictEqual(res5.allowed, false, "5th command must be throttled");
    assert.strictEqual(res5.shouldWarn, false, "Subsequent spam must be silently ignored");

    // Admin sender is exempt
    for (let i = 0; i < 10; i++) {
        const adminRes = RateLimiter.check(senderA, groupJid, true);
        assert.strictEqual(adminRes.allowed, true, "Admin should never be throttled");
    }

    console.log("[TEST] Inbound RateLimiter verified successfully.");

    // ----------------------------------------------------
    // Section 2: Outbound Queue & Presence Verification
    // ----------------------------------------------------
    console.log("[TEST] 2. Testing OutboundQueue pacing and typing presence...");
    OutboundQueue.clear();

    const recordedPresence: string[] = [];
    const recordedMessages: any[] = [];

    const mockSocket: any = {
        sendPresenceUpdate: async (type: string, jid: string) => {
            recordedPresence.push(type);
        },
        sendMessage: async (jid: string, content: any, options: any) => {
            recordedMessages.push({ jid, content, time: Date.now() });
            return { key: { id: "mock_res" } };
        },
    };

    OutboundQueue.setSocket(mockSocket);

    const start = Date.now();
    await OutboundQueue.enqueue(senderB, { text: "Hello student!" });
    const elapsed = Date.now() - start;

    assert.strictEqual(recordedMessages.length, 1, "Message must be sent");
    assert.ok(recordedPresence.includes("composing"), "Presence composing must be emitted");
    assert.ok(recordedPresence.includes("paused"), "Presence paused must be emitted");
    assert.ok(elapsed >= 800, `Expected delivery delay >= 800ms, elapsed was ${elapsed}ms`);

    OutboundQueue.clear();
    console.log("[TEST] OutboundQueue verified successfully.");

    console.log("[TEST] Rate Limiting & Anti-Ban Integration Suite PASSED.");
}

runIntegrationSuite().catch((err) => {
    console.error("[FATAL] Integration test failed:", err);
    process.exit(1);
});
