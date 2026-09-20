import { AuditEngine } from "../AuditEngine";
import type { AcademicRecordRepository } from "../AcademicRecordRepository";
import { SubjectCodeResolver } from "./SubjectCodeResolver";
import { GradeValidator } from "./GradeValidator";
import type { TermGradeBatch } from "./TermGradeBatch";
import type { GradeEntryResult, GradeEntryRowResult } from "./GradeEntryResult";
import type { CurriculumMap } from "../CurriculumMap";

export class GradeEntryService {
  private readonly validator = new GradeValidator();
  private readonly engine = new AuditEngine();

  constructor(private readonly repository: AcademicRecordRepository) {}

  async submit(
    batch: TermGradeBatch,
    curriculum: CurriculumMap,
    performedBy: string
  ): Promise<GradeEntryResult> {
    const resolver = new SubjectCodeResolver(curriculum);
    const rows: GradeEntryRowResult[] = [];
    let anyAccepted = false;

    const record = await this.repository.getRecord(batch.studentId);
    if (!record) {
      throw new Error(`No academic record found for student ${batch.studentId}`);
    }

    for (const entry of batch.entries) {
      const resolution = resolver.resolve(entry.subjectCode);
      if (!resolution.matched) {
        rows.push({ accepted: false, rawCode: entry.subjectCode, reason: resolution.reason });
        continue;
      }

      const validation = this.validator.validate(entry.input);
      if (!validation.valid) {
        rows.push({ accepted: false, rawCode: entry.subjectCode, reason: validation.reason });
        continue;
      }

      // Checked once, at the moment of entry — this becomes a permanent
      // fact about this specific grade, not something re-checked later.
      const isInvalidEntry = resolution.subject.requirements.some((r) => !r.isSatisfiedBy(record));

      const newRecord = {
        subjectCode: resolution.subject.code,
        status: validation.status,
        grade: validation.grade,
        term: batch.term,
        isInvalidEntry,
      };

      await this.repository.upsertSubjectRecord(batch.studentId, newRecord, performedBy);
      record.setSubjectRecord(newRecord);

      rows.push({ accepted: true, subjectCode: resolution.subject.code });
      anyAccepted = true;
    }

    const audit = anyAccepted ? this.engine.auditCurriculum(record) : [];

    return { studentId: batch.studentId, term: batch.term, rows, audit };
  }
}