-- Undoes migrations/20260929110000_year_levels_from_grades.sql and brings back
-- Promote students and year levels set by hand (the Phase 2 behaviour), for
-- when automatic year levels are removed from the code as well. Run it by hand
-- (e.g. in Supabase Studio's SQL editor), then delete the migration file and
-- this one.
--
-- Overrides that set a student back to automatic are dropped, and where a
-- registration and an override share a term, the override is kept.

drop function public.set_student_year_level(text, smallint, text);
drop trigger students_record_registered_year_level on students;
drop function private.record_registered_year_level();

delete from student_year_levels where year_level is null;
delete from student_year_levels r
where r.source = 'REGISTERED'
  and exists (
    select 1 from student_year_levels o
    where o.student_id = r.student_id and o.effective_term = r.effective_term and o.source = 'CHAIRPERSON'
  );

alter table student_year_levels drop constraint student_year_levels_student_term_source_key;
alter table student_year_levels drop constraint student_year_levels_registered_has_level;
alter table student_year_levels drop column source;
alter table student_year_levels alter column year_level set not null;
alter table student_year_levels add constraint student_year_levels_student_id_effective_term_key
  unique (student_id, effective_term);

-- Phase 2's functions, as they were:

-- Records the year level from the term passed by the functions below, or
-- else the college's current term. Without either, nothing is recorded.
create function private.record_year_level()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_term text := nullif(current_setting('auditrix.effective_term', true), '');
  v_level smallint := coalesce(nullif(current_setting('auditrix.year_level', true), '')::smallint, new.nominal_year_level);
  v_by text;
begin
  -- An unchanged year level is recorded only when a term was given, e.g. to
  -- fill in the history of an earlier term.
  if tg_op = 'UPDATE' and v_term is null and new.nominal_year_level is not distinct from old.nominal_year_level then
    return new;
  end if;

  if v_term is null then
    select ct.current_term into v_term
    from curricula c
    join college_terms ct on ct.college_id = c.college_id
    where c.id = new.curriculum_id;
  end if;
  if v_term is null then
    return new;
  end if;

  select name into v_by from staff where id = auth.uid();

  insert into student_year_levels (student_id, effective_term, year_level, recorded_by)
  values (new.id, v_term, v_level, coalesce(v_by, 'System'))
  on conflict (student_id, effective_term) do update
    set year_level = excluded.year_level,
        recorded_by = excluded.recorded_by,
        recorded_at = now();
  return new;
end;
$$;

create trigger students_record_year_level
  after insert or update of nominal_year_level on students
  for each row execute function private.record_year_level();

-- 3. Changing year levels ----------------------------------------------------

-- Both run as the signed-in user, so row-level security limits them to the
-- chairperson's own students. Either every student is changed or none is.

-- Moves each student up one year level from `p_effective_term`.
create function public.promote_students(p_student_ids text[], p_effective_term text)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_expected integer := coalesce(array_length(p_student_ids, 1), 0);
  v_count integer;
begin
  if p_effective_term is null or p_effective_term !~ '^\d{2}-[123]$' then
    raise exception 'Invalid term: %', p_effective_term;
  end if;

  perform set_config('auditrix.effective_term', p_effective_term, true);
  update students
  set nominal_year_level = nominal_year_level + 1
  where id = any(p_student_ids) and nominal_year_level < 4;
  get diagnostics v_count = row_count;
  perform set_config('auditrix.effective_term', '', true);

  if v_count <> v_expected then
    raise exception 'Only % of the % selected students could be promoted (4th-year students and students outside your program can''t be). Nothing was changed.',
      v_count, v_expected;
  end if;
  return v_count;
end;
$$;

-- Sets one student's year level from `p_effective_term`. When the history
-- already has a later entry, this only fills in the earlier term and the
-- student's current year level stays as it is.
create function public.set_student_year_level(p_student_id text, p_year_level smallint, p_effective_term text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_found boolean;
  v_has_later boolean;
begin
  if p_effective_term is null or p_effective_term !~ '^\d{2}-[123]$' then
    raise exception 'Invalid term: %', p_effective_term;
  end if;
  if p_year_level is null or p_year_level not between 1 and 4 then
    raise exception 'Year level must be 1 to 4.';
  end if;

  -- "YY-S" terms sort correctly as text.
  select exists (
    select 1 from student_year_levels
    where student_id = p_student_id and effective_term > p_effective_term
  ) into v_has_later;

  perform set_config('auditrix.effective_term', p_effective_term, true);
  perform set_config('auditrix.year_level', p_year_level::text, true);
  update students
  set nominal_year_level = case when v_has_later then nominal_year_level else p_year_level end
  where id = p_student_id;
  v_found := found;
  perform set_config('auditrix.effective_term', '', true);
  perform set_config('auditrix.year_level', '', true);

  if not v_found then
    raise exception 'Your account isn''t allowed to change this student.';
  end if;
end;
$$;

revoke execute on function public.promote_students(text[], text) from public, anon;
revoke execute on function public.set_student_year_level(text, smallint, text) from public, anon;
grant execute on function public.promote_students(text[], text) to authenticated;
grant execute on function public.set_student_year_level(text, smallint, text) to authenticated;

delete from supabase_migrations.schema_migrations where version = '20260929110000';
