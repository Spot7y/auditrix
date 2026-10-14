import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_SUBJECT_UNITS,
  NAME_MAX_LENGTH,
  nameProblem,
  normalizeName,
  normalizeProgramCode,
  programCodeProblem,
  subjectProblem,
} from "../names";
import { prerequisiteProblem, type PrerequisiteLinks } from "../requirements/prerequisiteLinks";
import { gradeTermProblem, oldTermNote, schoolYearStart } from "../Term";
import { parseSubjectsCsv, planCurriculumImport } from "../import/curriculumImport";

describe("names", () => {
  it("tidies spaces", () => {
    assert.equal(normalizeName("  dela Cruz,   Juan \t Santos "), "dela Cruz, Juan Santos");
  });

  it("refuses an empty or very long name", () => {
    assert.equal(nameProblem(normalizeName("    ")), "Enter a name.");
    assert.match(nameProblem("X".repeat(NAME_MAX_LENGTH + 1))!, /at most/);
    assert.equal(nameProblem("Dela Cruz, Juan"), null);
  });

  it("accepts program codes of letters and numbers only", () => {
    assert.equal(normalizeProgramCode(" bsce "), "BSCE");
    for (const ok of ["BSCE", "BSED-MATH", "BS MATH", "BSIT2"]) assert.equal(programCodeProblem(ok), null, ok);
    for (const bad of ["BS IT!", "BS--IT", "-BSIT", "", "A".repeat(21)]) assert.notEqual(programCodeProblem(bad), null, bad);
  });

  it("checks a subject's code, title and units", () => {
    assert.equal(subjectProblem({ code: "CC 101", title: "Intro", units: 3 }), null);
    assert.equal(subjectProblem({ code: "CC 101", title: "", units: 3 }), "Enter the subject title.");
    assert.match(subjectProblem({ code: "CC 101", title: "Intro", units: MAX_SUBJECT_UNITS + 1 })!, /Units must be/);
    assert.match(subjectProblem({ code: "CC 101", title: "Intro", units: -1 })!, /Units must be/);
  });
});

describe("prerequisite links", () => {
  const links: PrerequisiteLinks = new Map([
    ["CC 102", ["CC 101"]],
    ["CC 201", ["CC 102"]],
  ]);

  it("refuses a subject requiring itself", () => {
    assert.match(prerequisiteProblem("CC 101", "CC 101", links)!, /own prerequisite/);
  });

  it("refuses the same requirement twice", () => {
    assert.match(prerequisiteProblem("CC 102", "CC 101", links, { existing: ["CC 101"] })!, /already a requirement/);
  });

  it("refuses a loop, naming the chain", () => {
    assert.equal(
      prerequisiteProblem("CC 101", "CC 201", links),
      "CC 201 needs CC 102 needs CC 101, so CC 101 can’t also need CC 201: none of them could ever be taken."
    );
  });

  it("allows an ordinary prerequisite and paired co-requisites", () => {
    assert.equal(prerequisiteProblem("CC 201", "CC 101", links), null);
    assert.equal(prerequisiteProblem("CC 101", "CC 102", links, { corequisite: true }), null);
  });
});

describe("grade terms", () => {
  it("refuses a term after the current semester", () => {
    assert.match(gradeTermProblem("99-1", "26-1")!, /after the current semester/);
    assert.match(gradeTermProblem("26-2", "26-1")!, /after the current semester/);
    assert.equal(gradeTermProblem("26-1", "26-1"), null);
    assert.equal(gradeTermProblem("26-S", "26-1"), null); // the midyear comes before 26-1
    assert.equal(gradeTermProblem("99-1", null), null);
  });

  it("notes a term many school years back", () => {
    assert.equal(schoolYearStart("26-S"), 2025);
    assert.match(oldTermNote("02-1", "26-1")!, /24 school years ago/);
    assert.equal(oldTermNote("20-1", "26-1"), null);
  });
});

describe("curriculum import prerequisites", () => {
  it("skips a subject requiring itself, a repeat, and a loop", () => {
    const parsed = parseSubjectsCsv(
      [
        "code,title,units,year_level,semester,prerequisite",
        "CC 101,Intro,3,1,1,CC 101",
        "CC 102,Programming,3,1,2,CC 101;CC 101;CC 103",
        "CC 103,Data,3,2,1,CC 102",
      ].join("\n")
    );
    assert.ok("subjects" in parsed);
    const plan = planCurriculumImport(parsed.subjects, [], [], new Set());
    const required = (code: string) =>
      plan.subjects.find((s) => s.code === code)!.requirements.map((r) => (r.kind === "code" ? r.code : r.level));
    assert.deepEqual(required("CC 101"), []);
    assert.deepEqual(required("CC 102"), ["CC 101", "CC 103"]);
    assert.deepEqual(required("CC 103"), []);
    assert.equal(plan.warnings.length, 3);
  });
});
