create policy "chairpersons can create new curriculum versions for their program" on curricula
  for insert with check (
    exists (
      select 1 from staff
      where staff.id = auth.uid()
        and staff.role = 'chairperson'
        and staff.program = curricula.program
    )
  );