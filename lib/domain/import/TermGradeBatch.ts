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
  /**
   * Subjects whose recorded grade is from a later term, which this batch may
   * replace anyway: the chairperson confirmed it corrects a wrong term.
   */
  replaceLaterTerm?: string[];
}