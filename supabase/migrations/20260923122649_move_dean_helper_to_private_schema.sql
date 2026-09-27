create schema if not exists private;

-- Drop the policy first, since it depends on the function we're about to replace
drop policy "deans can read chairpersons in their college" on staff;
drop function if exists public.current_dean_college_id();

create function private.current_dean_college_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select college_id from staff where id = auth.uid() and role = 'dean';
$$;

grant usage on schema private to authenticated;
grant execute on function private.current_dean_college_id() to authenticated;

create policy "deans can read chairpersons in their college" on staff
  for select using (
    exists (
      select 1 from curricula c
      where c.college_id = private.current_dean_college_id()
        and c.program = staff.program
    )
  );