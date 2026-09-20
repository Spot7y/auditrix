import type { AcademicRecord } from "./AcademicRecord";
import type { SubjectRecord } from "./SubjectRecord";

export interface AcademicRecordRepository {
  getRecord(studentId: string): Promise<AcademicRecord | undefined>;
  upsertSubjectRecord(studentId: string, record: SubjectRecord, performedBy: string): Promise<void>;
}