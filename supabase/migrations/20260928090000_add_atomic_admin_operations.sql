-- Multi-step operations that must succeed or fail as a whole. Each function
-- body runs in a single transaction, so an error in any step undoes the
-- earlier ones instead of leaving half-written data behind.
--
-- These are called only from server actions using the service-role client,
-- after the action has checked the caller's permissions. They are not
-- exposed to logged-in users directly (see the grants at the bottom).

-- Dean creates a new program: its first curriculum version plus the
-- chairperson's staff row. The chairperson's auth account is created by the
-- server beforehand (and deleted again if this fails).
create function public.create_program_with_chairperson(
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

  insert into staff (id, name, role, program)
  values (p_chair_id, p_chair_name, 'chairperson', p_program);
end;
$$;

-- Dean replaces a program's chairperson: removes every current chairperson
-- row for the program and adds the new one. Returns the removed staff IDs so
-- the server can also ban their auth accounts.
create function public.replace_chairperson(
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

  insert into staff (id, name, role, program)
  values (p_new_chair_id, p_new_chair_name, 'chairperson', p_program);

  return v_old_ids;
end;
$$;

-- Chairperson accepts a student shifting in: consumes the pending request,
-- moves the student to the new curriculum and logs both sides of the shift.
-- Deleting the request first also means that if two chairpersons accept the
-- same student at once, only the first succeeds.
create function public.accept_shift_in(
  p_student_id text,
  p_new_curriculum_id uuid,
  p_recorded_by text
)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_from_program text;
  v_to_program text;
  v_student_name text;
begin
  delete from shift_requests
  where student_id = p_student_id
  returning from_program into v_from_program;
  if v_from_program is null then
    raise exception 'This student no longer has a pending shift request.';
  end if;

  select program into v_to_program from curricula where id = p_new_curriculum_id;
  if v_to_program is null then
    raise exception 'Destination curriculum not found.';
  end if;

  update students
  set curriculum_id = p_new_curriculum_id
  where id = p_student_id
  returning name into v_student_name;
  if v_student_name is null then
    raise exception 'Student not found.';
  end if;

  insert into student_transitions (student_id, student_name, type, from_program, to_program, recorded_by)
  values
    (p_student_id, v_student_name, 'SHIFTED_OUT', v_from_program, v_to_program, p_recorded_by),
    (p_student_id, v_student_name, 'SHIFTED_IN', v_from_program, v_to_program, p_recorded_by);

  return v_to_program;
end;
$$;

-- Supabase grants execute on new public functions to anon and authenticated
-- by default; these must only be callable by the server.
revoke execute on function public.create_program_with_chairperson(text, integer, uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.replace_chairperson(text, uuid, text) from public, anon, authenticated;
revoke execute on function public.accept_shift_in(text, uuid, text) from public, anon, authenticated;

grant execute on function public.create_program_with_chairperson(text, integer, uuid, uuid, text) to service_role;
grant execute on function public.replace_chairperson(text, uuid, text) to service_role;
grant execute on function public.accept_shift_in(text, uuid, text) to service_role;
