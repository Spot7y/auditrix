// Demo students and grades for presenting Auditrix to chairpersons.
//
//   npx tsx scripts/seed-demo.ts            shows what it would do (changes nothing)
//   npx tsx scripts/seed-demo.ts --apply    adds the demo data
//   npx tsx scripts/seed-demo.ts --remove   removes everything it added
//
// For every program with an uploaded curriculum, each year level is filled up
// to 10 students. Students that already have grades are left alone; students
// without any grades get demo grades, and new students are made for the rest.
// Grades run from the student's first semester up to the college's current
// semester, which is marked in progress, and a few students per year show the
// system's features: a failed subject, an INC, a completed INC, a retake, a
// subject taken out of order and an irregular load.
//
// Everything is recorded as "Demo data" (in the grade logbook and the new
// students' year-level history), which is how --remove finds it again.
import { config } from "dotenv";
config({ path: ".env.local" });

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../lib/domain/supabase/adminClient";
import { SupabaseAcademicRecordRepository } from "../lib/domain/import/SupabaseAcademicRecordRepository";
import { AcademicRecord } from "../lib/domain/AcademicRecord";
import { AuditEngine } from "../lib/domain/AuditEngine";
import type { CurriculumMap } from "../lib/domain/CurriculumMap";
import type { SubjectRecord } from "../lib/domain/SubjectRecord";
import type { YearLevelEntry } from "../lib/domain/yearLevels";
import { CoursePrerequisite } from "../lib/domain/requirements/CoursePrerequisite";
import { enrollmentStatus } from "../lib/domain/enrollmentStatus";
import { compareTerms, formatTerm, isValidTerm, parseTerm } from "../lib/domain/Term";

const DEMO = "Demo data";
const PER_YEAR = 10;
const GRADES = [1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0];

type Variant = "regular" | "retaken" | "incResolved" | "failed" | "inc" | "outOfOrder" | "irregular";
// One per student in a year level, in this order; the rest are regular.
const VARIANTS: Variant[] = ["regular", "regular", "regular", "regular", "retaken", "incResolved", "failed", "inc", "outOfOrder", "irregular"];
const VARIANT_LABEL: Record<Variant, string> = {
  regular: "all passed",
  retaken: "failed once, retaken and passed",
  incResolved: "INC later completed",
  failed: "failed subject to retake",
  inc: "INC not yet completed",
  outOfOrder: "subject taken out of order",
  irregular: "irregular load this semester",
};

const SURNAMES = [
  "Dela Cruz", "Santos", "Reyes", "Garcia", "Mendoza", "Bautista", "Aquino", "Ramos", "Villanueva", "Castillo",
  "Fernandez", "Navarro", "Gonzales", "Lopez", "Torres", "Flores", "Rivera", "Domingo", "Pascual", "Salvador",
  "Mercado", "Soriano", "Valdez", "Manalo", "Dulawan", "Bangit", "Gaddawan", "Dalang", "Agustin", "Lagasca",
  "Sagudan", "Aggabao", "Balawag", "Tumbali", "Malanos", "Puyao", "Dawaton", "Sannadan", "Ligayo", "Baggay",
];
const FIRST_NAMES = [
  "Juan", "Maria", "Jose", "Ana", "Mark Anthony", "Kristine", "John Paul", "Angelica", "Carlo", "Jessa",
  "Ramon", "Liza", "Paolo", "Camille", "Jerome", "Rica", "Christian", "Joy", "Kevin", "Mae",
  "Rodel", "Charmaine", "Arnel", "Precious", "Jayson", "Hazel", "Noel", "Shiela", "Ronald", "Princess",
];

/** A small seeded random generator, so the same student always gets the same grades. */
function random(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** The school year a term belongs to: a midyear ends the year before its number. */
function schoolYear(term: string): number {
  const t = parseTerm(term)!;
  return t.semester === 3 ? t.year - 1 : t.year;
}

/** When a curriculum semester was taken by a student who entered in `entry`. */
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

async function selectAll<T>(client: SupabaseClient, table: string, columns: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from(table).select(columns).range(from, from + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return rows;
  }
}

async function insertAll(client: SupabaseClient, table: string, rows: object[]) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await client.from(table).insert(rows.slice(i, i + 500));
    if (error) throw error;
  }
}

interface LogRow {
  subjectCode: string;
  old: { status: string; grade: number | null; term: string | null; resolvedTerm?: string | null } | null;
  next: { status: string; grade: number | null; term: string | null; resolvedTerm?: string | null };
  at: string;
}

interface Plan {
  id: string;
  name: string;
  isNew: boolean;
  curriculumId: string;
  yearLevel: number;
  variant: Variant;
  records: SubjectRecord[];
  logs: LogRow[];
  outcome: string;
}

/** Builds a student's grades for `variant` and checks them with the audit engine. */
function planGrades(
  id: string,
  curriculum: CurriculumMap,
  yearLevel: number,
  history: YearLevelEntry[],
  currentTerm: string,
  variant: Variant
): Omit<Plan, "id" | "name" | "isNew" | "curriculumId" | "yearLevel" | "variant"> {
  const rand = random(id);
  const ability = Math.floor(rand() * 5); // 0 = mostly 1.0–1.75, 4 = mostly 2.0–3.0
  const grade = () => GRADES[Math.max(0, Math.min(GRADES.length - 1, ability + Math.floor(rand() * 5) - 1))];
  const entry = schoolYear(currentTerm) - (yearLevel - 1);
  const isBefore = (a: string, b: string) => compareTerms(a, b) < 0;

  const subjects = curriculum.allSubjects();
  let records: SubjectRecord[] = [];
  for (const s of subjects) {
    const term = slotTerm(entry, s.yearLevel, s.semester);
    if (isBefore(term, currentTerm)) records.push({ subjectCode: s.code, status: "PASSED", grade: grade(), term });
    else if (term === currentTerm) records.push({ subjectCode: s.code, status: "IN_PROGRESS", grade: null, term });
  }
  const past = () => records.filter((r) => r.status !== "IN_PROGRESS");
  const pastTerms = [...new Set(past().map((r) => r.term!))].sort(compareTerms);
  const latestPast = pastTerms[pastTerms.length - 1];
  const nextTerm = (term: string) => pastTerms.find((t) => isBefore(term, t));

  // Which subjects each subject is a prerequisite of.
  const dependents = new Map<string, string[]>();
  for (const s of subjects) {
    for (const r of s.requirements) {
      if (r instanceof CoursePrerequisite && r.type === "PREREQUISITE") {
        dependents.set(r.subjectCode, [...(dependents.get(r.subjectCode) ?? []), s.code]);
      }
    }
  }
  const pick = <T>(items: T[]) => items[Math.floor(rand() * items.length)];
  const extraLogs: LogRow[] = [];
  const allowed = new Set<string>(); // a violation shown on purpose
  let applied = false;

  if (variant === "failed" && latestPast) {
    const candidates = past().filter((r) => dependents.has(r.subjectCode));
    const r = pick(candidates.length ? candidates : past().filter((x) => x.term === latestPast));
    if (r) {
      Object.assign(r, { status: "FAILED", grade: 5.0 });
      applied = true;
    }
  } else if (variant === "inc" && latestPast) {
    const r = pick(past().filter((x) => x.term === latestPast));
    if (r) {
      Object.assign(r, { status: "INCOMPLETE", grade: null });
      applied = true;
    }
  } else if (variant === "retaken" && pastTerms.length >= 2) {
    const r = pick(past().filter((x) => nextTerm(x.term!) !== undefined));
    if (r) {
      const first = r.term!;
      const second = nextTerm(first)!;
      extraLogs.push({ subjectCode: r.subjectCode, old: null, next: { status: "FAILED", grade: 5.0, term: first }, at: gradeDate(first, 0) });
      Object.assign(r, { term: second });
      extraLogs.push({ subjectCode: r.subjectCode, old: { status: "FAILED", grade: 5.0, term: first }, next: { ...r }, at: gradeDate(second, 0) });
      applied = true;
    }
  } else if (variant === "incResolved" && pastTerms.length >= 2) {
    const r = pick(past().filter((x) => nextTerm(x.term!) !== undefined));
    if (r) {
      const resolved = nextTerm(r.term!)!;
      extraLogs.push({ subjectCode: r.subjectCode, old: null, next: { status: "INCOMPLETE", grade: null, term: r.term }, at: gradeDate(r.term!, 0) });
      r.resolvedTerm = resolved;
      extraLogs.push({ subjectCode: r.subjectCode, old: { status: "INCOMPLETE", grade: null, term: r.term }, next: { ...r }, at: gradeDate(resolved, 3) });
      applied = true;
    }
  } else if (variant === "outOfOrder") {
    // A prerequisite failed, yet the subject after it was taken and passed.
    const byCode = new Map(past().map((r) => [r.subjectCode, r]));
    const pairs = past().flatMap((a) =>
      (dependents.get(a.subjectCode) ?? [])
        .map((code) => byCode.get(code))
        .filter((b): b is SubjectRecord => !!b && isBefore(a.term!, b.term!))
        .map((b) => [a, b] as const)
    );
    const pair = pick(pairs);
    if (pair) {
      Object.assign(pair[0], { status: "FAILED", grade: 5.0 });
      allowed.add(pair[1].subjectCode);
      applied = true;
    }
  } else if (variant === "irregular") {
    const current = records.filter((r) => r.status === "IN_PROGRESS");
    const drop = new Set(current.slice(0, Math.min(2, current.length - 1)).map((r) => r.subjectCode));
    records = records.filter((r) => !drop.has(r.subjectCode));
    applied = drop.size > 0;
  }

  // Leave out anything the curriculum's own rules would flag (e.g. a subject
  // after the failed one), so only the intended violation shows.
  const engine = new AuditEngine();
  const recordOf = () => new AcademicRecord(id, curriculum, yearLevel, records, history);
  for (let i = 0; i < 30; i++) {
    const unwanted = engine
      .auditCurriculum(recordOf())
      .filter((r) => r.status === "VIOLATION" && !allowed.has(r.subjectCode))
      .map((r) => r.subjectCode);
    if (unwanted.length === 0) break;
    records = records.filter((r) => !unwanted.includes(r.subjectCode));
  }

  const logs: LogRow[] = [
    ...extraLogs.filter((l) => records.some((r) => r.subjectCode === l.subjectCode)),
    ...records
      .filter((r) => !extraLogs.some((l) => l.subjectCode === r.subjectCode))
      .map((r, i) => ({ subjectCode: r.subjectCode, old: null, next: { ...r }, at: gradeDate(r.term!, i % 5) })),
  ];

  const record = recordOf();
  const { results, yearLevel: level } = engine.auditStudent(record, currentTerm);
  const status = enrollmentStatus(record, currentTerm, level.level);
  const violations = results.filter((r) => r.status === "VIOLATION").map((r) => r.subjectCode);
  const outcome = [
    `year ${level.level}`,
    status.kind === "REGULAR" ? "regular" : status.kind === "IRREGULAR" ? "irregular" : "not determined",
    ...(violations.length ? [`violation: ${violations.join(", ")}`] : []),
    ...(applied || variant === "regular" ? [] : ["(no fitting subject, so all passed)"]),
  ].join(", ");
  return { records, logs, outcome };
}

async function remove(client: SupabaseClient) {
  const registered = await selectAll<{ student_id: string; source: string; recorded_by: string }>(
    client,
    "student_year_levels",
    "student_id, source, recorded_by"
  );
  const created = [...new Set(registered.filter((r) => r.source === "REGISTERED" && r.recorded_by === DEMO).map((r) => r.student_id))];
  const logs = (
    await selectAll<{ student_id: string; subject_id: string; changed_by: string }>(client, "grade_audit_log", "student_id, subject_id, changed_by")
  ).filter((l) => l.changed_by === DEMO && !created.includes(l.student_id));
  const graded = [...new Set(logs.map((l) => l.student_id))];

  console.log(`Demo students to delete: ${created.length}. Existing students whose demo grades go: ${graded.length}.`);
  if (!process.argv.includes("--apply")) {
    console.log("Nothing changed. Run with --remove --apply to remove it.");
    return;
  }
  for (let i = 0; i < created.length; i += 100) {
    const { error } = await client.from("students").delete().in("id", created.slice(i, i + 100));
    if (error) throw error;
  }
  for (const studentId of graded) {
    const subjectIds = [...new Set(logs.filter((l) => l.student_id === studentId).map((l) => l.subject_id))];
    const { error } = await client.from("subject_records").delete().eq("student_id", studentId).in("subject_id", subjectIds);
    if (error) throw error;
    const { error: logError } = await client.from("grade_audit_log").delete().eq("student_id", studentId).eq("changed_by", DEMO);
    if (logError) throw logError;
  }
  console.log("Demo data removed.");
}

async function main() {
  const client = createAdminClient();
  if (process.argv.includes("--remove")) return remove(client);
  const apply = process.argv.includes("--apply");

  const curricula = await selectAll<{ id: string; program: string; effective_year: number; college_id: string | null }>(
    client,
    "curricula",
    "id, program, effective_year, college_id"
  );
  const subjectRows = await selectAll<{ id: string; curriculum_id: string; code: string }>(client, "subjects", "id, curriculum_id, code");
  const terms = await selectAll<{ college_id: string; current_term: string }>(client, "college_terms", "college_id, current_term");
  const students = await selectAll<{ id: string; name: string; curriculum_id: string; nominal_year_level: number }>(
    client,
    "students",
    "id, name, curriculum_id, nominal_year_level"
  );
  const gradedIds = new Set((await selectAll<{ student_id: string }>(client, "subject_records", "student_id")).map((r) => r.student_id));

  const withSubjects = curricula.filter((c) => subjectRows.some((s) => s.curriculum_id === c.id));
  const repository = new SupabaseAcademicRecordRepository(client);
  const { maps } = await repository.loadCurricula(withSubjects.map((c) => c.id));
  const subjectId = new Map(subjectRows.map((s) => [`${s.curriculum_id}|${s.code}`, s.id]));
  const takenIds = new Set(students.map((s) => s.id));
  const takenNames = new Set(students.map((s) => s.name.toLowerCase()));
  let nameIndex = 0;
  const newName = () => {
    for (;;) {
      const i = nameIndex++;
      const last = SURNAMES[i % SURNAMES.length];
      const first = FIRST_NAMES[(i * 7 + Math.floor(i / SURNAMES.length)) % FIRST_NAMES.length];
      const middle = String.fromCharCode(65 + ((i * 11) % 26));
      const name = `${last}, ${first} ${middle}.`;
      if (!takenNames.has(name.toLowerCase())) return takenNames.add(name.toLowerCase()), name;
    }
  };
  const newId = (entry: number) => {
    for (let n = 900001; ; n++) {
      const id = `${String(entry).padStart(2, "0")}-${n}`;
      if (!takenIds.has(id)) return takenIds.add(id), id;
    }
  };

  const plans: Plan[] = [];
  const programs = [...new Set(withSubjects.map((c) => c.program))].sort();
  for (const program of programs) {
    const versions = withSubjects.filter((c) => c.program === program).sort((a, b) => a.effective_year - b.effective_year);
    const currentTerm = terms.find((t) => t.college_id === versions[0].college_id)?.current_term;
    if (!currentTerm || !isValidTerm(currentTerm)) {
      console.log(`${program}: skipped — the dean hasn't set the current semester.`);
      continue;
    }

    const programStudents = students.filter((s) => versions.some((v) => v.id === s.curriculum_id));
    const existing = await repository.getRecords(programStudents.map((s) => s.id));
    const engine = new AuditEngine();
    // The year level the student's page shows.
    const levelOf = (id: string) => engine.yearLevel(existing.get(id)!, currentTerm).level;

    console.log(`\n${program} — current semester ${currentTerm}, curricula ${versions.map((v) => v.effective_year).join(", ")}`);
    for (let year = 1; year <= 4; year++) {
      const inYear = programStudents.filter((s) => existing.has(s.id) && levelOf(s.id) === year);
      const ungraded = inYear.filter((s) => !gradedIds.has(s.id)).sort((a, b) => a.id.localeCompare(b.id));
      const toCreate = Math.max(0, PER_YEAR - inYear.length);
      // New students use the newest curriculum in effect when they entered.
      const entry = schoolYear(currentTerm) - (year - 1);
      const version = [...versions].reverse().find((v) => v.effective_year <= 2000 + entry) ?? versions[0];

      const people = [
        ...ungraded.map((s) => ({ id: s.id, name: s.name, isNew: false, curriculumId: s.curriculum_id, history: existing.get(s.id)!.yearLevelHistory })),
        ...Array.from({ length: toCreate }, () => ({
          id: newId(entry),
          name: newName(),
          isNew: true,
          curriculumId: version.id,
          history: [{ term: currentTerm, yearLevel: year, source: "REGISTERED" as const }],
        })),
      ];
      people.forEach((p, i) => {
        const variant = VARIANTS[(inYear.length - ungraded.length + i) % VARIANTS.length];
        plans.push({
          ...p,
          yearLevel: year,
          variant,
          ...planGrades(p.id, maps.get(p.curriculumId)!, year, p.history, currentTerm, variant),
        });
      });
      console.log(
        `  Year ${year}: ${inYear.length - ungraded.length} with grades (left alone), ${ungraded.length} without grades (get demo grades), ${toCreate} new`
      );
    }
  }

  console.log("\nStudents to show in the presentation:");
  for (const p of plans) {
    if (p.variant === "regular") continue;
    const program = withSubjects.find((c) => c.id === p.curriculumId)!.program;
    console.log(`  ${program} ${p.id}  ${p.name.padEnd(32)} ${VARIANT_LABEL[p.variant].padEnd(32)} → ${p.outcome}`);
  }
  const grades = plans.reduce((n, p) => n + p.records.length, 0);
  console.log(
    `\nIn all: ${plans.filter((p) => p.isNew).length} new students, ${plans.filter((p) => !p.isNew).length} existing students given grades, ${grades} grades.`
  );

  if (!apply) {
    console.log("Nothing changed. Run again with --apply to add it.");
    return;
  }

  const created = plans.filter((p) => p.isNew);
  await insertAll(
    client,
    "students",
    created.map((p) => ({ id: p.id, name: p.name, curriculum_id: p.curriculumId, nominal_year_level: p.yearLevel }))
  );
  // Marks the new students as demo data, for --remove.
  for (let i = 0; i < created.length; i += 100) {
    const { error } = await client
      .from("student_year_levels")
      .update({ recorded_by: DEMO })
      .eq("source", "REGISTERED")
      .in("student_id", created.slice(i, i + 100).map((p) => p.id));
    if (error) throw error;
  }
  const idOf = (p: Plan, code: string) => subjectId.get(`${p.curriculumId}|${code}`)!;
  await insertAll(
    client,
    "subject_records",
    plans.flatMap((p) =>
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
    plans.flatMap((p) =>
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
        changed_by: DEMO,
        changed_at: l.at,
      }))
    )
  );
  console.log("Demo data added. Remove it later with: npx tsx scripts/seed-demo.ts --remove --apply");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
