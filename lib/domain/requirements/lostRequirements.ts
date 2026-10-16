/** A requirement a kept subject loses when the subject it points at is deleted. */
export interface LostRequirement {
  subject: string;
  required: string;
}

/**
 * Deleting several subjects at once: the subjects that stay but require one
 * being deleted lose that requirement (e.g. CC 102 no longer requires CC 101).
 * Requirements of the deleted subjects themselves go with them and aren't listed.
 */
export function lostRequirements(
  subjects: { code: string; requires: string[] }[],
  deleted: Iterable<string>
): LostRequirement[] {
  const gone = new Set(deleted);
  return subjects
    .filter((s) => !gone.has(s.code))
    .flatMap((s) => s.requires.filter((code) => gone.has(code)).map((required) => ({ subject: s.code, required })));
}

/** "CC 102 no longer requires CC 101" for the confirmation and the change history. */
export function describeLost(lost: LostRequirement[]): string[] {
  return lost.map((l) => `${l.subject} no longer requires ${l.required}`);
}
