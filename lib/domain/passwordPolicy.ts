export const MIN_PASSWORD_LENGTH = 8;

/** Returns why a new password is not acceptable, or null if it is. */
export function passwordProblem(password: string, confirmation?: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must contain both letters and numbers.";
  }
  if (confirmation !== undefined && password !== confirmation) {
    return "Passwords do not match.";
  }
  return null;
}
