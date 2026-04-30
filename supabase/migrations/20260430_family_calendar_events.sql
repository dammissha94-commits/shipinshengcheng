create table if not exists public.family_calendar_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.family_spaces(id) on delete cascade,
  creator_user_id uuid references public.profiles(id) on delete set null,
  related_person_id uuid references public.person_profiles(id) on delete set null,
  event_type text not null,
  title text not null,
  description text,
  event_date date not null,
  recurrence text default 'yearly',
  remind_d7 boolean default true,
  remind_d1 boolean default true,
  remind_day boolean default true,
  visibility text default 'family',
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'family_calendar_events_event_type_check') then
    alter table public.family_calendar_events
      add constraint family_calendar_events_event_type_check check (
        event_type in ('birthday', 'anniversary', 'family_gathering', 'family_task')
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'family_calendar_events_recurrence_check') then
    alter table public.family_calendar_events
      add constraint family_calendar_events_recurrence_check check (
        recurrence in ('none', 'yearly', 'monthly')
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'family_calendar_events_visibility_check') then
    alter table public.family_calendar_events
      add constraint family_calendar_events_visibility_check check (
        visibility in ('private', 'family', 'public')
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'family_calendar_events_status_check') then
    alter table public.family_calendar_events
      add constraint family_calendar_events_status_check check (
        status in ('active', 'archived')
      );
  end if;
end $$;

create index if not exists family_calendar_events_family_id_idx on public.family_calendar_events (family_id);
create index if not exists family_calendar_events_creator_user_id_idx on public.family_calendar_events (creator_user_id);
create index if not exists family_calendar_events_related_person_id_idx on public.family_calendar_events (related_person_id);
create index if not exists family_calendar_events_event_type_idx on public.family_calendar_events (event_type);
create index if not exists family_calendar_events_event_date_idx on public.family_calendar_events (event_date);
create index if not exists family_calendar_events_status_idx on public.family_calendar_events (status);

drop trigger if exists set_family_calendar_events_updated_at on public.family_calendar_events;
create trigger set_family_calendar_events_updated_at
before update on public.family_calendar_events
for each row execute function public.set_updated_at();

create or replace function public.is_family_content_admin(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_memberships
    where family_id = target_family_id
      and user_id = auth.uid()
      and join_status = 'active'
      and role in ('owner', 'family_admin', 'memory_admin')
  );
$$;

alter table public.family_calendar_events enable row level security;

drop policy if exists "family_calendar_events_select_family_member" on public.family_calendar_events;
create policy "family_calendar_events_select_family_member"
on public.family_calendar_events for select
using (public.is_family_member(family_id));

drop policy if exists "family_calendar_events_insert_family_member" on public.family_calendar_events;
create policy "family_calendar_events_insert_family_member"
on public.family_calendar_events for insert
with check (
  auth.uid() is not null
  and public.is_family_member(family_id)
  and creator_user_id = auth.uid()
);

drop policy if exists "family_calendar_events_update_creator_or_content_admin" on public.family_calendar_events;
create policy "family_calendar_events_update_creator_or_content_admin"
on public.family_calendar_events for update
using (
  creator_user_id = auth.uid()
  or public.is_family_content_admin(family_id)
)
with check (
  creator_user_id = auth.uid()
  or public.is_family_content_admin(family_id)
);

drop policy if exists "family_calendar_events_delete_content_admin" on public.family_calendar_events;
create policy "family_calendar_events_delete_content_admin"
on public.family_calendar_events for delete
using (public.is_family_content_admin(family_id));
