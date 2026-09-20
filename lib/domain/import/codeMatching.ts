export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, " ");
}

function stripSpaces(code: string): string {
  return code.replace(/\s+/g, "");
}

/**
 * Resolves a possibly-mistyped subject code against a list of real codes.
 * Tries an exact match first (after normalizing case/whitespace), then
 * falls back to space-insensitive matching (e.g. "CPE400" matches
 * "CPE 400") — but only when that narrows to exactly one candidate.
 * Ambiguous or still-unmatched codes are left for the caller to reject,
 * never guessed.
 */
export function findMatchingCode<T extends { code: string }>(rawCode: string, candidates: T[]): T | null {
  const target = normalizeCode(rawCode);

  const exactMatch = candidates.find((c) => normalizeCode(c.code) === target);
  if (exactMatch) return exactMatch;

  const strippedTarget = stripSpaces(target);
  const spaceTolerantMatches = candidates.filter((c) => stripSpaces(normalizeCode(c.code)) === strippedTarget);
  if (spaceTolerantMatches.length === 1) return spaceTolerantMatches[0];

  return null;
}