drop policy "staff can read transitions in scope" on student_transitions;

create policy "staff can read transitions in scope" on student_transitions
  for select using (
    exists (
      select 1 from staff
      where staff.id = auth.uid()
        and (
          staff.role = 'admin'
          or (staff.role = 'chairperson' and (
            (student_transitions.type in ('TRANSFERRED_OUT', 'DROPPED', 'SHIFTED_OUT') and staff.program = student_transitions.from_program)
            or (student_transitions.type in ('TRANSFERRED_IN', 'SHIFTED_IN') and staff.program = student_transitions.to_program)
          ))
          or (staff.role = 'dean' and exists (
            select 1 from curricula c
            where c.college_id = staff.college_id
              and (
                (student_transitions.type in ('TRANSFERRED_OUT', 'DROPPED', 'SHIFTED_OUT') and c.program = student_transitions.from_program)
                or (student_transitions.type in ('TRANSFERRED_IN', 'SHIFTED_IN') and c.program = student_transitions.to_program)
              )
          ))
        )
    )
  );