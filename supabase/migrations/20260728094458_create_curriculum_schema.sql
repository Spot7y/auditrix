create table curricula (
  id uuid primary key default gen_random_uuid(),
  program text not null unique
);

create table subjects (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references curricula(id) on delete cascade,
  code text not null,
  title text not null,
  units numeric not null,
  year_level smallint not null check (year_level between 1 and 4),
  semester smallint not null check (semester in (1, 2)),
  unique (curriculum_id, code)
);

-- Polymorphic: mirrors the Requirement class hierarchy (CoursePrerequisite / YearStandingRequirement)
create table requirements (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  type text not null check (type in ('PREREQUISITE', 'COREQUISITE', 'YEAR_STANDING', 'COMPLETION')),
  required_subject_id uuid references subjects(id),
  required_year_level smallint check (required_year_level between 1 and 4),
  check (
    (type in ('PREREQUISITE', 'COREQUISITE') and required_subject_id is not null and required_year_level is null)
    or
    (type = 'YEAR_STANDING' and required_year_level is not null and required_subject_id is null)
    or
     (type = 'COMPLETION' and required_subject_id is null and required_year_level is null)
  )
);
create table students (
  id text primary key, -- KSU ID number, e.g. "23-110414"
  name text not null,
  curriculum_id uuid not null references curricula(id),
  nominal_year_level smallint not null check (nominal_year_level between 1 and 4)
);

create table subject_records (
  id uuid primary key default gen_random_uuid(),
  student_id text not null references students(id) on delete cascade,
  subject_id uuid not null references subjects(id),
  status text not null check (status in ('PASSED', 'FAILED', 'INCOMPLETE', 'IN_PROGRESS')),
  grade numeric,
  term text,
  unique (student_id, subject_id)
);

create table grade_audit_log (
  id uuid primary key default gen_random_uuid(),
  student_id text not null references students(id) on delete cascade,
  subject_id uuid not null references subjects(id),
  old_status text,
  old_grade numeric,
  old_term text,
  new_status text not null,
  new_grade numeric,
  new_term text,
  changed_by text not null,
  changed_at timestamptz not null default now()
);
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;