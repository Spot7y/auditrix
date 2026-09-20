alter table subject_records drop constraint subject_records_student_id_fkey;
alter table subject_records add constraint subject_records_student_id_fkey
  foreign key (student_id) references students(id) on delete cascade on update cascade;

alter table grade_audit_log drop constraint grade_audit_log_student_id_fkey;
alter table grade_audit_log add constraint grade_audit_log_student_id_fkey
  foreign key (student_id) references students(id) on delete cascade on update cascade;

alter table student_transitions drop constraint student_transitions_student_id_fkey;
alter table student_transitions add constraint student_transitions_student_id_fkey
  foreign key (student_id) references students(id) on delete cascade on update cascade;