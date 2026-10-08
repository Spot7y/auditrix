-- Midyear terms are written as on KSU records: "26-S" is the midyear between
-- 25-2 and 26-1 (it carries the year of the semester after it). Midyear terms
-- were stored as "YY-3"; chairpersons entered them from KSU records, so each
-- one keeps its year and becomes "YY-S".
--
-- To undo this migration, see supabase/rollbacks/20261008090000_ksu_midyear_terms.down.sql.

alter table subject_records drop constraint subject_records_resolved_term_check;
alter table college_terms drop constraint college_terms_current_term_check;
alter table student_year_levels drop constraint student_year_levels_effective_term_check;

update subject_records set term = left(term, 3) || 'S' where term ~ '^\d{2}-3$';
update subject_records set resolved_term = left(resolved_term, 3) || 'S' where resolved_term ~ '^\d{2}-3$';
update grade_audit_log set old_term = left(old_term, 3) || 'S' where old_term ~ '^\d{2}-3$';
update grade_audit_log set new_term = left(new_term, 3) || 'S' where new_term ~ '^\d{2}-3$';
update grade_audit_log set old_resolved_term = left(old_resolved_term, 3) || 'S' where old_resolved_term ~ '^\d{2}-3$';
update grade_audit_log set new_resolved_term = left(new_resolved_term, 3) || 'S' where new_resolved_term ~ '^\d{2}-3$';
update student_year_levels set effective_term = left(effective_term, 3) || 'S' where effective_term ~ '^\d{2}-3$';
update college_terms set current_term = left(current_term, 3) || 'S' where current_term ~ '^\d{2}-3$';

alter table subject_records add constraint subject_records_resolved_term_check
  check (resolved_term ~ '^\d{2}-[12S]$');
alter table college_terms add constraint college_terms_current_term_check
  check (current_term ~ '^\d{2}-[12S]$');
alter table student_year_levels add constraint student_year_levels_effective_term_check
  check (effective_term ~ '^\d{2}-[12S]$');

-- Same as before, accepting "S" for the midyear.
create or replace function public.set_student_year_level(p_student_id text, p_year_level smallint, p_effective_term text)
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

  if p_effective_term is null or p_effective_term !~ '^\d{2}-[12S]$' then
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
