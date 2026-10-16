-- Undoes migrations/20261016090000_rename_college.sql: deans can no longer
-- rename their college. Colleges keep the names they have now; only the
-- "Renamed …" entries are removed from the college history. Run it by hand
-- (e.g. in Supabase Studio's SQL editor), then delete the migration file and this one.

drop function public.rename_college(uuid, text, text);

delete from college_history where event = 'COLLEGE_RENAMED';
alter table college_history drop constraint college_history_event_check;
alter table college_history add constraint college_history_event_check
  check (event in ('DEAN_HANDOVER', 'COLLEGE_SPLIT', 'COLLEGE_CREATED'));
