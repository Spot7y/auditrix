-- Undoes migrations/20261102090000_explicit_table_grants.sql. Only needed on a
-- project created after May 30, 2026 (older ones keep their automatic grants);
-- there, removing these grants stops Auditrix from reading or saving anything.
-- Run it by hand (e.g. in Supabase Studio's SQL editor), then delete the
-- migration file and this one.

revoke select, insert, update, delete on colleges, curricula, subjects, requirements, students, subject_records, shift_requests,
  staff, student_transitions, curriculum_change_log, grade_audit_log, student_year_levels, college_history, college_terms
  from authenticated;
revoke update (name) on staff from authenticated;
