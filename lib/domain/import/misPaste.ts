import { compareTerms } from "../Term";
import { findMatchingCode } from "./codeMatching";

// Reading a student's grades copied from the KSU-MIS "Academic Grades" page.
// The MIS can't export, but its page can be highlighted and copied. Each term
// is a block that starts "Term: 25-1 - First Semester" (or "26-S - Mid-Year"),
// followed by rows of CODE, DESCRIPTION, GRADE, UNITS, REMARKS. Depending on
// the browser the rows paste as tab-separated lines or with one cell per line;
// both are read.

export interface MisRow {
  term: string;
  code: string;
  description: string;
  /** As shown in the MIS, e.g. "2.5", "5", "IP", "UD", "INC". */
  grade: string;
}

export interface MisPaste {
  /** The ID number on the page, if it was copied too. */
  studentId: string | null;
  rows: MisRow[];
}

const TERM_LINE = /term:\s*(\d{2})\s*-\s*([12S])\b/i;
// A grade cell: a number like 2.5 or 5 (checked against KSU values later) or an MIS mark.
const GRADE_CELL = /^(\d(\.\d{1,2})?|INC|IP|UD|DRP|DR|OD|UW|W|NG|NC)$/i;
const HEADER_CELL = /^(code|description|grade|units|remarks)$/i;
// Cells after the grade: units ("3", "-") and remarks ("Passed", "Unofficially Dropped"…).
const TRAILING_CELL = /^(-|\d+(\.\d+)?|passed|failed|incomplete|unofficially|dropped|unofficially dropped|withdrawn|in progress|credited)$/i;
const STUDENT_ID = /\b(\d{2}-\d{5,6})\b/;

function cleanLines(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/ /g, " ").trimEnd());
}

/** Reads the terms and grade rows out of text pasted from the MIS. */
export function parseMisPaste(text: string): MisPaste {
  const lines = cleanLines(text);
  const firstTerm = lines.findIndex((l) => TERM_LINE.test(l));
  const before = firstTerm === -1 ? lines : lines.slice(0, firstTerm);
  const studentId = before.map((l) => STUDENT_ID.exec(l)?.[1]).find(Boolean) ?? null;

  const rows: MisRow[] = [];
  let term: string | null = null;
  // Cells of the current block when each cell pasted on its own line.
  let loose: string[] = [];

  const flushLoose = () => {
    if (term) rows.push(...rowsFromCells(loose, term));
    loose = [];
  };

  for (const line of lines) {
    const termMatch = TERM_LINE.exec(line);
    if (termMatch) {
      flushLoose();
      term = `${termMatch[1]}-${termMatch[2].toUpperCase()}`;
      continue;
    }
    if (!term) continue;
    const trimmed = line.trim();
    if (!trimmed || /^(school|program)\s*:/i.test(trimmed)) continue;

    const cells = trimmed.split(/\t+|\s{3,}/).map((c) => c.trim()).filter(Boolean);
    if (cells.every((c) => HEADER_CELL.test(c))) continue;
    // A whole row on one line: code, description, grade, …
    if (cells.length >= 3 && GRADE_CELL.test(cells[2])) {
      flushLoose();
      rows.push({ term, code: cells[0], description: cells[1], grade: cells[2].toUpperCase() });
      continue;
    }
    loose.push(trimmed);
  }
  flushLoose();
  return { studentId, rows };
}

/** Rows from one cell per line: code, description, grade, then units and remarks. */
function rowsFromCells(cells: string[], term: string): MisRow[] {
  const rows: MisRow[] = [];
  let i = 0;
  while (i + 2 < cells.length) {
    if (!GRADE_CELL.test(cells[i + 2]) || GRADE_CELL.test(cells[i]) || TRAILING_CELL.test(cells[i])) {
      i++;
      continue;
    }
    rows.push({ term, code: cells[i], description: cells[i + 1], grade: cells[i + 2].toUpperCase() });
    i += 3;
    while (i < cells.length && TRAILING_CELL.test(cells[i])) i++;
  }
  return rows;
}

// --- Planning what to save -----------------------------------------------------

export interface PlanSubject {
  code: string;
  title: string;
  currentGrade: number | null;
  currentStatus: "PASSED" | "FAILED" | "INCOMPLETE" | "NOT_TAKEN";
  currentTerm: string | null;
}

export type PastedGrade = { kind: "numeric"; value: number } | { kind: "incomplete" };

export type PlanAction =
  | "new"
  | "change"
  | "retake"
  | "complete-inc"
  | "same"
  | "later-recorded"
  | "in-progress"
  | "dropped"
  | "invalid"
  | "not-found"
  | "check"
  | "future";

export interface PlannedRow extends MisRow {
  /** The Auditrix subject it was matched to (by code, else by title). */
  subjectCode: string | null;
  matchedBy: "code" | "title" | null;
  grade: string;
  input: PastedGrade | null;
  action: PlanAction;
  /** Saved when the chairperson confirms (they can untick it). */
  save: boolean;
  note: string;
}

const KSU_GRADES = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 5];

function readGrade(raw: string): PastedGrade | "in-progress" | "dropped" | "invalid" {
  const value = raw.trim().toUpperCase();
  if (value === "IP" || value === "NG") return "in-progress";
  if (["UD", "DRP", "DR", "OD", "UW", "W", "NC"].includes(value)) return "dropped";
  if (value === "INC") return { kind: "incomplete" };
  const n = Number(value);
  return Number.isFinite(n) && KSU_GRADES.includes(n) ? { kind: "numeric", value: n } : "invalid";
}

const simplify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** The curriculum subject a pasted row is for: by code, else by an identical title (only if just one has it). */
export function matchSubject<T extends { code: string; title: string }>(
  row: { code: string; description: string },
  subjects: T[]
): { subject: T; by: "code" | "title"; conflict?: string } | null {
  const byTitle = subjects.filter((s) => simplify(s.title) === simplify(row.description) && simplify(s.title) !== "");
  const byCode = findMatchingCode(row.code, subjects);
  if (byCode) {
    // The MIS can have a wrong code (e.g. "SOC SCI 12 – Understanding the Self" when that's
    // PHILO 11): a code whose subject has a different title is left for the chairperson to check.
    const description = row.description.trim();
    if (description && simplify(byCode.title) !== simplify(description)) {
      const other = byTitle.find((s) => s.code !== byCode.code);
      if (other) {
        return {
          subject: byCode,
          by: "code",
          conflict: `The MIS says ${row.code} “${description}”, but ${byCode.code} here is “${byCode.title}”, and ${other.code} is “${other.title}”. Choose the right subject.`,
        };
      }
      if (titleSimilarity(byCode.title, description) < 0.5) {
        return {
          subject: byCode,
          by: "code",
          conflict: `The MIS calls it “${description}”, but ${byCode.code} here is “${byCode.title}”. Choose the right subject.`,
        };
      }
    }
    return { subject: byCode, by: "code" };
  }
  return byTitle.length === 1 ? { subject: byTitle[0], by: "title" } : null;
}

const SMALL_WORDS = new Set(["and", "the", "of", "in", "to", "a", "an", "for", "with", "on"]);
const words = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w && !SMALL_WORDS.has(w))
      .map((w) => w.replace(/s$/, ""))
  );

/** How alike two subject titles are, from 0 to 1, by shared words ("Data Structure" ≈ "Data Structures"). */
export function titleSimilarity(a: string, b: string): number {
  const x = words(a);
  const y = words(b);
  if (x.size === 0 || y.size === 0) return 0;
  const shared = [...x].filter((w) => y.has(w)).length;
  return shared / new Set([...x, ...y]).size;
}

const sameGrade = (input: PastedGrade, status: PlanSubject["currentStatus"], grade: number | null) =>
  input.kind === "incomplete" ? status === "INCOMPLETE" : grade === input.value && status !== "INCOMPLETE";

/**
 * What saving each pasted row would do, oldest term first, following the same
 * rules as entering grades by hand: only the latest attempt is kept, an INC is
 * completed by a later final grade, and nothing after the current semester.
 * `chosen` maps a row (by index in the paste) to a subject the chairperson
 * picked by hand.
 */
export function planMisPaste(
  pasted: MisRow[],
  subjects: PlanSubject[],
  currentTerm: string | null,
  chosen: Record<number, string> = {}
): PlannedRow[] {
  const byCode = new Map(subjects.map((s) => [s.code, s]));
  // What's recorded so far, updated as earlier rows would be saved.
  const state = new Map(subjects.map((s) => [s.code, { status: s.currentStatus, grade: s.currentGrade, term: s.currentTerm }]));

  const order = pasted
    .map((row, index) => ({ row, index }))
    .sort((a, b) => compareTerms(a.row.term, b.row.term) || a.index - b.index);

  const planned: PlannedRow[] = new Array(pasted.length);
  for (const { row, index } of order) {
    const picked = chosen[index] ? byCode.get(chosen[index]) : undefined;
    const match = picked ? { subject: picked, by: "code" as const } : matchSubject(row, subjects);
    const base = { ...row, subjectCode: match?.subject.code ?? null, matchedBy: match ? (picked ? null : match.by) : null };
    const result = (action: PlanAction, note: string, input: PastedGrade | null = null): PlannedRow => ({
      ...base,
      input,
      action,
      save: ["new", "change", "retake", "complete-inc"].includes(action),
      note,
    });

    const grade = readGrade(row.grade);
    if (currentTerm && compareTerms(row.term, currentTerm) > 0) {
      planned[index] = result("future", `${row.term} is after the current semester (${currentTerm}).`);
      continue;
    }
    if (grade === "in-progress") {
      planned[index] = result("in-progress", "No grade yet (in progress).");
      continue;
    }
    if (grade === "dropped") {
      planned[index] = result("dropped", `${row.grade}: dropped, so no grade is recorded.`);
      continue;
    }
    if (grade === "invalid") {
      planned[index] = result("invalid", `${row.grade} isn’t a KSU grade.`);
      continue;
    }
    if (match?.conflict) {
      planned[index] = result("check", match.conflict, grade);
      continue;
    }
    if (!match) {
      planned[index] = result("not-found", "No subject in this student’s curriculum has this code or title. Choose one, or leave it out.", grade);
      continue;
    }

    const code = match.subject.code;
    const now = state.get(code)!;
    const final = grade.kind === "numeric";
    let action: PlanAction;
    let note: string;
    if (now.status === "NOT_TAKEN" || !now.term) {
      action = "new";
      note = "New grade.";
    } else if (now.term === row.term) {
      if (sameGrade(grade, now.status, now.grade)) {
        planned[index] = result("same", "Already recorded.");
        continue;
      }
      action = now.status === "INCOMPLETE" && final ? "complete-inc" : "change";
      note = action === "complete-inc" ? "Completes the INC." : `Replaces ${now.status === "INCOMPLETE" ? "INC" : now.grade?.toFixed(2)} for the same term.`;
    } else if (compareTerms(row.term, now.term) < 0) {
      planned[index] = result("later-recorded", `A grade from a later term (${now.term}) is already recorded; only the latest attempt is kept.`);
      continue;
    } else if (now.status === "INCOMPLETE" && final) {
      action = "complete-inc";
      note = `Completes the INC from ${now.term}.`;
    } else {
      action = "retake";
      note = `Retaken after ${now.term}.`;
    }

    planned[index] = result(action, note, grade);
    // An INC completed later keeps its original term.
    const term = action === "complete-inc" ? now.term : row.term;
    state.set(code, {
      status: grade.kind === "incomplete" ? "INCOMPLETE" : grade.value <= 3 ? "PASSED" : "FAILED",
      grade: grade.kind === "numeric" ? grade.value : null,
      term,
    });
  }
  return planned;
}

