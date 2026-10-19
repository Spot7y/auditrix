export type AuditStatus = "COMPLETED" | "AVAILABLE" | "INCOMPLETE" | "UNAVAILABLE" | "VIOLATION";

export interface AuditResult {
  subjectCode: string;
  status: AuditStatus;
  reasons: string[]; // descriptions of unmet requirements, empty if none
  /** Things to double-check that don't change the status, e.g. a missing term. */
  warnings: string[];
  /**
   * Taken out of order, but everything it needs is passed now, so it's
   * AVAILABLE to be retaken (e.g. NSTP 2 taken while NSTP 1 was failed, then
   * NSTP 1 retaken and passed). Only set when true.
   */
  outOfOrder?: true;
}

/** Whether the subject was taken out of order: still a violation, or now waiting to be retaken. */
export function isOutOfOrder(result: AuditResult): boolean {
  return result.status === "VIOLATION" || result.outOfOrder === true;
}
