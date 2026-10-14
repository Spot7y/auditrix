-- Undoes migrations/20261014090000_lock_curricula_with_students.sql, for when
-- locking curriculum versions is taken out of the code as well. Run it by hand
-- (e.g. in Supabase Studio's SQL editor), then delete the migration file and
-- this one.

drop trigger subjects_refuse_locked_curriculum on subjects;
drop trigger requirements_refuse_locked_curriculum on requirements;
drop function private.refuse_locked_curriculum_change();
