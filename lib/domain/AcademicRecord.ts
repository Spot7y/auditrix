import type { CurriculumMap } from "./CurriculumMap";
import type { SubjectRecord, SubjectRecordStatus } from "./SubjectRecord";

export class AcademicRecord {
  constructor(
    public readonly studentId: string,
    public readonly curriculum: CurriculumMap,
    public readonly nominalYearLevel: number,
    private readonly subjectRecords: SubjectRecord[]
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

  hasCompletedAllSubjectsThroughYear(throughYear: number): boolean {
    if (throughYear <= 0) return true;
    const required = this.curriculum.subjectsThroughYear(throughYear);
    return required.every((subject) => this.hasPassed(subject.code));
  }

  unitCompletionPercentage(): number {
    const earnedUnits = this.subjectRecords
      .filter((r) => r.status === "PASSED")
      .reduce((sum, r) => {
        const subject = this.curriculum.findSubject(r.subjectCode);
        return sum + (subject?.units ?? 0);
      }, 0);

    const totalUnits = this.curriculum.totalUnits();
    return totalUnits > 0 ? (earnedUnits / totalUnits) * 100 : 0;
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