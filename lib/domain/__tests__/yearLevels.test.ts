import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { promotionSkipReason, promotionTerm, yearLevelAsOf } from "../yearLevels";

describe("year level history", () => {
  const history = [
    { term: "24-1", yearLevel: 1 },
    { term: "26-1", yearLevel: 3 },
    { term: "25-1", yearLevel: 2 },
  ];

  it("uses the latest entry at or before the term", () => {
    assert.equal(yearLevelAsOf(history, "24-1"), 1);
    assert.equal(yearLevelAsOf(history, "24-3"), 1);
    assert.equal(yearLevelAsOf(history, "25-2"), 2);
    assert.equal(yearLevelAsOf(history, "27-1"), 3);
  });

  it("knows nothing before the first entry", () => {
    assert.equal(yearLevelAsOf(history, "23-2"), null);
    assert.equal(yearLevelAsOf([], "25-1"), null);
  });
});

describe("promotion", () => {
  it("takes effect from the current term in the first semester, else from the next school year", () => {
    assert.equal(promotionTerm("25-1"), "25-1");
    assert.equal(promotionTerm("25-2"), "26-1");
    assert.equal(promotionTerm("25-3"), "26-1");
  });

  it("leaves out 4th-year, dropped and transferred-out students", () => {
    assert.equal(promotionSkipReason(2, null), null);
    assert.equal(promotionSkipReason(3, "SHIFTED_IN"), null);
    assert.equal(promotionSkipReason(3, "TRANSFERRED_IN"), null);
    assert.equal(promotionSkipReason(4, null), "SENIOR");
    assert.equal(promotionSkipReason(2, "DROPPED"), "DROPPED");
    assert.equal(promotionSkipReason(1, "TRANSFERRED_OUT"), "TRANSFERRED_OUT");
  });
});
