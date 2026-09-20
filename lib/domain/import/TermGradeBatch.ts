import type { RawGradeInput } from "./GradeValidator";

export interface TermGradeEntry {
  subjectCode: string;
  input: RawGradeInput;
}

/** One chairperson submission: one student, one term, several subjects at once. */
export interface TermGradeBatch {
  studentId: string;
  term: string; // e.g. "25-2"
  entries: TermGradeEntry[];
}