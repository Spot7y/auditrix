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
  /** The term the subject was taken, e.g. "25-1". */
  term: string | null;
  /**
   * The term an INC was replaced by a final grade, when that happened in a
   * later term. The subject only counts as passed from this term on.
   */
  resolvedTerm?: string | null;
}
