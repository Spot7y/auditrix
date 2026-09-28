-- Row-level security had no UPDATE policies on students or staff, so
-- "Edit Student" and "Change Name" in Settings updated 0 rows without an
-- error and silently changed nothing.

-- Chairpersons can edit students in their program. The check also applies to
-- the row after the update, so a student can't be moved into another
-- program's curriculum this way (shift-in handles that).
create policy "chairpersons can update students in their program" on students
  for update
  using (
    exists (
      select 1 from staff
      join curricula on curricula.id = students.curriculum_id
      where staff.id = auth.uid()
        and staff.role = 'chairperson'
        and staff.program = curricula.program
    )
  )
  with check (
    exists (
      select 1 from staff
      join curricula on curricula.id = students.curriculum_id
      where staff.id = auth.uid()
        and staff.role = 'chairperson'
        and staff.program = curricula.program
    )
  );

-- Staff can change their own name, and nothing else: the column grant below
-- stops anyone from changing their own role, program or college.
create policy "staff can update own row" on staff
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

revoke update on staff from anon, authenticated;
grant update (name) on staff to authenticated;
