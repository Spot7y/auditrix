-- A history of curriculum edits (subjects, prerequisites, versions, imports),
-- like grade_audit_log does for grades. Entries can be added but never
-- edited or deleted by users: there are no update or delete policies.
create table curriculum_change_log (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references curricula(id) on delete cascade,
  subject_code text,
  summary text not null,
  changed_by text not null,
  changed_by_id uuid default auth.uid(),
  changed_at timestamptz not null default now()
);

create index curriculum_change_log_curriculum_idx on curriculum_change_log (curriculum_id, changed_at desc);

-- Supabase grants every privilege on new tables by default; history is append-only.
revoke all on curriculum_change_log from anon, authenticated;
grant select, insert on curriculum_change_log to authenticated;
grant all on curriculum_change_log to service_role;

alter table curriculum_change_log enable row level security;

create policy "chairpersons can log changes to their program" on curriculum_change_log
  for insert with check (
    changed_by_id = auth.uid()
    and exists (
      select 1 from staff
      join curricula on curricula.id = curriculum_change_log.curriculum_id
      where staff.id = auth.uid()
        and staff.role = 'chairperson'
        and staff.program = curricula.program
    )
  );

create policy "staff can read curriculum history in scope" on curriculum_change_log
  for select using (
    exists (
      select 1 from staff
      join curricula on curricula.id = curriculum_change_log.curriculum_id
      where staff.id = auth.uid()
        and (
          staff.role = 'admin'
          or (staff.role = 'dean' and staff.college_id = curricula.college_id)
          or (staff.role = 'chairperson' and staff.program = curricula.program)
        )
    )
  );
