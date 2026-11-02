-- Undoes migrations/20261102100000_login_failures.sql. Restore the in-memory
-- lib/domain/loginThrottle.ts first, or logins can no longer count wrong
-- passwords (they still work). Run it by hand (e.g. in Supabase Studio's SQL
-- editor), then delete the migration file and this one.

drop table login_failures;
