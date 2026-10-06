export const MIN_PASSWORD_LENGTH = 8;

/** The rules a new password must meet, as shown in the checklist under the field. */
export const PASSWORD_RULES: { label: string; test: (password: string) => boolean }[] = [
  { label: `At least ${MIN_PASSWORD_LENGTH} characters`, test: (p) => p.length >= MIN_PASSWORD_LENGTH },
  { label: "Contains a letter", test: (p) => /[A-Za-z]/.test(p) },
  { label: "Contains a number", test: (p) => /[0-9]/.test(p) },
];

/** Returns why a new password is not acceptable, or null if it is. */
export function passwordProblem(password: string, confirmation?: string): string | null {
  const [longEnough, hasLetter, hasNumber] = PASSWORD_RULES.map((rule) => rule.test(password));
  if (!longEnough) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!hasLetter || !hasNumber) {
    return "Password must contain both letters and numbers.";
  }
  if (confirmation !== undefined && password !== confirmation) {
    return "Passwords do not match.";
  }
  return null;
}
