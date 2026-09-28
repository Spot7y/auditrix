-- Chairperson accounts are created by a dean, who therefore knows the
-- password. New chairpersons must choose their own password when they first
-- log in. Only the server (service role) sets or clears this flag.
alter table staff add column must_change_password boolean not null default false;

create or replace function public.create_program_with_chairperson(
  p_program text,
  p_effective_year integer,
  p_college_id uuid,
  p_chair_id uuid,
  p_chair_name text
)
returns void
language plpgsql
set search_path = public
as $$
begin
  insert into curricula (program, effective_year, college_id)
  values (p_program, p_effective_year, p_college_id);

  insert into staff (id, name, role, program, must_change_password)
  values (p_chair_id, p_chair_name, 'chairperson', p_program, true);
end;
$$;

create or replace function public.replace_chairperson(
  p_program text,
  p_new_chair_id uuid,
  p_new_chair_name text
)
returns uuid[]
language plpgsql
set search_path = public
as $$
declare
  v_old_ids uuid[];
begin
  with removed as (
    delete from staff
    where role = 'chairperson' and program = p_program
    returning id
  )
  select coalesce(array_agg(id), '{}') into v_old_ids from removed;

  insert into staff (id, name, role, program, must_change_password)
  values (p_new_chair_id, p_new_chair_name, 'chairperson', p_program, true);

  return v_old_ids;
end;
$$;
