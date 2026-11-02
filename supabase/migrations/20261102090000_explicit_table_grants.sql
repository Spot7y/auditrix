-- Since May 30, 2026, new Supabase projects no longer grant the API roles
-- access to tables automatically: without explicit grants, every query from
-- Auditrix fails with "permission denied" (42501). This writes out the
-- access Auditrix uses, so a new hosted project works the same as the local
-- one. Row-level security still decides which rows each staff member sees.
--
-- The anon role gets nothing: the browser never talks to Supabase directly,
-- and every query is made as a signed-in staff member (authenticated) or by
-- the server's admin client (service_role).

-- Older projects (and local copies) gave anon the same access as everyone;
-- removed so local and hosted behave the same.
revoke all on all tables in schema public from anon;

grant usage on schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to service_role;

-- Programs, curricula and students: read and changed by staff, within their RLS scope.
grant select, insert, update, delete on colleges, curricula, subjects, requirements, students, subject_records, shift_requests
  to authenticated;

-- Staff can read accounts in scope and change only their own name.
grant select, insert, delete on staff to authenticated;
grant update (name) on staff to authenticated;

-- Histories and logbooks: read, and added to, never changed or deleted.
grant select, insert on student_transitions, curriculum_change_log to authenticated;
grant select on grade_audit_log, student_year_levels, college_history to authenticated;

-- The current semester is set by the dean.
grant select, insert, update on college_terms to authenticated;
