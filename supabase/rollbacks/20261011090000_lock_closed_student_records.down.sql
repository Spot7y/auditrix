-- Undoes migrations/20261011090000_lock_closed_student_records.sql, for when
-- locking dropped and transferred-out students is taken out of the code as
-- well. Run it by hand (e.g. in Supabase Studio's SQL editor), then delete the
-- migration file and this one. "Record reopened" entries are removed from the
-- students' history.

drop trigger students_refuse_locked_update on students;
drop trigger student_year_levels_refuse_locked on student_year_levels;
drop trigger subject_records_refuse_locked on subject_records;
drop trigger student_transitions_apply_record_status on student_transitions;
drop function private.refuse_locked_student_update();
drop function private.refuse_locked_student_rows();
drop function private.apply_record_status();
drop function private.locked_message(text);

delete from student_transitions where type = 'REOPENED';
alter table student_transitions drop constraint student_transitions_type_check;
alter table student_transitions add constraint student_transitions_type_check
  check (type in ('TRANSFERRED_IN', 'TRANSFERRED_OUT', 'SHIFTED_IN', 'SHIFTED_OUT', 'DROPPED'));

alter table students drop column record_status;

drop policy "chairpersons can record their own transitions" on student_transitions;
create policy "chairpersons can record their own transitions" on student_transitions
  for insert
  with check (
    exists (
      select 1 from staff
      where staff.id = auth.uid()
        and staff.role = 'chairperson'
        and (
          (student_transitions.type in ('TRANSFERRED_OUT', 'DROPPED', 'SHIFTED_OUT')
            and staff.program = student_transitions.from_program)
          or (student_transitions.type in ('TRANSFERRED_IN', 'SHIFTED_IN')
            and staff.program = student_transitions.to_program)
        )
    )
  );

drop policy "staff can read transitions in scope" on student_transitions;
create policy "staff can read transitions in scope" on student_transitions
  for select
  using (
    exists (
      select 1 from staff
      where staff.id = auth.uid()
        and (
          staff.role = 'admin'
          or (staff.role = 'chairperson' and (
            (student_transitions.type in ('TRANSFERRED_OUT', 'DROPPED', 'SHIFTED_OUT')
              and staff.program = student_transitions.from_program)
            or (student_transitions.type in ('TRANSFERRED_IN', 'SHIFTED_IN')
              and staff.program = student_transitions.to_program)
          ))
          or (staff.role = 'dean' and exists (
            select 1 from curricula c
            where c.college_id = staff.college_id
              and (
                (student_transitions.type in ('TRANSFERRED_OUT', 'DROPPED', 'SHIFTED_OUT')
                  and c.program = student_transitions.from_program)
                or (student_transitions.type in ('TRANSFERRED_IN', 'SHIFTED_IN')
                  and c.program = student_transitions.to_program)
              )
          ))
        )
    )
  );
