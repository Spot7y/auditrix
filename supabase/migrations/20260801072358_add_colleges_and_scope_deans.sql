create table colleges (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  short_name text not null unique
);

alter table curricula add column college_id uuid references colleges(id);

alter table staff add column college_id uuid references colleges(id);
alter table staff drop constraint chairperson_needs_program;
alter table staff add constraint chairperson_needs_program check (
  (role = 'chairperson' and program is not null and college_id is null)
  or
  (role = 'dean' and college_id is not null and program is null)
  or
  (role = 'admin')
);

alter table colleges enable row level security;
create policy "authenticated staff can read colleges" on colleges
  for select using (auth.uid() is not null);
grant select, insert, update, delete on colleges to anon, authenticated, service_role;

drop policy "staff can read students in scope" on students;
create policy "staff can read students in scope" on students
  for select using (
    exists (
      select 1 from staff
      join curricula on curricula.id = students.curriculum_id
      where staff.id = auth.uid()
        and (
          staff.role = 'admin'
          or (staff.role = 'dean' and staff.college_id = curricula.college_id)
          or (staff.role = 'chairperson' and staff.program = curricula.program)
        )
    )
  );

drop policy "staff can read subject records in scope" on subject_records;
create policy "staff can read subject records in scope" on subject_records
  for select using (
    exists (
      select 1 from staff
      join students on students.id = subject_records.student_id
      join curricula on curricula.id = students.curriculum_id
      where staff.id = auth.uid()
        and (
          staff.role = 'admin'
          or (staff.role = 'dean' and staff.college_id = curricula.college_id)
          or (staff.role = 'chairperson' and staff.program = curricula.program)
        )
    )
  );

drop policy "staff can read audit log in scope" on grade_audit_log;
create policy "staff can read audit log in scope" on grade_audit_log
  for select using (
    exists (
      select 1 from staff
      join students on students.id = grade_audit_log.student_id
      join curricula on curricula.id = students.curriculum_id
      where staff.id = auth.uid()
        and (
          staff.role = 'admin'
          or (staff.role = 'dean' and staff.college_id = curricula.college_id)
          or (staff.role = 'chairperson' and staff.program = curricula.program)
        )
    )
  );