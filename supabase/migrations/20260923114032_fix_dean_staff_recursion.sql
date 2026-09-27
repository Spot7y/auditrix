drop policy "deans can read chairpersons in their college" on staff;

create or replace function public.current_dean_college_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select college_id from staff where id = auth.uid() and role = 'dean';
$$;

create policy "deans can read chairpersons in their college" on staff
  for select using (
    exists (
      select 1 from curricula c
      where c.college_id = public.current_dean_college_id()
        and c.program = staff.program
    )
  );