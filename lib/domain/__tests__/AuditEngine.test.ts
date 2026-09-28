import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AuditEngine } from "../AuditEngine";
import { AcademicRecord } from "../AcademicRecord";
import { CurriculumMap } from "../CurriculumMap";
import { CoursePrerequisite } from "../requirements/CoursePrerequisite";
import { YearStandingRequirement } from "../requirements/YearStandingRequirement";
import { CompletionRequirement } from "../requirements/CompletionRequirement";
import type { Subject } from "../Subject";
import type { SubjectRecord } from "../SubjectRecord";

const engine = new AuditEngine();

function subject(code: string, overrides: Partial<Subject> = {}): Subject {
  return { code, title: code, units: 3, yearLevel: 1, semester: 1, requirements: [], ...overrides };
}

function passed(...codes: string[]): SubjectRecord[] {
  return codes.map((subjectCode) => ({ subjectCode, status: "PASSED", grade: 2.0, term: "24-1" }));
}

function statusOf(results: ReturnType<AuditEngine["auditCurriculum"]>, code: string) {
  return results.find((r) => r.subjectCode === code);
}

describe("AuditEngine — prerequisite chains", () => {
  const curriculum = new CurriculumMap("BSIT", [
    subject("CC 101"),
    subject("CC 103", { requirements: [new CoursePrerequisite("CC 101")] }),
    subject("CC 107", { yearLevel: 2, requirements: [new CoursePrerequisite("CC 104")] }),
  ]);
  const audit = engine.auditCurriculum(new AcademicRecord("23-110414", curriculum, 1, passed("CC 101")));

  it("marks a passed subject COMPLETED", () => {
    assert.deepEqual(statusOf(audit, "CC 101"), { subjectCode: "CC 101", status: "COMPLETED", reasons: [] });
  });

  it("marks a subject AVAILABLE once its prerequisite is passed", () => {
    assert.deepEqual(statusOf(audit, "CC 103"), { subjectCode: "CC 103", status: "AVAILABLE", reasons: [] });
  });

  it("marks a subject UNAVAILABLE and names the missing prerequisite", () => {
    assert.deepEqual(statusOf(audit, "CC 107"), { subjectCode: "CC 107", status: "UNAVAILABLE", reasons: ["CC 104"] });
  });
});

describe("AuditEngine — pending prerequisites", () => {
  it("is PENDING when every unmet prerequisite is in progress or incomplete", () => {
    const curriculum = new CurriculumMap("BSIT", [
      subject("CC 111"),
      subject("CC 112"),
      subject("CC 120", {
        yearLevel: 2,
        requirements: [new CoursePrerequisite("CC 111"), new CoursePrerequisite("CC 112")],
      }),
    ]);
    const record = new AcademicRecord("23-110415", curriculum, 2, [
      { subjectCode: "CC 111", status: "IN_PROGRESS", grade: null, term: "25-1" },
      { subjectCode: "CC 112", status: "INCOMPLETE", grade: null, term: "25-1" },
    ]);

    assert.deepEqual(engine.auditEnrollment(record, "CC 120"), {
      subjectCode: "CC 120",
      status: "PENDING",
      reasons: ["CC 111", "CC 112"],
    });
  });

  it("is UNAVAILABLE when one unmet prerequisite is pending but another was never taken", () => {
    const curriculum = new CurriculumMap("BSIT", [
      subject("CC 105"),
      subject("CC 108"),
      subject("CC 109"),
      subject("CC 116", {
        yearLevel: 2,
        requirements: [
          new CoursePrerequisite("CC 105"),
          new CoursePrerequisite("CC 108"),
          new CoursePrerequisite("CC 109"),
        ],
      }),
    ]);
    const record = new AcademicRecord("23-110416", curriculum, 2, [
      { subjectCode: "CC 105", status: "PASSED", grade: 1.75, term: "23-1" },
      { subjectCode: "CC 108", status: "INCOMPLETE", grade: null, term: "25-1" },
    ]);

    assert.deepEqual(engine.auditEnrollment(record, "CC 116"), {
      subjectCode: "CC 116",
      status: "UNAVAILABLE",
      reasons: ["CC 108", "CC 109"],
    });
  });
});

describe("AuditEngine — the student's own grade", () => {
  const curriculum = new CurriculumMap("BSIT", [subject("CC 101"), subject("CC 102")]);

  it("requires a retake after a failing grade", () => {
    const record = new AcademicRecord("S", curriculum, 1, [
      { subjectCode: "CC 101", status: "FAILED", grade: 5.0, term: "24-1" },
    ]);
    assert.deepEqual(engine.auditEnrollment(record, "CC 101"), {
      subjectCode: "CC 101",
      status: "AVAILABLE",
      reasons: ["Retake required — previously failed"],
    });
  });

  it("is PENDING while the subject itself is in progress or incomplete", () => {
    const record = new AcademicRecord("S", curriculum, 1, [
      { subjectCode: "CC 101", status: "IN_PROGRESS", grade: null, term: "25-1" },
      { subjectCode: "CC 102", status: "INCOMPLETE", grade: null, term: "25-1" },
    ]);
    assert.equal(engine.auditEnrollment(record, "CC 101").status, "PENDING");
    assert.deepEqual(engine.auditEnrollment(record, "CC 101").reasons, ["Currently in progress"]);
    assert.deepEqual(engine.auditEnrollment(record, "CC 102").reasons, ["Incomplete grade"]);
  });

  it("rejects an unknown subject code", () => {
    const record = new AcademicRecord("S", curriculum, 1, []);
    assert.throws(() => engine.auditEnrollment(record, "CC 999"), { message: "Unknown subject code: CC 999" });
  });
});

describe("AuditEngine — grades entered while prerequisites were unmet", () => {
  const curriculum = new CurriculumMap("BSIT", [
    subject("CC 101"),
    subject("CC 103", { requirements: [new CoursePrerequisite("CC 101")] }),
  ]);
  const invalidCc103: SubjectRecord = {
    subjectCode: "CC 103",
    status: "PASSED",
    grade: 1.5,
    term: "24-1",
    isInvalidEntry: true,
  };

  it("is a VIOLATION while the prerequisite is still unmet", () => {
    const record = new AcademicRecord("S", curriculum, 1, [invalidCc103]);
    assert.deepEqual(engine.auditEnrollment(record, "CC 103"), {
      subjectCode: "CC 103",
      status: "VIOLATION",
      reasons: ["CC 101"],
    });
  });

  it("still requires a retake after the prerequisite is later passed", () => {
    const record = new AcademicRecord("S", curriculum, 1, [...passed("CC 101"), invalidCc103]);
    assert.deepEqual(engine.auditEnrollment(record, "CC 103"), {
      subjectCode: "CC 103",
      status: "AVAILABLE",
      reasons: ["Retake required — previous attempt invalid (taken before prerequisite was satisfied)"],
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
    });
  });
});

describe("CompletionRequirement", () => {
  const curriculum = new CurriculumMap("BSIT", [
    subject("CC 101"),
    subject("CC 102"),
    subject("CAP 400", { units: 0, requirements: [new CompletionRequirement()] }),
  ]);

  it("needs every unit of the curriculum passed", () => {
    const partial = new AcademicRecord("S", curriculum, 4, passed("CC 101"));
    const full = new AcademicRecord("S", curriculum, 4, passed("CC 101", "CC 102"));
    assert.equal(engine.auditEnrollment(partial, "CAP 400").status, "UNAVAILABLE");
    assert.equal(engine.auditEnrollment(full, "CAP 400").status, "AVAILABLE");
  });
});
