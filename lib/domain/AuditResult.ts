export type AuditStatus = "COMPLETED" | "AVAILABLE" | "PENDING" | "UNAVAILABLE" | "VIOLATION";

export interface AuditResult {
  subjectCode: string;
  status: AuditStatus;
  reasons: string[]; // descriptions of unmet requirements, empty if none
  /** Things to double-check that don't change the status, e.g. a missing term. */
  warnings: string[];
}
