-- A college can already exist before it has programs (e.g. added together
-- with the university's other colleges). Splitting can now move programs into
-- such a college, as long as it has no programs and no dean yet, instead of
-- only into a brand-new one.
--
-- To undo this migration, see supabase/rollbacks/20261015100000_split_into_existing_college.down.sql.

drop function public.split_college(uuid, text, text, text[], uuid, text);

create function public.split_college(
  p_dean_id uuid,
  p_existing_college uuid,
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
  v_new_short text;
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

  if p_existing_college is not null then
    select id, short_name into v_new, v_new_short from colleges where id = p_existing_college;
    if v_new is null then
      raise exception 'That college no longer exists.';
    end if;
    if v_new = v_from
       or exists (select 1 from curricula where college_id = v_new)
       or exists (select 1 from staff where college_id = v_new) then
      raise exception '% already has programs or a dean, so programs can only move to a college that has neither.', v_new_short;
    end if;
  else
    insert into colleges (name, short_name) values (p_name, p_short_name) returning id, short_name into v_new, v_new_short;
  end if;

  -- Every curriculum version of the moved programs goes with them.
  update curricula set college_id = v_new where college_id = v_from and program = any (p_programs);

  insert into college_terms (college_id, current_term, set_by, set_at)
  select v_new, current_term, set_by, set_at from college_terms where college_id = v_from
  on conflict (college_id) do nothing;

  insert into staff (id, name, role, college_id, must_change_password)
  values (p_new_dean_id, p_new_dean_name, 'dean', v_new, true);

  select string_agg(p, ', ' order by p) into v_moved from unnest(p_programs) as p;
  insert into college_history (college_id, event, summary, recorded_by) values
    (v_from, 'COLLEGE_SPLIT', format('%s moved to %s (dean: %s).', v_moved, v_new_short, p_new_dean_name), v_dean_name),
    (v_new, 'COLLEGE_CREATED', format('Received %s from %s. Dean: %s.', v_moved, v_from_short, p_new_dean_name), v_dean_name);

  return v_new;
end;
$$;

revoke execute on function public.split_college(uuid, uuid, text, text, text[], uuid, text) from public, anon, authenticated;
grant execute on function public.split_college(uuid, uuid, text, text, text[], uuid, text) to service_role;
