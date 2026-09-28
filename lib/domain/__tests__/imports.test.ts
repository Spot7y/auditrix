import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { findMatchingCode, normalizeCode } from "../import/codeMatching";
import { parseSubjectsCsv, planCurriculumImport, type ExistingSubject } from "../import/curriculumImport";
import { isValidStudentId, normalizeStudentId } from "../studentId";

describe("subject code matching", () => {
  const candidates = [{ code: "CPE 400" }, { code: "CC 101" }];

  it("normalizes case and spacing", () => {
    assert.equal(normalizeCode("  cc   101 "), "CC 101");
  });

  it("matches exactly, then ignoring spaces", () => {
    assert.deepEqual(findMatchingCode("cc 101", candidates), { code: "CC 101" });
    assert.deepEqual(findMatchingCode("CPE400", candidates), { code: "CPE 400" });
  });

  it("never guesses between two possible matches", () => {
    assert.equal(findMatchingCode("AB12", [{ code: "AB 12" }, { code: "A B12" }]), null);
    assert.equal(findMatchingCode("CC 999", candidates), null);
  });
});

describe("student ID numbers", () => {
  for (const id of ["24-113792", "23-19991", "25-123456"]) {
    it(`accepts ${id}`, () => {
      assert.equal(isValidStudentId(id), true);
    });
  }

  for (const id of ["23-1", "2024-113792", "24113792", "24-1137925", "ab-12345", ""]) {
    it(`rejects ${id}`, () => {
      assert.equal(isValidStudentId(id), false);
    });
  }

  it("removes stray spaces", () => {
    assert.equal(normalizeStudentId(" 24 - 113792 "), "24-113792");
  });
});

describe("curriculum CSV parsing", () => {
  const header = "code,title,units,year_level,semester,prerequisite";

  it("reads subjects, prerequisites and year standing", () => {
    const result = parseSubjectsCsv(
      [header, "CC 101,Intro,3,1,1,", 'cc  103,"HCI, Intro",3,1,2,CC 101;2nd Yr Standing'].join("\n")
    );
    assert.deepEqual(result, {
      warnings: [],
      subjects: [
        { code: "CC 101", title: "Intro", units: 3, yearLevel: 1, semester: 1, requirements: [] },
        {
          code: "CC 103",
          title: "HCI, Intro",
          units: 3,
          yearLevel: 1,
          semester: 2,
          requirements: [
            { kind: "code", code: "CC 101" },
            { kind: "year_standing", level: 2 },
          ],
        },
      ],
    });
  });

  it("skips unreadable and repeated rows with a note", () => {
    const result = parseSubjectsCsv(
      [header, "CC 101,Intro,3,1,1,", ",No code,3,1,1,", "CC 101,Again,3,1,1,"].join("\n")
    );
    assert.deepEqual("warnings" in result && result.warnings, [
      "Row 3: missing or invalid data, skipped.",
      "Row 4: CC 101 appears more than once in the file, skipped.",
    ]);
  });

  it("rejects an empty file", () => {
    assert.deepEqual(parseSubjectsCsv(header), { error: "File appears to be empty." });
  });
});

describe("curriculum import plan (what the preview shows)", () => {
  const existing: ExistingSubject[] = [
    { id: "1", code: "CC 101", title: "Intro", units: 3, year_level: 1, semester: 1 },
    { id: "2", code: "CC 102", title: "Programming 1", units: 3, year_level: 1, semester: 2 },
    { id: "3", code: "OLD 2", title: "Old", units: 3, year_level: 1, semester: 1 },
    { id: "4", code: "OLD 3", title: "Old graded", units: 3, year_level: 1, semester: 1 },
  ];
  const existingRequirements = [
    { subject_id: "2", type: "PREREQUISITE", required_subject_id: "1", required_year_level: null },
    { subject_id: "2", type: "PREREQUISITE", required_subject_id: "3", required_year_level: null },
  ];
  const parsed = parseSubjectsCsv(
    [
      "code,title,units,year_level,semester,prerequisite",
      "CC 101,Intro,3,1,1,",
      "CC 102,Programming 1 (renamed),3,1,2,CC 101",
      "NEW 1,New,3,2,1,CC102;BOGUS 9",
    ].join("\n")
  );
  if ("error" in parsed) throw new Error(parsed.error);
  const plan = planCurriculumImport(parsed.subjects, existing, existingRequirements, new Set(["4"]));

  it("lists added, changed and unchanged subjects", () => {
    assert.deepEqual(plan.added, ["NEW 1"]);
    assert.deepEqual(plan.changed, [
      {
        code: "CC 102",
        changes: ['title "Programming 1" → "Programming 1 (renamed)"', "prerequisites CC 101, OLD 2 → CC 101"],
      },
    ]);
    assert.equal(plan.unchangedCount, 1);
  });

  it("removes subjects missing from the file, except those with student grades", () => {
    assert.deepEqual(
      plan.removed.map((s) => s.code),
      ["OLD 2"]
    );
    assert.deepEqual(plan.keptWithGrades, ["OLD 3"]);
  });

  it("reports prerequisites that don't exist", () => {
    assert.deepEqual(plan.warnings, ['NEW 1: prerequisite "BOGUS 9" not found, skipped.']);
  });
});
