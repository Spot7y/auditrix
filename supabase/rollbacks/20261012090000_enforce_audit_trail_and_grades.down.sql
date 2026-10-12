-- Undoes migrations/20261012090000_enforce_audit_trail_and_grades.sql, for
-- when the app writes the grade logbook itself again (as before). Run it by
-- hand (e.g. in Supabase Studio's SQL editor), then delete the migration file
-- and this one. Logbook entries already written are kept.

alter table subject_records drop constraint subject_records_term_check;
alter table subject_records drop constraint subject_records_ksu_grade;

grant update, delete on student_transitions, curriculum_change_log to authenticated;
drop trigger curriculum_change_log_stamp on curriculum_change_log;
drop function private.stamp_changed_by();
drop trigger student_transitions_stamp on student_transitions;
drop function private.stamp_recorded_by();

grant insert, update, delete on grade_audit_log to anon, authenticated;
create policy "chairpersons can insert audit log entries in their program" on grade_audit_log
  for insert with check (
    exists (
      select 1
      from staff
      join students on students.id = grade_audit_log.student_id
      join curricula on curricula.id = students.curriculum_id
      where staff.id = auth.uid()
        and staff.role = 'chairperson'
        and staff.program = curricula.program
    )
  );
drop trigger subject_records_log_change on subject_records;
drop function private.log_grade_change();

drop function private.current_actor();
drop function private.request_role();
