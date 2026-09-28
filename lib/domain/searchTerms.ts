/**
 * Splits a search into words, keeping only characters that can appear in an
 * ID or a name. Anything else (commas, brackets, quotes) has meaning in the
 * database's filter syntax, so it's dropped rather than passed through.
 */
export function searchTerms(query: string): string[] {
  return query
    .split(/[\s,]+/)
    .map((term) => term.replace(/[^\p{L}\p{N}\-.']/gu, ""))
    .filter(Boolean)
    .slice(0, 5);
}
