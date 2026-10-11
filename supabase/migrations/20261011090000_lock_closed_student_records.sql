-- A dropped or transferred-out student's record is locked: their grades,
-- details and year level can't be changed until a chairperson reopens it.
-- The lock follows the student's history: recording a drop or a transfer out
-- locks the record, and recording "Record reopened" unlocks it.
--
-- To undo this migration, see supabase/rollbacks/20261011090000_lock_closed_student_records.down.sql.

alter table students add column record_status text not null default 'ACTIVE'
  check (record_status in ('ACTIVE', 'DROPPED', 'TRANSFERRED_OUT'));

alter table student_transitions drop constraint student_transitions_type_check;
alter table student_transitions add constraint student_transitions_type_check
  check (type in ('TRANSFERRED_IN', 'TRANSFERRED_OUT', 'SHIFTED_IN', 'SHIFTED_OUT', 'DROPPED', 'REOPENED'));

-- Students already dropped or transferred out start locked.
update students s set record_status = t.type
from (
  select distinct on (student_id) student_id, type
  from student_transitions
  where type in ('DROPPED', 'TRANSFERRED_OUT', 'REOPENED', 'TRANSFERRED_IN', 'SHIFTED_IN')
  order by student_id, recorded_at desc
) t
where t.student_id = s.id and t.type in ('DROPPED', 'TRANSFERRED_OUT');

-- Recording a drop, a transfer out or a reopening sets the lock.
create function private.apply_record_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.type in ('DROPPED', 'TRANSFERRED_OUT') then
    update students set record_status = new.type where id = new.student_id;
  elsif new.type = 'REOPENED' then
    update students set record_status = 'ACTIVE' where id = new.student_id;
  end if;
  return new;
end;
$$;

create trigger student_transitions_apply_record_status
  after insert on student_transitions
  for each row execute function private.apply_record_status();

create function private.locked_message(p_status text)
returns text
language sql
immutable
as $$
  select 'This student''s record is locked because the student was '
    || case p_status when 'DROPPED' then 'dropped' else 'transferred out' end
    || '. Reopen the record to change it.';
$$;

-- Grades and year levels of a locked student can't be added or changed.
create function private.refuse_locked_student_rows()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select record_status into v_status from students where id = new.student_id;
  if v_status is not null and v_status <> 'ACTIVE' then
    raise exception '%', private.locked_message(v_status);
  end if;
  return new;
end;
$$;

create trigger subject_records_refuse_locked
  before insert or update on subject_records
  for each row execute function private.refuse_locked_student_rows();

create trigger student_year_levels_refuse_locked
  before insert or update on student_year_levels
  for each row execute function private.refuse_locked_student_rows();

-- A locked student's details can't be changed; only the lock itself can.
create function private.refuse_locked_student_update()
returns trigger
language plpgsql
as $$
begin
  if old.record_status <> 'ACTIVE'
     and (new.id, new.name, new.curriculum_id, new.nominal_year_level)
       is distinct from (old.id, old.name, old.curriculum_id, old.nominal_year_level) then
    raise exception '%', private.locked_message(old.record_status);
  end if;
  return new;
end;
$$;

create trigger students_refuse_locked_update
  before update on students
  for each row execute function private.refuse_locked_student_update();

-- Chairpersons record a reopening for their own program's students, and see
-- it in the student's history like a drop.
drop policy "chairpersons can record their own transitions" on student_transitions;
create policy "chairpersons can record their own transitions" on student_transitions
  for insert
  with check (
    exists (
      select 1 from staff
      where staff.id = auth.uid()
        and staff.role = 'chairperson'
        and (
          (student_transitions.type in ('TRANSFERRED_OUT', 'DROPPED', 'SHIFTED_OUT', 'REOPENED')
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
            (student_transitions.type in ('TRANSFERRED_OUT', 'DROPPED', 'SHIFTED_OUT', 'REOPENED')
              and staff.program = student_transitions.from_program)
            or (student_transitions.type in ('TRANSFERRED_IN', 'SHIFTED_IN')
              and staff.program = student_transitions.to_program)
          ))
          or (staff.role = 'dean' and exists (
            select 1 from curricula c
            where c.college_id = staff.college_id
              and (
                (student_transitions.type in ('TRANSFERRED_OUT', 'DROPPED', 'SHIFTED_OUT', 'REOPENED')
                  and c.program = student_transitions.from_program)
                or (student_transitions.type in ('TRANSFERRED_IN', 'SHIFTED_IN')
                  and c.program = student_transitions.to_program)
              )
          ))
        )
    )
  );
