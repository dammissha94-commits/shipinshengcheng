alter table public.person_profiles add column if not exists birth_month int;
alter table public.person_profiles add column if not exists birth_day int;
alter table public.person_profiles add column if not exists birth_date_precision text default 'year_only';

update public.person_profiles
set birth_date_precision = 'year_only'
where birth_date_precision is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'person_profiles_birth_month_check') then
    alter table public.person_profiles
      add constraint person_profiles_birth_month_check check (
        birth_month is null or birth_month between 1 and 12
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'person_profiles_birth_day_check') then
    alter table public.person_profiles
      add constraint person_profiles_birth_day_check check (
        birth_day is null or birth_day between 1 and 31
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'person_profiles_birth_date_precision_check') then
    alter table public.person_profiles
      add constraint person_profiles_birth_date_precision_check check (
        birth_date_precision in ('unknown', 'year_only', 'month_day', 'full_date')
      );
  end if;
end $$;

alter table public.family_calendar_events add column if not exists source_type text default 'manual';
alter table public.family_calendar_events add column if not exists source_person_id uuid references public.person_profiles(id) on delete cascade;
alter table public.family_calendar_events add column if not exists source_key text;

update public.family_calendar_events
set source_type = 'manual'
where source_type is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'family_calendar_events_source_type_check') then
    alter table public.family_calendar_events
      add constraint family_calendar_events_source_type_check check (
        source_type in ('manual', 'person_birthday', 'family_custom')
      );
  end if;
end $$;

create unique index if not exists family_calendar_events_source_unique_idx
on public.family_calendar_events (family_id, source_type, source_person_id, source_key)
where source_person_id is not null and source_key is not null;

create index if not exists person_profiles_birth_month_day_idx on public.person_profiles (birth_month, birth_day);
create index if not exists family_calendar_events_source_person_id_idx on public.family_calendar_events (source_person_id);
create index if not exists family_calendar_events_source_type_idx on public.family_calendar_events (source_type);
