import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { searchTerms } from "../searchTerms";
import { MIN_PASSWORD_LENGTH, PASSWORD_RULES, passwordProblem } from "../passwordPolicy";

describe("student search terms", () => {
  it("splits a “Last, First” name into words", () => {
    assert.deepEqual(searchTerms("Doe, John"), ["Doe", "John"]);
  });

  it("keeps characters that appear in IDs and names", () => {
    assert.deepEqual(searchTerms("24-113792 O'Neil Jr. Peñaflor"), ["24-113792", "O'Neil", "Jr.", "Peñaflor"]);
  });

  it("drops characters that have meaning in database filters", () => {
    // Brackets, quotes and wildcards are removed, so a word like "id.neq.0" can
    // only ever be text to search for, never an extra filter condition.
    assert.deepEqual(searchTerms('x),id.neq.0 "y" (z) %_*'), ["x", "id.neq.0", "y", "z"]);
  });

  it("ignores blank searches and caps the number of words", () => {
    assert.deepEqual(searchTerms("  ,  "), []);
    assert.equal(searchTerms("a b c d e f g").length, 5);
  });
});

describe("password policy", () => {
  it(`requires at least ${MIN_PASSWORD_LENGTH} characters`, () => {
    assert.equal(passwordProblem("abc123"), `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  });

  it("requires letters and numbers", () => {
    assert.equal(passwordProblem("onlyletters"), "Password must contain both letters and numbers.");
    assert.equal(passwordProblem("1234567890"), "Password must contain both letters and numbers.");
  });

  it("checks the confirmation matches", () => {
    assert.equal(passwordProblem("goodpass9", "goodpass8"), "Passwords do not match.");
  });

  it("accepts a good password", () => {
    assert.equal(passwordProblem("goodpass9", "goodpass9"), null);
    assert.equal(passwordProblem("V7T62cBwN6WV"), null);
  });

  it("ticks every rule in the checklist exactly when the password is accepted", () => {
    for (const password of ["", "abc", "abc123", "abcdefgh", "12345678", "goodpass9", "V7T62cBwN6WV"]) {
      const allTicked = PASSWORD_RULES.every((rule) => rule.test(password));
      assert.equal(allTicked, passwordProblem(password) === null, password);
    }
    assert.deepEqual(
      PASSWORD_RULES.map((rule) => [rule.label, rule.test("abc12")]),
      [
        ["At least 8 characters", false],
        ["Contains a letter", true],
        ["Contains a number", true],
      ]
    );
  });
});
