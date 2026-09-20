create policy "chairpersons can insert subjects in their program" on subjects
  for insert with check (
    exists (
      select 1 from staff
      join curricula on curricula.id = subjects.curriculum_id
      where staff.id = auth.uid()
        and staff.role = 'chairperson'
        and staff.program = curricula.program
    )
  );

create policy "chairpersons can update subjects in their program" on subjects
  for update using (
    exists (
      select 1 from staff
      join curricula on curricula.id = subjects.curriculum_id
      where staff.id = auth.uid()
        and staff.role = 'chairperson'
        and staff.program = curricula.program
    )
  );

create policy "chairpersons can delete subjects in their program" on subjects
  for delete using (
    exists (
      select 1 from staff
      join curricula on curricula.id = subjects.curriculum_id
      where staff.id = auth.uid()
        and staff.role = 'chairperson'
        and staff.program = curricula.program
    )
  );

create policy "chairpersons can insert requirements in their program" on requirements
  for insert with check (
    exists (
      select 1 from staff
      join subjects on subjects.id = requirements.subject_id
      join curricula on curricula.id = subjects.curriculum_id
      where staff.id = auth.uid()
        and staff.role = 'chairperson'
        and staff.program = curricula.program
    )
  );

create policy "chairpersons can delete requirements in their program" on requirements
  for delete using (
    exists (
      select 1 from staff
      join subjects on subjects.id = requirements.subject_id
      join curricula on curricula.id = subjects.curriculum_id
      where staff.id = auth.uid()
        and staff.role = 'chairperson'
        and staff.program = curricula.program
    )
  );