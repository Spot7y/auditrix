-- The prerequisite checker now works from terms: a subject is out of order
-- when a prerequisite wasn't passed in an earlier term. The old flag was
-- worked out once, when the grade was typed in, so it depended on the order
-- grades were entered in; it's no longer used.
--
-- To undo this migration, see supabase/rollbacks/20260929090000_term_based_audit.down.sql.

-- The term an INC was replaced by a final grade. The subject keeps the term
-- it was taken in (`term`), and counts as passed only from this term.
alter table subject_records
  add column resolved_term text check (resolved_term ~ '^\d{2}-[123]$');

alter table grade_audit_log
  add column old_resolved_term text,
  add column new_resolved_term text;

alter table subject_records drop column is_invalid_entry;
