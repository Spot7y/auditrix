import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AcademicRecord } from "../AcademicRecord";
import { CurriculumMap } from "../CurriculumMap";
import { enrollmentStatus } from "../enrollmentStatus";
import type { Subject } from "../Subject";
import type { SubjectRecord, SubjectRecordStatus } from "../SubjectRecord";

function subject(code: string, yearLevel: 1 | 2 | 3 | 4, semester: 1 | 2 | 3): Subject {
  return { code, title: code, units: 3, yearLevel, semester, requirements: [] };
}

function taken(subjectCode: string, term: string, status: SubjectRecordStatus = "IN_PROGRESS"): SubjectRecord {
  return { subjectCode, status, grade: status === "PASSED" ? 2.0 : null, term };
}

// 2nd year, second semester: CC 201, CC 202, CC 203.
const curriculum = new CurriculumMap("BSIT", [
  subject("CC 101", 1, 1),
  subject("CC 102", 1, 2),
  subject("CC 201", 2, 2),
  subject("CC 202", 2, 2),
  subject("CC 203", 2, 2),
]);
const status = (records: SubjectRecord[], term: string | null = "25-2", yearLevel = 2) =>
  enrollmentStatus(new AcademicRecord("S", curriculum, yearLevel, records), term, yearLevel);

describe("regular or irregular (KSU Operations Manual)", () => {
  it("is regular when enrolled in the whole prescribed load", () => {
    assert.deepEqual(status([taken("CC 201", "25-2"), taken("CC 202", "25-2"), taken("CC 203", "25-2")]), {
      kind: "REGULAR",
      term: "25-2",
    });
  });

  it("is still regular with a back subject on top of the full load", () => {
    const records = [taken("CC 102", "25-2"), taken("CC 201", "25-2"), taken("CC 202", "25-2"), taken("CC 203", "25-2")];
    assert.equal(status(records).kind, "REGULAR");
  });

  it("doesn't expect a subject already passed in an earlier term", () => {
    const records = [taken("CC 203", "25-1", "PASSED"), taken("CC 201", "25-2"), taken("CC 202", "25-2")];
    assert.equal(status(records).kind, "REGULAR");
  });

  it("is irregular when enrolled in less than the prescribed load, and names what's missing", () => {
    assert.deepEqual(status([taken("CC 102", "25-2"), taken("CC 201", "25-2")]), {
      kind: "IRREGULAR",
      term: "25-2",
      missing: ["CC 202", "CC 203"],
    });
  });

  it("counts a subject failed earlier as still missing", () => {
    const records = [taken("CC 203", "25-1", "FAILED"), taken("CC 201", "25-2"), taken("CC 202", "25-2")];
    assert.deepEqual(status(records), { kind: "IRREGULAR", term: "25-2", missing: ["CC 203"] });
  });

  it("counts grades already entered for the current term as enrolled", () => {
    const records = [taken("CC 201", "25-2", "PASSED"), taken("CC 202", "25-2", "FAILED"), taken("CC 203", "25-2", "INCOMPLETE")];
    assert.equal(status(records).kind, "REGULAR");
  });

  it("is not determined without enrollment for the current term", () => {
    assert.deepEqual(status([taken("CC 101", "25-1", "PASSED")]), {
      kind: "NOT_DETERMINED",
      reason: "No enrollment is recorded for 25-2.",
    });
  });

  it("is not determined before the dean sets the current semester", () => {
    assert.equal(status([taken("CC 201", "25-2")], null).kind, "NOT_DETERMINED");
  });

  it("is not determined when nothing is prescribed for that semester", () => {
    assert.deepEqual(status([taken("CC 102", "25-3")], "25-3"), {
      kind: "NOT_DETERMINED",
      reason: "The curriculum prescribes no subjects for 2nd year, midyear.",
    });
  });
});
