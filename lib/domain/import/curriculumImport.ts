import { normalizeCode, findMatchingCode } from "./codeMatching";

// Parsing and planning for the curriculum CSV import. Kept free of database
// calls so the preview and the real import work from exactly the same plan.

export type ParsedRequirement = { kind: "code"; code: string } | { kind: "year_standing"; level: number };

export interface ParsedSubject {
  code: string;
  title: string;
  units: number;
  yearLevel: number;
  semester: number;
  requirements: ParsedRequirement[];
}

export interface ExistingSubject {
  id: string;
  code: string;
  title: string;
  units: number;
  year_level: number;
  semester: number;
}

export interface ExistingRequirement {
  subject_id: string;
  type: string;
  required_subject_id: string | null;
  required_year_level: number | null;
}

export interface SubjectChange {
  code: string;
  changes: string[];
}

export interface CurriculumImportPlan {
  subjects: ParsedSubject[];
  added: string[];
  changed: SubjectChange[];
  unchangedCount: number;
  /** Subjects not in the file that will be deleted. */
  removed: ExistingSubject[];
  /** Subjects not in the file that stay because students have grades recorded for them. */
  keptWithGrades: string[];
  warnings: string[];
}

/** What the preview step shows before anything is written. */
export interface CurriculumImportSummary {
  added: string[];
  changed: SubjectChange[];
  unchangedCount: number;
  removed: string[];
  keptWithGrades: string[];
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
      } else if (char === "\n" || char === "\r") {
        if (char === "\r" && next === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim().length > 0));
}

export function parseRequirementToken(raw: string): ParsedRequirement | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.toUpperCase() === "NONE") return null;

  const yearMatch = trimmed.match(/^(\d)(?:st|nd|rd|th)?\s+(?:yr|year)s?\s+standing$/i);
  if (yearMatch) {
    return { kind: "year_standing", level: Number(yearMatch[1]) };
  }

  return { kind: "code", code: normalizeCode(trimmed) };
}

/** Parses the CSV text into subjects. Rows that can't be read become warnings. */
export function parseSubjectsCsv(text: string): { subjects: ParsedSubject[]; warnings: string[] } | { error: string } {
  const rows = parseCsv(text);
  if (rows.length < 2) return { error: "File appears to be empty." };

  const subjects: ParsedSubject[] = [];
  const warnings: string[] = [];
  const seenCodes = new Set<string>();
  const dataRows = rows.slice(1);

  for (let i = 0; i < dataRows.length; i++) {
    const [rawCode, rawTitle, rawUnits, rawYear, rawSemester, rawPrereq] = dataRows[i];
    const code = normalizeCode(rawCode ?? "");
    const title = (rawTitle ?? "").trim();
    const units = Number(rawUnits);
    const yearLevel = Number(rawYear);
    const semester = Number(rawSemester);

    if (!code || !title || Number.isNaN(units) || Number.isNaN(yearLevel) || Number.isNaN(semester)) {
      warnings.push(`Row ${i + 2}: missing or invalid data, skipped.`);
      continue;
    }
    if (seenCodes.has(code)) {
      warnings.push(`Row ${i + 2}: ${code} appears more than once in the file, skipped.`);
      continue;
    }
    seenCodes.add(code);

    const requirements = (rawPrereq ?? "")
      .split(";")
      .map((token) => parseRequirementToken(token))
      .filter((r): r is ParsedRequirement => r !== null);

    subjects.push({ code, title, units, yearLevel, semester, requirements });
  }

  if (subjects.length === 0) return { error: "No valid rows found in file." };
  return { subjects, warnings };
}

function describeYearStanding(level: number): string {
  return `Year ${level} standing`;
}

/**
 * Works out what importing `subjects` into a curriculum will do, given the
 * subjects and requirements it has now and which existing subjects have
 * student grades recorded (those can't be deleted).
 */
export function planCurriculumImport(
  subjects: ParsedSubject[],
  existing: ExistingSubject[],
  existingRequirements: ExistingRequirement[],
  gradedSubjectIds: Set<string>,
  parseWarnings: string[] = []
): CurriculumImportPlan {
  const warnings = [...parseWarnings];
  const existingByCode = new Map(existing.map((s) => [s.code, s]));
  const codeById = new Map(existing.map((s) => [s.id, s.code]));
  const importedCodes = new Set(subjects.map((s) => s.code));

  const notInFile = existing.filter((s) => !importedCodes.has(s.code));
  const removed = notInFile.filter((s) => !gradedSubjectIds.has(s.id));
  const keptWithGrades = notInFile.filter((s) => gradedSubjectIds.has(s.id)).map((s) => s.code);

  // Prerequisites can point at any subject that will exist after the import.
  const codeCandidates = [...importedCodes, ...keptWithGrades].map((code) => ({ code }));

  const added: string[] = [];
  const changed: SubjectChange[] = [];
  let unchangedCount = 0;

  for (const s of subjects) {
    const newRequirements: string[] = [];
    for (const req of s.requirements) {
      if (req.kind === "year_standing") {
        newRequirements.push(describeYearStanding(req.level));
        continue;
      }
      const matched = findMatchingCode(req.code, codeCandidates);
      if (!matched) {
        warnings.push(`${s.code}: prerequisite "${req.code}" not found, skipped.`);
        continue;
      }
      newRequirements.push(matched.code);
    }

    const current = existingByCode.get(s.code);
    if (!current) {
      added.push(s.code);
      continue;
    }

    const currentRequirements = existingRequirements
      .filter((r) => r.subject_id === current.id)
      .map((r) => {
        if (r.type === "YEAR_STANDING") return describeYearStanding(r.required_year_level ?? 0);
        if (r.type === "COMPLETION") return "All subjects";
        const code = codeById.get(r.required_subject_id ?? "") ?? "?";
        return r.type === "COREQUISITE" ? `${code} (corequisite)` : code;
      });

    const changes: string[] = [];
    if (current.title !== s.title) changes.push(`title "${current.title}" → "${s.title}"`);
    if (Number(current.units) !== s.units) changes.push(`units ${current.units} → ${s.units}`);
    if (current.year_level !== s.yearLevel) changes.push(`year ${current.year_level} → ${s.yearLevel}`);
    if (current.semester !== s.semester) changes.push(`semester ${current.semester} → ${s.semester}`);
    const before = [...currentRequirements].sort().join(", ");
    const after = [...newRequirements].sort().join(", ");
    if (before !== after) changes.push(`prerequisites ${before || "none"} → ${after || "none"}`);

    if (changes.length > 0) changed.push({ code: s.code, changes });
    else unchangedCount++;
  }

  return { subjects, added, changed, unchangedCount, removed, keptWithGrades, warnings };
}
