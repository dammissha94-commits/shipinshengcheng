create table if not exists public.family_stories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.family_spaces(id) on delete cascade,
  title text not null,
  year int,
  content text not null,
  related_person_ids jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_stories_related_person_ids_check check (jsonb_typeof(related_person_ids) = 'array')
);

create table if not exists public.family_photos (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.family_spaces(id) on delete cascade,
  title text not null,
  year int,
  description text,
  photo_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_meetings (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.family_spaces(id) on delete cascade,
  type text not null,
  title text not null,
  content text not null,
  status text not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_meetings_type_check check (type in ('notice', 'vote', 'event', 'memorial')),
  constraint family_meetings_status_check check (status in ('active', 'closed'))
);

create index if not exists family_stories_family_id_idx on public.family_stories (family_id);
create index if not exists family_stories_created_at_idx on public.family_stories (created_at);
create index if not exists family_photos_family_id_idx on public.family_photos (family_id);
create index if not exists family_photos_created_at_idx on public.family_photos (created_at);
create index if not exists family_meetings_family_id_idx on public.family_meetings (family_id);
create index if not exists family_meetings_type_idx on public.family_meetings (type);
create index if not exists family_meetings_created_at_idx on public.family_meetings (created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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

alter table public.family_stories enable row level security;
alter table public.family_photos enable row level security;
alter table public.family_meetings enable row level security;

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
  and created_by = auth.uid()
);

drop policy if exists "family_stories_update_creator_or_admin" on public.family_stories;
create policy "family_stories_update_creator_or_admin"
on public.family_stories for update
using (created_by = auth.uid() or public.is_family_admin(family_id))
with check (created_by = auth.uid() or public.is_family_admin(family_id));

drop policy if exists "family_stories_delete_creator_or_admin" on public.family_stories;
create policy "family_stories_delete_creator_or_admin"
on public.family_stories for delete
using (created_by = auth.uid() or public.is_family_admin(family_id));

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
  and created_by = auth.uid()
);

drop policy if exists "family_photos_update_creator_or_admin" on public.family_photos;
create policy "family_photos_update_creator_or_admin"
on public.family_photos for update
using (created_by = auth.uid() or public.is_family_admin(family_id))
with check (created_by = auth.uid() or public.is_family_admin(family_id));

drop policy if exists "family_photos_delete_creator_or_admin" on public.family_photos;
create policy "family_photos_delete_creator_or_admin"
on public.family_photos for delete
using (created_by = auth.uid() or public.is_family_admin(family_id));

drop policy if exists "family_meetings_select_family_member" on public.family_meetings;
create policy "family_meetings_select_family_member"
on public.family_meetings for select
using (public.is_family_member(family_id));

drop policy if exists "family_meetings_insert_family_member" on public.family_meetings;
create policy "family_meetings_insert_family_member"
on public.family_meetings for insert
with check (
  auth.uid() is not null
  and public.is_family_member(family_id)
  and created_by = auth.uid()
);

drop policy if exists "family_meetings_update_creator_or_admin" on public.family_meetings;
create policy "family_meetings_update_creator_or_admin"
on public.family_meetings for update
using (created_by = auth.uid() or public.is_family_admin(family_id))
with check (created_by = auth.uid() or public.is_family_admin(family_id));

drop policy if exists "family_meetings_delete_creator_or_admin" on public.family_meetings;
create policy "family_meetings_delete_creator_or_admin"
on public.family_meetings for delete
using (created_by = auth.uid() or public.is_family_admin(family_id));
