// Slows down password guessing on one account: after MAX_FAILURES wrong
// passwords within WINDOW_MS, that email can't log in for the rest of the
// window. Supabase also limits logins, but per IP address, and every login
// reaches it from the Auditrix server's address.
//
// The failures are kept in the database (see SupabaseFailureStore), not in
// the server's memory: hosted, Auditrix runs on several short-lived servers
// at once, and a count kept in one of them would be missed by the others.

export const MAX_FAILURES = 5;
export const WINDOW_MS = 15 * 60 * 1000;

/** Where wrong-password attempts are counted. */
export interface FailureStore {
  /** How many failures this email has had since `since`. */
  countSince(email: string, since: Date): Promise<number>;
  add(email: string, at: Date): Promise<void>;
  clear(email: string): Promise<void>;
}

const key = (email: string) => email.trim().toLowerCase();

export class LoginThrottle {
  constructor(
    private readonly store: FailureStore,
    private readonly now: () => number = Date.now
  ) {}

  /** Whether this email has had too many wrong passwords lately. */
  async isBlocked(email: string): Promise<boolean> {
    return (await this.store.countSince(key(email), new Date(this.now() - WINDOW_MS))) >= MAX_FAILURES;
  }

  recordFailure(email: string): Promise<void> {
    return this.store.add(key(email), new Date(this.now()));
  }

  recordSuccess(email: string): Promise<void> {
    return this.store.clear(key(email));
  }
}

/** Failures kept in memory, for tests. */
export class MemoryFailureStore implements FailureStore {
  private readonly failures = new Map<string, Date[]>();

  async countSince(email: string, since: Date): Promise<number> {
    return (this.failures.get(email) ?? []).filter((t) => t > since).length;
  }

  async add(email: string, at: Date): Promise<void> {
    this.failures.set(email, [...(this.failures.get(email) ?? []), at]);
  }

  async clear(email: string): Promise<void> {
    this.failures.delete(email);
  }
}
