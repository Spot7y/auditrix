import { MET, type AuditContext, type CheckOutcome, type Requirement } from "./Requirement";
import { compareTerms, isValidTerm } from "../Term";

export type YearLevel = 1 | 2 | 3 | 4;

const LEVEL_NAMES: Record<YearLevel, string> = {
  1: "First",
  2: "Second",
  3: "Third",
  4: "Fourth",
};

/**
 * Share of the curriculum's units a student needs for each year standing,
 * per the KSU Operations Manual: Sophomore 25% or more, Junior more than
 * 50% (exactly half isn't enough), Senior 75% or more.
 */
export function meetsUnitThreshold(level: YearLevel, percent: number): boolean {
  switch (level) {
    case 1:
      return true;
    case 2:
      return percent >= 25;
    case 3:
      return percent > 50;
    case 4:
      return percent >= 75;
  }
}

/**
 * Satisfied by ANY ONE of three conditions (per the handbook):
 *  1. Being on that year level (or higher)
 *  2. All prior years' subjects completed
 *  3. Units earned cross the percentage threshold for that year
 *
 * For a subject already taken, each is checked as of the term it was taken:
 * the year level recorded for that term, and only what was passed before
 * it. When no year level was recorded for that term and the grades alone
 * don't show the standing, it can't be ruled out, so it's flagged to verify
 * rather than as a violation.
 */
export class YearStandingRequirement implements Requirement {
  constructor(public readonly level: YearLevel) {}

  get description(): string {
    return `${LEVEL_NAMES[this.level]} yr standing`;
  }

  check(context: AuditContext, asOf: string | null): CheckOutcome {
    const term = isValidTerm(asOf) ? asOf : null;
    const yearLevel = term === null ? context.record.nominalYearLevel : context.record.yearLevelIn(term);

    if (yearLevel !== null && yearLevel >= this.level) return MET;
    if (this.earnedBefore(context, term)) return MET;

    if (term !== null && yearLevel === null) {
      return {
        state: "VERIFY",
        reason: `Year standing: please verify (${this.description} in ${term}; no year level is recorded for that term)`,
      };
    }
    return { state: "UNMET", reason: term === null ? this.description : `${this.description} in ${term}` };
  }

  /** Conditions 2 and 3, counting only passes that count and came before `term` (or at all, if null). */
  private earnedBefore(context: AuditContext, term: string | null): boolean {
    const subjects = context.record.curriculum.allSubjects();
    const counts = (code: string) => {
      // Anything taken in or after `term` can't have been passed before it;
      // skipping it also avoids working out subjects that depend on this one.
      const attempt = context.record.recordOf(code);
      if (attempt?.status !== "PASSED") return false;
      if (term !== null && isValidTerm(attempt.term) && compareTerms(attempt.term, term) >= 0) return false;
      const credit = context.creditOf(code);
      return credit.kind === "CREDITED" && (term === null || credit.term === null || compareTerms(credit.term, term) < 0);
    };

    const priorYears = subjects.filter((s) => s.yearLevel < this.level);
    if (priorYears.every((s) => counts(s.code))) return true;

    const total = subjects.reduce((sum, s) => sum + Number(s.units), 0);
    const earned = subjects.filter((s) => counts(s.code)).reduce((sum, s) => sum + Number(s.units), 0);
    return meetsUnitThreshold(this.level, total > 0 ? (earned / total) * 100 : 0);
  }
}
