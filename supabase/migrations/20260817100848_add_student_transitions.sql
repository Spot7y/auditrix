create table student_transitions (
  id uuid primary key default gen_random_uuid(),
  student_id text not null references students(id) on delete cascade,
  type text not null check (type in ('TRANSFERRED_IN', 'TRANSFERRED_OUT', 'SHIFTED_IN', 'SHIFTED_OUT')),
  from_program text,
  to_program text,
  notes text,
  recorded_by text not null,
  recorded_at timestamptz not null default now()
);

grant select, insert, update, delete on student_transitions to anon, authenticated, service_role;

alter table student_transitions enable row level security;

create policy "staff can read transitions in scope" on student_transitions
  for select using (
    exists (
      select 1 from staff
      where staff.id = auth.uid()
        and (
          staff.role = 'admin'
          or (staff.role = 'chairperson' and staff.program in (student_transitions.from_program, student_transitions.to_program))
          or (staff.role = 'dean' and exists (
            select 1 from curricula c
            where c.college_id = staff.college_id
              and c.program in (student_transitions.from_program, student_transitions.to_program)
          ))
        )
    )
  );