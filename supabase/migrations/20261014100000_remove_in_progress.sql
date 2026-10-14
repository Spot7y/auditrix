-- "In progress" is removed: a subject is recorded only once it has a grade
-- (a final grade or INC). Regular and irregular students are therefore known
-- only after the semester's grades are entered.
--
-- The in-progress records saved so far are deleted. A copy is kept in
-- private.removed_in_progress_records (not reachable from the app), so the
-- rollback can put them back. Their past entries in the grade logbook stay.
--
-- To undo this migration, see supabase/rollbacks/20261014100000_remove_in_progress.down.sql.

create table private.removed_in_progress_records as
  select * from subject_records where status = 'IN_PROGRESS';

delete from subject_records where status = 'IN_PROGRESS';

alter table subject_records drop constraint subject_records_status_check;
alter table subject_records add constraint subject_records_status_check
  check (status in ('PASSED', 'FAILED', 'INCOMPLETE'));
