import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { yearLevelFromProgress } from "../yearLevels";

describe("year level from progress", () => {
  const none = () => false;

  it("follows the unit share: 25% Sophomore, over 50% Junior, 75% Senior", () => {
    assert.equal(yearLevelFromProgress(0, none), 1);
    assert.equal(yearLevelFromProgress(24.9, none), 1);
    assert.equal(yearLevelFromProgress(25, none), 2);
    assert.equal(yearLevelFromProgress(50, none), 2);
    assert.equal(yearLevelFromProgress(50.1, none), 3);
    assert.equal(yearLevelFromProgress(75, none), 4);
  });

  it("also moves up once every earlier year is finished", () => {
    assert.equal(yearLevelFromProgress(10, (y) => y <= 1), 2);
    assert.equal(yearLevelFromProgress(10, (y) => y <= 2), 3);
    assert.equal(yearLevelFromProgress(10, (y) => y <= 3), 4);
  });

  it("never goes past 4th year", () => {
    assert.equal(yearLevelFromProgress(100, () => true), 4);
  });
});
