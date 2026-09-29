import type { CurriculumMap } from "./CurriculumMap";
import type { SubjectRecord, SubjectRecordStatus } from "./SubjectRecord";
import type { YearLevelEntry } from "./yearLevels";

export class AcademicRecord {
  constructor(
    public readonly studentId: string,
    public readonly curriculum: CurriculumMap,
    /** The year level the student was registered or imported at. */
    public readonly registeredYearLevel: number,
    private readonly subjectRecords: SubjectRecord[],
    /** Year levels recorded by term: registrations and chairperson overrides. */
    public readonly yearLevelHistory: YearLevelEntry[] = []
  ) {}

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
