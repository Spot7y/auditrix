import type { AcademicRecordRepository } from "../AcademicRecordRepository";
import type { AcademicRecord } from "../AcademicRecord";
import type { SubjectRecord } from "../SubjectRecord";

export class InMemoryAcademicRecordRepository implements AcademicRecordRepository {
  private readonly records = new Map<string, AcademicRecord>();

  constructor(seedRecords: AcademicRecord[] = []) {
    for (const record of seedRecords) {
      this.records.set(record.studentId, record);
    }
  }

  async getRecord(studentId: string): Promise<AcademicRecord | undefined> {
    return this.records.get(studentId);
  }

  async upsertSubjectRecord(studentId: string, record: SubjectRecord): Promise<void> {
    const academicRecord = this.records.get(studentId);
    if (!academicRecord) {
      throw new Error(`No academic record found for student ${studentId}`);
    }
    academicRecord.setSubjectRecord(record);
  }
}