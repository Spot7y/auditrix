import type { AuditResult } from "../AuditResult";

export type GradeEntryRowResult =
  | { accepted: true; subjectCode: string }
  | { accepted: false; rawCode: string; reason: string };

export interface GradeEntryResult {
  studentId: string;
  term: string;
  rows: GradeEntryRowResult[];
  /** Full recomputed curriculum audit — only populated if at least one row was accepted. */
  audit: AuditResult[];
}