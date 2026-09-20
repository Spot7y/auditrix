import type { Subject } from "./Subject";

/** The canonical, single source of truth for one program (e.g. BSIT). */
export class CurriculumMap {
  constructor(
    public readonly program: string,
    private readonly subjects: Subject[]
  ) {}

  findSubject(code: string): Subject | undefined {
    return this.subjects.find((s) => s.code === code);
  }

  subjectsThroughYear(year: number): Subject[] {
    return this.subjects.filter((s) => s.yearLevel <= year);
  }

  totalUnits(): number {
    return this.subjects.reduce((sum, s) => sum + s.units, 0);
  }

  allSubjects(): Subject[] {
    return [...this.subjects];
  }
}