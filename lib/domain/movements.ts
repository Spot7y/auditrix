import { searchTerms } from "./searchTerms";

// Filtering and summing up student movements, shared by the Student
// movements page and its printed report so both show the same rows.

export type MovementType = "TRANSFERRED_IN" | "TRANSFERRED_OUT" | "SHIFTED_IN" | "SHIFTED_OUT" | "DROPPED" | "REOPENED";

export interface Movement {
  studentId: string;
  studentName: string;
  type: MovementType;
  fromProgram: string | null;
  toProgram: string | null;
  recordedAt: string;
}

export interface MovementFilter {
  q?: string;
  type?: string;
  program?: string;
  year?: string;
}

/** The order movements are counted and listed in. */
export const MOVEMENT_TYPES: MovementType[] = ["SHIFTED_IN", "SHIFTED_OUT", "TRANSFERRED_IN", "TRANSFERRED_OUT", "DROPPED", "REOPENED"];

/** The calendar year a movement was recorded, in Philippine time. */
export function movementYear(recordedAt: string): number {
  return Number(new Intl.DateTimeFormat("en-PH", { year: "numeric", timeZone: "Asia/Manila" }).format(new Date(recordedAt)));
}

/** The movements matching the search and filters of the Student movements page. */
export function filterMovements<T extends Movement>(rows: T[], { q = "", type = "", program = "", year = "" }: MovementFilter): T[] {
  const terms = searchTerms(q).map((t) => t.toLowerCase());
  return rows.filter(
    (t) =>
      (!type || t.type === type) &&
      (!program || t.fromProgram === program || t.toProgram === program) &&
      (!year || movementYear(t.recordedAt) === Number(year)) &&
      terms.every((term) => t.studentId.toLowerCase().includes(term) || t.studentName.toLowerCase().includes(term))
  );
}

/**
 * The program a movement is recorded for: the one the student left for a
 * shift or transfer out, a drop or a return, and the one they joined for a
 * shift or transfer in. A shift between two programs is two movements, one
 * for each.
 */
export function movementProgram(t: Movement): string {
  const program = t.type === "SHIFTED_IN" || t.type === "TRANSFERRED_IN" ? t.toProgram : t.fromProgram;
  return program ?? t.toProgram ?? t.fromProgram ?? "—";
}

/** How many movements there are of each type. */
export function countMovements(rows: Movement[]): Record<MovementType, number> {
  const counts = Object.fromEntries(MOVEMENT_TYPES.map((type) => [type, 0])) as Record<MovementType, number>;
  for (const t of rows) counts[t.type]++;
  return counts;
}

/** The movements grouped by program, programs in alphabetical order. */
export function groupByProgram<T extends Movement>(rows: T[]): { program: string; rows: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const t of rows) {
    const program = movementProgram(t);
    groups.set(program, [...(groups.get(program) ?? []), t]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([program, rows]) => ({ program, rows }));
}
