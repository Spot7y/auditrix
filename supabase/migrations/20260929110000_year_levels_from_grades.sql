-- Year levels are now worked out from what each student has finished in their
-- curriculum, instead of being promoted by hand. What's stored is only:
--  - the year level a student was registered or imported at (REGISTERED),
--    a starting point until the grades catch up;
--  - a chairperson's override for special cases (CHAIRPERSON); an override
--    with no year level sets the student back to automatic from that term.
--
-- To undo this migration, see
-- supabase/rollbacks/20260929110000_year_levels_from_grades.down.sql.

alter table student_year_levels
  add column source text not null default 'REGISTERED' check (source in ('REGISTERED', 'CHAIRPERSON'));
alter table student_year_levels alter column source drop default;

-- Existing rows came from registration, imports and promotions; they all
-- stay as starting points. An override may be "back to automatic" (no level).
alter table student_year_levels alter column year_level drop not null;
alter table student_year_levels
  add constraint student_year_levels_registered_has_level check (source = 'CHAIRPERSON' or year_level is not null);

-- A registration and an override can share a term.
alter table student_year_levels drop constraint student_year_levels_student_id_effective_term_key;
alter table student_year_levels add constraint student_year_levels_student_term_source_key
  unique (student_id, effective_term, source);

-- The registered year level is recorded when a student is added. Later
-- changes to students.nominal_year_level (the registered level) aren't
-- history; overrides go through set_student_year_level below.
drop trigger students_record_year_level on students;
drop function private.record_year_level();

create function private.record_registered_year_level()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_term text;
  v_by text;
begin
  select ct.current_term into v_term
  from curricula c
  join college_terms ct on ct.college_id = c.college_id
  where c.id = new.curriculum_id;
  if v_term is null then
    return new;
  end if;

  select name into v_by from staff where id = auth.uid();

  insert into student_year_levels (student_id, effective_term, year_level, source, recorded_by)
  values (new.id, v_term, new.nominal_year_level, 'REGISTERED', coalesce(v_by, 'System'))
  on conflict (student_id, effective_term, source) do update
    set year_level = excluded.year_level, recorded_by = excluded.recorded_by, recorded_at = now();
  return new;
end;
$$;

create trigger students_record_registered_year_level
  after insert on students
  for each row execute function private.record_registered_year_level();

-- Promotion by hand is no longer needed.
drop function public.promote_students(text[], text);

-- A chairperson's override of one student's year level from a term, or with
-- p_year_level null, back to automatic from that term.
drop function public.set_student_year_level(text, smallint, text);

create function public.set_student_year_level(p_student_id text, p_year_level smallint, p_effective_term text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_by text;
begin
  select st.name into v_by
  from students s
  join curricula c on c.id = s.curriculum_id
  join staff st on st.id = auth.uid()
  where s.id = p_student_id
    and st.role = 'chairperson'
    and st.program = c.program;
  if v_by is null then
    raise exception 'Your account isn''t allowed to change this student.';
  end if;

  if p_effective_term is null or p_effective_term !~ '^\d{2}-[123]$' then
    raise exception 'Invalid term: %', p_effective_term;
  end if;
  if p_year_level is not null and p_year_level not between 1 and 4 then
    raise exception 'Year level must be 1 to 4.';
  end if;

  insert into student_year_levels (student_id, effective_term, year_level, source, recorded_by)
  values (p_student_id, p_effective_term, p_year_level, 'CHAIRPERSON', v_by)
  on conflict (student_id, effective_term, source) do update
    set year_level = excluded.year_level, recorded_by = excluded.recorded_by, recorded_at = now();
end;
$$;

revoke execute on function public.set_student_year_level(text, smallint, text) from public, anon;
grant execute on function public.set_student_year_level(text, smallint, text) to authenticated;
