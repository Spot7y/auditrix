-- Wrong-password attempts, so the "blocked for 15 minutes after five wrong
-- passwords" rule works when Auditrix runs on several servers at once
-- (hosted), not only on one. Only the server's admin client uses it.

create table login_failures (
  id bigint generated always as identity primary key,
  email text not null,
  failed_at timestamptz not null default now()
);
create index login_failures_email_failed_at on login_failures (email, failed_at);

-- No policies: staff and the public can't see or change it.
alter table login_failures enable row level security;
revoke all on login_failures from anon, authenticated;
grant select, insert, delete on login_failures to service_role;
