import type { AuditResult } from "../AuditResult";

export type GradeEntryRowResult =
  /** `resolvedFrom`: the term of the INC this grade resolved, if it was one. */
  | { accepted: true; subjectCode: string; resolvedFrom?: string }
  | { accepted: false; rawCode: string; reason: string };

export interface GradeEntryResult {
  studentId: string;
  term: string;
  rows: GradeEntryRowResult[];
  /** Full recomputed curriculum audit — only populated if at least one row was accepted. */
  audit: AuditResult[];
}
