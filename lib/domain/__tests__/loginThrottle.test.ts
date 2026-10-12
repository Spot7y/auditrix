import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LoginThrottle, MAX_FAILURES, WINDOW_MS } from "../loginThrottle";

describe("login throttle", () => {
  it("blocks an email after too many wrong passwords, whatever its capitals", () => {
    const throttle = new LoginThrottle(() => 0);
    for (let i = 0; i < MAX_FAILURES - 1; i++) throttle.recordFailure("Chair@ksu.edu.ph");
    assert.equal(throttle.isBlocked("chair@ksu.edu.ph"), false);
    throttle.recordFailure("chair@ksu.edu.ph ");
    assert.equal(throttle.isBlocked("CHAIR@ksu.edu.ph"), true);
    assert.equal(throttle.isBlocked("dean@ksu.edu.ph"), false);
  });

  it("lets the email in again once the window has passed", () => {
    let now = 0;
    const throttle = new LoginThrottle(() => now);
    for (let i = 0; i < MAX_FAILURES; i++) throttle.recordFailure("a@ksu.edu.ph");
    now = WINDOW_MS - 1;
    assert.equal(throttle.isBlocked("a@ksu.edu.ph"), true);
    now = WINDOW_MS + 1;
    assert.equal(throttle.isBlocked("a@ksu.edu.ph"), false);
  });

  it("forgets failures after a successful login", () => {
    const throttle = new LoginThrottle(() => 0);
    for (let i = 0; i < MAX_FAILURES - 1; i++) throttle.recordFailure("a@ksu.edu.ph");
    throttle.recordSuccess("a@ksu.edu.ph");
    throttle.recordFailure("a@ksu.edu.ph");
    assert.equal(throttle.isBlocked("a@ksu.edu.ph"), false);
  });
});
