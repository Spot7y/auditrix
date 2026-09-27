select id, type, from_program, to_program, student_name, recorded_at
from student_transitions
where student_id = '23-19206'
order by recorded_at desc;