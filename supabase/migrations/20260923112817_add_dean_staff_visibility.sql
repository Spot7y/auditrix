create policy "deans can read chairpersons in their college" on staff
  for select using (
    exists (
      select 1 from staff dean
      where dean.id = auth.uid()
        and dean.role = 'dean'
        and exists (
          select 1 from curricula c
          where c.college_id = dean.college_id
            and c.program = staff.program
        )
    )
  );