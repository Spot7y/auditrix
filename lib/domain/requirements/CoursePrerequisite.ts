import type { Requirement } from "./Requirement";
import type { AcademicRecord } from "../AcademicRecord";

export type PrerequisiteType = "PREREQUISITE" | "COREQUISITE";

/**
 * Satisfied by having passed one specific subject. `type` exists now
 * (even though every current CEIT curriculum is PREREQUISITE-only) so
 * co-requisites can be supported later without touching the schema.
 */
export class CoursePrerequisite implements Requirement {
    isPending(record: AcademicRecord): boolean {
    const status = record.statusOf(this.subjectCode);
    return status === "INCOMPLETE" || status === "IN_PROGRESS";
  }
  constructor(
    public readonly subjectCode: string,
    public readonly type: PrerequisiteType = "PREREQUISITE"
  ) {}

  get description(): string {
    return this.subjectCode;
  }

  isSatisfiedBy(record: AcademicRecord): boolean {
    return record.hasPassed(this.subjectCode);
  }
}