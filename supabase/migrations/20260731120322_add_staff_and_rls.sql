create table staff (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('chairperson', 'dean', 'admin')),
  program text references curricula(program),
  constraint chairperson_needs_program check (
    (role = 'chairperson' and program is not null) or (role <> 'chairperson')
  )
);

alter table staff enable row level security;
alter table students enable row level security;
alter table subject_records enable row level security;
alter table grade_audit_log enable row level security;
alter table curricula enable row level security;
alter table subjects enable row level security;
alter table requirements enable row level security;

create policy "staff can read own row" on staff
  for select using (id = auth.uid());

create policy "authenticated staff can read curricula" on curricula
  for select using (auth.uid() is not null);
create policy "authenticated staff can read subjects" on subjects
  for select using (auth.uid() is not null);
create policy "authenticated staff can read requirements" on requirements
  for select using (auth.uid() is not null);

create policy "staff can read students in scope" on students
  for select using (
    exists (
      select 1 from staff
      where staff.id = auth.uid()
        and (
          staff.role in ('dean', 'admin')
          or staff.program = (select program from curricula where curricula.id = students.curriculum_id)
        )
    )
  );

create policy "chairpersons can insert students in their program" on students
  for insert with check (
    exists (
      select 1 from staff
      where staff.id = auth.uid()
        and staff.role = 'chairperson'
        and staff.program = (select program from curricula where curricula.id = students.curriculum_id)
    )
  );

create policy "staff can read subject records in scope" on subject_records
  for select using (
    exists (
      select 1 from staff
      join students on students.id = subject_records.student_id
      join curricula on curricula.id = students.curriculum_id
      where staff.id = auth.uid()
        and (staff.role in ('dean', 'admin') or staff.program = curricula.program)
    )
  );

create policy "chairpersons can write subject records in their program" on subject_records
  for insert with check (
    exists (
      select 1 from staff
      join students on students.id = subject_records.student_id
      join curricula on curricula.id = students.curriculum_id
      where staff.id = auth.uid()
        and staff.role = 'chairperson'
        and staff.program = curricula.program
    )
  );

create policy "chairpersons can update subject records in their program" on subject_records
  for update using (
    exists (
      select 1 from staff
      join students on students.id = subject_records.student_id
      join curricula on curricula.id = students.curriculum_id
      where staff.id = auth.uid()
        and staff.role = 'chairperson'
        and staff.program = curricula.program
    )
  );

create policy "staff can read audit log in scope" on grade_audit_log
  for select using (
    exists (
      select 1 from staff
      join students on students.id = grade_audit_log.student_id
      join curricula on curricula.id = students.curriculum_id
      where staff.id = auth.uid()
        and (staff.role in ('dean', 'admin') or staff.program = curricula.program)
    )
  );

create policy "chairpersons can insert audit log entries in their program" on grade_audit_log
  for insert with check (
    exists (
      select 1 from staff
      join students on students.id = grade_audit_log.student_id
      join curricula on curricula.id = students.curriculum_id
      where staff.id = auth.uid()
        and staff.role = 'chairperson'
        and staff.program = curricula.program
    )
  );
  grant select, insert, update, delete on staff to anon, authenticated, service_role;