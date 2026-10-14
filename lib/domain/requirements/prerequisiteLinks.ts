/** Prerequisites as links between subject codes: each subject → the codes it requires. */
export type PrerequisiteLinks = Map<string, string[]>;

/** A chain of prerequisites from `from` to `to` (both included), if `from` requires `to` directly or indirectly. */
function chain(from: string, to: string, links: PrerequisiteLinks): string[] | null {
  const seen = new Set<string>();
  const walk = (code: string): string[] | null => {
    if (code === to) return [code];
    if (seen.has(code)) return null;
    seen.add(code);
    for (const next of links.get(code) ?? []) {
      const rest = walk(next);
      if (rest) return [code, ...rest];
    }
    return null;
  };
  return walk(from);
}

/**
 * Why `subject` can't be given `required` as a prerequisite (or co-requisite),
 * or null when it can: a subject can't require itself, the same requirement
 * isn't added twice, and a prerequisite can't close a loop (A needs B needs
 * A), since then none of those subjects could ever be taken.
 */
export function prerequisiteProblem(
  subject: string,
  required: string,
  links: PrerequisiteLinks,
  { corequisite = false, existing = [] as string[] } = {}
): string | null {
  if (subject === required) return `${subject} can’t be its own ${corequisite ? "co-requisite" : "prerequisite"}.`;
  if (existing.includes(required)) return `${required} is already a requirement of ${subject}.`;
  if (corequisite) return null;
  const loop = chain(required, subject, links);
  if (loop) {
    return `${loop.join(" needs ")}, so ${subject} can’t also need ${required}: none of them could ever be taken.`;
  }
  return null;
}
