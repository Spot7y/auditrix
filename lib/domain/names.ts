// What a typed or imported name, or program code, has to look like.

export const NAME_MAX_LENGTH = 120;

/** Trims and collapses repeated spaces, e.g. "  Dela Cruz,   Juan " → "Dela Cruz, Juan". */
export function normalizeName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/** Why a (normalized) person's name can't be used, or null when it's fine. */
export function nameProblem(name: string): string | null {
  if (!name) return "Enter a name.";
  if (name.length > NAME_MAX_LENGTH) return `A name can be at most ${NAME_MAX_LENGTH} characters.`;
  return null;
}

export const PROGRAM_CODE_MAX_LENGTH = 20;
// Letters and digits, words joined by a single space or hyphen: BSCE, BSED-MATH, BS MATH.
const programCodePattern = /^[A-Z0-9]+(?:[- ][A-Z0-9]+)*$/;

/** Upper case with spaces tidied, e.g. " bsce " → "BSCE". */
export function normalizeProgramCode(raw: string): string {
  return normalizeName(raw).toUpperCase();
}

/** Why a (normalized) program code can't be used, or null when it's fine. */
export function programCodeProblem(code: string): string | null {
  if (!code) return "Enter the program code.";
  if (code.length > PROGRAM_CODE_MAX_LENGTH || !programCodePattern.test(code)) {
    return `A program code is letters and numbers, up to ${PROGRAM_CODE_MAX_LENGTH} characters, e.g. BSCE or BSED-MATH.`;
  }
  return null;
}

export const MAX_SUBJECT_UNITS = 12;

/** Why a subject's code, title or units can't be saved, or null when they're fine. */
export function subjectProblem({ code, title, units }: { code: string; title: string; units: number }): string | null {
  if (!code) return "Enter the subject code.";
  if (!title) return "Enter the subject title.";
  if (!Number.isFinite(units) || units < 0 || units > MAX_SUBJECT_UNITS) {
    return `Units must be from 0 to ${MAX_SUBJECT_UNITS}.`;
  }
  return null;
}

export const COLLEGE_SHORT_NAME_MAX_LENGTH = 15;

/** Why a (normalized, upper-case) college short name can't be used, or null when it's fine. */
export function collegeShortNameProblem(shortName: string): string | null {
  if (!shortName) return "Enter the college’s short name, e.g. CEIT.";
  if (shortName.length > COLLEGE_SHORT_NAME_MAX_LENGTH || !programCodePattern.test(shortName)) {
    return `A short name is letters and numbers, up to ${COLLEGE_SHORT_NAME_MAX_LENGTH} characters, e.g. CEIT or COE.`;
  }
  return null;
}
