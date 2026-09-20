import type { CurriculumMap } from "../CurriculumMap";
import type { Subject } from "../Subject";
import { findMatchingCode } from "./codeMatching";

export type CodeResolution =
  | { matched: true; subject: Subject }
  | { matched: false; rawCode: string; reason: string };

export class SubjectCodeResolver {
  constructor(private readonly curriculum: CurriculumMap) {}

  resolve(rawCode: string): CodeResolution {
    const subject = findMatchingCode(rawCode, this.curriculum.allSubjects());

    if (subject) {
      return { matched: true, subject };
    }

    return {
      matched: false,
      rawCode,
      reason: `No subject in ${this.curriculum.program} matches "${rawCode}"`,
    };
  }
}