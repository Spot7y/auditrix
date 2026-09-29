import type { CurriculumMap } from "./CurriculumMap";
import type { SubjectRecord, SubjectRecordStatus } from "./SubjectRecord";
import { yearLevelAsOf, type YearLevelEntry } from "./yearLevels";

export class AcademicRecord {
  constructor(
    public readonly studentId: string,
    public readonly curriculum: CurriculumMap,
    public readonly nominalYearLevel: number,
    private readonly subjectRecords: SubjectRecord[],
    /** The student's year level by term, as far back as it was recorded. */
    public readonly yearLevelHistory: YearLevelEntry[] = []
  ) {}

  /** The year level recorded for a term, or null when the history doesn't reach it. */
  yearLevelIn(term: string): number | null {
    return yearLevelAsOf(this.yearLevelHistory, term);
  }

  private findRecord(subjectCode: string): SubjectRecord | undefined {
    return this.subjectRecords.find((r) => r.subjectCode === subjectCode);
  }

  /** The latest attempt recorded for a subject, if any. */
  recordOf(subjectCode: string): SubjectRecord | undefined {
    return this.findRecord(subjectCode);
  }

  hasPassed(subjectCode: string): boolean {
    return this.findRecord(subjectCode)?.status === "PASSED";
  }

  statusOf(subjectCode: string): SubjectRecordStatus {
    return this.findRecord(subjectCode)?.status ?? "NOT_TAKEN";
  }

  gradeOf(subjectCode: string): number | null {
    return this.findRecord(subjectCode)?.grade ?? null;
  }

  setSubjectRecord(newRecord: SubjectRecord): void {
    const index = this.subjectRecords.findIndex((r) => r.subjectCode === newRecord.subjectCode);
    if (index >= 0) {
      this.subjectRecords[index] = newRecord;
    } else {
      this.subjectRecords.push(newRecord);
    }
  }
}