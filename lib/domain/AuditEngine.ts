import type { AcademicRecord } from "./AcademicRecord";
import type { Subject } from "./Subject";
import type { AuditResult, AuditStatus } from "./AuditResult";
import type { AuditContext, CheckOutcome, Credit } from "./requirements/Requirement";
import { isCorequisite } from "./requirements/CoursePrerequisite";
import { isValidTerm, laterTerm } from "./Term";

interface TakenCheck {
  /** Requirements that weren't met in the term the subject was taken. */
  violations: string[];
  /** Requirements that can't be decided yet, e.g. a prerequisite with no final grade. */
  pending: string[];
  /** Requirements that couldn't be confirmed from the records; the credit still counts. */
  verify: string[];
}

type Unmet = Extract<CheckOutcome, { state: "UNMET" | "PENDING" }>;

const NO_CREDIT: Credit = { kind: "NONE" };
const PENDING_CREDIT: Credit = { kind: "PENDING" };

/**
 * One audit of one student's record. Every check compares terms, so the
 * result doesn't depend on the order grades were entered in:
 *  - a prerequisite must be passed in a term before the subject was taken;
 *    the same term is a violation;
 *  - an INC counts as passed only from the term it was resolved;
 *  - co-requisites (paired both ways) must be taken in the same term, and
 *    neither counts until both are passed;
 *  - a subject taken out of order gets no credit, so it doesn't satisfy
 *    the prerequisites of later subjects either, and has to be retaken.
 */
class RecordAudit implements AuditContext {
  private readonly partners = new Map<string, Set<string>>();
  private readonly credits = new Map<string, Credit>();
  private readonly checks = new Map<string, TakenCheck>();
  private readonly computing = new Set<string>();
  /** Times the cycle guard answered; anything worked out through it isn't cached. */
  private guardHits = 0;

  constructor(readonly record: AcademicRecord) {
    for (const subject of record.curriculum.allSubjects()) {
      for (const requirement of subject.requirements) {
        if (!isCorequisite(requirement) || requirement.subjectCode === subject.code) continue;
        if (!record.curriculum.findSubject(requirement.subjectCode)) continue;
        this.pair(subject.code, requirement.subjectCode);
      }
    }
  }

  private pair(a: string, b: string) {
    for (const [from, to] of [
      [a, b],
      [b, a],
    ]) {
      const set = this.partners.get(from) ?? new Set<string>();
      set.add(to);
      this.partners.set(from, set);
    }
  }

  corequisitesOf(code: string): string[] {
    return [...(this.partners.get(code) ?? [])].sort();
  }

  /** The subject plus every subject linked to it through co-requisites. */
  private group(code: string): string[] {
    const seen = new Set([code]);
    const queue = [code];
    while (queue.length > 0) {
      for (const next of this.partners.get(queue.shift()!) ?? []) {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    return [...seen];
  }

  /** Checks a taken subject's requirements as of the term it was taken. */
  checkTaken(code: string): TakenCheck {
    const cached = this.checks.get(code);
    if (cached) return cached;

    const subject = this.record.curriculum.findSubject(code);
    const attempt = this.record.recordOf(code);
    const result: TakenCheck = { violations: [], pending: [], verify: [] };
    if (!subject || !attempt || attempt.status === "NOT_TAKEN") return result;

    const hitsBefore = this.guardHits;
    const asOf = isValidTerm(attempt.term) ? attempt.term : null;
    for (const requirement of subject.requirements) {
      if (isCorequisite(requirement)) continue;
      const outcome = requirement.check(this, asOf);
      if (outcome.state === "UNMET") result.violations.push(outcome.reason);
      else if (outcome.state === "PENDING") result.pending.push(outcome.reason);
      else if (outcome.state === "VERIFY") result.verify.push(outcome.reason);
    }
    for (const partner of this.corequisitesOf(code)) {
      const other = this.record.recordOf(partner);
      if (!other || other.status === "NOT_TAKEN") {
        result.violations.push(`${partner} (co-requisite) wasn't taken in the same term`);
      } else if (asOf && isValidTerm(other.term) && other.term !== asOf) {
        result.violations.push(`${partner} (co-requisite) was taken in ${other.term}, not ${asOf}`);
      }
    }

    if (this.guardHits === hitsBefore) this.checks.set(code, result);
    return result;
  }

  creditOf(code: string): Credit {
    const cached = this.credits.get(code);
    if (cached) return cached;
    // A prerequisite cycle in the curriculum can't be satisfied.
    if (this.computing.has(code)) {
      this.guardHits += 1;
      return NO_CREDIT;
    }

    const hitsBefore = this.guardHits;
    this.computing.add(code);
    try {
      const credit = this.computeCredit(code);
      if (this.guardHits === hitsBefore) this.credits.set(code, credit);
      return credit;
    } finally {
      this.computing.delete(code);
    }
  }

  private computeCredit(code: string): Credit {
    let pending = false;
    let term: string | null = null;
    for (const member of this.group(code)) {
      const attempt = this.record.recordOf(member);
      const status = attempt?.status ?? "NOT_TAKEN";
      if (status === "IN_PROGRESS" || status === "INCOMPLETE") {
        pending = true;
        continue;
      }
      if (!attempt || status !== "PASSED") return NO_CREDIT;

      const check = this.checkTaken(member);
      if (check.violations.length > 0) return NO_CREDIT;
      if (check.pending.length > 0) pending = true;

      const passedIn = attempt.resolvedTerm ?? attempt.term;
      if (isValidTerm(passedIn)) term = term === null ? passedIn : laterTerm(term, passedIn);
    }
    return pending ? PENDING_CREDIT : { kind: "CREDITED", term };
  }

  result(subject: Subject): AuditResult {
    const code = subject.code;
    const attempt = this.record.recordOf(code);
    const partners = this.corequisitesOf(code);
    const make = (status: AuditStatus, reasons: string[], warnings: string[] = []): AuditResult => ({
      subjectCode: code,
      status,
      reasons,
      warnings,
    });

    if (!attempt || attempt.status === "NOT_TAKEN") return this.notTaken(subject, partners, make);

    const check = this.checkTaken(code);
    const warnings: string[] = [];
    if (!isValidTerm(attempt.term)) {
      warnings.push("No term recorded, so the order of its prerequisites couldn't be checked");
    }
    warnings.push(...check.verify);

    if (check.violations.length > 0) {
      return make("VIOLATION", check.violations, [...warnings, ...check.pending]);
    }

    switch (attempt.status) {
      case "PASSED": {
        const credit = this.creditOf(code);
        if (credit.kind === "CREDITED") {
          return make("COMPLETED", attempt.resolvedTerm ? [`INC resolved in ${attempt.resolvedTerm}`] : [], warnings);
        }
        if (credit.kind === "PENDING") {
          const waiting = partners.filter((p) => {
            const status = this.record.statusOf(p);
            return status === "IN_PROGRESS" || status === "INCOMPLETE";
          });
          const reasons = [
            ...(waiting.length > 0 ? [`Waiting for the grade of ${waiting.join(", ")} (co-requisite)`] : []),
            ...check.pending,
          ];
          return make("PENDING", reasons.length > 0 ? reasons : ["Waiting for a co-requisite's earlier grades"], warnings);
        }
        return make(
          "AVAILABLE",
          [`Retake together with ${partners.join(", ")} — co-requisites must be passed together`],
          warnings
        );
      }
      case "FAILED":
        return make(
          "AVAILABLE",
          ["Retake required — previously failed", ...(partners.length > 0 ? [`Retake together with ${partners.join(", ")}`] : [])],
          [...warnings, ...check.pending]
        );
      default:
        return make(
          "PENDING",
          [attempt.status === "IN_PROGRESS" ? "Currently in progress" : "Incomplete grade"],
          [...warnings, ...check.pending]
        );
    }
  }

  private notTaken(
    subject: Subject,
    partners: string[],
    make: (status: AuditStatus, reasons: string[]) => AuditResult
  ): AuditResult {
    const unmet = subject.requirements
      .filter((r) => !isCorequisite(r))
      .map((r) => r.check(this, null))
      .filter((o): o is Unmet => o.state === "UNMET" || o.state === "PENDING");

    // Co-requisites are taken together, so each one's own requirements
    // have to be met now as well.
    for (const partner of partners) {
      const other = this.record.curriculum.findSubject(partner);
      if (!other) continue;
      const states = other.requirements.filter((r) => !isCorequisite(r)).map((r) => r.check(this, null).state);
      const reason = `${partner} (co-requisite) can't be taken yet`;
      if (states.includes("UNMET")) unmet.push({ state: "UNMET", reason });
      else if (states.includes("PENDING")) unmet.push({ state: "PENDING", reason });
    }

    if (unmet.length === 0) {
      return make("AVAILABLE", partners.length > 0 ? [`Take together with ${partners.join(", ")}`] : []);
    }
    const status: AuditStatus = unmet.every((o) => o.state === "PENDING") ? "PENDING" : "UNAVAILABLE";
    return make(status, unmet.map((o) => o.reason));
  }
}

export class AuditEngine {
  auditSubject(record: AcademicRecord, subject: Subject): AuditResult {
    return new RecordAudit(record).result(subject);
  }

  auditCurriculum(record: AcademicRecord): AuditResult[] {
    const audit = new RecordAudit(record);
    return record.curriculum.allSubjects().map((subject) => audit.result(subject));
  }

  auditEnrollment(record: AcademicRecord, subjectCode: string): AuditResult {
    const subject = record.curriculum.findSubject(subjectCode);
    if (!subject) {
      throw new Error(`Unknown subject code: ${subjectCode}`);
    }
    return this.auditSubject(record, subject);
  }
}
