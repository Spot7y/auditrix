import { MET, type AuditContext, type CheckOutcome, type Requirement } from "./Requirement";
import { isValidTerm } from "../Term";

export { meetsUnitThreshold } from "../yearLevels";

export type YearLevel = 1 | 2 | 3 | 4;

const LEVEL_NAMES: Record<YearLevel, string> = {
  1: "First",
  2: "Second",
  3: "Third",
  4: "Fourth",
};

/**
 * Satisfied by being on that year level or higher. The year level follows
 * what the student has finished (see AuditEngine): the unit share passed, or
 * every earlier year's subjects passed, unless a chairperson set it by hand.
 *
 * For a subject already taken, it's the year level going into the term it
 * was taken, counting only what was passed before that term. When nothing was
 * recorded for that term and the grades alone don't show the standing (older
 * grades may not be entered yet), it's flagged to verify rather than as a
 * violation.
 */
export class YearStandingRequirement implements Requirement {
  constructor(public readonly level: YearLevel) {}

  get description(): string {
    return `${LEVEL_NAMES[this.level]} yr standing`;
  }

  check(context: AuditContext, asOf: string | null): CheckOutcome {
    const term = isValidTerm(asOf) ? asOf : null;
    const yearLevel = context.yearLevelAt(term);
    if (yearLevel.level >= this.level) return MET;

    if (term !== null && !yearLevel.known) {
      return {
        state: "VERIFY",
        reason: `Year standing: please verify (${this.description} in ${term}; no year level is recorded for that term)`,
      };
    }
    return { state: "UNMET", reason: term === null ? this.description : `${this.description} in ${term}` };
  }
}
