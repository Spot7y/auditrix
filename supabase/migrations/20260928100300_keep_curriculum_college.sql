-- Curriculum versions created with "New version" were saved without a
-- college_id. Deans only see students whose curriculum belongs to their
-- college, so every student registered under such a version was missing from
-- the dean's overview (e.g. 50 students for the chairperson, 1 for the dean).

-- 1. Repair: give each version the college of the other versions of its program.
update curricula c
set college_id = (
  select other.college_id
  from curricula other
  where other.program = c.program and other.college_id is not null
  order by other.effective_year
  limit 1
)
where c.college_id is null;

-- 2. Prevent: a program's versions always share the college of its existing
-- versions, however the new version is created. This also stops a version
-- from being attached to a different college than the rest of its program.
create function private.set_curriculum_college()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_college uuid;
begin
  select college_id into v_college
  from curricula
  where program = new.program and college_id is not null
  order by effective_year
  limit 1;

  if v_college is not null then
    new.college_id := v_college;
  end if;
  return new;
end;
$$;

create trigger curricula_keep_program_college
  before insert on curricula
  for each row execute function private.set_curriculum_college();
