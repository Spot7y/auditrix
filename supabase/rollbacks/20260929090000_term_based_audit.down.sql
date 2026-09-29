-- Undoes migrations/20260929090000_term_based_audit.sql, for when the
-- term-based prerequisite checker is removed from the code as well.
-- Run it by hand (e.g. in Supabase Studio's SQL editor), then delete the
-- migration file and this one.
--
-- The old invalid-entry flags can't be brought back; every grade starts
-- unflagged.

alter table subject_records add column is_invalid_entry boolean not null default false;

alter table grade_audit_log
  drop column old_resolved_term,
  drop column new_resolved_term;

alter table subject_records drop column resolved_term;

delete from supabase_migrations.schema_migrations where version = '20260929090000';
