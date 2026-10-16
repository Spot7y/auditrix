import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { matchSubject, parseMisPaste, planMisPaste, type PlanSubject } from "../import/misPaste";

// Shaped like the KSU-MIS "Academic Grades" page (made-up student).
const tabbed = [
  "ID Number",
  "99-999999",
  "Student",
  "Dela Cruz, Juan",
  "Academic Grades",
  "Term: 25-1 - First Semester",
  "School: KSU - Kalinga State University",
  "Program: BSCpE - Bachelor of Science in Computer Engineering",
  "CODE\tDESCRIPTION\tGRADE\tUNITS\tREMARKS",
  "PE 11\tMovement Enhancement\t1.75\t2\tPassed",
  "PRE CALL 11\tPre Calculus\tUD\t\tUnofficially Dropped",
  "MATH 11\tMathematics in the Modern World\t2.5\t3\tPassed",
  "Term: 26-S - Mid-Year",
  "School: KSU - Kalinga State University",
  "CODE\tDESCRIPTION\tGRADE\tUNITS\tREMARKS",
  "MATH 111\tEngineering Calculus 1\t5\t-\tFailed",
  "Term: 26-1 - First Semester",
  "CODE\tDESCRIPTION\tGRADE\tUNITS\tREMARKS",
  "CPE 211\tData Structure and Algorithms\tIP\t-\t-",
].join("\n");

// The same page when each cell pastes on its own line.
const perLine = [
  "Term: 25-1 - First Semester",
  "School: KSU - Kalinga State University",
  "CODE",
  "DESCRIPTION",
  "GRADE",
  "UNITS",
  "REMARKS",
  "PE 11",
  "Movement Enhancement",
  "1.75",
  "2",
  "Passed",
  "PRE CALL 11",
  "Pre Calculus",
  "UD",
  "Unofficially",
  "Dropped",
  "MATH 11",
  "Mathematics in the Modern World",
  "2.5",
  "3",
  "Passed",
].join("\n");

describe("reading a paste from the MIS", () => {
  it("reads terms and rows from tab-separated lines", () => {
    const paste = parseMisPaste(tabbed);
    assert.equal(paste.studentId, "99-999999");
    assert.deepEqual(
      paste.rows.map((r) => `${r.term} ${r.code} ${r.grade}`),
      ["25-1 PE 11 1.75", "25-1 PRE CALL 11 UD", "25-1 MATH 11 2.5", "26-S MATH 111 5", "26-1 CPE 211 IP"]
    );
    assert.equal(paste.rows[0].description, "Movement Enhancement");
  });

  it("reads rows when each cell is on its own line", () => {
    assert.deepEqual(
      parseMisPaste(perLine).rows.map((r) => `${r.term} ${r.code} | ${r.description} | ${r.grade}`),
      [
        "25-1 PE 11 | Movement Enhancement | 1.75",
        "25-1 PRE CALL 11 | Pre Calculus | UD",
        "25-1 MATH 11 | Mathematics in the Modern World | 2.5",
      ]
    );
  });

  it("finds nothing in text that isn't from the MIS", () => {
    assert.deepEqual(parseMisPaste("hello\nworld").rows, []);
  });
});

describe("matching pasted rows to the curriculum", () => {
  const subjects = [
    { code: "PRE CAL", title: "Pre Calculus" },
    { code: "MATH 11", title: "Mathematics in the Modern World" },
  ];
  it("matches by code, then by an identical title", () => {
    assert.equal(matchSubject({ code: "math 11", description: "x" }, subjects)?.by, "code");
    assert.deepEqual(matchSubject({ code: "PRE CALL 11", description: "Pre-Calculus" }, subjects), {
      subject: subjects[0],
      by: "title",
    });
    assert.equal(matchSubject({ code: "XYZ 1", description: "Unknown" }, subjects), null);
  });
});

describe("planning what to save", () => {
  const subject = (code: string, title: string, rest: Partial<PlanSubject> = {}): PlanSubject => ({
    code,
    title,
    currentGrade: null,
    currentStatus: "NOT_TAKEN",
    currentTerm: null,
    ...rest,
  });
  const subjects = [
    subject("PE 11", "Movement Enhancement", { currentGrade: 1.75, currentStatus: "PASSED", currentTerm: "25-1" }),
    subject("PRE CAL", "Pre Calculus"),
    subject("MATH 11", "Mathematics in the Modern World"),
    subject("MATH 111", "Engineering Calculus 1"),
    subject("CPE 211", "Data Structure and Algorithms"),
  ];

  it("saves new grades, skips what's recorded, dropped or in progress", () => {
    const plan = planMisPaste(parseMisPaste(tabbed).rows, subjects, "26-1");
    assert.deepEqual(
      plan.map((p) => `${p.code} ${p.action} ${p.save}`),
      [
        "PE 11 same false",
        "PRE CALL 11 dropped false",
        "MATH 11 new true",
        "MATH 111 new true",
        "CPE 211 in-progress false",
      ]
    );
  });

  it("records a failed attempt, then the retake, oldest first", () => {
    const rows = [
      { term: "26-1", code: "MATH 111", description: "Engineering Calculus 1", grade: "2" },
      { term: "26-S", code: "MATH 111", description: "Engineering Calculus 1", grade: "5" },
    ];
    assert.deepEqual(planMisPaste(rows, subjects, "26-1").map((p) => p.action), ["retake", "new"]);
  });

  it("doesn't let an older grade replace a later one, or save after the current semester", () => {
    const later = [subject("MATH 11", "Mathematics in the Modern World", { currentGrade: 2, currentStatus: "PASSED", currentTerm: "26-1" })];
    const rows = [
      { term: "25-1", code: "MATH 11", description: "", grade: "5" },
      { term: "27-1", code: "MATH 11", description: "", grade: "1.5" },
    ];
    assert.deepEqual(planMisPaste(rows, later, "26-1").map((p) => p.action), ["later-recorded", "future"]);
  });

  it("completes an INC and flags grades that aren't KSU grades", () => {
    const inc = [subject("MATH 11", "Mathematics in the Modern World", { currentStatus: "INCOMPLETE", currentTerm: "25-1" })];
    const rows = [
      { term: "25-2", code: "MATH 11", description: "", grade: "2.25" },
      { term: "25-2", code: "MATH 11", description: "", grade: "4" },
    ];
    assert.deepEqual(planMisPaste(rows, inc, "26-1").map((p) => p.action), ["complete-inc", "invalid"]);
  });

  it("uses a subject the chairperson picked for a row that didn't match", () => {
    const rows = [{ term: "25-1", code: "ENGG CHEM 111", description: "Chemistry", grade: "2" }];
    assert.equal(planMisPaste(rows, subjects, "26-1")[0].action, "not-found");
    const picked = planMisPaste(rows, subjects, "26-1", { 0: "MATH 111" })[0];
    assert.equal(picked.subjectCode, "MATH 111");
    assert.equal(picked.action, "new");
  });
});

describe("pasting the whole MIS page (Ctrl+A)", () => {
  const menu = ["Information", "Grades", "Enrollment", "Curriculum", "Checklist", "SOA", "Assessment", "Account"];
  const footer = ["© 2026 Kalinga State University", "Management Information System", "Version 2.1"];

  it("skips the menu, names and footer, before or after the grades", () => {
    for (const text of [
      ["KSU-MIS", ...menu, tabbed, ...footer].join("\n"),
      [tabbed, ...menu, ...footer].join("\n"),
      ["KSU-MIS", ...menu, perLine, ...menu, ...footer].join("\n"),
    ]) {
      const codes = parseMisPaste(text).rows.map((r) => `${r.code} ${r.grade}`);
      assert.ok(codes.includes("PE 11 1.75") && codes.includes("MATH 11 2.5"), codes.join(", "));
      assert.ok(codes.every((c) => /^(PE 11|PRE CALL 11|MATH 11|MATH 111|CPE 211) /.test(c)), codes.join(", "));
    }
  });
});

describe("a wrong code in the MIS", () => {
  const subjects = [
    { code: "SOC SCI 12", title: "The Contemporary World", currentGrade: null, currentStatus: "NOT_TAKEN" as const, currentTerm: null },
    { code: "PHILO 11", title: "Understanding the Self", currentGrade: null, currentStatus: "NOT_TAKEN" as const, currentTerm: null },
    { code: "CPE 211", title: "Data Structures and Algorithms", currentGrade: null, currentStatus: "NOT_TAKEN" as const, currentTerm: null },
  ];

  it("doesn't put a grade on the code's subject when the title belongs to another one", () => {
    const rows = [{ term: "25-1", code: "SOC SCI 12", description: "Understanding the Self", grade: "2" }];
    const [row] = planMisPaste(rows, subjects, "26-1");
    assert.equal(row.action, "check");
    assert.equal(row.save, false);
    assert.match(row.note, /PHILO 11 is “Understanding the Self”/);
    assert.equal(planMisPaste(rows, subjects, "26-1", { 0: "PHILO 11" })[0].action, "new");
  });

  it("asks to check a code whose title is quite different", () => {
    const rows = [{ term: "25-1", code: "SOC SCI 12", description: "Readings in Philippine History", grade: "2" }];
    assert.equal(planMisPaste(rows, subjects, "26-1")[0].action, "check");
  });

  it("accepts small differences in the title", () => {
    const rows = [{ term: "25-1", code: "CPE 211", description: "Data Structure and Algorithms", grade: "2" }];
    assert.equal(planMisPaste(rows, subjects, "26-1")[0].action, "new");
  });
});
