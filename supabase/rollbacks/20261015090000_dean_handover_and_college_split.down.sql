-- Undoes migrations/20261015090000_dean_handover_and_college_split.sql, for
-- when the dean handover and college split are taken out of the code as well.
-- Run it by hand (e.g. in Supabase Studio's SQL editor), then delete the
-- migration file and this one.
--
-- Colleges created by a split, their deans and the moved programs stay as
-- they are; only the functions and the college history are removed.

drop function public.hand_over_deanship(uuid, uuid, text);
drop function public.split_college(uuid, text, text, text[], uuid, text);
drop table college_history;
