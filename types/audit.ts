export type AuditStatus =
  | "Pending"
  | "Validated"
  | "Violated";

export interface AuditViolation {
  courseCode: string;

  missingPrerequisite: string;

  reason: string;
}

export interface AuditResult {
  overallStatus: AuditStatus;

  validatedCourses: string[];

  pendingCourses: string[];

  violatedCourses: AuditViolation[];

  incWarnings: string[];

  residencyWarning?: string;
}