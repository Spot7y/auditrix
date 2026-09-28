// KSU ID numbers: two-digit entry year, a dash, then 5 or 6 digits
// (e.g. 23-19991, 24-113792).
export const STUDENT_ID_PATTERN = "\\d{2}-\\d{5,6}";
export const STUDENT_ID_HINT = "ID number must look like 24-113792 (year, dash, 5–6 digits).";

const studentIdRegex = new RegExp(`^${STUDENT_ID_PATTERN}$`);

/** Trims and removes stray spaces, e.g. " 24 - 113792 " → "24-113792". */
export function normalizeStudentId(raw: string): string {
  return raw.replace(/\s+/g, "");
}

export function isValidStudentId(id: string): boolean {
  return studentIdRegex.test(id);
}
