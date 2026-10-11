-- The database keeps its own history and checks grades, instead of trusting
-- the app to do it. Before this, someone using a chairperson's login directly
-- against the database (bypassing the app) could change a grade without a
-- logbook entry, write logbook entries under another person's name with any
-- date, and save grades KSU doesn't use (e.g. 4.0).
--
-- 1. Every change to a grade is written to the grade logbook by a trigger, with
--    the name of the signed-in staff member and the database's time. Nobody
--    can write to the logbook directly any more.
-- 2. "Recorded by" and the time on student movements and curriculum changes
--    are filled in from the login, whatever the request says.
-- 3. Grades must be KSU grades that fit their status, and terms must be
--    written like 25-1 or 26-S.
--
-- Requests made with the server's secret key (the app's admin-only steps and
-- maintenance scripts) are trusted to record their own history, so they keep
-- the names and times they give.
--
-- To undo this migration, see supabase/rollbacks/20261012090000_enforce_audit_trail_and_grades.down.sql.

-- Who is making the request: the role in the login token ('authenticated',
-- 'service_role'), or null for a direct database session such as Supabase
-- Studio's SQL editor.
create function private.request_role()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
$$;

-- The signed-in staff member's name, or who else made the change.
create function private.current_actor()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select name from staff where id = auth.uid()),
    case when private.request_role() is null then 'Database administrator' else 'System' end
  );
$$;

-- 1. The grade logbook ----------------------------------------------------------

create function private.log_grade_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if private.request_role() = 'service_role' then
    return null;
  end if;
  if tg_op = 'UPDATE'
     and (new.status, new.grade, new.term, new.resolved_term)
       is not distinct from (old.status, old.grade, old.term, old.resolved_term) then
    return null;
  end if;

  insert into grade_audit_log (
    student_id, subject_id,
    old_status, old_grade, old_term, old_resolved_term,
    new_status, new_grade, new_term, new_resolved_term,
    changed_by, changed_at
  ) values (
    new.student_id, new.subject_id,
    case when tg_op = 'UPDATE' then old.status end,
    case when tg_op = 'UPDATE' then old.grade end,
    case when tg_op = 'UPDATE' then old.term end,
    case when tg_op = 'UPDATE' then old.resolved_term end,
    new.status, new.grade, new.term, new.resolved_term,
    private.current_actor(), now()
  );
  return null;
end;
$$;

create trigger subject_records_log_change
  after insert or update on subject_records
  for each row execute function private.log_grade_change();

drop policy "chairpersons can insert audit log entries in their program" on grade_audit_log;
revoke insert, update, delete on grade_audit_log from anon, authenticated;

-- 2. Who recorded student movements and curriculum changes -----------------------

create function private.stamp_recorded_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if private.request_role() is distinct from 'service_role' then
    new.recorded_by := private.current_actor();
    new.recorded_at := now();
  end if;
  return new;
end;
$$;

create trigger student_transitions_stamp
  before insert on student_transitions
  for each row execute function private.stamp_recorded_by();

create function private.stamp_changed_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if private.request_role() is distinct from 'service_role' then
    new.changed_by := private.current_actor();
    new.changed_by_id := auth.uid();
    new.changed_at := now();
  end if;
  return new;
end;
$$;

create trigger curriculum_change_log_stamp
  before insert on curriculum_change_log
  for each row execute function private.stamp_changed_by();

revoke update, delete on student_transitions, curriculum_change_log from anon, authenticated;

-- 3. Only KSU grades, matching their status, and valid terms ------------------------
-- "not valid": checked for every grade saved from now on, without rejecting
-- this migration because of an older row.

alter table subject_records add constraint subject_records_ksu_grade check (
  case status
    when 'PASSED' then coalesce(grade in (1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0), false)
    when 'FAILED' then coalesce(grade = 5.0, false)
    else grade is null
  end
) not valid;

alter table subject_records add constraint subject_records_term_check
  check (term ~ '^\d{2}-[12S]$') not valid;
