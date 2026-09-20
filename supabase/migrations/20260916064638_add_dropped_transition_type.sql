alter table student_transitions drop constraint student_transitions_type_check;
alter table student_transitions add constraint student_transitions_type_check check (
  type in ('TRANSFERRED_IN', 'TRANSFERRED_OUT', 'SHIFTED_IN', 'SHIFTED_OUT', 'DROPPED')
);