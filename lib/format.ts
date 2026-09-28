export function formatGrade(grade: number | null): string {
  return grade !== null ? grade.toFixed(2) : "—";
}

// Dates are shown in Philippine time regardless of where the server runs.
const dateFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" });
const dateTimeFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" });

export function formatDate(value: string | Date): string {
  return dateFormat.format(new Date(value));
}

export function formatDateTime(value: string | Date): string {
  return dateTimeFormat.format(new Date(value));
}

export const TRANSITION_LABEL: Record<string, string> = {
  TRANSFERRED_IN: "Transferred in",
  TRANSFERRED_OUT: "Transferred out",
  SHIFTED_IN: "Shifted in",
  SHIFTED_OUT: "Shifted out",
  DROPPED: "Dropped",
};

/** "1 subject", "3 subjects". */
export function plural(count: number, word: string, pluralWord = `${word}s`): string {
  return `${count} ${count === 1 ? word : pluralWord}`;
}
