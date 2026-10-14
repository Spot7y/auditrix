-- Two things a dean can now do without a system administrator:
--
-- 1. Hand over the deanship: the outgoing dean creates their successor's
--    account (with a temporary password) and their own account is closed.
--    Their name stays on everything they recorded, which stores names as text.
-- 2. Split the college: the dean names a new college, picks which of their
--    programs move to it, and creates its dean. Only the programs' college
--    changes; curricula, students, grades and history stay as they are, and
--    the new college starts on a copy of the old one's current semester.
--
-- Both are recorded in college_history, which each college's dean can read.
-- The functions are called only by the server (service role), after the
-- action has checked who is asking; each runs as one transaction.
--
-- To undo this migration, see supabase/rollbacks/20261015090000_dean_handover_and_college_split.down.sql.

create table college_history (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges(id) on delete cascade,
  event text not null check (event in ('DEAN_HANDOVER', 'COLLEGE_SPLIT', 'COLLEGE_CREATED')),
  summary text not null,
  recorded_by text not null,
  recorded_at timestamptz not null default now()
);

alter table college_history enable row level security;
revoke all on college_history from anon, authenticated;
grant select on college_history to authenticated;
grant all on college_history to service_role;

create policy "deans can read their college's history" on college_history
  for select using (college_id = private.current_dean_college_id());

-- 1. Hand over the deanship ----------------------------------------------------

create function public.hand_over_deanship(
  p_old_dean_id uuid,
  p_new_dean_id uuid,
  p_new_dean_name text
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_college uuid;
  v_old_name text;
begin
  delete from staff
  where id = p_old_dean_id and role = 'dean'
  returning college_id, name into v_college, v_old_name;
  if v_college is null then
    raise exception 'Only a dean can hand over the deanship.';
  end if;

  insert into staff (id, name, role, college_id, must_change_password)
  values (p_new_dean_id, p_new_dean_name, 'dean', v_college, true);

  insert into college_history (college_id, event, summary, recorded_by)
  values (v_college, 'DEAN_HANDOVER', format('%s handed the deanship over to %s.', v_old_name, p_new_dean_name), v_old_name);
end;
$$;

-- 2. Split the college ---------------------------------------------------------

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

revoke execute on function public.hand_over_deanship(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.split_college(uuid, text, text, text[], uuid, text) from public, anon, authenticated;
grant execute on function public.hand_over_deanship(uuid, uuid, text) to service_role;
grant execute on function public.split_college(uuid, text, text, text[], uuid, text) to service_role;
