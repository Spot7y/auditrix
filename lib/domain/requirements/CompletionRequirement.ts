import { MET, type AuditContext, type CheckOutcome, type Requirement } from "./Requirement";
import { compareTerms, isValidTerm } from "../Term";

/**
 * Satisfied only when every other subject of the curriculum is passed — the
 * "ALL SUBJECTS" case from Binaraba's spreadsheet, used for practicum/
 * capstone-style subjects that require the whole program completed.
 * Subjects that themselves need all subjects completed (the practicum
 * itself) are left out.
 */
export class CompletionRequirement implements Requirement {
  get description(): string {
    return "All subjects completed";
  }

  check(context: AuditContext, asOf: string | null): CheckOutcome {
    const others = context.record.curriculum
      .allSubjects()
      .filter((s) => !s.requirements.some((r) => r instanceof CompletionRequirement));
    const term = isValidTerm(asOf) ? asOf : null;

    let missing = 0;
    let waiting = 0;
    for (const subject of others) {
      const attempt = context.record.recordOf(subject.code);
      // Taken in or after `term`: it can't count, and isn't worked out.
      if (term !== null && attempt && isValidTerm(attempt.term) && compareTerms(attempt.term, term) >= 0) {
        missing += 1;
        continue;
      }
      const credit = context.creditOf(subject.code);
      if (credit.kind === "CREDITED" && (term === null || credit.term === null || compareTerms(credit.term, term) < 0)) {
        continue;
      }
      const stillOpen =
        term === null
          ? credit.kind === "PENDING"
          : attempt?.status === "IN_PROGRESS" && isValidTerm(attempt.term) && compareTerms(attempt.term, term) < 0;
      if (stillOpen) waiting += 1;
      else missing += 1;
    }

    if (missing === 0 && waiting === 0) return MET;
    if (term === null) {
      return { state: missing > 0 ? "UNMET" : "PENDING", reason: this.description };
    }
    if (missing > 0) {
      const count = missing === 1 ? "1 subject was" : `${missing} subjects were`;
      return { state: "UNMET", reason: `All subjects completed (${count} not passed before ${term})` };
    }
    return { state: "PENDING", reason: "All subjects completed (some earlier grades aren't final yet)" };
  }
}
