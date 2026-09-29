import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compareTerms, describeTerm, isValidTerm, laterTerm, parseTerm } from "../Term";

describe("Term — YY-S", () => {
  it("parses a two-digit year and semester 1, 2 or 3", () => {
    assert.deepEqual(parseTerm("25-1"), { year: 25, semester: 1 });
    assert.deepEqual(parseTerm(" 07-3 "), { year: 7, semester: 3 });
  });

  for (const value of ["2025-1", "25-4", "25-0", "25", "25/1", "", null]) {
    it(`rejects ${JSON.stringify(value)}`, () => {
      assert.equal(parseTerm(value), null);
      assert.equal(isValidTerm(value), false);
    });
  }

  it("orders first semester, second semester, then midyear, then the next school year", () => {
    const shuffled = ["26-1", "25-3", "25-1", "24-3", "25-2"];
    assert.deepEqual([...shuffled].sort(compareTerms), ["24-3", "25-1", "25-2", "25-3", "26-1"]);
    assert.equal(compareTerms("25-2", "25-2"), 0);
    assert.equal(laterTerm("25-3", "25-2"), "25-3");
  });

  it("describes a term in words", () => {
    assert.equal(describeTerm("25-1"), "1st semester, SY 2025–2026");
    assert.equal(describeTerm("25-3"), "Midyear, SY 2025–2026");
  });
});
