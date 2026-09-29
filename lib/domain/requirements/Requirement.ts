import type { AcademicRecord } from "../AcademicRecord";

/**
 * Whether a subject's pass counts, and from which term.
 *  - CREDITED: it counts from `term` (null when no term was recorded).
 *  - PENDING: not final yet, e.g. in progress, INC, or waiting on a
 *    co-requisite's grade.
 *  - NONE: it doesn't count: never passed, failed, or its credit is void
 *    because it was taken out of order.
 */
export type Credit = { kind: "CREDITED"; term: string | null } | { kind: "PENDING" } | { kind: "NONE" };

/** What a requirement check can see: the record, and which passes count. */
export interface AuditContext {
  readonly record: AcademicRecord;
  creditOf(subjectCode: string): Credit;
}

export type CheckOutcome =
  | { state: "MET" }
  /** Can't be decided yet, e.g. the prerequisite is still in progress. */
  | { state: "PENDING"; reason: string }
  /**
   * Couldn't be confirmed from what's recorded, but may well have been met,
   * e.g. year standing in a term with no year level recorded. Shown as a
   * warning to check, not a violation.
   */
  | { state: "VERIFY"; reason: string }
  | { state: "UNMET"; reason: string };

export const MET: CheckOutcome = { state: "MET" };

/**
 * A single requirement a student must satisfy before taking a subject.
 * Every concrete requirement type (course prerequisite, year standing,
 * etc.) implements this interface, so AuditEngine never needs to know
 * which kind it's checking.
 */
export interface Requirement {
  /** Human-readable label, e.g. "CC 105" or "Third yr standing" */
  readonly description: string;

  /**
   * Checks the requirement for a subject taken in term `asOf`, counting
   * only what was passed before that term. With `asOf` null, checks
   * whether the subject can be taken now.
   */
  check(context: AuditContext, asOf: string | null): CheckOutcome;
}
