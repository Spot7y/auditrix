create table shift_requests (
  id uuid primary key default gen_random_uuid(),
  student_id text not null unique references students(id) on delete cascade,
  from_program text not null,
  requested_by text not null,
  requested_at timestamptz not null default now()
);

grant select, insert, update, delete on shift_requests to anon, authenticated, service_role;

alter table shift_requests enable row level security;

create policy "chairpersons can see their own programs pending requests" on shift_requests
  for select using (
    exists (
      select 1 from staff
      where staff.id = auth.uid()
        and staff.role = 'chairperson'
        and staff.program = shift_requests.from_program
    )
  );

create policy "chairpersons can request their own students shift out" on shift_requests
  for insert with check (
    exists (
      select 1 from staff
      where staff.id = auth.uid()
        and staff.role = 'chairperson'
        and staff.program = shift_requests.from_program
    )
  );

create policy "chairpersons can cancel their own pending requests" on shift_requests
  for delete using (
    exists (
      select 1 from staff
      where staff.id = auth.uid()
        and staff.role = 'chairperson'
        and staff.program = shift_requests.from_program
    )
  );