import { MET, type AuditContext, type CheckOutcome, type Requirement } from "./Requirement";
import { compareTerms, isValidTerm } from "../Term";

export type PrerequisiteType = "PREREQUISITE" | "COREQUISITE";

/**
 * A subject that must be passed before this one (PREREQUISITE), or taken
 * in the same semester as this one (COREQUISITE).
 *
 * Co-requisites are paired both ways and checked by AuditEngine itself,
 * since they depend on both subjects' records; `check` covers the
 * prerequisite case.
 */
export class CoursePrerequisite implements Requirement {
  constructor(
    public readonly subjectCode: string,
    public readonly type: PrerequisiteType = "PREREQUISITE"
  ) {}

  get description(): string {
    return this.subjectCode;
  }

  check(context: AuditContext, asOf: string | null): CheckOutcome {
    const code = this.subjectCode;
    const credit = context.creditOf(code);
    const attempt = context.record.recordOf(code);

    if (asOf === null || !isValidTerm(asOf)) {
      if (credit.kind === "CREDITED") return MET;
      if (credit.kind === "PENDING") return { state: "PENDING", reason: code };
      return { state: "UNMET", reason: code };
    }

    // Taken in term `asOf`: the prerequisite must have been passed, and
    // count, in an earlier term.
    if (credit.kind === "CREDITED" && (credit.term === null || compareTerms(credit.term, asOf) < 0)) {
      return MET;
    }

    const takenTerm = attempt && isValidTerm(attempt.term) ? attempt.term : null;
    const takenBefore = takenTerm !== null && compareTerms(takenTerm, asOf) < 0;

    if (takenTerm !== null && compareTerms(takenTerm, asOf) === 0) {
      return { state: "UNMET", reason: `${code} was taken in the same term (${asOf})` };
    }
    if (takenBefore && attempt?.status === "IN_PROGRESS") {
      return { state: "PENDING", reason: `${code} (${takenTerm}) has no final grade yet` };
    }
    if (takenBefore && attempt?.status === "INCOMPLETE") {
      return { state: "UNMET", reason: `${code} was still INC in ${asOf}` };
    }
    if (takenBefore && attempt?.status === "PASSED") {
      if (credit.kind === "PENDING") {
        return { state: "PENDING", reason: `${code} isn't final yet (waiting on its co-requisite's grade)` };
      }
      if (credit.kind === "NONE") {
        return { state: "UNMET", reason: `${code} doesn't count (it has to be retaken)` };
      }
      if (attempt.resolvedTerm) {
        return { state: "UNMET", reason: `${code} was still INC in ${asOf} (resolved ${attempt.resolvedTerm})` };
      }
      return { state: "UNMET", reason: `${code} was passed only in ${credit.term}` };
    }
    if (credit.kind === "CREDITED" && credit.term !== null) {
      return { state: "UNMET", reason: `${code} was passed only in ${credit.term}` };
    }
    return { state: "UNMET", reason: `${code} was not passed before ${asOf}` };
  }
}

export function isCorequisite(requirement: Requirement): requirement is CoursePrerequisite {
  return requirement instanceof CoursePrerequisite && requirement.type === "COREQUISITE";
}
