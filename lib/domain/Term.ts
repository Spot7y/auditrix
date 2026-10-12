/**
 * A KSU term written "YY-S" as on KSU records: the school year's first two
 * digits and the semester, 1 (first), 2 (second) or S (midyear). "25-1" is
 * the first semester of school year 2025–2026. A midyear carries the year
 * of the semester after it, so "26-S" is the summer between "25-2" and
 * "26-1".
 */
export interface Term {
  year: number;
  /** 3 is the midyear ("S"). */
  semester: 1 | 2 | 3;
}

const TERM_PATTERN = /^(\d{2})-([12S])$/;

export function parseTerm(value: string | null | undefined): Term | null {
  const match = TERM_PATTERN.exec((value ?? "").trim());
  if (!match) return null;
  return { year: Number(match[1]), semester: match[2] === "S" ? 3 : (Number(match[2]) as 1 | 2) };
}

export function formatTerm(term: Term): string {
  return `${String(term.year).padStart(2, "0")}-${term.semester === 3 ? "S" : term.semester}`;
}

/** Where a semester falls within its year number: the midyear comes first. */
const POSITION: Record<1 | 2 | 3, number> = { 3: 0, 1: 1, 2: 2 };

/**
 * Negative when `a` comes before `b`, 0 when they are the same term,
 * positive when `a` comes after. Both must be valid terms.
 */
export function compareTerms(a: string, b: string): number {
  const ta = parseTerm(a);
  const tb = parseTerm(b);
  if (!ta || !tb) throw new Error(`Invalid term: ${!ta ? a : b}`);
  return ta.year - tb.year || POSITION[ta.semester] - POSITION[tb.semester];
}

export function isValidTerm(value: string | null | undefined): value is string {
  return parseTerm(value) !== null;
}

/** The later of two terms. */
export function laterTerm(a: string, b: string): string {
  return compareTerms(a, b) >= 0 ? a : b;
}

const SEMESTER_NAME: Record<1 | 2 | 3, string> = { 1: "1st semester", 2: "2nd semester", 3: "Midyear" };

/** "25-1" → "1st semester, SY 2025–2026"; "26-S" → "Midyear, SY 2025–2026". */
export function describeTerm(value: string): string {
  const term = parseTerm(value);
  if (!term) return value;
  // The midyear ends the school year before its year number.
  const start = 2000 + term.year - (term.semester === 3 ? 1 : 0);
  return `${SEMESTER_NAME[term.semester]}, SY ${start}–${start + 1}`;
}
