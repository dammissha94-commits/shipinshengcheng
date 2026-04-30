create table if not exists public.family_stories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.family_spaces(id) on delete cascade,
  author_user_id uuid references public.profiles(id) on delete set null,
  title text not null,
  content text,
  story_year int,
  related_person_ids uuid[] default '{}',
  visibility text default 'family',
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.family_photos (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.family_spaces(id) on delete cascade,
  uploader_user_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  photo_year int,
  image_url text,
  related_person_ids uuid[] default '{}',
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
  created_at timestamptz default now(),
  constraint family_meeting_votes_meeting_voter_unique unique (meeting_id, voter_user_id)
);

alter table public.family_stories add column if not exists author_user_id uuid references public.profiles(id) on delete set null;
alter table public.family_stories add column if not exists story_year int;
alter table public.family_stories add column if not exists visibility text default 'family';
alter table public.family_stories add column if not exists status text default 'active';
alter table public.family_stories add column if not exists content text;

alter table public.family_photos add column if not exists uploader_user_id uuid references public.profiles(id) on delete set null;
alter table public.family_photos add column if not exists photo_year int;
alter table public.family_photos add column if not exists image_url text;
alter table public.family_photos add column if not exists related_person_ids uuid[] default '{}';
alter table public.family_photos add column if not exists visibility text default 'family';
alter table public.family_photos add column if not exists status text default 'active';

alter table public.family_meetings add column if not exists creator_user_id uuid references public.profiles(id) on delete set null;
alter table public.family_meetings add column if not exists meeting_type text default 'notice';
alter table public.family_meetings add column if not exists event_date date;
alter table public.family_meetings add column if not exists visibility text default 'family';
alter table public.family_meetings drop constraint if exists family_meetings_status_check;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'family_stories'
      and column_name = 'related_person_ids'
      and udt_name = 'jsonb'
  ) then
    create or replace function public.jsonb_text_array_to_uuid_array(value jsonb)
    returns uuid[]
    language sql
    immutable
    as $fn$
      select coalesce(
        array(
          select item::uuid
          from jsonb_array_elements_text(value) as item
          where item ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        ),
        '{}'
      );
    $fn$;

    alter table public.family_stories
      alter column related_person_ids drop default;

    alter table public.family_stories
      alter column related_person_ids type uuid[]
      using public.jsonb_text_array_to_uuid_array(related_person_ids);

    alter table public.family_stories
      alter column related_person_ids set default '{}';

    drop function public.jsonb_text_array_to_uuid_array(jsonb);
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'family_stories' and column_name = 'created_by') then
    execute 'update public.family_stories set author_user_id = coalesce(author_user_id, created_by)';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'family_stories' and column_name = 'year') then
    execute 'update public.family_stories set story_year = coalesce(story_year, year)';
  end if;
  update public.family_stories set visibility = coalesce(visibility, 'family'), status = coalesce(status, 'active');

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'family_photos' and column_name = 'created_by') then
    execute 'update public.family_photos set uploader_user_id = coalesce(uploader_user_id, created_by)';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'family_photos' and column_name = 'year') then
    execute 'update public.family_photos set photo_year = coalesce(photo_year, year)';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'family_photos' and column_name = 'photo_url') then
    execute 'update public.family_photos set image_url = coalesce(image_url, photo_url)';
  end if;
  update public.family_photos set visibility = coalesce(visibility, 'family'), status = coalesce(status, 'active');

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'family_meetings' and column_name = 'created_by') then
    execute 'update public.family_meetings set creator_user_id = coalesce(creator_user_id, created_by)';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'family_meetings' and column_name = 'type') then
    execute 'update public.family_meetings set meeting_type = coalesce(meeting_type, nullif(type, ''''), ''notice'')';
  end if;
  update public.family_meetings
  set
    status = case
      when status = 'active' then 'open'
      when status is null then 'open'
      else status
    end,
    visibility = coalesce(visibility, 'family');
end $$;

update public.family_meetings
set meeting_type = 'memorial_day'
where meeting_type = 'memorial';

alter table public.family_stories alter column related_person_ids set default '{}';
alter table public.family_photos alter column related_person_ids set default '{}';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'family_stories_visibility_check') then
    alter table public.family_stories
      add constraint family_stories_visibility_check check (visibility in ('private', 'family', 'public'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'family_stories_status_check') then
    alter table public.family_stories
      add constraint family_stories_status_check check (status in ('active', 'archived', 'hidden'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'family_photos_visibility_check') then
    alter table public.family_photos
      add constraint family_photos_visibility_check check (visibility in ('private', 'family', 'public'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'family_photos_status_check') then
    alter table public.family_photos
      add constraint family_photos_status_check check (status in ('active', 'archived', 'hidden'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'family_meetings_meeting_type_check') then
    alter table public.family_meetings
      add constraint family_meetings_meeting_type_check check (meeting_type in ('notice', 'vote', 'event', 'memorial_day'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'family_meetings_open_status_check') then
    alter table public.family_meetings
      add constraint family_meetings_open_status_check check (status in ('open', 'closed', 'archived'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'family_meetings_visibility_check') then
    alter table public.family_meetings
      add constraint family_meetings_visibility_check check (visibility in ('private', 'family', 'public'));
  end if;
end $$;

create index if not exists family_stories_family_id_idx on public.family_stories (family_id);
create index if not exists family_stories_author_user_id_idx on public.family_stories (author_user_id);
create index if not exists family_stories_status_idx on public.family_stories (status);
create index if not exists family_photos_family_id_idx on public.family_photos (family_id);
create index if not exists family_photos_uploader_user_id_idx on public.family_photos (uploader_user_id);
create index if not exists family_photos_status_idx on public.family_photos (status);
create index if not exists family_meetings_family_id_idx on public.family_meetings (family_id);
create index if not exists family_meetings_creator_user_id_idx on public.family_meetings (creator_user_id);
create index if not exists family_meetings_meeting_type_idx on public.family_meetings (meeting_type);
create index if not exists family_meetings_status_idx on public.family_meetings (status);
create index if not exists family_meeting_votes_meeting_id_idx on public.family_meeting_votes (meeting_id);
create index if not exists family_meeting_votes_family_id_idx on public.family_meeting_votes (family_id);
create index if not exists family_meeting_votes_voter_user_id_idx on public.family_meeting_votes (voter_user_id);

drop trigger if exists set_family_stories_updated_at on public.family_stories;
create trigger set_family_stories_updated_at
before update on public.family_stories
for each row execute function public.set_updated_at();

drop trigger if exists set_family_photos_updated_at on public.family_photos;
create trigger set_family_photos_updated_at
before update on public.family_photos
for each row execute function public.set_updated_at();

drop trigger if exists set_family_meetings_updated_at on public.family_meetings;
create trigger set_family_meetings_updated_at
before update on public.family_meetings
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

alter table public.family_stories enable row level security;
alter table public.family_photos enable row level security;
alter table public.family_meetings enable row level security;
alter table public.family_meeting_votes enable row level security;

drop policy if exists "family_stories_select_family_member" on public.family_stories;
create policy "family_stories_select_family_member"
on public.family_stories for select
using (public.is_family_member(family_id));

drop policy if exists "family_stories_insert_family_member" on public.family_stories;
create policy "family_stories_insert_family_member"
on public.family_stories for insert
with check (
  auth.uid() is not null
  and public.is_family_member(family_id)
  and author_user_id = auth.uid()
);

drop policy if exists "family_stories_update_creator_or_admin" on public.family_stories;
drop policy if exists "family_stories_update_author_or_content_admin" on public.family_stories;
create policy "family_stories_update_author_or_content_admin"
on public.family_stories for update
using (author_user_id = auth.uid() or public.is_family_content_admin(family_id))
with check (author_user_id = auth.uid() or public.is_family_content_admin(family_id));

drop policy if exists "family_stories_delete_creator_or_admin" on public.family_stories;
drop policy if exists "family_stories_delete_content_admin" on public.family_stories;
create policy "family_stories_delete_content_admin"
on public.family_stories for delete
using (public.is_family_content_admin(family_id));

drop policy if exists "family_photos_select_family_member" on public.family_photos;
create policy "family_photos_select_family_member"
on public.family_photos for select
using (public.is_family_member(family_id));

drop policy if exists "family_photos_insert_family_member" on public.family_photos;
create policy "family_photos_insert_family_member"
on public.family_photos for insert
with check (
  auth.uid() is not null
  and public.is_family_member(family_id)
  and uploader_user_id = auth.uid()
);

drop policy if exists "family_photos_update_creator_or_admin" on public.family_photos;
drop policy if exists "family_photos_update_uploader_or_content_admin" on public.family_photos;
create policy "family_photos_update_uploader_or_content_admin"
on public.family_photos for update
using (uploader_user_id = auth.uid() or public.is_family_content_admin(family_id))
with check (uploader_user_id = auth.uid() or public.is_family_content_admin(family_id));

drop policy if exists "family_photos_delete_creator_or_admin" on public.family_photos;
drop policy if exists "family_photos_delete_content_admin" on public.family_photos;
create policy "family_photos_delete_content_admin"
on public.family_photos for delete
using (public.is_family_content_admin(family_id));

drop policy if exists "family_meetings_select_family_member" on public.family_meetings;
create policy "family_meetings_select_family_member"
on public.family_meetings for select
using (public.is_family_member(family_id));

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
