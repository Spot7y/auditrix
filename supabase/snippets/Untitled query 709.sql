  select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'student_transitions'::regclass and contype = 'c';
  