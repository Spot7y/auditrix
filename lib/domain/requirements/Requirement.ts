import type { AcademicRecord } from "../AcademicRecord";

/**
 * A single requirement a student must satisfy before enrolling in a
 * subject. Every concrete requirement type (course prerequisite, year
 * standing, etc.) implements this interface, so AuditEngine never needs
 * to know which kind it's checking — it just asks "is this satisfied?"
 */
export interface Requirement {
  /** Human-readable label, e.g. "CC 105" or "Third yr standing" */
  readonly description: string;

  isSatisfiedBy(record: AcademicRecord): boolean;

  /**
   * True when not yet satisfied, but not definitively violated either —
   * e.g. a prerequisite subject with an Incomplete grade or still in
   * progress. Distinguishes "wait and see" from "violated."
   */
  isPending(record: AcademicRecord): boolean;
}