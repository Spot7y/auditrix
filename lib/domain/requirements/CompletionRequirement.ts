import type { Requirement } from "./Requirement";
import type { AcademicRecord } from "../AcademicRecord";

/**
 * Satisfied only when 100% of the curriculum's units are passed — the
 * "ALL SUBJECTS" case from Binaraba's spreadsheet, used for practicum/
 * capstone-style subjects that require the whole program completed.
 */
export class CompletionRequirement implements Requirement {
  get description(): string {
    return "All subjects completed";
  }

  isSatisfiedBy(record: AcademicRecord): boolean {
    return record.unitCompletionPercentage() >= 100;
  }

  isPending(_record: AcademicRecord): boolean {
    return false;
  }
}