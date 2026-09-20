export function formatGrade(grade: number | null): string {
  return grade !== null ? grade.toFixed(2) : "—";
}