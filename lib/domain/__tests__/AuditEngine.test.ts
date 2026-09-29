import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AuditEngine } from "../AuditEngine";
import { AcademicRecord } from "../AcademicRecord";
import { CurriculumMap } from "../CurriculumMap";
import { CoursePrerequisite } from "../requirements/CoursePrerequisite";
import { YearStandingRequirement, meetsUnitThreshold } from "../requirements/YearStandingRequirement";
import { CompletionRequirement } from "../requirements/CompletionRequirement";
import type { Subject } from "../Subject";
import type { SubjectRecord, SubjectRecordStatus } from "../SubjectRecord";
import type { YearLevelEntry } from "../yearLevels";

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

describe("YearStandingRequirement — the year level the student has reached", () => {
  // 2 year-1 subjects, 3 year-2 subjects and the year-3 target: 6 × 3 = 18 units in total.
  const curriculum = new CurriculumMap("BSIT", [
    subject("GE 101", { yearLevel: 1 }),
    subject("GE 102", { yearLevel: 1 }),
    subject("GE 201", { yearLevel: 2 }),
    subject("GE 202", { yearLevel: 2 }),
    subject("GE 203", { yearLevel: 2 }),
    subject("CC 300", { yearLevel: 3, requirements: [new YearStandingRequirement(3)] }),
  ]);
  const cc300 = (registeredYear: number, records: SubjectRecord[]) =>
    engine.auditEnrollment(new AcademicRecord("S", curriculum, registeredYear, records), "CC 300");

  it("the year level the student was registered at", () => {
    assert.equal(cc300(3, []).status, "AVAILABLE");
  });

  it("all subjects of the prior years passed", () => {
    assert.equal(cc300(1, passed("GE 101", "GE 102", "GE 201", "GE 202", "GE 203")).status, "AVAILABLE");
  });

  it("more than 50% of the curriculum's units passed", () => {
    // 4 of 6 subjects: 67%.
    assert.equal(cc300(1, passed("GE 101", "GE 102", "GE 201", "GE 202")).status, "AVAILABLE");
  });

  it("exactly 50% isn't enough for Junior standing", () => {
    assert.equal(cc300(1, passed("GE 101", "GE 102", "GE 201")).status, "UNAVAILABLE");
  });

  it("none of the three", () => {
    assert.deepEqual(cc300(1, passed("GE 101", "GE 102")), {
      subjectCode: "CC 300",
      status: "UNAVAILABLE",
      reasons: ["Third yr standing"],
      warnings: [],
    });
  });

  it("uses the handbook's thresholds: Sophomore 25%, Junior over 50%, Senior 75%", () => {
    assert.equal(meetsUnitThreshold(2, 24.9), false);
    assert.equal(meetsUnitThreshold(2, 25), true);
    assert.equal(meetsUnitThreshold(3, 50), false);
    assert.equal(meetsUnitThreshold(3, 50.1), true);
    assert.equal(meetsUnitThreshold(4, 74.9), false);
    assert.equal(meetsUnitThreshold(4, 75), true);
  });
});

describe("YearStandingRequirement — as of the term the subject was taken", () => {
  // Same 18-unit curriculum: CC 300 needs Third yr standing.
  const curriculum = new CurriculumMap("BSIT", [
    subject("GE 101", { yearLevel: 1 }),
    subject("GE 102", { yearLevel: 1 }),
    subject("GE 201", { yearLevel: 2 }),
    subject("GE 202", { yearLevel: 2 }),
    subject("GE 203", { yearLevel: 2 }),
    subject("CC 300", { yearLevel: 3, requirements: [new YearStandingRequirement(3)] }),
  ]);
  const cc300 = (registeredYear: number, records: SubjectRecord[], history: YearLevelEntry[] = []) =>
    engine.auditEnrollment(new AcademicRecord("S", curriculum, registeredYear, records, history), "CC 300");
  const registered = (term: string, yearLevel: number): YearLevelEntry => ({ term, yearLevel, source: "REGISTERED" });
  const byHand = (term: string, yearLevel: number | null): YearLevelEntry => ({ term, yearLevel, source: "CHAIRPERSON" });
  const firstTwoYears = [
    taken("GE 101", "24-1"),
    taken("GE 102", "24-1"),
    taken("GE 201", "25-1"),
    taken("GE 202", "25-1"),
  ];

  it("accepts the year level a student was registered at, from that term", () => {
    const result = cc300(3, [taken("CC 300", "26-1")], [registered("26-1", 3)]);
    assert.equal(result.status, "COMPLETED");
    assert.deepEqual(result.warnings, []);
  });

  it("accepts a year level set by hand for that term", () => {
    const result = cc300(1, [taken("CC 300", "26-1")], [registered("24-1", 1), byHand("25-2", 3)]);
    assert.equal(result.status, "COMPLETED");
  });

  it("is a violation when the recorded year level and the grades both fall short", () => {
    const result = cc300(1, [taken("GE 101", "24-1"), taken("CC 300", "25-1")], [registered("24-1", 1)]);
    assert.deepEqual(result.reasons, ["Third yr standing in 25-1"]);
    assert.equal(result.status, "VIOLATION");
  });

  it("accepts enough units passed before that term, whatever the registered level", () => {
    const result = cc300(1, [...firstTwoYears, taken("CC 300", "25-2")], [registered("24-1", 1)]);
    assert.equal(result.status, "COMPLETED");
  });

  it("doesn't count units passed in the same term or later", () => {
    const result = cc300(1, [...firstTwoYears, taken("CC 300", "25-1")], [registered("24-1", 1)]);
    assert.equal(result.status, "VIOLATION");
  });

  it("asks to verify, rather than flagging, when nothing is recorded for that term", () => {
    // Registered at 3rd year, but not when: that says nothing about 25-1.
    const result = cc300(3, [taken("GE 101", "24-1"), taken("CC 300", "25-1")]);
    assert.deepEqual(result, {
      subjectCode: "CC 300",
      status: "COMPLETED",
      reasons: [],
      warnings: ["Year standing: please verify (Third yr standing in 25-1; no year level is recorded for that term)"],
    });
  });

  it("credits a later subject that builds on one checked by units", () => {
    const withNext = new CurriculumMap("BSIT", [
      ...curriculum.allSubjects(),
      subject("CC 310", { yearLevel: 3, requirements: [prereq("CC 300")] }),
    ]);
    const record = new AcademicRecord("S", withNext, 3, [
      ...firstTwoYears,
      taken("CC 300", "25-2"),
      taken("CC 310", "26-1"),
    ]);
    const results = engine.auditCurriculum(record);
    assert.equal(statusOf(results, "CC 300")?.status, "COMPLETED");
    assert.equal(statusOf(results, "CC 310")?.status, "COMPLETED");
  });

  it("follows a year level set by hand, until it's set back to automatic", () => {
    assert.equal(cc300(1, [], [registered("24-1", 1), byHand("25-1", 3)]).status, "AVAILABLE");
    assert.equal(cc300(1, [], [registered("24-1", 1), byHand("25-1", 3), byHand("25-2", null)]).status, "UNAVAILABLE");
  });
});

describe("Year level — from what the student has finished", () => {
  // 18 units: two 1st-year subjects, three 2nd-year, one 3rd-year.
  const curriculum = new CurriculumMap("BSIT", [
    subject("GE 101", { yearLevel: 1 }),
    subject("GE 102", { yearLevel: 1 }),
    subject("GE 201", { yearLevel: 2 }),
    subject("GE 202", { yearLevel: 2 }),
    subject("GE 203", { yearLevel: 2 }),
    subject("CC 300", { yearLevel: 3 }),
  ]);
  const level = (records: SubjectRecord[], currentTerm: string | null, registeredYear = 1, history: YearLevelEntry[] = []) =>
    engine.yearLevel(new AcademicRecord("S", curriculum, registeredYear, records, history), currentTerm);

  it("starts at 1st year", () => {
    assert.deepEqual(level([], "25-1"), { level: 1, basis: "GRADES", known: true });
  });

  it("moves up with the share of units passed", () => {
    const twoSubjects = [taken("GE 101", "24-1"), taken("GE 102", "24-1")]; // 33%
    assert.equal(level(twoSubjects, "24-2").level, 2);
    const fourSubjects = [...twoSubjects, taken("GE 201", "24-2"), taken("GE 202", "24-2")]; // 67%
    assert.equal(level(fourSubjects, "25-1").level, 3);
    const fiveSubjects = [...fourSubjects, taken("GE 203", "25-1")]; // 83%
    assert.equal(level(fiveSubjects, "25-2").level, 4);
  });

  it("moves up once every earlier year's subject is passed, even with fewer units", () => {
    const heavy = new CurriculumMap("BSIT", [
      subject("GE 101", { yearLevel: 1, units: 1 }),
      subject("CC 201", { yearLevel: 2, units: 10 }),
      subject("CC 301", { yearLevel: 3, units: 10 }),
    ]);
    const record = new AcademicRecord("S", heavy, 1, [taken("GE 101", "24-1")]); // 1 of 21 units
    assert.equal(engine.yearLevel(record, "24-2").level, 2);
  });

  it("counts only what was passed before the current semester", () => {
    const twoSubjects = [taken("GE 101", "25-1"), taken("GE 102", "25-1")];
    assert.equal(level(twoSubjects, "25-1").level, 1);
    assert.equal(level(twoSubjects, "25-2").level, 2);
  });

  it("doesn't count failed subjects or subjects taken out of order", () => {
    const withPrereq = new CurriculumMap("BSIT", [
      subject("GE 101", { yearLevel: 1 }),
      subject("GE 102", { yearLevel: 1, requirements: [prereq("GE 101")] }),
      subject("GE 201", { yearLevel: 2 }),
      subject("GE 202", { yearLevel: 2 }),
    ]);
    const record = new AcademicRecord("S", withPrereq, 1, [
      taken("GE 101", "24-1", "FAILED"),
      taken("GE 102", "24-1"),
    ]);
    assert.equal(engine.yearLevel(record, "25-1").level, 1);
  });

  it("keeps the registered year level until the grades show more", () => {
    assert.deepEqual(level([], "25-1", 3), { level: 3, basis: "REGISTERED", known: true });
    const passedMost = ["GE 101", "GE 102", "GE 201", "GE 202", "GE 203"].map((c) => taken(c, "24-1"));
    assert.deepEqual(level(passedMost, "25-1", 3), { level: 4, basis: "GRADES", known: true });
  });

  it("uses a year level set by hand, higher or lower, until it's set back to automatic", () => {
    const passedMost = ["GE 101", "GE 102", "GE 201", "GE 202", "GE 203"].map((c) => taken(c, "24-1"));
    const override: YearLevelEntry = { term: "25-1", yearLevel: 2, source: "CHAIRPERSON" };
    assert.deepEqual(level(passedMost, "25-1", 1, [override]), { level: 2, basis: "CHAIRPERSON", known: true });
    const back: YearLevelEntry = { term: "25-2", yearLevel: null, source: "CHAIRPERSON" };
    assert.equal(level(passedMost, "25-2", 1, [override, back]).level, 4);
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
