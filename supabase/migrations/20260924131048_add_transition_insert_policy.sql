create policy "chairpersons can record their own transitions" on student_transitions
  for insert with check (
    exists (
      select 1 from staff
      where staff.id = auth.uid()
        and staff.role = 'chairperson'
        and (
          (type in ('TRANSFERRED_OUT', 'DROPPED', 'SHIFTED_OUT') and staff.program = from_program)
          or (type in ('TRANSFERRED_IN', 'SHIFTED_IN') and staff.program = to_program)
        )
    )
  );