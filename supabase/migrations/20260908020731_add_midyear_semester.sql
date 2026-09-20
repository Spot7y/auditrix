alter table subjects drop constraint subjects_semester_check;
alter table subjects add constraint subjects_semester_check check (semester in (1, 2, 3));