import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AcademicRecord } from "../AcademicRecord";
import { CurriculumMap } from "../CurriculumMap";
import { CoursePrerequisite } from "../requirements/CoursePrerequisite";
import { GradeValidator } from "../import/GradeValidator";
import { GradeEntryService } from "../import/GradeEntryService";
import { InMemoryAcademicRecordRepository } from "../import/InMemoryAcademicRecordRepository";
import type { Subject } from "../Subject";

describe("GradeValidator — KSU grade values", () => {
  const validator = new GradeValidator();

  for (const value of [1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0]) {
    it(`accepts ${value} as passing`, () => {
      assert.deepEqual(validator.validate({ kind: "numeric", value }), { valid: true, status: "PASSED", grade: value });
    });
  }

  it("accepts 5.0 as failing", () => {
    assert.deepEqual(validator.validate({ kind: "numeric", value: 5.0 }), {
      valid: true,
      status: "FAILED",
      grade: 5.0,
    });
  });

  for (const value of [4.0, 3.5, 0, 7.5, 1.1]) {
    it(`rejects ${value}, which is not a KSU grade`, () => {
      assert.deepEqual(validator.validate({ kind: "numeric", value }), {
        valid: false,
        reason: `${value} is not a valid KSU grade value.`,
      });
    });
  }

  it("accepts INC and in-progress without a numeric grade", () => {
    assert.deepEqual(validator.validate({ kind: "incomplete" }), { valid: true, status: "INCOMPLETE", grade: null });
    assert.deepEqual(validator.validate({ kind: "in_progress" }), { valid: true, status: "IN_PROGRESS", grade: null });
  });
});

describe("GradeEntryService — submitting a term's grades", () => {
  function setup() {
    const subjects: Subject[] = [
      { code: "CC 101", title: "Intro to Computing", units: 3, yearLevel: 1, semester: 1, requirements: [] },
      {
        code: "CC 103",
        title: "Introduction to HCI",
        units: 3,
        yearLevel: 1,
        semester: 2,
        requirements: [new CoursePrerequisite("CC 101")],
      },
    ];
    const curriculum = new CurriculumMap("BSIT", subjects);
    const record = new AcademicRecord("23-110414", curriculum, 1, []);
    const repository = new InMemoryAcademicRecordRepository([record]);
    return { curriculum, record, service: new GradeEntryService(repository) };
  }

  it("accepts valid rows and reports each rejected row with its reason", async () => {
    const { curriculum, service } = setup();
    const result = await service.submit(
      {
        studentId: "23-110414",
        term: "23-1",
        entries: [
          { subjectCode: "cc 101", input: { kind: "numeric", value: 1.5 } },
          { subjectCode: "CC 999", input: { kind: "numeric", value: 2.0 } },
          { subjectCode: "CC 103", input: { kind: "numeric", value: 7.5 } },
        ],
      },
      curriculum,
      "test-chairperson"
    );

    assert.deepEqual(result.rows, [
      { accepted: true, subjectCode: "CC 101" },
      { accepted: false, rawCode: "CC 999", reason: 'No subject in BSIT matches "CC 999"' },
      { accepted: false, rawCode: "CC 103", reason: "7.5 is not a valid KSU grade value." },
    ]);
    // The audit is recomputed after the batch: CC 101 is done, which opens up CC 103.
    assert.deepEqual(
      result.audit.map((a) => [a.subjectCode, a.status]),
      [
        ["CC 101", "COMPLETED"],
        ["CC 103", "AVAILABLE"],
      ]
    );
  });

  const grade = (subjectCode: string, value: number) => ({ subjectCode, input: { kind: "numeric" as const, value } });
  const statusIn = (result: { audit: { subjectCode: string; status: string }[] }, code: string) =>
    result.audit.find((a) => a.subjectCode === code)?.status;

  it("flags a subject taken before its prerequisite was passed", async () => {
    const { curriculum, service } = setup();
    const result = await service.submit(
      { studentId: "23-110414", term: "23-2", entries: [grade("CC 103", 2.0)] },
      curriculum,
      "test-chairperson"
    );

    assert.equal(statusIn(result, "CC 103"), "VIOLATION");
  });

  it("flags a prerequisite taken in the same term, whatever order the rows are in", async () => {
    for (const entries of [
      [grade("CC 101", 1.75), grade("CC 103", 2.0)],
      [grade("CC 103", 2.0), grade("CC 101", 1.75)],
    ]) {
      const { curriculum, service } = setup();
      const result = await service.submit({ studentId: "23-110414", term: "23-1", entries }, curriculum, "test-chairperson");
      assert.equal(statusIn(result, "CC 103"), "VIOLATION");
    }
  });

  it("accepts grades entered in any order of terms", async () => {
    const { curriculum, service } = setup();
    await service.submit({ studentId: "23-110414", term: "23-2", entries: [grade("CC 103", 2.0)] }, curriculum, "chair");
    const result = await service.submit(
      { studentId: "23-110414", term: "23-1", entries: [grade("CC 101", 1.5)] },
      curriculum,
      "chair"
    );
    assert.equal(statusIn(result, "CC 103"), "COMPLETED");
  });

  it("keeps a violation when the grade is saved again", async () => {
    const { curriculum, service } = setup();
    await service.submit({ studentId: "23-110414", term: "23-1", entries: [grade("CC 103", 2.0)] }, curriculum, "chair");
    await service.submit({ studentId: "23-110414", term: "23-2", entries: [grade("CC 101", 1.5)] }, curriculum, "chair");
    // Correcting CC 103's grade in the term it was taken doesn't clear the violation.
    const result = await service.submit(
      { studentId: "23-110414", term: "23-1", entries: [grade("CC 103", 1.75)] },
      curriculum,
      "chair"
    );
    assert.equal(statusIn(result, "CC 103"), "VIOLATION");
  });

  it("completes an INC in its original term and records when it was resolved", async () => {
    const { curriculum, record, service } = setup();
    await service.submit(
      { studentId: "23-110414", term: "23-1", entries: [{ subjectCode: "CC 101", input: { kind: "incomplete" } }] },
      curriculum,
      "chair"
    );
    const result = await service.submit(
      { studentId: "23-110414", term: "23-2", entries: [grade("CC 101", 2.0)] },
      curriculum,
      "chair"
    );

    assert.deepEqual(result.rows, [{ accepted: true, subjectCode: "CC 101", resolvedFrom: "23-1" }]);
    assert.deepEqual(record.recordOf("CC 101"), {
      subjectCode: "CC 101",
      status: "PASSED",
      grade: 2.0,
      term: "23-1",
      resolvedTerm: "23-2",
    });
  });

  it("won't resolve an INC in a term before it was given", async () => {
    const { curriculum, record, service } = setup();
    await service.submit(
      { studentId: "23-110414", term: "23-2", entries: [{ subjectCode: "CC 101", input: { kind: "incomplete" } }] },
      curriculum,
      "chair"
    );
    const result = await service.submit(
      { studentId: "23-110414", term: "23-1", entries: [grade("CC 101", 2.0)] },
      curriculum,
      "chair"
    );

    assert.deepEqual(result.rows, [
      {
        accepted: false,
        rawCode: "CC 101",
        reason: "The INC for CC 101 was given in 23-2, so it can't be resolved in an earlier term (23-1).",
      },
    ]);
    assert.equal(record.statusOf("CC 101"), "INCOMPLETE");
  });

  it("won't let a grade from an earlier term replace a later one", async () => {
    const { curriculum, record, service } = setup();
    await service.submit({ studentId: "23-110414", term: "24-1", entries: [grade("CC 101", 1.5)] }, curriculum, "chair");
    const result = await service.submit(
      { studentId: "23-110414", term: "23-1", entries: [grade("CC 101", 5.0)] },
      curriculum,
      "chair"
    );

    assert.deepEqual(result.rows, [
      {
        accepted: false,
        rawCode: "CC 101",
        reason:
          "CC 101 already has a grade from 24-1, a later term than 23-1. Only the latest attempt is kept, so it wasn't replaced. If 24-1 was entered by mistake, save again and confirm the correction.",
      },
    ]);
    assert.deepEqual([record.statusOf("CC 101"), record.recordOf("CC 101")?.term], ["PASSED", "24-1"]);
  });

  it("replaces a later-term grade when confirmed as a correction", async () => {
    const { curriculum, record, service } = setup();
    await service.submit({ studentId: "23-110414", term: "24-1", entries: [grade("CC 101", 1.5)] }, curriculum, "chair");
    const result = await service.submit(
      { studentId: "23-110414", term: "23-1", entries: [grade("CC 101", 1.5)], replaceLaterTerm: ["CC 101"] },
      curriculum,
      "chair"
    );

    assert.deepEqual(result.rows, [{ accepted: true, subjectCode: "CC 101" }]);
    assert.equal(record.recordOf("CC 101")?.term, "23-1");
  });

  it("still takes a correction in the same term and a retake in a later one", async () => {
    const { curriculum, record, service } = setup();
    await service.submit({ studentId: "23-110414", term: "23-1", entries: [grade("CC 101", 5.0)] }, curriculum, "chair");
    await service.submit({ studentId: "23-110414", term: "23-1", entries: [grade("CC 101", 3.0)] }, curriculum, "chair");
    assert.equal(record.gradeOf("CC 101"), 3.0);
    await service.submit({ studentId: "23-110414", term: "23-2", entries: [grade("CC 101", 1.75)] }, curriculum, "chair");
    assert.deepEqual([record.gradeOf("CC 101"), record.recordOf("CC 101")?.term], [1.75, "23-2"]);
  });

  it("rejects a malformed term", async () => {
    const { curriculum, service } = setup();
    await assert.rejects(
      service.submit({ studentId: "23-110414", term: "2023-1", entries: [grade("CC 101", 2.0)] }, curriculum, "chair"),
      { message: "Invalid term: 2023-1" }
    );
  });

  it("returns no audit when nothing was accepted", async () => {
    const { curriculum, service } = setup();
    const result = await service.submit(
      {
        studentId: "23-110414",
        term: "23-1",
        entries: [{ subjectCode: "XX 1", input: { kind: "numeric", value: 2.0 } }],
      },
      curriculum,
      "test-chairperson"
    );
    assert.deepEqual(result.audit, []);
  });
});
