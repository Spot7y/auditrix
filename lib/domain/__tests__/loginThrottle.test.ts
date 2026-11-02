import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LoginThrottle, MAX_FAILURES, MemoryFailureStore, WINDOW_MS } from "../loginThrottle";

describe("login throttle", () => {
  it("blocks an email after too many wrong passwords, whatever its capitals", async () => {
    const throttle = new LoginThrottle(new MemoryFailureStore(), () => 0);
    for (let i = 0; i < MAX_FAILURES - 1; i++) await throttle.recordFailure("Chair@ksu.edu.ph");
    assert.equal(await throttle.isBlocked("chair@ksu.edu.ph"), false);
    await throttle.recordFailure("chair@ksu.edu.ph ");
    assert.equal(await throttle.isBlocked("CHAIR@ksu.edu.ph"), true);
    assert.equal(await throttle.isBlocked("dean@ksu.edu.ph"), false);
  });

  it("lets the email in again once the window has passed", async () => {
    let now = 0;
    const throttle = new LoginThrottle(new MemoryFailureStore(), () => now);
    for (let i = 0; i < MAX_FAILURES; i++) await throttle.recordFailure("a@ksu.edu.ph");
    now = WINDOW_MS - 1;
    assert.equal(await throttle.isBlocked("a@ksu.edu.ph"), true);
    now = WINDOW_MS + 1;
    assert.equal(await throttle.isBlocked("a@ksu.edu.ph"), false);
  });

  it("forgets failures after a successful login", async () => {
    const throttle = new LoginThrottle(new MemoryFailureStore(), () => 0);
    for (let i = 0; i < MAX_FAILURES - 1; i++) await throttle.recordFailure("a@ksu.edu.ph");
    await throttle.recordSuccess("a@ksu.edu.ph");
    await throttle.recordFailure("a@ksu.edu.ph");
    assert.equal(await throttle.isBlocked("a@ksu.edu.ph"), false);
  });

  it("counts failures seen by every server, since they share one store", async () => {
    const store = new MemoryFailureStore();
    const serverA = new LoginThrottle(store, () => 0);
    const serverB = new LoginThrottle(store, () => 0);
    for (let i = 0; i < MAX_FAILURES; i++) await (i % 2 ? serverA : serverB).recordFailure("a@ksu.edu.ph");
    assert.equal(await serverA.isBlocked("a@ksu.edu.ph"), true);
    assert.equal(await serverB.isBlocked("a@ksu.edu.ph"), true);
  });
});
