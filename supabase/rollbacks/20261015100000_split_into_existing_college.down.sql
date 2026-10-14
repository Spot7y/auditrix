-- Undoes migrations/20261015100000_split_into_existing_college.sql: splitting
-- goes back to creating a brand-new college only. Run it by hand (e.g. in
-- Supabase Studio's SQL editor), then delete the migration file and this one.

drop function public.split_college(uuid, uuid, text, text, text[], uuid, text);

create function public.split_college(
  p_dean_id uuid,
  p_name text,
  p_short_name text,
  p_programs text[],
  p_new_dean_id uuid,
  p_new_dean_name text
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_from uuid;
  v_from_short text;
  v_dean_name text;
  v_new uuid;
  v_moved text;
begin
  select s.college_id, s.name, c.short_name into v_from, v_dean_name, v_from_short
  from staff s join colleges c on c.id = s.college_id
  where s.id = p_dean_id and s.role = 'dean';
  if v_from is null then
    raise exception 'Only a dean can split their college.';
  end if;

  if coalesce(array_length(p_programs, 1), 0) = 0 then
    raise exception 'Choose at least one program to move to the new college.';
  end if;
  if exists (
    select unnest(p_programs)
    except
    select program from curricula where college_id = v_from
  ) then
    raise exception 'Only programs of your own college can be moved.';
  end if;
  if not exists (select 1 from curricula where college_id = v_from and program <> all (p_programs)) then
    raise exception 'At least one program has to stay in %.', v_from_short;
  end if;

  insert into colleges (name, short_name) values (p_name, p_short_name) returning id into v_new;

  -- Every curriculum version of the moved programs goes with them.
  update curricula set college_id = v_new where college_id = v_from and program = any (p_programs);

  insert into college_terms (college_id, current_term, set_by, set_at)
  select v_new, current_term, set_by, set_at from college_terms where college_id = v_from;

  insert into staff (id, name, role, college_id, must_change_password)
  values (p_new_dean_id, p_new_dean_name, 'dean', v_new, true);

  select string_agg(p, ', ' order by p) into v_moved from unnest(p_programs) as p;
  insert into college_history (college_id, event, summary, recorded_by) values
    (v_from, 'COLLEGE_SPLIT', format('%s moved to the new %s (dean: %s).', v_moved, p_short_name, p_new_dean_name), v_dean_name),
    (v_new, 'COLLEGE_CREATED', format('Created from %s with %s. Dean: %s.', v_from_short, v_moved, p_new_dean_name), v_dean_name);

  return v_new;
end;
$$;

revoke execute on function public.split_college(uuid, text, text, text[], uuid, text) from public, anon, authenticated;
grant execute on function public.split_college(uuid, text, text, text[], uuid, text) to service_role;
