import type { AcademicRecord } from "./AcademicRecord";
import { compareTerms, isValidTerm, parseTerm } from "./Term";

/**
 * Regular or irregular, per the KSU Operations Manual:
 *  - Regular: enrolled in the prescribed academic load for the semester.
 *  - Irregular: enrolled in less than the prescribed load.
 *
 * The prescribed load is the curriculum's subjects for the student's year
 * level (`yearLevel`, see AuditEngine.yearLevel) and the current semester. Subjects already passed in an earlier term
 * don't need to be taken again, and back subjects taken on top of the full
 * load don't make a student irregular. A student with nothing recorded for
 * the current semester isn't enrolled as far as Auditrix knows, so their
 * status is not determined.
 */
export type EnrollmentStatus =
  | { kind: "REGULAR"; term: string }
  | { kind: "IRREGULAR"; term: string; missing: string[] }
  | { kind: "NOT_DETERMINED"; reason: string };

const SEMESTER_NAME: Record<number, string> = { 1: "first semester", 2: "second semester", 3: "midyear" };
const YEAR_NAME: Record<number, string> = { 1: "1st year", 2: "2nd year", 3: "3rd year", 4: "4th year" };

export function enrollmentStatus(record: AcademicRecord, currentTerm: string | null, yearLevel: number): EnrollmentStatus {
  if (!isValidTerm(currentTerm)) {
    return { kind: "NOT_DETERMINED", reason: "The dean hasn’t set the current semester." };
  }
  const { semester } = parseTerm(currentTerm)!;
  const subjects = record.curriculum.allSubjects();

  const enrolled = subjects.filter((s) => record.recordOf(s.code)?.term === currentTerm);
  if (enrolled.length === 0) {
    return { kind: "NOT_DETERMINED", reason: `No enrollment is recorded for ${currentTerm}.` };
  }

  const prescribed = subjects.filter((s) => s.yearLevel === yearLevel && s.semester === semester);
  if (prescribed.length === 0) {
    return {
      kind: "NOT_DETERMINED",
      reason: `The curriculum prescribes no subjects for ${YEAR_NAME[yearLevel] ?? `year ${yearLevel}`}, ${SEMESTER_NAME[semester]}.`,
    };
  }

  const missing = prescribed
    .filter((s) => {
      const attempt = record.recordOf(s.code);
      if (!attempt) return true;
      if (attempt.term === currentTerm) return false;
      const passedEarlier =
        attempt.status === "PASSED" && isValidTerm(attempt.term) && compareTerms(attempt.term, currentTerm) < 0;
      return !passedEarlier;
    })
    .map((s) => s.code)
    .sort((a, b) => a.localeCompare(b));

  return missing.length === 0
    ? { kind: "REGULAR", term: currentTerm }
    : { kind: "IRREGULAR", term: currentTerm, missing };
}
