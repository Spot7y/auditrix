import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compareTerms, describeTerm, formatTerm, isValidTerm, laterTerm, parseTerm } from "../Term";

describe("Term — YY-S", () => {
  it("parses a two-digit year and semester 1, 2 or S (midyear)", () => {
    assert.deepEqual(parseTerm("25-1"), { year: 25, semester: 1 });
    assert.deepEqual(parseTerm(" 07-S "), { year: 7, semester: 3 });
    assert.equal(formatTerm({ year: 7, semester: 3 }), "07-S");
  });

  for (const value of ["2025-1", "25-3", "25-4", "25-0", "25-s", "25", "25/1", "", null]) {
    it(`rejects ${JSON.stringify(value)}`, () => {
      assert.equal(parseTerm(value), null);
      assert.equal(isValidTerm(value), false);
    });
  }

  it("orders terms as KSU records do: 25-2, then the midyear 26-S, then 26-1", () => {
    const shuffled = ["26-1", "26-S", "25-1", "25-S", "25-2", "26-2"];
    assert.deepEqual([...shuffled].sort(compareTerms), ["25-S", "25-1", "25-2", "26-S", "26-1", "26-2"]);
    assert.equal(compareTerms("25-2", "25-2"), 0);
    assert.equal(laterTerm("26-S", "25-2"), "26-S");
    assert.equal(laterTerm("26-S", "26-1"), "26-1");
  });

  it("describes a term in words; the midyear ends the school year before its number", () => {
    assert.equal(describeTerm("25-1"), "1st semester, SY 2025–2026");
    assert.equal(describeTerm("26-S"), "Midyear, SY 2025–2026");
  });
});
