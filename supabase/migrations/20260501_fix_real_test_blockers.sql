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

create table if not exists public.family_meetings (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.family_spaces(id) on delete cascade,
  creator_user_id uuid references public.profiles(id) on delete set null,
  meeting_type text default 'notice',
  title text not null,
  content text,
  event_date date,
  status text default 'open',
  visibility text default 'family',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.family_meeting_votes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references public.family_meetings(id) on delete cascade,
  family_id uuid references public.family_spaces(id) on delete cascade,
  voter_user_id uuid references public.profiles(id) on delete cascade,
  option_text text not null,
  created_at timestamptz default now()
);

create table if not exists public.family_meeting_opinions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.family_spaces(id) on delete cascade,
  meeting_id uuid not null references public.family_meetings(id) on delete cascade,
  author_user_id uuid references public.profiles(id) on delete set null,
  stance text not null default 'neutral',
  content text not null,
  status text not null default 'active',
  visibility text not null default 'family',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.family_meeting_opinions
  add column if not exists family_id uuid references public.family_spaces(id) on delete cascade;
alter table public.family_meeting_opinions
  add column if not exists meeting_id uuid references public.family_meetings(id) on delete cascade;
alter table public.family_meeting_opinions
  add column if not exists author_user_id uuid references public.profiles(id) on delete set null;
alter table public.family_meeting_opinions
  add column if not exists stance text default 'neutral';
alter table public.family_meeting_opinions
  add column if not exists content text;
alter table public.family_meeting_opinions
  add column if not exists status text default 'active';
alter table public.family_meeting_opinions
  add column if not exists visibility text default 'family';
alter table public.family_meeting_opinions
  add column if not exists created_at timestamptz default now();
alter table public.family_meeting_opinions
  add column if not exists updated_at timestamptz default now();

update public.family_meeting_opinions
set
  stance = coalesce(stance, 'neutral'),
  status = coalesce(status, 'active'),
  visibility = coalesce(visibility, 'family'),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'family_meeting_opinions_stance_check'
  ) then
    alter table public.family_meeting_opinions
      add constraint family_meeting_opinions_stance_check
      check (stance in ('agree', 'disagree', 'neutral', 'suggestion', 'question'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'family_meeting_opinions_status_check'
  ) then
    alter table public.family_meeting_opinions
      add constraint family_meeting_opinions_status_check
      check (status in ('active', 'hidden', 'archived'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'family_meeting_opinions_visibility_check'
  ) then
    alter table public.family_meeting_opinions
      add constraint family_meeting_opinions_visibility_check
      check (visibility in ('private', 'family'));
  end if;
end;
$$;

create index if not exists family_meeting_opinions_family_id_idx
  on public.family_meeting_opinions (family_id);
create index if not exists family_meeting_opinions_meeting_id_idx
  on public.family_meeting_opinions (meeting_id);
create index if not exists family_meeting_opinions_author_user_id_idx
  on public.family_meeting_opinions (author_user_id);
create index if not exists family_meeting_opinions_status_idx
  on public.family_meeting_opinions (status);

create index if not exists family_calendar_events_family_id_idx
  on public.family_calendar_events (family_id);
create index if not exists family_calendar_events_creator_user_id_idx
  on public.family_calendar_events (creator_user_id);
create index if not exists family_calendar_events_event_date_idx
  on public.family_calendar_events (event_date);
create index if not exists family_calendar_events_status_idx
  on public.family_calendar_events (status);

create index if not exists family_meetings_family_id_idx
  on public.family_meetings (family_id);
create index if not exists family_meetings_creator_user_id_idx
  on public.family_meetings (creator_user_id);
create index if not exists family_meetings_status_idx
  on public.family_meetings (status);

create index if not exists family_meeting_votes_meeting_id_idx
  on public.family_meeting_votes (meeting_id);
create index if not exists family_meeting_votes_family_id_idx
  on public.family_meeting_votes (family_id);
create index if not exists family_meeting_votes_voter_user_id_idx
  on public.family_meeting_votes (voter_user_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'family_meeting_votes_meeting_voter_unique'
  ) then
    alter table public.family_meeting_votes
      add constraint family_meeting_votes_meeting_voter_unique unique (meeting_id, voter_user_id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'family_meetings_type_check') then
    alter table public.family_meetings
      add constraint family_meetings_type_check check (
        meeting_type in ('notice', 'vote', 'event', 'memorial_day')
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'family_meetings_status_check') then
    alter table public.family_meetings
      add constraint family_meetings_status_check check (
        status in ('open', 'closed', 'archived')
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'family_meetings_visibility_check') then
    alter table public.family_meetings
      add constraint family_meetings_visibility_check check (
        visibility in ('private', 'family', 'public')
      );
  end if;

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
end;
$$;

create table if not exists public.family_meeting_opinions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.family_spaces(id) on delete cascade,
  meeting_id uuid not null references public.family_meetings(id) on delete cascade,
  author_user_id uuid references public.profiles(id) on delete set null,
  stance text not null default 'neutral',
  content text not null,
  status text not null default 'active',
  visibility text not null default 'family',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.family_meeting_opinions
  add column if not exists family_id uuid references public.family_spaces(id) on delete cascade;
alter table public.family_meeting_opinions
  add column if not exists meeting_id uuid references public.family_meetings(id) on delete cascade;
alter table public.family_meeting_opinions
  add column if not exists author_user_id uuid references public.profiles(id) on delete set null;
alter table public.family_meeting_opinions
  add column if not exists stance text default 'neutral';
alter table public.family_meeting_opinions
  add column if not exists content text;
alter table public.family_meeting_opinions
  add column if not exists status text default 'active';
alter table public.family_meeting_opinions
  add column if not exists visibility text default 'family';
alter table public.family_meeting_opinions
  add column if not exists created_at timestamptz default now();
alter table public.family_meeting_opinions
  add column if not exists updated_at timestamptz default now();

alter table public.family_meeting_opinions enable row level security;
alter table public.family_meetings enable row level security;
alter table public.family_calendar_events enable row level security;
alter table public.family_meeting_votes enable row level security;

drop policy if exists "family_meeting_opinions_select_active_by_visibility" on public.family_meeting_opinions;
drop policy if exists "family_meeting_opinions_insert_family_member" on public.family_meeting_opinions;
drop policy if exists "family_meeting_opinions_update_author_or_admin" on public.family_meeting_opinions;
create policy "family_meeting_opinions_select_active_by_visibility"
on public.family_meeting_opinions for select
using (
  public.is_family_member(family_id)
  and status = 'active'
  and (
    visibility = 'family'
    or author_user_id = auth.uid()
    or public.is_family_admin(family_id)
  )
);

drop policy if exists "family_meeting_opinions_insert_family_member" on public.family_meeting_opinions;
create policy "family_meeting_opinions_insert_family_member"
on public.family_meeting_opinions for insert
with check (
  auth.uid() is not null
  and public.is_family_member(family_id)
  and author_user_id = auth.uid()
);

drop policy if exists "family_meeting_opinions_update_author_or_admin" on public.family_meeting_opinions;
create policy "family_meeting_opinions_update_author_or_admin"
on public.family_meeting_opinions for update
using (
  public.is_family_member(family_id)
  and (
    (author_user_id = auth.uid() and status = 'active')
    or public.is_family_admin(family_id)
  )
)
with check (
  public.is_family_member(family_id)
  and (
    (author_user_id = auth.uid() and status in ('active', 'archived'))
    or public.is_family_admin(family_id)
  )
);

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
end;
$$;

create unique index if not exists family_calendar_events_source_unique_idx
  on public.family_calendar_events (family_id, source_type, source_person_id, source_key)
  where source_person_id is not null and source_key is not null;

drop policy if exists "family_calendar_events_select_family_member" on public.family_calendar_events;
drop policy if exists "family_calendar_events_select_by_visibility" on public.family_calendar_events;
create policy "family_calendar_events_select_by_visibility"
on public.family_calendar_events for select
using (
  public.is_family_member(family_id)
  and (
    visibility in ('family', 'public')
    or creator_user_id = auth.uid()
    or public.is_family_content_admin(family_id)
  )
);

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

drop policy if exists "family_meetings_select_family_member" on public.family_meetings;
drop policy if exists "family_meetings_select_by_visibility" on public.family_meetings;
create policy "family_meetings_select_by_visibility"
on public.family_meetings for select
using (
  public.is_family_member(family_id)
  and (
    visibility in ('family', 'public')
    or creator_user_id = auth.uid()
    or public.is_family_admin(family_id)
  )
);

drop policy if exists "family_meetings_insert_family_member" on public.family_meetings;
drop policy if exists "family_meetings_insert_admin" on public.family_meetings;
create policy "family_meetings_insert_admin"
on public.family_meetings for insert
with check (
  auth.uid() is not null
  and public.is_family_admin(family_id)
  and creator_user_id = auth.uid()
);

drop policy if exists "family_meetings_update_creator_or_admin" on public.family_meetings;
drop policy if exists "family_meetings_update_admin" on public.family_meetings;
create policy "family_meetings_update_admin"
on public.family_meetings for update
using (public.is_family_admin(family_id))
with check (public.is_family_admin(family_id));

drop policy if exists "family_meetings_delete_creator_or_admin" on public.family_meetings;
drop policy if exists "family_meetings_delete_admin" on public.family_meetings;
create policy "family_meetings_delete_admin"
on public.family_meetings for delete
using (public.is_family_admin(family_id));

drop policy if exists "family_meeting_votes_select_family_member" on public.family_meeting_votes;
create policy "family_meeting_votes_select_family_member"
on public.family_meeting_votes for select
using (public.is_family_member(family_id));

drop policy if exists "family_meeting_votes_insert_family_member" on public.family_meeting_votes;
create policy "family_meeting_votes_insert_family_member"
on public.family_meeting_votes for insert
with check (
  auth.uid() is not null
  and voter_user_id = auth.uid()
  and public.is_family_member(family_id)
  and exists (
    select 1
    from public.family_meetings
    where id = meeting_id
      and family_id = family_meeting_votes.family_id
      and status = 'open'
  )
);
