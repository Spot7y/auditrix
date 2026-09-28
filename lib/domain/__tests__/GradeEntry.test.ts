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

  it("flags a grade entered before its prerequisite was passed, permanently", async () => {
    const { curriculum, record, service } = setup();
    const result = await service.submit(
      {
        studentId: "23-110414",
        term: "23-2",
        entries: [{ subjectCode: "CC 103", input: { kind: "numeric", value: 2.0 } }],
      },
      curriculum,
      "test-chairperson"
    );

    assert.equal(record.isInvalidEntry("CC 103"), true);
    assert.equal(result.audit.find((a) => a.subjectCode === "CC 103")?.status, "VIOLATION");
  });

  it("counts a prerequisite passed earlier in the same batch", async () => {
    const { curriculum, record, service } = setup();
    await service.submit(
      {
        studentId: "23-110414",
        term: "23-1",
        entries: [
          { subjectCode: "CC 101", input: { kind: "numeric", value: 1.75 } },
          { subjectCode: "CC 103", input: { kind: "numeric", value: 2.0 } },
        ],
      },
      curriculum,
      "test-chairperson"
    );

    assert.equal(record.isInvalidEntry("CC 103"), false);
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
