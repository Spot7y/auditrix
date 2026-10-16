-- A dean can rename their own college (name and short name), e.g. after a
-- split leaves it with only some of its programs. Programs, students and
-- records point at the college itself, not its name, so nothing else changes;
-- the new name simply shows everywhere from then on. The rename is recorded
-- in college_history.
--
-- The function is called only by the server (service role), after the action
-- has checked who is asking; it runs as one transaction.
--
-- To undo this migration, see supabase/rollbacks/20261016090000_rename_college.down.sql.

alter table college_history drop constraint college_history_event_check;
alter table college_history add constraint college_history_event_check
  check (event in ('DEAN_HANDOVER', 'COLLEGE_SPLIT', 'COLLEGE_CREATED', 'COLLEGE_RENAMED'));

create function public.rename_college(
  p_dean_id uuid,
  p_name text,
  p_short_name text
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_college uuid;
  v_dean_name text;
  v_old_name text;
  v_old_short text;
  v_taken text;
begin
  select s.college_id, s.name, c.name, c.short_name into v_college, v_dean_name, v_old_name, v_old_short
  from staff s join colleges c on c.id = s.college_id
  where s.id = p_dean_id and s.role = 'dean';
  if v_college is null then
    raise exception 'Only a dean can rename their college.';
  end if;

  if p_name = v_old_name and p_short_name = v_old_short then
    raise exception 'That is already the college''s name.';
  end if;

  -- Names are compared without regard to capitals, so "COE" and "CoE" can't both exist.
  select format('%s (%s)', name, short_name) into v_taken
  from colleges
  where id <> v_college and (lower(name) = lower(p_name) or lower(short_name) = lower(p_short_name))
  limit 1;
  if v_taken is not null then
    raise exception 'There is already a college named %. Choose another name and short name.', v_taken;
  end if;

  update colleges set name = p_name, short_name = p_short_name where id = v_college;

  insert into college_history (college_id, event, summary, recorded_by)
  values (
    v_college,
    'COLLEGE_RENAMED',
    format('Renamed %s (%s) to %s (%s).', v_old_name, v_old_short, p_name, p_short_name),
    v_dean_name
  );
end;
$$;

revoke execute on function public.rename_college(uuid, text, text) from public, anon, authenticated;
grant execute on function public.rename_college(uuid, text, text) to service_role;
