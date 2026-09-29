import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AuditEngine } from "../AuditEngine";
import { AcademicRecord } from "../AcademicRecord";
import { CurriculumMap } from "../CurriculumMap";
import { CoursePrerequisite } from "../requirements/CoursePrerequisite";
import { YearStandingRequirement } from "../requirements/YearStandingRequirement";
import { CompletionRequirement } from "../requirements/CompletionRequirement";
import type { Subject } from "../Subject";
import type { SubjectRecord, SubjectRecordStatus } from "../SubjectRecord";

const engine = new AuditEngine();

function subject(code: string, overrides: Partial<Subject> = {}): Subject {
  return { code, title: code, units: 3, yearLevel: 1, semester: 1, requirements: [], ...overrides };
}

function passed(...codes: string[]): SubjectRecord[] {
  return codes.map((subjectCode) => ({ subjectCode, status: "PASSED", grade: 2.0, term: "24-1" }));
}

function taken(subjectCode: string, term: string | null, status: SubjectRecordStatus = "PASSED"): SubjectRecord {
  const grade = status === "PASSED" ? 2.0 : status === "FAILED" ? 5.0 : null;
  return { subjectCode, status, grade, term };
}

function statusOf(results: ReturnType<AuditEngine["auditCurriculum"]>, code: string) {
  return results.find((r) => r.subjectCode === code);
}

const prereq = (code: string) => new CoursePrerequisite(code);
const coreq = (code: string) => new CoursePrerequisite(code, "COREQUISITE");

describe("AuditEngine — prerequisite chains", () => {
  const curriculum = new CurriculumMap("BSIT", [
    subject("CC 101"),
    subject("CC 103", { requirements: [prereq("CC 101")] }),
    subject("CC 107", { yearLevel: 2, requirements: [prereq("CC 104")] }),
  ]);
  const audit = engine.auditCurriculum(new AcademicRecord("23-110414", curriculum, 1, passed("CC 101")));

  it("marks a passed subject COMPLETED", () => {
    assert.deepEqual(statusOf(audit, "CC 101"), { subjectCode: "CC 101", status: "COMPLETED", reasons: [], warnings: [] });
  });

  it("marks a subject AVAILABLE once its prerequisite is passed", () => {
    assert.deepEqual(statusOf(audit, "CC 103"), { subjectCode: "CC 103", status: "AVAILABLE", reasons: [], warnings: [] });
  });

  it("marks a subject UNAVAILABLE and names the missing prerequisite", () => {
    assert.deepEqual(statusOf(audit, "CC 107"), {
      subjectCode: "CC 107",
      status: "UNAVAILABLE",
      reasons: ["CC 104"],
      warnings: [],
    });
  });
});

describe("AuditEngine — pending prerequisites", () => {
  it("is PENDING when every unmet prerequisite is in progress or incomplete", () => {
    const curriculum = new CurriculumMap("BSIT", [
      subject("CC 111"),
      subject("CC 112"),
      subject("CC 120", { yearLevel: 2, requirements: [prereq("CC 111"), prereq("CC 112")] }),
    ]);
    const record = new AcademicRecord("23-110415", curriculum, 2, [
      taken("CC 111", "25-1", "IN_PROGRESS"),
      taken("CC 112", "25-1", "INCOMPLETE"),
    ]);

    assert.deepEqual(engine.auditEnrollment(record, "CC 120"), {
      subjectCode: "CC 120",
      status: "PENDING",
      reasons: ["CC 111", "CC 112"],
      warnings: [],
    });
  });

  it("is UNAVAILABLE when one unmet prerequisite is pending but another was never taken", () => {
    const curriculum = new CurriculumMap("BSIT", [
      subject("CC 105"),
      subject("CC 108"),
      subject("CC 109"),
      subject("CC 116", { yearLevel: 2, requirements: [prereq("CC 105"), prereq("CC 108"), prereq("CC 109")] }),
    ]);
    const record = new AcademicRecord("23-110416", curriculum, 2, [
      { subjectCode: "CC 105", status: "PASSED", grade: 1.75, term: "23-1" },
      taken("CC 108", "25-1", "INCOMPLETE"),
    ]);

    assert.deepEqual(engine.auditEnrollment(record, "CC 116"), {
      subjectCode: "CC 116",
      status: "UNAVAILABLE",
      reasons: ["CC 108", "CC 109"],
      warnings: [],
    });
  });
});

describe("AuditEngine — the student's own grade", () => {
  const curriculum = new CurriculumMap("BSIT", [subject("CC 101"), subject("CC 102")]);

  it("requires a retake after a failing grade", () => {
    const record = new AcademicRecord("S", curriculum, 1, [taken("CC 101", "24-1", "FAILED")]);
    assert.deepEqual(engine.auditEnrollment(record, "CC 101"), {
      subjectCode: "CC 101",
      status: "AVAILABLE",
      reasons: ["Retake required — previously failed"],
      warnings: [],
    });
  });

  it("is PENDING while the subject itself is in progress or incomplete", () => {
    const record = new AcademicRecord("S", curriculum, 1, [
      taken("CC 101", "25-1", "IN_PROGRESS"),
      taken("CC 102", "25-1", "INCOMPLETE"),
    ]);
    assert.equal(engine.auditEnrollment(record, "CC 101").status, "PENDING");
    assert.deepEqual(engine.auditEnrollment(record, "CC 101").reasons, ["Currently in progress"]);
    assert.deepEqual(engine.auditEnrollment(record, "CC 102").reasons, ["Incomplete grade"]);
  });

  it("rejects an unknown subject code", () => {
    const record = new AcademicRecord("S", curriculum, 1, []);
    assert.throws(() => engine.auditEnrollment(record, "CC 999"), { message: "Unknown subject code: CC 999" });
  });

  it("warns when a grade has no term, since the order can't be checked", () => {
    const withPrereq = new CurriculumMap("BSIT", [subject("CC 101"), subject("CC 103", { requirements: [prereq("CC 101")] })]);
    const record = new AcademicRecord("S", withPrereq, 1, [taken("CC 101", "24-1"), taken("CC 103", null)]);
    const result = engine.auditEnrollment(record, "CC 103");
    assert.equal(result.status, "COMPLETED");
    assert.deepEqual(result.warnings, ["No term recorded, so the order of its prerequisites couldn't be checked"]);
  });
});

describe("AuditEngine — prerequisites are checked by term", () => {
  const curriculum = new CurriculumMap("BSIT", [
    subject("CC 101"),
    subject("CC 103", { requirements: [prereq("CC 101")] }),
    subject("CC 107", { yearLevel: 2, requirements: [prereq("CC 103")] }),
  ]);
  const audit = (records: SubjectRecord[]) => engine.auditCurriculum(new AcademicRecord("S", curriculum, 2, records));

  it("accepts a prerequisite passed in an earlier term", () => {
    const results = audit([taken("CC 101", "24-1"), taken("CC 103", "24-2")]);
    assert.equal(statusOf(results, "CC 103")?.status, "COMPLETED");
  });

  it("gives the same result whatever order the grades were entered in", () => {
    const results = audit([taken("CC 103", "24-2"), taken("CC 101", "24-1")]);
    assert.equal(statusOf(results, "CC 103")?.status, "COMPLETED");
  });

  it("flags a prerequisite taken in the same term", () => {
    for (const records of [
      [taken("CC 101", "24-1"), taken("CC 103", "24-1")],
      [taken("CC 103", "24-1"), taken("CC 101", "24-1")],
    ]) {
      assert.deepEqual(statusOf(audit(records), "CC 103"), {
        subjectCode: "CC 103",
        status: "VIOLATION",
        reasons: ["CC 101 was taken in the same term (24-1)"],
        warnings: [],
      });
    }
  });

  it("flags a prerequisite passed only in a later term", () => {
    const results = audit([taken("CC 103", "24-1"), taken("CC 101", "24-2")]);
    assert.deepEqual(statusOf(results, "CC 103")?.reasons, ["CC 101 was passed only in 24-2"]);
  });

  it("flags a prerequisite that was never passed", () => {
    const results = audit([taken("CC 101", "24-1", "FAILED"), taken("CC 103", "24-2")]);
    assert.deepEqual(statusOf(results, "CC 103")?.reasons, ["CC 101 was not passed before 24-2"]);
  });

  it("flags a subject that is in progress while its prerequisite isn't passed", () => {
    const results = audit([taken("CC 103", "25-1", "IN_PROGRESS")]);
    assert.equal(statusOf(results, "CC 103")?.status, "VIOLATION");
  });

  it("gives no credit for a subject taken out of order, so later subjects are flagged too", () => {
    const results = audit([taken("CC 101", "24-1"), taken("CC 103", "24-1"), taken("CC 107", "24-2")]);
    assert.equal(statusOf(results, "CC 103")?.status, "VIOLATION");
    assert.deepEqual(statusOf(results, "CC 107")?.reasons, ["CC 103 doesn't count (it has to be retaken)"]);
  });

  it("doesn't let a subject taken out of order satisfy a prerequisite now", () => {
    const results = audit([taken("CC 101", "24-2"), taken("CC 103", "24-1")]);
    assert.deepEqual(statusOf(results, "CC 107"), {
      subjectCode: "CC 107",
      status: "UNAVAILABLE",
      reasons: ["CC 103"],
      warnings: [],
    });
  });

  it("clears once the subject is retaken in order", () => {
    const results = audit([taken("CC 101", "24-2"), taken("CC 103", "25-1"), taken("CC 107", "25-2")]);
    assert.deepEqual(
      results.map((r) => r.status),
      ["COMPLETED", "COMPLETED", "COMPLETED"]
    );
  });

  it("orders the midyear after the second semester and before the next school year", () => {
    assert.equal(statusOf(audit([taken("CC 101", "24-2"), taken("CC 103", "24-3")]), "CC 103")?.status, "COMPLETED");
    assert.equal(statusOf(audit([taken("CC 101", "24-3"), taken("CC 103", "25-1")]), "CC 103")?.status, "COMPLETED");
    assert.equal(statusOf(audit([taken("CC 101", "25-1"), taken("CC 103", "24-3")]), "CC 103")?.status, "VIOLATION");
  });

  it("waits while a prerequisite from an earlier term has no final grade", () => {
    const results = audit([taken("CC 101", "24-1", "IN_PROGRESS"), taken("CC 103", "24-2")]);
    assert.deepEqual(statusOf(results, "CC 103"), {
      subjectCode: "CC 103",
      status: "PENDING",
      reasons: ["CC 101 (24-1) has no final grade yet"],
      warnings: [],
    });
  });
});

describe("AuditEngine — INC", () => {
  const curriculum = new CurriculumMap("BSIT", [
    subject("CC 101"),
    subject("CC 103", { requirements: [prereq("CC 101")] }),
  ]);
  const resolved = (resolvedTerm: string): SubjectRecord => ({ ...taken("CC 101", "24-1"), resolvedTerm });
  const cc103 = (records: SubjectRecord[]) =>
    engine.auditEnrollment(new AcademicRecord("S", curriculum, 1, records), "CC 103");

  it("counts a resolved INC as passed from the term it was resolved", () => {
    assert.equal(cc103([resolved("24-2"), taken("CC 103", "24-3")]).status, "COMPLETED");
  });

  it("flags a subject taken while its prerequisite was still INC", () => {
    assert.deepEqual(cc103([resolved("25-1"), taken("CC 103", "24-2")]).reasons, [
      "CC 101 was still INC in 24-2 (resolved 25-1)",
    ]);
    assert.deepEqual(cc103([taken("CC 101", "24-1", "INCOMPLETE"), taken("CC 103", "24-2")]).reasons, [
      "CC 101 was still INC in 24-2",
    ]);
  });

  it("notes the term an INC was resolved", () => {
    const record = new AcademicRecord("S", curriculum, 1, [resolved("24-2")]);
    assert.deepEqual(engine.auditEnrollment(record, "CC 101").reasons, ["INC resolved in 24-2"]);
  });
});

describe("AuditEngine — co-requisites", () => {
  // Only CC 105 lists the co-requisite; the pair works both ways.
  const curriculum = new CurriculumMap("BSIT", [
    subject("CC 104"),
    subject("CC 105", { requirements: [coreq("CC 104")] }),
    subject("CC 106", { semester: 2, requirements: [prereq("CC 105")] }),
  ]);
  const audit = (records: SubjectRecord[]) => engine.auditCurriculum(new AcademicRecord("S", curriculum, 1, records));

  it("completes both when they are passed together", () => {
    const results = audit([taken("CC 104", "24-1"), taken("CC 105", "24-1")]);
    assert.equal(statusOf(results, "CC 104")?.status, "COMPLETED");
    assert.equal(statusOf(results, "CC 105")?.status, "COMPLETED");
    assert.equal(statusOf(results, "CC 106")?.status, "AVAILABLE");
  });

  it("requires both to be retaken when one is failed", () => {
    const results = audit([taken("CC 104", "24-1", "FAILED"), taken("CC 105", "24-1")]);
    assert.deepEqual(statusOf(results, "CC 105"), {
      subjectCode: "CC 105",
      status: "AVAILABLE",
      reasons: ["Retake together with CC 104 — co-requisites must be passed together"],
      warnings: [],
    });
    assert.deepEqual(statusOf(results, "CC 104")?.reasons, [
      "Retake required — previously failed",
      "Retake together with CC 105",
    ]);
    // The pass doesn't count, so it doesn't open up the next subject.
    assert.equal(statusOf(results, "CC 106")?.status, "UNAVAILABLE");
  });

  it("flags both when they are taken in different terms", () => {
    const results = audit([taken("CC 104", "24-1"), taken("CC 105", "24-2")]);
    assert.deepEqual(statusOf(results, "CC 105")?.reasons, ["CC 104 (co-requisite) was taken in 24-1, not 24-2"]);
    assert.deepEqual(statusOf(results, "CC 104")?.reasons, ["CC 105 (co-requisite) was taken in 24-2, not 24-1"]);
  });

  it("flags one taken without the other", () => {
    const results = audit([taken("CC 104", "24-1")]);
    assert.deepEqual(statusOf(results, "CC 104")?.reasons, ["CC 105 (co-requisite) wasn't taken in the same term"]);
    assert.deepEqual(statusOf(results, "CC 105")?.reasons, ["Take together with CC 104"]);
  });

  it("waits for the other's grade", () => {
    const results = audit([taken("CC 104", "25-1", "IN_PROGRESS"), taken("CC 105", "25-1")]);
    assert.deepEqual(statusOf(results, "CC 105")?.reasons, ["Waiting for the grade of CC 104 (co-requisite)"]);
    assert.equal(statusOf(results, "CC 106")?.status, "PENDING");
  });

  it("isn't available when the other can't be taken yet", () => {
    const withPrereq = new CurriculumMap("BSIT", [
      subject("CC 101"),
      subject("CC 104", { requirements: [prereq("CC 101")] }),
      subject("CC 105", { requirements: [coreq("CC 104")] }),
    ]);
    const result = engine.auditEnrollment(new AcademicRecord("S", withPrereq, 1, []), "CC 105");
    assert.deepEqual(result, {
      subjectCode: "CC 105",
      status: "UNAVAILABLE",
      reasons: ["CC 104 (co-requisite) can't be taken yet"],
      warnings: [],
    });
  });
});

describe("YearStandingRequirement — satisfied by any one of three conditions", () => {
  // 2 year-1 subjects, 3 year-2 subjects and the year-3 target: 6 × 3 = 18 units in total.
  const curriculum = new CurriculumMap("BSIT", [
    subject("GE 101", { yearLevel: 1 }),
    subject("GE 102", { yearLevel: 1 }),
    subject("GE 201", { yearLevel: 2 }),
    subject("GE 202", { yearLevel: 2 }),
    subject("GE 203", { yearLevel: 2 }),
    subject("CC 300", { yearLevel: 3, requirements: [new YearStandingRequirement(3)] }),
  ]);
  const cc300 = (nominalYear: number, records: SubjectRecord[]) =>
    engine.auditEnrollment(new AcademicRecord("S", curriculum, nominalYear, records), "CC 300");

  it("nominal year level alone", () => {
    assert.equal(cc300(3, []).status, "AVAILABLE");
  });

  it("all subjects of the prior years passed", () => {
    assert.equal(cc300(1, passed("GE 101", "GE 102", "GE 201", "GE 202", "GE 203")).status, "AVAILABLE");
  });

  it("exactly 50% of the curriculum's units passed", () => {
    assert.equal(cc300(1, passed("GE 101", "GE 102", "GE 201")).status, "AVAILABLE");
  });

  it("none of the three", () => {
    assert.deepEqual(cc300(1, passed("GE 101", "GE 102")), {
      subjectCode: "CC 300",
      status: "UNAVAILABLE",
      reasons: ["Third yr standing"],
      warnings: [],
    });
  });
});

describe("CompletionRequirement", () => {
  const curriculum = new CurriculumMap("BSIT", [
    subject("CC 101"),
    subject("CC 102"),
    subject("CC 128", { units: 6, yearLevel: 4, semester: 2, requirements: [new CompletionRequirement()] }),
  ]);

  it("needs every other subject passed; the practicum's own units don't count against it", () => {
    const partial = new AcademicRecord("S", curriculum, 4, passed("CC 101"));
    const full = new AcademicRecord("S", curriculum, 4, passed("CC 101", "CC 102"));
    assert.equal(engine.auditEnrollment(partial, "CC 128").status, "UNAVAILABLE");
    assert.equal(engine.auditEnrollment(full, "CC 128").status, "AVAILABLE");
  });

  it("flags the practicum when it was taken before everything else was passed", () => {
    const record = new AcademicRecord("S", curriculum, 4, [
      taken("CC 101", "26-1"),
      taken("CC 102", "26-2"),
      taken("CC 128", "26-2"),
    ]);
    assert.deepEqual(engine.auditEnrollment(record, "CC 128").reasons, [
      "All subjects completed (1 subject was not passed before 26-2)",
    ]);
  });
});
