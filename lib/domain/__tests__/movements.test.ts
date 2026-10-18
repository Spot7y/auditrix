import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { countMovements, filterMovements, groupByProgram, movementProgram, movementYear, type Movement } from "../movements";

const m = (over: Partial<Movement>): Movement => ({
  studentId: "21-00001",
  studentName: "Dela Cruz, Juan",
  type: "DROPPED",
  fromProgram: "BSIT",
  toProgram: null,
  recordedAt: "2026-03-01T02:00:00Z",
  ...over,
});

const rows = [
  m({}),
  m({ studentId: "22-00002", studentName: "Santos, Ana", type: "SHIFTED_OUT", fromProgram: "BSIT", toProgram: "BSCE" }),
  m({ studentId: "22-00002", studentName: "Santos, Ana", type: "SHIFTED_IN", fromProgram: "BSIT", toProgram: "BSCE" }),
  m({ studentId: "23-00003", studentName: "Bayang, Leo", type: "TRANSFERRED_IN", fromProgram: null, toProgram: "BSCE", recordedAt: "2025-06-10T00:00:00Z" }),
];

describe("student movements", () => {
  it("dates a movement by the year in the Philippines", () => {
    assert.equal(movementYear("2025-12-31T17:00:00Z"), 2026); // 1 a.m. on 1 January in Manila
    assert.equal(movementYear("2025-12-31T15:00:00Z"), 2025);
  });

  it("filters like the Student movements page", () => {
    assert.equal(filterMovements(rows, {}).length, 4);
    assert.deepEqual(filterMovements(rows, { type: "SHIFTED_IN" }).map((t) => t.studentId), ["22-00002"]);
    assert.equal(filterMovements(rows, { program: "BSCE" }).length, 3);
    assert.deepEqual(filterMovements(rows, { year: "2025" }).map((t) => t.studentId), ["23-00003"]);
    assert.deepEqual(filterMovements(rows, { q: "santos ana" }).map((t) => t.type), ["SHIFTED_OUT", "SHIFTED_IN"]);
    assert.equal(filterMovements(rows, { q: "21-000" }).length, 1);
  });

  it("puts a movement under the program it was recorded for", () => {
    assert.equal(movementProgram(rows[1]), "BSIT"); // shifted out of BSIT
    assert.equal(movementProgram(rows[2]), "BSCE"); // shifted into BSCE
    assert.equal(movementProgram(m({ type: "REOPENED", fromProgram: "BSIT", toProgram: "BSIT" })), "BSIT");
    assert.deepEqual(
      groupByProgram(rows).map((g) => [g.program, g.rows.length]),
      [["BSCE", 2], ["BSIT", 2]]
    );
  });

  it("counts each type of movement", () => {
    assert.deepEqual(countMovements(rows), {
      SHIFTED_IN: 1,
      SHIFTED_OUT: 1,
      TRANSFERRED_IN: 1,
      TRANSFERRED_OUT: 0,
      DROPPED: 1,
      REOPENED: 0,
    });
  });
});
