import { compareTerms, formatTerm, parseTerm } from "./Term";

export interface YearLevelEntry {
  /** The student is in `yearLevel` from this term until the next entry. */
  term: string;
  yearLevel: number;
}

/** Year levels are 1–4 (Freshman to Senior). */
export const MAX_YEAR_LEVEL = 4;

export const YEAR_LEVEL_NAME: Record<number, string> = { 1: "Freshman", 2: "Sophomore", 3: "Junior", 4: "Senior" };

/**
 * The year level recorded for a term: the latest entry at or before it.
 * Null when the history doesn't reach back that far.
 */
export function yearLevelAsOf(history: YearLevelEntry[], term: string): number | null {
  let found: YearLevelEntry | null = null;
  for (const entry of history) {
    if (compareTerms(entry.term, term) > 0) continue;
    if (!found || compareTerms(entry.term, found.term) > 0) found = entry;
  }
  return found?.yearLevel ?? null;
}

/**
 * The term a promotion takes effect from: students move up at the start of a
 * school year, so during the first semester that's the current term, and
 * later in the year it's the next school year's first semester.
 */
export function promotionTerm(currentTerm: string): string {
  const term = parseTerm(currentTerm);
  if (!term) throw new Error(`Invalid term: ${currentTerm}`);
  return term.semester === 1 ? formatTerm(term) : formatTerm({ year: term.year + 1, semester: 1 });
}

export type PromotionSkipReason = "SENIOR" | "DROPPED" | "TRANSFERRED_OUT";

/**
 * Why a student isn't promoted by default, if they aren't: 4th-year students
 * have no next year level, and dropped or transferred-out students are no
 * longer enrolled. `latestMovement` is the student's most recent transfer,
 * shift or drop.
 */
export function promotionSkipReason(yearLevel: number, latestMovement: string | null): PromotionSkipReason | null {
  if (latestMovement === "DROPPED") return "DROPPED";
  if (latestMovement === "TRANSFERRED_OUT") return "TRANSFERRED_OUT";
  if (yearLevel >= MAX_YEAR_LEVEL) return "SENIOR";
  return null;
}
