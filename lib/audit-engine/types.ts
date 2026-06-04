export interface AuditViolation {
  courseCode: string;
  missingPrerequisite: string;
  reason: string;
}

export interface AuditResult {
  overallStatus:
    | "Validated"
    | "Pending"
    | "Violated";

  validatedCourses: string[];

  pendingCourses: string[];

  violatedCourses: AuditViolation[];

  incWarnings: string[];
}