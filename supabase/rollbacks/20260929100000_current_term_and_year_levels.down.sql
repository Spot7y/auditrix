-- Undoes migrations/20260929100000_current_term_and_year_levels.sql, for
-- when the current semester and year level history are removed from the code
-- as well. Run it by hand (e.g. in Supabase Studio's SQL editor), then delete
-- the migration file and this one.
--
-- Students keep their current year level; only the history is removed.

drop function public.set_student_year_level(text, smallint, text);
drop function public.promote_students(text[], text);
drop trigger students_record_year_level on students;
drop function private.record_year_level();
drop table student_year_levels;
drop table college_terms;
drop function private.current_staff_college_id();

delete from supabase_migrations.schema_migrations where version = '20260929100000';
