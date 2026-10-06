import { AuditEngine } from "../AuditEngine";
import type { AcademicRecordRepository } from "../AcademicRecordRepository";
import { SubjectCodeResolver } from "./SubjectCodeResolver";
import { GradeValidator } from "./GradeValidator";
import type { TermGradeBatch } from "./TermGradeBatch";
import type { GradeEntryResult, GradeEntryRowResult } from "./GradeEntryResult";
import type { CurriculumMap } from "../CurriculumMap";
import type { SubjectRecord } from "../SubjectRecord";
import { compareTerms, isValidTerm } from "../Term";

export class GradeEntryService {
  private readonly validator = new GradeValidator();
  private readonly engine = new AuditEngine();

  constructor(private readonly repository: AcademicRecordRepository) {}

  async submit(
    batch: TermGradeBatch,
    curriculum: CurriculumMap,
    performedBy: string
  ): Promise<GradeEntryResult> {
    if (!isValidTerm(batch.term)) {
      throw new Error(`Invalid term: ${batch.term}`);
    }

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

      const code = resolution.subject.code;
      const isFinal = validation.status === "PASSED" || validation.status === "FAILED";
      const previous = record.recordOf(code);
      let term = batch.term;
      let resolvedTerm: string | null = null;

      // A final grade for an INC completes the original attempt: the subject
      // stays taken in its original term, and counts as passed only from the
      // term the INC was resolved in.
      if (isFinal && previous?.status === "INCOMPLETE" && isValidTerm(previous.term)) {
        if (compareTerms(batch.term, previous.term) < 0) {
          rows.push({
            accepted: false,
            rawCode: entry.subjectCode,
            reason: `The INC for ${code} was given in ${previous.term}, so it can't be resolved in an earlier term (${batch.term}).`,
          });
          continue;
        }
        term = previous.term;
        resolvedTerm = batch.term === previous.term ? null : batch.term;
      } else if (isFinal && previous?.resolvedTerm === batch.term && isValidTerm(previous.term)) {
        // Correcting the grade an INC was resolved with.
        term = previous.term;
        resolvedTerm = previous.resolvedTerm;
      } else if (
        previous &&
        isValidTerm(previous.term) &&
        compareTerms(batch.term, previous.term) < 0 &&
        !(batch.replaceLaterTerm ?? []).includes(code)
      ) {
        // Only the latest attempt is kept, so an older grade entered now
        // would replace the newer one (e.g. a 5.0 from 24-1 over the pass
        // from 25-1). Allowed only as a confirmed correction of the term.
        rows.push({
          accepted: false,
          rawCode: entry.subjectCode,
          reason: `${code} already has a grade from ${previous.term}, a later term than ${batch.term}. Only the latest attempt is kept, so it wasn't replaced. If ${previous.term} was entered by mistake, save again and confirm the correction.`,
        });
        continue;
      }

      // Whether it was taken in order is worked out by the audit from the
      // terms, not stored, so grades can be entered in any order.
      const newRecord: SubjectRecord = {
        subjectCode: code,
        status: validation.status,
        grade: validation.grade,
        term,
        resolvedTerm,
      };

      await this.repository.upsertSubjectRecord(batch.studentId, newRecord, performedBy);
      record.setSubjectRecord(newRecord);

      rows.push({ accepted: true, subjectCode: code, ...(resolvedTerm ? { resolvedFrom: term } : {}) });
      anyAccepted = true;
    }

    const audit = anyAccepted ? this.engine.auditCurriculum(record) : [];

    return { studentId: batch.studentId, term: batch.term, rows, audit };
  }
}
