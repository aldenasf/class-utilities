import { RateLimiter } from "../src/interfaces/whatsapp/rate-limiter.js";
import assert from "node:assert";

function runTests() {
    console.log("[TEST] Starting RateLimiter unit tests...");
    RateLimiter.reset();

    const user1 = "62811111111@s.whatsapp.net";
    const user2 = "62822222222@s.whatsapp.net";
    const group1 = "120363000000000000@g.us";

    // Test 1: First 3 commands allowed for user1
    for (let i = 1; i <= 3; i++) {
        const res = RateLimiter.check(user1, group1, false);
        assert.strictEqual(res.allowed, true, `Command ${i} should be allowed`);
        assert.strictEqual(res.shouldWarn, false);
    }
    console.log("[TEST] Test 1 passed: First 3 commands allowed for single user");

    // Test 2: 4th command rejected with shouldWarn = true
    const res4 = RateLimiter.check(user1, group1, false);
    assert.strictEqual(res4.allowed, false, "4th command must be rejected");
    assert.strictEqual(res4.shouldWarn, true, "First violation must trigger warning");
    assert.strictEqual(res4.reason, "user");
    console.log("[TEST] Test 2 passed: 4th command throttled with warning");

    // Test 3: 5th command rejected with shouldWarn = false (silent drop)
    const res5 = RateLimiter.check(user1, group1, false);
    assert.strictEqual(res5.allowed, false, "5th command must be rejected");
    assert.strictEqual(res5.shouldWarn, false, "Subsequent spam must be silently dropped");
    console.log("[TEST] Test 3 passed: 5th command silently dropped");

    // Test 4: Another user in same group still has their own allowance
    const user2Res1 = RateLimiter.check(user2, group1, false);
    assert.strictEqual(user2Res1.allowed, true, "User 2 should be allowed");
    console.log("[TEST] Test 4 passed: Distinct user has independent quota");

    // Test 5: Exempt admin bypasses rate limits
    for (let i = 0; i < 15; i++) {
        const adminRes = RateLimiter.check(user1, group1, true);
        assert.strictEqual(adminRes.allowed, true, "Admin must be exempt from rate limits");
    }
    console.log("[TEST] Test 5 passed: Admin exemption verified");

    // Test 6: Group ceiling test
    RateLimiter.reset();
    for (let i = 0; i < 10; i++) {
        const u = `6280000000${i}@s.whatsapp.net`;
        const r = RateLimiter.check(u, group1, false);
        assert.strictEqual(r.allowed, true, `User ${i} should be allowed`);
    }
    // 11th command across the group
    const u11 = "628999999999@s.whatsapp.net";
    const groupCeilingRes = RateLimiter.check(u11, group1, false);
    assert.strictEqual(groupCeilingRes.allowed, false, "Group ceiling must trip at 11th command");
    assert.strictEqual(groupCeilingRes.reason, "chat");
    assert.strictEqual(groupCeilingRes.shouldWarn, true);
    console.log("[TEST] Test 6 passed: Group ceiling triggered correctly");

    console.log("[TEST] All RateLimiter unit tests passed successfully.");
}

runTests();
