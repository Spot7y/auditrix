/**
 * A KSU term written "YY-S": the school year's first two digits and the
 * semester, 1 (first), 2 (second) or 3 (midyear). "25-1" is the first
 * semester of school year 2025–2026, and its midyear "25-3" comes before
 * "26-1".
 */
export interface Term {
  year: number;
  semester: 1 | 2 | 3;
}

const TERM_PATTERN = /^(\d{2})-([123])$/;

export function parseTerm(value: string | null | undefined): Term | null {
  const match = TERM_PATTERN.exec((value ?? "").trim());
  if (!match) return null;
  return { year: Number(match[1]), semester: Number(match[2]) as 1 | 2 | 3 };
}

export function formatTerm(term: Term): string {
  return `${String(term.year).padStart(2, "0")}-${term.semester}`;
}

/**
 * Negative when `a` comes before `b`, 0 when they are the same term,
 * positive when `a` comes after. Both must be valid terms.
 */
export function compareTerms(a: string, b: string): number {
  const ta = parseTerm(a);
  const tb = parseTerm(b);
  if (!ta || !tb) throw new Error(`Invalid term: ${!ta ? a : b}`);
  return ta.year - tb.year || ta.semester - tb.semester;
}

export function isValidTerm(value: string | null | undefined): value is string {
  return parseTerm(value) !== null;
}

/** The later of two terms. */
export function laterTerm(a: string, b: string): string {
  return compareTerms(a, b) >= 0 ? a : b;
}

const SEMESTER_NAME: Record<1 | 2 | 3, string> = { 1: "1st semester", 2: "2nd semester", 3: "Midyear" };

/** "25-1" → "1st semester, SY 2025–2026". */
export function describeTerm(value: string): string {
  const term = parseTerm(value);
  if (!term) return value;
  const start = 2000 + term.year;
  return `${SEMESTER_NAME[term.semester]}, SY ${start}–${start + 1}`;
}
