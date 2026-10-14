// Showcase students for presenting Auditrix: one student per feature, per program.
//
//   npx tsx scripts/seed-showcase.ts                    shows what it would add (changes nothing)
//   npx tsx scripts/seed-showcase.ts --apply            adds the showcase students
//   npx tsx scripts/seed-showcase.ts --program BSCPE    only that program (with or without --apply)
//   npx tsx scripts/seed-showcase.ts --remove           shows what --remove --apply would delete
//   npx tsx scripts/seed-showcase.ts --remove --apply   deletes every showcase student again
//
// Where seed-demo.ts fills the year levels so the dashboard has numbers, this
// adds a small set of named students that each show one thing the system does:
// a clean audit, a new first year counted as regular, a year level rising with
// grades or set by the chairperson, irregular and not-determined students,
// subjects taken out of order (a failed prerequisite, the same term, a
// co-requisite apart), a year standing to verify, an open and a completed INC,
// a retake, a retake with the same grade, a corrected grade, and every kind of
// student movement (pending shift, shifted in, transferred in and out, dropped,
// returnee). Each student is checked with the audit engine before it's added,
// and a case the curriculum can't show (e.g. it has no co-requisites) is
// skipped. The list of who shows what, and where to click, is printed and saved
// to showcase-guide.md.
//
// The showcase students are new students, recognized again by their registered
// year level being recorded by "Showcase data"; --remove deletes them, with
// their grades, logbook and movements. Nothing else is touched.
import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../lib/domain/supabase/adminClient";
import { fetchAll } from "../lib/domain/supabase/fetchAll";
import { SupabaseAcademicRecordRepository } from "../lib/domain/import/SupabaseAcademicRecordRepository";
import { AcademicRecord } from "../lib/domain/AcademicRecord";
import { AuditEngine } from "../lib/domain/AuditEngine";
import type { AuditResult } from "../lib/domain/AuditResult";
import type { CurriculumMap } from "../lib/domain/CurriculumMap";
import type { Subject } from "../lib/domain/Subject";
import type { SubjectRecord } from "../lib/domain/SubjectRecord";
import type { YearLevelEntry, YearLevelInfo } from "../lib/domain/yearLevels";
import { CoursePrerequisite } from "../lib/domain/requirements/CoursePrerequisite";
import { YearStandingRequirement } from "../lib/domain/requirements/YearStandingRequirement";
import { enrollmentStatus, type EnrollmentStatus } from "../lib/domain/enrollmentStatus";
import { compareTerms, formatTerm, isValidTerm, parseTerm } from "../lib/domain/Term";

const MARK = "Showcase data";
const GUIDE_FILE = "showcase-guide.md";
const GRADES = [1.25, 1.5, 1.75, 2.0, 2.25, 2.5];

const SURNAMES = [
  "Alunday", "Bagto", "Calimag", "Dumalig", "Esteban", "Fronda", "Guinaang", "Hilario", "Ignacio", "Jimenez",
  "Kiwang", "Labbutan", "Magwilang", "Nabus", "Ogues", "Palangdao", "Quilang", "Ramirez", "Saboy", "Tayaban",
  "Umaming", "Viernes", "Wacnang", "Yadao", "Zambrano", "Agbayani", "Buyagan", "Cabato", "Dagupen", "Eclar",
];
const FIRST_NAMES = [
  "Adrian", "Bea", "Cedric", "Dianne", "Elijah", "Faith", "Gerald", "Hannah", "Ivan", "Janelle",
  "Kurt", "Lovely", "Miguel", "Nicole", "Oliver", "Patricia", "Rafael", "Sophia", "Tristan", "Vanessa",
];

// --- Small helpers ------------------------------------------------------------

/** A small seeded random generator, so a rerun gives the same grades. */
function random(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const isBefore = (a: string, b: string) => compareTerms(a, b) < 0;

/** The school year a term belongs to: a midyear ends the year before its number. */
function schoolYear(term: string): number {
  const t = parseTerm(term)!;
  return t.semester === 3 ? t.year - 1 : t.year;
}

/** When a curriculum semester was taken by a student who entered in school year `entry`. */
function slotTerm(entry: number, yearLevel: number, semester: number): string {
  return semester === 3
    ? formatTerm({ year: entry + yearLevel, semester: 3 })
    : formatTerm({ year: entry + yearLevel - 1, semester: semester as 1 | 2 });
}

/** A plausible date for a grade from `term`, for the logbook. */
function gradeDate(term: string, offsetDays: number): string {
  const t = parseTerm(term)!;
  const date =
    t.semester === 1
      ? new Date(Date.UTC(2000 + t.year, 11, 15))
      : t.semester === 2
        ? new Date(Date.UTC(2001 + t.year, 4, 20))
        : new Date(Date.UTC(2000 + t.year, 6, 25));
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return new Date(Math.min(date.getTime(), Date.now())).toISOString();
}

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

/** Every row of a table, a page at a time in a stable order. */
function selectAll<T>(client: SupabaseClient, table: string, columns: string, orderBy = "id"): Promise<T[]> {
  return fetchAll<T>(
    (from, to) =>
      client.from(table).select(columns).order(orderBy).range(from, to) as unknown as PromiseLike<{
        data: T[] | null;
        error: unknown;
      }>
  );
}

async function insertAll(client: SupabaseClient, table: string, rows: object[]) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await client.from(table).insert(rows.slice(i, i + 500));
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

// --- What each showcase student is ---------------------------------------------

interface LogRow {
  subjectCode: string;
  old: { status: string; grade: number | null; term: string | null; resolvedTerm?: string | null } | null;
  next: { status: string; grade: number | null; term: string | null; resolvedTerm?: string | null };
  at: string;
}

type MovementType = "SHIFTED_OUT" | "SHIFTED_IN" | "TRANSFERRED_IN" | "TRANSFERRED_OUT" | "DROPPED" | "REOPENED";

interface Movement {
  type: MovementType;
  from: string | null;
  to: string | null;
  daysAgo: number;
}

/** What the audit engine says about a draft student. */
interface Outcome {
  record: AcademicRecord;
  results: AuditResult[];
  yearLevel: YearLevelInfo;
  enrollment: EnrollmentStatus;
  violations: string[];
}

interface Draft {
  /** The year level the student is registered at. */
  year: number;
  records: SubjectRecord[];
  /** Year-level history; by default registered at `year` in the current semester. */
  history?: YearLevelEntry[];
  /** Logbook entries for some subjects (e.g. a retake); the others get one entry each. */
  logs?: LogRow[];
  /** Subjects meant to show as taken out of order. */
  allow?: string[];
  shiftRequest?: boolean;
  movements?: Movement[];
  /** What to point out, e.g. "CPE 102 taken before CC 101 was passed". */
  detail: string;
  /** Null when the student shows what it should; otherwise why it's skipped. */
  check: (outcome: Outcome) => string | null;
}

interface Context {
  program: string;
  otherProgram: string | null;
  curriculum: CurriculumMap;
  currentTerm: string;
  /** All subjects passed in order, as a student `year` years in would have them (grades in for this semester too). */
  base: (year: number, seed: string) => SubjectRecord[];
  /** Subjects that list `code` as a prerequisite. */
  dependents: (code: string) => string[];
}

interface Showcase {
  group: string;
  feature: string;
  where: string;
  draft: (ctx: Context) => Draft | string;
}

const pastOf = (records: SubjectRecord[], currentTerm: string) => records.filter((r) => isBefore(r.term!, currentTerm));
const termsOf = (records: SubjectRecord[]) => [...new Set(records.map((r) => r.term!))].sort(compareTerms);
const nextTermAfter = (terms: string[], term: string) => terms.find((t) => isBefore(term, t));
const resultOf = (o: Outcome, code: string) => o.results.find((r) => r.subjectCode === code);

/** A prerequisite pair a → b where both were taken before this semester, a earlier than b. */
function prerequisitePair(ctx: Context, records: SubjectRecord[]) {
  const past = pastOf(records, ctx.currentTerm);
  const byCode = new Map(past.map((r) => [r.subjectCode, r]));
  for (const a of past) {
    for (const code of ctx.dependents(a.subjectCode)) {
      const b = byCode.get(code);
      if (b && isBefore(a.term!, b.term!)) return { a, b };
    }
  }
  return null;
}

/** A past subject with a later past term to retake or complete it in; ones nothing depends on first. */
function retakeCandidate(ctx: Context, records: SubjectRecord[]) {
  const past = pastOf(records, ctx.currentTerm);
  const terms = termsOf(past);
  const usable = past.filter((r) => nextTermAfter(terms, r.term!) !== undefined);
  const chosen = usable.find((r) => ctx.dependents(r.subjectCode).length === 0) ?? usable[0];
  return chosen ? { record: chosen, next: nextTermAfter(terms, chosen.term!)! } : null;
}

const SHOWCASES: Showcase[] = [
  // Audit and grades
  {
    group: "Audit and grades",
    feature: "Clean audit: every subject passed in order",
    where: "Student page (all Completed / Available), then Print evaluation",
    draft: (ctx) => ({
      year: 3,
      records: ctx.base(3, "clean"),
      detail: "nothing taken out of order",
      check: (o) => (o.violations.length === 0 ? null : "the curriculum flags something"),
    }),
  },
  {
    group: "Audit and grades",
    feature: "Subject taken out of order (prerequisite failed)",
    where: "Dashboard Needs attention banner, student page (red row), Print evaluation",
    draft: (ctx) => {
      const records = ctx.base(3, "outoforder");
      const pair = prerequisitePair(ctx, records);
      if (!pair) return "no prerequisite pair in the earlier semesters";
      Object.assign(pair.a, { status: "FAILED", grade: 5.0 });
      return {
        year: 3,
        records,
        allow: [pair.b.subjectCode],
        detail: `${pair.b.subjectCode} taken in ${pair.b.term} though ${pair.a.subjectCode} was failed`,
        check: (o) => (o.violations.includes(pair.b.subjectCode) ? null : "the violation didn't show"),
      };
    },
  },
  {
    group: "Audit and grades",
    feature: "Prerequisite taken in the same term",
    where: "Student page: the reason says it was taken in the same term",
    draft: (ctx) => {
      const records = ctx.base(3, "sameterm");
      const pair = prerequisitePair(ctx, records);
      if (!pair) return "no prerequisite pair in the earlier semesters";
      pair.b.term = pair.a.term;
      return {
        year: 3,
        records,
        allow: [pair.b.subjectCode],
        detail: `${pair.b.subjectCode} and its prerequisite ${pair.a.subjectCode} both in ${pair.a.term}`,
        check: (o) => (o.violations.includes(pair.b.subjectCode) ? null : "the violation didn't show"),
      };
    },
  },
  {
    group: "Audit and grades",
    feature: "Co-requisites taken in different terms",
    where: "Student page: co-requisites must be taken together",
    draft: (ctx) => {
      const pairs = ctx.curriculum
        .allSubjects()
        .flatMap((s) =>
          s.requirements
            .filter((r): r is CoursePrerequisite => r instanceof CoursePrerequisite && r.type === "COREQUISITE")
            .map((r) => ({ subject: s.code, partner: r.subjectCode }))
        );
      for (const year of [4, 3]) {
        const records = ctx.base(year, `coreq${year}`);
        const terms = termsOf(pastOf(records, ctx.currentTerm));
        for (const { subject, partner } of pairs) {
          const s = records.find((r) => r.subjectCode === subject);
          const p = records.find((r) => r.subjectCode === partner);
          const later = s && nextTermAfter(terms, s.term!);
          if (!s || !p || !later || !isBefore(s.term!, ctx.currentTerm)) continue;
          p.term = later;
          return {
            year,
            records,
            allow: [subject, partner],
            detail: `${subject} in ${s.term}, its co-requisite ${partner} in ${later}`,
            check: (o) =>
              o.violations.includes(subject) || o.violations.includes(partner) ? null : "the violation didn't show",
          };
        }
      }
      return pairs.length ? "no co-requisite pair taken before this semester" : "the curriculum has no co-requisites";
    },
  },
  {
    group: "Audit and grades",
    feature: "Year standing to verify (older grades not entered yet)",
    where: "Student page: amber \"Year standing: please verify\" note",
    draft: (ctx) => {
      const subjects = ctx.curriculum.allSubjects();
      const byCode = new Map(subjects.map((s) => [s.code, s]));
      const entry = schoolYear(ctx.currentTerm) - 3;
      for (const x of subjects) {
        if (!x.requirements.some((r) => r instanceof YearStandingRequirement && r.level >= 2)) continue;
        // The subject and what it needs, nothing else: like a transferee whose other grades aren't in.
        const needed = new Map<string, Subject>();
        const add = (s: Subject) => {
          if (needed.has(s.code)) return;
          needed.set(s.code, s);
          for (const r of s.requirements) {
            if (r instanceof CoursePrerequisite && byCode.has(r.subjectCode)) add(byCode.get(r.subjectCode)!);
          }
        };
        add(x);
        const records = [...needed.values()].map((s, i) => ({
          subjectCode: s.code,
          status: "PASSED" as const,
          grade: GRADES[i % GRADES.length],
          term: slotTerm(entry, s.yearLevel, s.semester),
        }));
        if (!records.every((r) => isBefore(r.term, ctx.currentTerm))) continue;
        return {
          year: 4,
          records,
          detail: `${x.code} (${x.requirements.find((r) => r instanceof YearStandingRequirement)!.description})`,
          check: (o) =>
            resultOf(o, x.code)?.warnings.some((w) => w.startsWith("Year standing: please verify"))
              ? null
              : "the note didn't show",
        };
      }
      return "no subject with a year-standing requirement taken before this semester";
    },
  },
  {
    group: "Audit and grades",
    feature: "INC not yet completed",
    where: "Student page and Print evaluation (grade INC)",
    draft: (ctx) => {
      const records = ctx.base(2, "inc");
      const terms = termsOf(pastOf(records, ctx.currentTerm));
      const r = pastOf(records, ctx.currentTerm).find((x) => x.term === terms[terms.length - 1]);
      if (!r) return "no earlier semester";
      Object.assign(r, { status: "INCOMPLETE", grade: null });
      return {
        year: 2,
        records,
        detail: `${r.subjectCode} INC from ${r.term}`,
        check: (o) => (o.record.statusOf(r.subjectCode) === "INCOMPLETE" ? null : "the INC didn't stay"),
      };
    },
  },
  {
    group: "Audit and grades",
    feature: "INC completed in a later term",
    where: "Student page (\"INC → term\"), Grade logbook (INC, then the final grade)",
    draft: (ctx) => {
      const records = ctx.base(3, "incdone");
      const c = retakeCandidate(ctx, records);
      if (!c) return "not enough earlier semesters";
      const { record: r, next } = c;
      r.resolvedTerm = next;
      return {
        year: 3,
        records,
        logs: [
          { subjectCode: r.subjectCode, old: null, next: { status: "INCOMPLETE", grade: null, term: r.term }, at: gradeDate(r.term!, 0) },
          { subjectCode: r.subjectCode, old: { status: "INCOMPLETE", grade: null, term: r.term }, next: { ...r }, at: gradeDate(next, 3) },
        ],
        detail: `${r.subjectCode} INC in ${r.term}, completed in ${next}`,
        check: (o) => (o.record.recordOf(r.subjectCode)?.resolvedTerm === next ? null : "the completion didn't stay"),
      };
    },
  },
  {
    group: "Audit and grades",
    feature: "Failed, then retaken and passed",
    where: "Grade logbook: 5.00, then the passing grade in a later term",
    draft: (ctx) => {
      const records = ctx.base(3, "retake");
      const c = retakeCandidate(ctx, records);
      if (!c) return "not enough earlier semesters";
      const { record: r, next } = c;
      const first = r.term!;
      r.term = next;
      return {
        year: 3,
        records,
        logs: [
          { subjectCode: r.subjectCode, old: null, next: { status: "FAILED", grade: 5.0, term: first }, at: gradeDate(first, 0) },
          { subjectCode: r.subjectCode, old: { status: "FAILED", grade: 5.0, term: first }, next: { ...r }, at: gradeDate(next, 0) },
        ],
        detail: `${r.subjectCode} failed in ${first}, passed in ${next}`,
        check: (o) => (o.record.statusOf(r.subjectCode) === "PASSED" ? null : "the retake didn't stay"),
      };
    },
  },
  {
    group: "Audit and grades",
    feature: "Retake with the same grade",
    where: "Grade logbook: 5.00 in two different terms, both kept",
    draft: (ctx) => {
      const records = ctx.base(3, "samegrade");
      const c = retakeCandidate(ctx, records);
      if (!c) return "not enough earlier semesters";
      const { record: r, next } = c;
      const first = r.term!;
      Object.assign(r, { status: "FAILED", grade: 5.0, term: next });
      return {
        year: 3,
        records,
        logs: [
          { subjectCode: r.subjectCode, old: null, next: { status: "FAILED", grade: 5.0, term: first }, at: gradeDate(first, 0) },
          { subjectCode: r.subjectCode, old: { status: "FAILED", grade: 5.0, term: first }, next: { ...r }, at: gradeDate(next, 0) },
        ],
        detail: `${r.subjectCode} 5.00 in ${first} and again in ${next}`,
        check: (o) => (o.record.statusOf(r.subjectCode) === "FAILED" ? null : "the second 5.00 didn't stay"),
      };
    },
  },
  {
    group: "Audit and grades",
    feature: "Grade corrected after it was entered",
    where: "Grade logbook: the first grade, then the correction, with who and when",
    draft: (ctx) => {
      const records = ctx.base(2, "corrected");
      const r = pastOf(records, ctx.currentTerm)[0];
      if (!r) return "no earlier semester";
      Object.assign(r, { status: "PASSED", grade: 1.75 });
      const wrong = { status: "PASSED", grade: 2.75, term: r.term };
      return {
        year: 2,
        records,
        logs: [
          { subjectCode: r.subjectCode, old: null, next: wrong, at: gradeDate(r.term!, 0) },
          { subjectCode: r.subjectCode, old: wrong, next: { ...r }, at: gradeDate(r.term!, 6) },
        ],
        detail: `${r.subjectCode} entered as 2.75, corrected to 1.75`,
        check: () => null,
      };
    },
  },

  // Year levels
  {
    group: "Year levels",
    feature: "Year level rising with grades",
    where: "Student page (year level from the subjects passed), Edit → year-level history",
    draft: (ctx) => {
      const entry = schoolYear(ctx.currentTerm) - 1;
      return {
        year: 1,
        records: ctx.base(2, "movedup"),
        history: [{ term: formatTerm({ year: entry, semester: 1 }), yearLevel: 1, source: "REGISTERED" }],
        detail: `registered as 1st year in ${formatTerm({ year: entry, semester: 1 })}`,
        check: (o) =>
          o.yearLevel.level >= 2 && o.yearLevel.basis === "GRADES" ? null : "the grades didn't raise the year level",
      };
    },
  },
  {
    group: "Year levels",
    feature: "Year level set by the chairperson (special case)",
    where: "Student page \"(set by chairperson)\", Edit → Year level",
    draft: (ctx) => ({
      year: 2,
      records: ctx.base(2, "override"),
      history: [
        { term: ctx.currentTerm, yearLevel: 2, source: "REGISTERED" },
        { term: ctx.currentTerm, yearLevel: 3, source: "CHAIRPERSON" },
      ],
      detail: "2nd year by grades, set to 3rd year",
      check: (o) => (o.yearLevel.basis === "CHAIRPERSON" ? null : "the override didn't apply"),
    }),
  },

  // Regular and irregular
  {
    group: "Regular and irregular",
    feature: "New first-year student counted as regular",
    where: "Students list (Regular, \"new first year\"), dashboard",
    draft: () => ({
      year: 1,
      records: [],
      detail: "no grades yet",
      check: (o) => (o.enrollment.kind === "REGULAR" && o.enrollment.assumed ? null : "not counted as a new first year"),
    }),
  },
  {
    group: "Regular and irregular",
    feature: "Irregular: less than the prescribed load",
    where: "Students list (reason under the name), student page badge",
    draft: (ctx) => {
      const records = ctx.base(2, "irregular");
      const current = records.filter((r) => r.term === ctx.currentTerm);
      if (current.length < 2) return "this semester has fewer than 2 subjects";
      const missing = current.slice(0, Math.min(2, current.length - 1)).map((r) => r.subjectCode);
      return {
        year: 2,
        records: records.filter((r) => !missing.includes(r.subjectCode)),
        detail: `not enrolled in ${missing.join(", ")}`,
        check: (o) => (o.enrollment.kind === "IRREGULAR" ? null : "not irregular"),
      };
    },
  },
  {
    group: "Regular and irregular",
    feature: "Not determined: this semester's grades not in yet",
    where: "Students list filter \"Not determined\", dashboard",
    draft: (ctx) => ({
      year: 2,
      records: ctx.base(2, "undetermined").filter((r) => r.term !== ctx.currentTerm),
      detail: `nothing recorded for ${ctx.currentTerm}`,
      check: (o) => (o.enrollment.kind === "NOT_DETERMINED" ? null : "the status was determined"),
    }),
  },

  // Student movements
  {
    group: "Student movements",
    feature: "Shift request waiting",
    where: "Student page (\"Pending shift request\"); another program's chairperson types the ID under Shift In a Student",
    draft: (ctx) => ({
      year: 2,
      records: ctx.base(2, "shiftpending"),
      shiftRequest: true,
      detail: `shifting out of ${ctx.program}`,
      check: () => null,
    }),
  },
  {
    group: "Student movements",
    feature: "Shifted in from another program",
    where: "Student Movements page; the student's page and logbook",
    draft: (ctx) => {
      if (!ctx.otherProgram) return "there's no other program to shift from";
      return {
        year: 2,
        records: ctx.base(2, "shiftedin"),
        movements: [
          { type: "SHIFTED_OUT", from: ctx.otherProgram, to: ctx.program, daysAgo: 21 },
          { type: "SHIFTED_IN", from: ctx.otherProgram, to: ctx.program, daysAgo: 21 },
        ],
        detail: `from ${ctx.otherProgram}`,
        check: () => null,
      };
    },
  },
  {
    group: "Student movements",
    feature: "Transferred in from another school",
    where: "Student Movements page; credited subjects on the student page",
    draft: (ctx) => ({
      year: 2,
      records: ctx.base(2, "transferin"),
      movements: [{ type: "TRANSFERRED_IN", from: null, to: ctx.program, daysAgo: 45 }],
      detail: "credited subjects entered",
      check: () => null,
    }),
  },
  {
    group: "Student movements",
    feature: "Transferred out (record locked)",
    where: "Student page (red Locked banner, no Edit / Enter grades), Student Movements",
    draft: (ctx) => ({
      year: 3,
      records: ctx.base(3, "transferout"),
      movements: [{ type: "TRANSFERRED_OUT", from: ctx.program, to: null, daysAgo: 12 }],
      detail: "left KSU",
      check: () => null,
    }),
  },
  {
    group: "Student movements",
    feature: "Dropped (record locked)",
    where: "Students list filter \"Dropped\", student page, dashboard Dropped count",
    draft: (ctx) => ({
      year: 2,
      records: ctx.base(2, "dropped"),
      movements: [{ type: "DROPPED", from: ctx.program, to: null, daysAgo: 6 }],
      detail: "dropped this semester",
      check: () => null,
    }),
  },
  {
    group: "Student movements",
    feature: "Returnee: dropped, then came back",
    where: "Student Movements (Dropped, then Returnee); the student is active again",
    draft: (ctx) => ({
      year: 2,
      records: ctx.base(2, "reopened"),
      movements: [
        { type: "DROPPED", from: ctx.program, to: null, daysAgo: 70 },
        { type: "REOPENED", from: ctx.program, to: null, daysAgo: 35 },
      ],
      detail: "came back after dropping",
      check: () => null,
    }),
  },
];

// --- Planning -------------------------------------------------------------------

interface Planned {
  id: string;
  name: string;
  program: string;
  curriculumId: string;
  showcase: Showcase;
  draft: Draft;
  records: SubjectRecord[];
  history: YearLevelEntry[];
  logs: LogRow[];
  result: string;
}

/** Leaves out anything else the curriculum's rules would flag, so only the intended case shows. */
function settle(id: string, ctx: Context, draft: Draft, history: YearLevelEntry[]) {
  const engine = new AuditEngine();
  const allow = new Set(draft.allow ?? []);
  let records = draft.records;
  for (let i = 0; i < 40; i++) {
    const record = new AcademicRecord(id, ctx.curriculum, draft.year, records, history);
    const unwanted = engine
      .auditCurriculum(record)
      .filter((r) => r.status === "VIOLATION" && !allow.has(r.subjectCode))
      .map((r) => r.subjectCode);
    if (unwanted.length === 0) break;
    records = records.filter((r) => !unwanted.includes(r.subjectCode));
  }
  const record = new AcademicRecord(id, ctx.curriculum, draft.year, records, history);
  const { results, yearLevel } = engine.auditStudent(record, ctx.currentTerm);
  const outcome: Outcome = {
    record,
    results,
    yearLevel,
    enrollment: enrollmentStatus(record, ctx.currentTerm, yearLevel.level),
    violations: results.filter((r) => r.status === "VIOLATION").map((r) => r.subjectCode),
  };
  return { records, outcome };
}

function describe(o: Outcome): string {
  const status =
    o.enrollment.kind === "REGULAR" ? "regular" : o.enrollment.kind === "IRREGULAR" ? "irregular" : "not determined";
  return [`year ${o.yearLevel.level}`, status, ...(o.violations.length ? [`out of order: ${o.violations.join(", ")}`] : [])].join(", ");
}

// --- Removing ---------------------------------------------------------------------

async function showcaseStudentIds(client: SupabaseClient): Promise<string[]> {
  const rows = await selectAll<{ student_id: string; source: string; recorded_by: string }>(
    client,
    "student_year_levels",
    "student_id, source, recorded_by"
  );
  return [...new Set(rows.filter((r) => r.source === "REGISTERED" && r.recorded_by === MARK).map((r) => r.student_id))];
}

async function remove(client: SupabaseClient, apply: boolean) {
  const ids = await showcaseStudentIds(client);
  console.log(`Showcase students to delete (with their grades, logbook and movements): ${ids.length}.`);
  if (!apply) {
    console.log("Nothing changed. Run with --remove --apply to delete them.");
    return;
  }
  for (let i = 0; i < ids.length; i += 100) {
    const { error } = await client.from("students").delete().in("id", ids.slice(i, i + 100));
    if (error) throw new Error(error.message);
  }
  console.log("Showcase data removed.");
}

// --- Main ---------------------------------------------------------------------------

async function main() {
  const client = createAdminClient();
  const apply = process.argv.includes("--apply");
  if (process.argv.includes("--remove")) return remove(client, apply);
  const onlyProgram = process.argv.includes("--program") ? process.argv[process.argv.indexOf("--program") + 1] : null;

  if ((await showcaseStudentIds(client)).length > 0) {
    console.log("Showcase data is already in the database. To add it fresh, first run:");
    console.log("  npx tsx scripts/seed-showcase.ts --remove --apply");
    return;
  }

  const [curricula, subjectRows, terms, students, staff] = await Promise.all([
    selectAll<{ id: string; program: string; effective_year: number; college_id: string | null }>(
      client,
      "curricula",
      "id, program, effective_year, college_id"
    ),
    selectAll<{ id: string; curriculum_id: string; code: string }>(client, "subjects", "id, curriculum_id, code"),
    selectAll<{ college_id: string; current_term: string }>(client, "college_terms", "college_id, current_term", "college_id"),
    selectAll<{ id: string; name: string }>(client, "students", "id, name"),
    selectAll<{ name: string; role: string; program: string | null }>(client, "staff", "name, role, program"),
  ]);

  const withSubjects = curricula.filter((c) => subjectRows.some((s) => s.curriculum_id === c.id));
  const { maps } = await new SupabaseAcademicRecordRepository(client).loadCurricula(withSubjects.map((c) => c.id));
  const subjectId = new Map(subjectRows.map((s) => [`${s.curriculum_id}|${s.code}`, s.id]));
  const allPrograms = [...new Set(withSubjects.map((c) => c.program))].sort();
  const programs = allPrograms.filter((p) => !onlyProgram || p.toLowerCase() === onlyProgram.toLowerCase());
  if (programs.length === 0) {
    console.log(onlyProgram ? `No program ${onlyProgram} with subjects.` : "No curriculum has subjects yet.");
    return;
  }

  const takenIds = new Set(students.map((s) => s.id));
  const takenNames = new Set(students.map((s) => s.name.toLowerCase()));
  let nameIndex = 0;
  const newName = () => {
    for (;;) {
      const i = nameIndex++;
      const last = SURNAMES[i % SURNAMES.length];
      const first = FIRST_NAMES[(i * 7 + Math.floor(i / SURNAMES.length)) % FIRST_NAMES.length];
      const name = `${last}, ${first} ${String.fromCharCode(65 + ((i * 5) % 26))}.`;
      if (!takenNames.has(name.toLowerCase())) return takenNames.add(name.toLowerCase()), name;
    }
  };
  const newId = (entry: number) => {
    for (let n = 800001; ; n++) {
      const id = `${String(entry).padStart(2, "0")}-${n}`;
      if (!takenIds.has(id)) return takenIds.add(id), id;
    }
  };

  const planned: Planned[] = [];
  const skipped: string[] = [];
  for (const program of programs) {
    const versions = withSubjects.filter((c) => c.program === program).sort((a, b) => a.effective_year - b.effective_year);
    const currentTerm = terms.find((t) => t.college_id === versions[0].college_id)?.current_term;
    if (!currentTerm || !isValidTerm(currentTerm)) {
      skipped.push(`${program}: the dean hasn't set the current semester`);
      continue;
    }
    for (const showcase of SHOWCASES) {
      const seedProgram = program;
      // A student uses the newest curriculum in effect when they entered; the
      // year depends on the case, so the curriculum is chosen per draft.
      const contextFor = (year: number): Context => {
        const entry = schoolYear(currentTerm) - (year - 1);
        const version = [...versions].reverse().find((v) => v.effective_year <= 2000 + entry) ?? versions[0];
        const curriculum = maps.get(version.id)!;
        const deps = new Map<string, string[]>();
        for (const s of curriculum.allSubjects()) {
          for (const r of s.requirements) {
            if (r instanceof CoursePrerequisite && r.type === "PREREQUISITE") {
              deps.set(r.subjectCode, [...(deps.get(r.subjectCode) ?? []), s.code]);
            }
          }
        }
        return {
          program,
          otherProgram: allPrograms.find((p) => p !== program) ?? null,
          curriculum,
          currentTerm,
          dependents: (code) => deps.get(code) ?? [],
          base: (baseYear, seed) => {
            const rand = random(`${seedProgram}|${seed}`);
            const baseEntry = schoolYear(currentTerm) - (baseYear - 1);
            return curriculum
              .allSubjects()
              .map((s) => ({ subject: s, term: slotTerm(baseEntry, s.yearLevel, s.semester) }))
              .filter(({ term }) => !isBefore(currentTerm, term))
              .map(({ subject, term }) => ({
                subjectCode: subject.code,
                status: "PASSED" as const,
                grade: GRADES[Math.floor(rand() * GRADES.length)],
                term,
              }));
          },
        };
      };

      // The draft decides the year; build it once to learn it, then again with the right curriculum.
      const probe = showcase.draft(contextFor(2));
      const year = typeof probe === "string" ? 2 : probe.year;
      const ctx = contextFor(year);
      const draft = showcase.draft(ctx);
      if (typeof draft === "string") {
        skipped.push(`${program}: ${showcase.feature} (${draft})`);
        continue;
      }
      const version = withSubjects.find((v) => maps.get(v.id) === ctx.curriculum)!;
      const history: YearLevelEntry[] = draft.history ?? [{ term: currentTerm, yearLevel: draft.year, source: "REGISTERED" }];
      if (!history.some((h) => h.source === "REGISTERED")) {
        history.unshift({ term: currentTerm, yearLevel: draft.year, source: "REGISTERED" });
      }
      // ID numbers start with the school year the student entered.
      const entry = Math.min(schoolYear(currentTerm) - (draft.year - 1), ...history.map((h) => schoolYear(h.term)));
      const id = newId(entry);
      const { records, outcome } = settle(id, ctx, draft, history);
      const problem = draft.check(outcome);
      if (problem) {
        skipped.push(`${program}: ${showcase.feature} (${problem})`);
        continue;
      }
      const special = new Set((draft.logs ?? []).map((l) => l.subjectCode));
      const logs: LogRow[] = [
        ...(draft.logs ?? []).filter((l) => records.some((r) => r.subjectCode === l.subjectCode)),
        ...records
          .filter((r) => !special.has(r.subjectCode))
          .map((r, i) => ({ subjectCode: r.subjectCode, old: null, next: { ...r }, at: gradeDate(r.term!, i % 5) })),
      ];
      planned.push({
        id,
        name: newName(),
        program,
        curriculumId: version.id,
        showcase,
        draft,
        records,
        history,
        logs,
        result: describe(outcome),
      });
    }
  }

  // The guide: who shows what, and where to look.
  const lines: string[] = ["# Auditrix showcase students", ""];
  for (const program of programs) {
    const mine = planned.filter((p) => p.program === program);
    if (mine.length === 0) continue;
    lines.push(`## ${program}`, "");
    for (const group of [...new Set(SHOWCASES.map((s) => s.group))]) {
      const inGroup = mine.filter((p) => p.showcase.group === group);
      if (inGroup.length === 0) continue;
      lines.push(`### ${group}`, "", "| Student | Shows | Look at |", "| --- | --- | --- |");
      for (const p of inGroup) {
        lines.push(`| ${p.id} ${p.name} | ${p.showcase.feature}: ${p.draft.detail} (${p.result}) | ${p.showcase.where} |`);
      }
      lines.push("");
    }
  }
  if (skipped.length) {
    lines.push("## Not shown", "", ...skipped.map((s) => `- ${s}`), "");
  }
  console.log(lines.join("\n"));
  const grades = planned.reduce((n, p) => n + p.records.length, 0);
  console.log(`In all: ${planned.length} showcase students, ${grades} grades.`);

  if (!apply) {
    console.log("\nNothing changed. Run again with --apply to add them.");
    return;
  }

  const chairOf = (program: string) => staff.find((s) => s.role === "chairperson" && s.program === program)?.name ?? "Chairperson";

  await insertAll(
    client,
    "students",
    planned.map((p) => ({ id: p.id, name: p.name, curriculum_id: p.curriculumId, nominal_year_level: p.draft.year }))
  );
  // The registration trigger records "registered this semester"; replace it with each case's history.
  const ids = planned.map((p) => p.id);
  for (let i = 0; i < ids.length; i += 100) {
    const { error } = await client.from("student_year_levels").delete().in("student_id", ids.slice(i, i + 100));
    if (error) throw new Error(error.message);
  }
  await insertAll(
    client,
    "student_year_levels",
    planned.flatMap((p) =>
      p.history.map((h) => ({
        student_id: p.id,
        effective_term: h.term,
        year_level: h.yearLevel,
        source: h.source,
        // The registration carries the mark --remove looks for.
        recorded_by: h.source === "REGISTERED" ? MARK : chairOf(p.program),
      }))
    )
  );
  const idOf = (p: Planned, code: string) => subjectId.get(`${p.curriculumId}|${code}`)!;
  await insertAll(
    client,
    "subject_records",
    planned.flatMap((p) =>
      p.records.map((r) => ({
        student_id: p.id,
        subject_id: idOf(p, r.subjectCode),
        status: r.status,
        grade: r.grade,
        term: r.term,
        resolved_term: r.resolvedTerm ?? null,
      }))
    )
  );
  await insertAll(
    client,
    "grade_audit_log",
    planned.flatMap((p) =>
      p.logs.map((l) => ({
        student_id: p.id,
        subject_id: idOf(p, l.subjectCode),
        old_status: l.old?.status ?? null,
        old_grade: l.old?.grade ?? null,
        old_term: l.old?.term ?? null,
        old_resolved_term: l.old?.resolvedTerm ?? null,
        new_status: l.next.status,
        new_grade: l.next.grade,
        new_term: l.next.term,
        new_resolved_term: l.next.resolvedTerm ?? null,
        changed_by: chairOf(p.program),
        changed_at: l.at,
      }))
    )
  );
  await insertAll(
    client,
    "shift_requests",
    planned
      .filter((p) => p.draft.shiftRequest)
      .map((p) => ({ student_id: p.id, from_program: p.program, requested_by: chairOf(p.program), requested_at: daysAgo(3) }))
  );
  // Oldest first: a drop locks the record and a reopening unlocks it, in that order.
  const movements = planned
    .flatMap((p) => (p.draft.movements ?? []).map((m) => ({ p, m })))
    .sort((a, b) => b.m.daysAgo - a.m.daysAgo);
  for (const { p, m } of movements) {
    await insertAll(client, "student_transitions", [
      {
        student_id: p.id,
        student_name: p.name,
        type: m.type,
        from_program: m.from,
        to_program: m.to,
        recorded_by: chairOf(m.type === "SHIFTED_IN" || m.type === "TRANSFERRED_IN" ? (m.to ?? p.program) : p.program),
        recorded_at: daysAgo(m.daysAgo),
      },
    ]);
  }

  writeFileSync(GUIDE_FILE, lines.join("\n"), "utf8");
  console.log(`\nShowcase data added. The list above is saved in ${GUIDE_FILE}.`);
  console.log("Remove it later with: npx tsx scripts/seed-showcase.ts --remove --apply");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
