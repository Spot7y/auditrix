export type SubjectRecordStatus =
  | "PASSED"
  | "FAILED"
  | "INCOMPLETE"
  | "IN_PROGRESS"
  | "NOT_TAKEN";

export interface SubjectRecord {
  subjectCode: string;
  status: SubjectRecordStatus;
  grade: number | null;
  term: string | null;
  /** True if this grade was entered while its prerequisites were unmet. Permanent — never re-derived. */
  isInvalidEntry?: boolean;
}