-- A curriculum version is locked once any student is registered on it: its
-- subjects and their requirements can no longer be added, edited, reordered
-- or deleted. Changing a curriculum students already follow would silently
-- change their audits (e.g. a new prerequisite turning a subject they passed
-- into a violation), so an edited curriculum is a new version instead. "New
-- version" starts as a copy of the latest one.
--
-- The app checks this too, but the database refuses the change whoever makes
-- it. Restoring a backup (npm run db:save's seed.sql) skips triggers, so it is
-- not affected.
--
-- To undo this migration, see supabase/rollbacks/20261014090000_lock_curricula_with_students.down.sql.

create function private.refuse_locked_curriculum_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_curricula uuid[];
begin
  if tg_table_name = 'subjects' then
    v_curricula := case tg_op
      when 'INSERT' then array[new.curriculum_id]
      when 'DELETE' then array[old.curriculum_id]
      else array[old.curriculum_id, new.curriculum_id]
    end;
  else
    select array_agg(distinct s.curriculum_id) into v_curricula
    from subjects s
    where s.id in (
      case when tg_op = 'DELETE' then null else new.subject_id end,
      case when tg_op = 'INSERT' then null else old.subject_id end
    );
  end if;

  if exists (select 1 from students where curriculum_id = any (v_curricula)) then
    raise exception 'This curriculum version is locked because students are registered on it. To change the curriculum, create a new version.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger subjects_refuse_locked_curriculum
  before insert or update or delete on subjects
  for each row execute function private.refuse_locked_curriculum_change();

create trigger requirements_refuse_locked_curriculum
  before insert or update or delete on requirements
  for each row execute function private.refuse_locked_curriculum_change();
