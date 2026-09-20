export type AuditStatus = "COMPLETED" | "AVAILABLE" | "PENDING" | "UNAVAILABLE" | "VIOLATION";

export interface AuditResult {
  subjectCode: string;
  status: AuditStatus;
  reasons: string[]; // descriptions of unmet requirements, empty if none
}