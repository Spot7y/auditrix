alter table student_transitions add column student_name text;

update student_transitions st
set student_name = s.name
from students s
where st.student_id = s.id and st.student_name is null;

update student_transitions
set student_name = 'Unknown'
where student_name is null;

alter table student_transitions alter column student_name set not null;