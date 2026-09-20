import type { AcademicRecord } from "./AcademicRecord";
import type { Subject } from "./Subject";
import type { AuditResult, AuditStatus } from "./AuditResult";

export class AuditEngine {
  auditSubject(record: AcademicRecord, subject: Subject): AuditResult {
    const ownStatus = record.statusOf(subject.code);
    const unmet = subject.requirements.filter((r) => !r.isSatisfiedBy(record));
    const wasTakenOrGraded = ownStatus !== "NOT_TAKEN";
    const isInvalidEntry = record.isInvalidEntry(subject.code);

    // Permanently invalid entry: recorded while prerequisites were unmet.
    // This never silently clears just because the prerequisite later gets
    // fixed — only a genuine new grade entry, made after things are in
    // order, can ever clear it.
    if (wasTakenOrGraded && isInvalidEntry) {
      if (unmet.length > 0) {
        return {
          subjectCode: subject.code,
          status: "VIOLATION",
          reasons: unmet.map((r) => r.description),
        };
      }
      return {
        subjectCode: subject.code,
        status: "AVAILABLE",
        reasons: ["Retake required — previous attempt invalid (taken before prerequisite was satisfied)"],
      };
    }

    if (ownStatus === "PASSED") {
      return { subjectCode: subject.code, status: "COMPLETED", reasons: [] };
    }

    if (ownStatus === "FAILED") {
      return {
        subjectCode: subject.code,
        status: "AVAILABLE",
        reasons: ["Retake required — previously failed"],
      };
    }

    if (ownStatus === "IN_PROGRESS" || ownStatus === "INCOMPLETE") {
      return {
        subjectCode: subject.code,
        status: "PENDING",
        reasons: [ownStatus === "IN_PROGRESS" ? "Currently in progress" : "Incomplete grade"],
      };
    }

    if (unmet.length === 0) {
      return { subjectCode: subject.code, status: "AVAILABLE", reasons: [] };
    }

    const pending = unmet.filter((r) => r.isPending(record));
    const status: AuditStatus = pending.length === unmet.length ? "PENDING" : "UNAVAILABLE";

    return {
      subjectCode: subject.code,
      status,
      reasons: unmet.map((r) => r.description),
    };
  }

  auditCurriculum(record: AcademicRecord): AuditResult[] {
    return record.curriculum.allSubjects().map((subject) => this.auditSubject(record, subject));
  }

  auditEnrollment(record: AcademicRecord, subjectCode: string): AuditResult {
    const subject = record.curriculum.findSubject(subjectCode);
    if (!subject) {
      throw new Error(`Unknown subject code: ${subjectCode}`);
    }
    return this.auditSubject(record, subject);
  }
}