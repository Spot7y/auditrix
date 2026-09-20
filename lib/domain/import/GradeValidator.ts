import type { SubjectRecordStatus } from "../SubjectRecord";

export type RawGradeInput =
  | { kind: "numeric"; value: number }
  | { kind: "incomplete" }
  | { kind: "in_progress" };

export type GradeValidationResult =
  | { valid: true; status: SubjectRecordStatus; grade: number | null }
  | { valid: false; reason: string };

// The exact set of grade values KSU uses — confirmed by the adviser.
// Note there is no 4.0; it jumps from 3.0 (lowest passing) straight to 5.0 (fail).
const VALID_NUMERIC_GRADES: number[] = [1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 5.0];
const PASSING_MAX = 3.0;

export class GradeValidator {
  validate(input: RawGradeInput): GradeValidationResult {
    if (input.kind === "incomplete") {
      return { valid: true, status: "INCOMPLETE", grade: null };
    }
    if (input.kind === "in_progress") {
      return { valid: true, status: "IN_PROGRESS", grade: null };
    }

    const { value } = input;
    if (!VALID_NUMERIC_GRADES.includes(value)) {
      return {
        valid: false,
        reason: `${value} is not a valid KSU grade value.`,
      };
    }

    const status: SubjectRecordStatus = value <= PASSING_MAX ? "PASSED" : "FAILED";
    return { valid: true, status, grade: value };
  }
}