import { MET, type AuditContext, type CheckOutcome, type Requirement } from "./Requirement";
import type { AcademicRecord } from "../AcademicRecord";

export type YearLevel = 1 | 2 | 3 | 4;

// Unit-percentage bands per the KSU student handbook
const UNIT_THRESHOLDS: Record<YearLevel, number> = {
  1: 0,
  2: 25,
  3: 50,
  4: 75,
};

const LEVEL_NAMES: Record<YearLevel, string> = {
  1: "First",
  2: "Second",
  3: "Third",
  4: "Fourth",
};

/**
 * Satisfied by ANY ONE of three conditions (per the handbook):
 *  1. Nominal year level per curriculum
 *  2. All prior years' subjects completed
 *  3. Units earned cross the percentage threshold for that year
 */
export class YearStandingRequirement implements Requirement {
  constructor(public readonly level: YearLevel) {}

  get description(): string {
    return `${LEVEL_NAMES[this.level]} yr standing`;
  }

  check(context: AuditContext): CheckOutcome {
    return this.isSatisfiedBy(context.record) ? MET : { state: "UNMET", reason: this.description };
  }

  private isSatisfiedBy(record: AcademicRecord): boolean {
    return (
      record.nominalYearLevel >= this.level ||
      record.hasCompletedAllSubjectsThroughYear(this.level - 1) ||
      record.unitCompletionPercentage() >= UNIT_THRESHOLDS[this.level]
    );
  }
}
