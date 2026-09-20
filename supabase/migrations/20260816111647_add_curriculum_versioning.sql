alter table curricula add column effective_year integer;
update curricula set effective_year = 2019 where effective_year is null;
alter table curricula alter column effective_year set not null;

alter table curricula drop constraint curricula_program_key cascade;
alter table curricula add constraint curricula_program_effective_year_key unique (program, effective_year);