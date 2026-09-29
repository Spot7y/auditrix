/** Year levels are 1–4 (Freshman to Senior). */
export const MAX_YEAR_LEVEL = 4;

export const YEAR_LEVEL_NAME: Record<number, string> = { 1: "Freshman", 2: "Sophomore", 3: "Junior", 4: "Senior" };

/**
 * A year level recorded for a student from a term on:
 *  - REGISTERED: the level they were registered or imported at, a starting
 *    point until their grades show a higher one;
 *  - CHAIRPERSON: a chairperson's override for a special case, or with
 *    `yearLevel` null, back to automatic.
 */
export interface YearLevelEntry {
  term: string;
  yearLevel: number | null;
  source: "REGISTERED" | "CHAIRPERSON";
}

/** A student's year level, and what it's based on. */
export interface YearLevelInfo {
  level: number;
  basis: "GRADES" | "REGISTERED" | "CHAIRPERSON";
  /**
   * False when it's from grades alone for a term nothing was recorded for,
   * so the student may have been further along than the entered grades show.
   */
  known: boolean;
}

/**
 * Share of the curriculum's units a student needs for each year level, per
 * the KSU Operations Manual: Sophomore 25% or more, Junior more than 50%
 * (exactly half isn't enough), Senior 75% or more.
 */
export function meetsUnitThreshold(level: number, percent: number): boolean {
  if (level <= 1) return true;
  if (level === 2) return percent >= 25;
  if (level === 3) return percent > 50;
  return percent >= 75;
}

/**
 * The year level a student's finished subjects put them in: the highest
 * level whose unit share they've reached, or whose earlier years' subjects
 * they've all passed. `completedYears(n)` says whether every subject of years
 * 1 to n is passed.
 */
export function yearLevelFromProgress(unitPercent: number, completedYears: (throughYear: number) => boolean): number {
  for (let level = MAX_YEAR_LEVEL; level > 1; level--) {
    if (meetsUnitThreshold(level, unitPercent) || completedYears(level - 1)) return level;
  }
  return 1;
}
