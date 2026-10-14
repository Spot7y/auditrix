-- Undoes migrations/20261014100000_remove_in_progress.sql, for when "In
-- progress" is put back in the code as well. Run it by hand (e.g. in Supabase
-- Studio's SQL editor), then delete the migration file and this one.
--
-- The deleted in-progress records come back, except for subjects that have
-- been graded since (the grade is kept).

alter table subject_records drop constraint subject_records_status_check;
alter table subject_records add constraint subject_records_status_check
  check (status in ('PASSED', 'FAILED', 'INCOMPLETE', 'IN_PROGRESS'));

-- Without the grade logbook trigger (these rows were logged when first
-- saved) and the locked-record check (they're being restored, not changed).
alter table subject_records disable trigger subject_records_log_change;
alter table subject_records disable trigger subject_records_refuse_locked;
insert into subject_records
  select * from private.removed_in_progress_records
  on conflict (student_id, subject_id) do nothing;
alter table subject_records enable trigger subject_records_refuse_locked;
alter table subject_records enable trigger subject_records_log_change;

drop table private.removed_in_progress_records;
