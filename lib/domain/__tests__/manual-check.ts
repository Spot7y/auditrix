import { AuditEngine } from "../AuditEngine";
import { AcademicRecord } from "../AcademicRecord";
import { CurriculumMap } from "../CurriculumMap";
import { Student } from "../Student";
import { CoursePrerequisite } from "../requirements/CoursePrerequisite";
import { YearStandingRequirement } from "../requirements/YearStandingRequirement";
import type { Subject } from "../Subject";
import type { SubjectRecord } from "../SubjectRecord";

const engine = new AuditEngine();

function subject(code: string, overrides: Partial<Subject> = {}): Subject {
  return {
    code,
    title: code,
    units: 3,
    yearLevel: 1,
    semester: 1,
    requirements: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------
// Scenario 1: basic chain — COMPLETED / VALIDATED / VIOLATED
// ---------------------------------------------------------------------
{
  const subjects: Subject[] = [
    subject("CC 101"),
    subject("CC 103", { requirements: [new CoursePrerequisite("CC 101")] }),
    subject("CC 107", { yearLevel: 2, requirements: [new CoursePrerequisite("CC 104")] }),
  ];
  const curriculum = new CurriculumMap("BSIT", subjects);
  const records: SubjectRecord[] = [
    { subjectCode: "CC 101", status: "PASSED", grade: 2.0, term: "23-1" },
  ];
  const record = new AcademicRecord("23-110414", curriculum, 1, records);
  const student = new Student("23-110414", "Test Student", "BSIT", record);

  console.log("Scenario 1 — basic chain:");
  console.log(engine.auditCurriculum(student.academicRecord));
}

// ---------------------------------------------------------------------
// Scenario 2: pure PENDING — every unmet requirement is incomplete/in-progress
// ---------------------------------------------------------------------
{
  const subjects: Subject[] = [
    subject("CC 111"),
    subject("CC 112"),
    subject("CC 120", {
      yearLevel: 2,
      requirements: [new CoursePrerequisite("CC 111"), new CoursePrerequisite("CC 112")],
    }),
  ];
  const curriculum = new CurriculumMap("BSIT", subjects);
  const records: SubjectRecord[] = [
    { subjectCode: "CC 111", status: "IN_PROGRESS", grade: null, term: "25-1" },
    { subjectCode: "CC 112", status: "INCOMPLETE", grade: null, term: "25-1" },
  ];
  const record = new AcademicRecord("23-110415", curriculum, 2, records);
  const student = new Student("23-110415", "Test Student 2", "BSIT", record);

  console.log("\nScenario 2 — pure pending (CC 120):");
  console.log(engine.auditCurriculum(student.academicRecord));
}

// ---------------------------------------------------------------------
// Scenario 3: mixed — one pending + one violated requirement should
// still resolve to VIOLATED overall (a real violation always wins)
// ---------------------------------------------------------------------
{
  const subjects: Subject[] = [
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
  ];
  const curriculum = new CurriculumMap("BSIT", subjects);
  const records: SubjectRecord[] = [
    { subjectCode: "CC 105", status: "PASSED", grade: 1.75, term: "23-1" },
    { subjectCode: "CC 108", status: "INCOMPLETE", grade: null, term: "25-1" },
    // CC 109 never taken at all
  ];
  const record = new AcademicRecord("23-110416", curriculum, 2, records);
  const student = new Student("23-110416", "Test Student 3", "BSIT", record);

  console.log("\nScenario 3 — mixed pending + violated (CC 116):");
  console.log(engine.auditCurriculum(student.academicRecord));
}

// ---------------------------------------------------------------------
// Scenario 4: YearStandingRequirement — each OR-condition tested,
// including a genuine failure case
// ---------------------------------------------------------------------
{
  // 2 year-1 subjects, 3 year-2 subjects, 1 target year-3 subject — 6 x 3 units = 18 total
  const subjects: Subject[] = [
    subject("GE 101", { yearLevel: 1 }),
    subject("GE 102", { yearLevel: 1 }),
    subject("GE 201", { yearLevel: 2 }),
    subject("GE 202", { yearLevel: 2 }),
    subject("GE 203", { yearLevel: 2 }),
    subject("CC 300", { yearLevel: 3, requirements: [new YearStandingRequirement(3)] }),
  ];
  const curriculum = new CurriculumMap("BSIT", subjects);

  // 4a — nominal year level alone (registrar says 3rd year, nothing passed)
  const studentA = new Student("A", "Nominal Level", "BSIT", new AcademicRecord("A", curriculum, 3, []));

  // 4b — all prior years completed (nominal level still 1)
  const recordsB: SubjectRecord[] = [
    "GE 101", "GE 102", "GE 201", "GE 202", "GE 203",
  ].map((code) => ({ subjectCode: code, status: "PASSED", grade: 2.0, term: "24-1" }));
  const studentB = new Student("B", "Prior Years Done", "BSIT", new AcademicRecord("B", curriculum, 1, recordsB));

  // 4c — exactly 50% of units (9 of 18), prior years NOT all complete — isolates the percentage condition
  const recordsC: SubjectRecord[] = ["GE 101", "GE 102", "GE 201"].map((code) => ({
    subjectCode: code, status: "PASSED", grade: 2.0, term: "24-1",
  }));
  const studentC = new Student("C", "Exactly 50 Percent", "BSIT", new AcademicRecord("C", curriculum, 1, recordsC));

  // 4d — none of the three conditions hold: should genuinely VIOLATE
  const studentD = new Student("D", "No Standing Yet", "BSIT", new AcademicRecord("D", curriculum, 1, []));

  console.log("\nScenario 4a — nominal level satisfies:");
  console.log(engine.auditEnrollment(studentA.academicRecord, "CC 300"));

  console.log("\nScenario 4b — prior years completed satisfies:");
  console.log(engine.auditEnrollment(studentB.academicRecord, "CC 300"));

  console.log("\nScenario 4c — exactly 50% units satisfies:");
  console.log(engine.auditEnrollment(studentC.academicRecord, "CC 300"));

  console.log("\nScenario 4d — none satisfy, expect VIOLATED:");
  console.log(engine.auditEnrollment(studentD.academicRecord, "CC 300"));
}