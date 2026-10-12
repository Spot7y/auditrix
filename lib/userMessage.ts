// What to tell the user when the database or Supabase refuses something.
// Messages written for people are passed through: those Auditrix's own
// database functions raise (code P0001, e.g. "This student's record is
// locked…") and Supabase Auth's (e.g. "Password should be at least 8
// characters."). Anything else is a technical message about tables and
// policies, so the user gets plain wording and the details go to the server
// log instead of the screen.

type ErrorLike = { message?: string; code?: string; name?: string; status?: number } | null | undefined;

const PLAIN: Record<string, string> = {
  "23505": "That already exists.",
  "23514": "That value isn’t allowed.",
  "23503": "That can’t be changed because other records depend on it.",
  "42501": "Your account isn’t allowed to do that.",
};

export function userMessage(error: ErrorLike, fallback = "Something went wrong. Please try again."): string {
  if (!error) return fallback;
  if (error.code === "P0001" && error.message) return error.message;
  if (error.name?.startsWith("Auth") && error.message) return error.message;

  console.error("Auditrix:", error.code ?? "", error.message ?? error);
  if (error.code && PLAIN[error.code]) return PLAIN[error.code];
  if (/row-level security|permission denied/i.test(error.message ?? "")) return PLAIN["42501"];
  return fallback;
}
