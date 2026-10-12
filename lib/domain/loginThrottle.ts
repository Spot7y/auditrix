// Slows down password guessing on one account: after MAX_FAILURES wrong
// passwords within WINDOW_MS, that email can't log in for the rest of the
// window. Supabase also limits logins, but per IP address, and every login
// reaches it from the Auditrix server's one address.
//
// Kept in the server's memory, so it resets when the server restarts; that
// suits one Auditrix server (a shared store would be needed for several).

export const MAX_FAILURES = 5;
export const WINDOW_MS = 15 * 60 * 1000;

export class LoginThrottle {
  private readonly failures = new Map<string, number[]>();

  constructor(private readonly now: () => number = Date.now) {}

  private recent(email: string): number[] {
    const key = email.trim().toLowerCase();
    const since = this.now() - WINDOW_MS;
    const list = (this.failures.get(key) ?? []).filter((t) => t > since);
    if (list.length) this.failures.set(key, list);
    else this.failures.delete(key);
    return list;
  }

  /** Whether this email has had too many wrong passwords lately. */
  isBlocked(email: string): boolean {
    return this.recent(email).length >= MAX_FAILURES;
  }

  recordFailure(email: string): void {
    this.failures.set(email.trim().toLowerCase(), [...this.recent(email), this.now()]);
  }

  recordSuccess(email: string): void {
    this.failures.delete(email.trim().toLowerCase());
  }
}

/** The one throttle for this server. */
export const loginThrottle = new LoginThrottle();
