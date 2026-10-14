-- Run in Supabase Studio's SQL editor (http://127.0.0.1:54323 → SQL Editor), or see README → Scripts.
-- Auditrix data check: lists problems, changes nothing.
with
term_key as (
  select term, substring(term, 1, 2)::int * 10 + case right(term, 1) when 'S' then 0 when '1' then 1 else 2 end as k
  from (select distinct term from subject_records where term ~ '^\d{2}-[12S]$'
        union select current_term from college_terms where current_term ~ '^\d{2}-[12S]$') t
),
prereq as (
  select r.subject_id as from_id, r.required_subject_id as to_id
  from requirements r where r.type = 'PREREQUISITE'
),
loops as (
  with recursive walk(start_id, at_id, path) as (
    select from_id, to_id, array[from_id, to_id] from prereq
    union all
    select w.start_id, p.to_id, w.path || p.to_id
    from walk w join prereq p on p.from_id = w.at_id
    where p.to_id <> all (w.path[2:]) and cardinality(w.path) < 30
  )
  -- each loop once: the walk that starts at its smallest subject id
  select distinct on (start_id) start_id, path from walk
  where at_id = start_id and cardinality(path) > 2 and start_id = (select min(x::text)::uuid from unnest(path) x)
)
select problem, program, detail from (
  select 1 as o, 'Student with a blank name' as problem, c.program, s.id as detail
  from students s join curricula c on c.id = s.curriculum_id where btrim(s.name) = ''
  union all
  select 2, 'Student name with extra spaces or over 120 characters', c.program, s.id || ': "' || left(s.name, 60) || '"'
  from students s join curricula c on c.id = s.curriculum_id
  where btrim(s.name) <> '' and (s.name <> btrim(regexp_replace(s.name, '\s+', ' ', 'g')) or length(s.name) > 120)
  union all
  select 3, 'Staff with a blank name', coalesce(st.program, '(dean)'), st.id::text
  from staff st where btrim(st.name) = ''
  union all
  select 4, 'Subject that is its own prerequisite or co-requisite', c.program, c.effective_year || ' ' || s.code
  from requirements r join subjects s on s.id = r.subject_id join curricula c on c.id = s.curriculum_id
  where r.required_subject_id = r.subject_id
  union all
  select 5, 'Same requirement listed more than once', c.program,
         c.effective_year || ' ' || s.code || ' needs ' || coalesce(rs.code, 'year ' || r.required_year_level || ' standing', 'all subjects') || ' (' || count(*) || ' times)'
  from requirements r join subjects s on s.id = r.subject_id join curricula c on c.id = s.curriculum_id
  left join subjects rs on rs.id = r.required_subject_id
  group by c.program, c.effective_year, s.code, r.type, rs.code, r.required_year_level having count(*) > 1
  union all
  select 6, 'Prerequisite loop (none of these can ever be taken)', c.program,
         c.effective_year || ' ' || (select string_agg(x.code, ' needs ' order by u.n) from unnest(l.path) with ordinality u(id, n) join subjects x on x.id = u.id)
  from loops l join subjects s on s.id = l.start_id join curricula c on c.id = s.curriculum_id
  union all
  select 7, 'Subject with a blank title or units outside 0-12', c.program, c.effective_year || ' ' || s.code || ' (' || s.units || ' units)'
  from subjects s join curricula c on c.id = s.curriculum_id where btrim(s.title) = '' or s.units < 0 or s.units > 12
  union all
  select 8, 'Program code with symbols', p.program, p.program
  from (select distinct program from curricula) p where p.program !~ '^[A-Z0-9]+([- ][A-Z0-9]+)*$'
  union all
  select 9, 'Grade saved for a term after the current semester', c.program, sr.student_id || ': ' || sb.code || ' in ' || sr.term || ' (current ' || ct.current_term || ')'
  from subject_records sr join students st on st.id = sr.student_id join curricula c on c.id = st.curriculum_id
  join subjects sb on sb.id = sr.subject_id join college_terms ct on ct.college_id = c.college_id
  join term_key g on g.term = sr.term join term_key cur on cur.term = ct.current_term where g.k > cur.k
) found
order by o, program, detail;
