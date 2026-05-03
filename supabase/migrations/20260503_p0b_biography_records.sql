-- P0-B: Biography records for person timeline
-- Each record belongs to one person, supports authorization and visibility

create table if not exists public.biography_records (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.person_profiles(id) on delete cascade,
  family_id uuid not null references public.family_spaces(id) on delete cascade,
  title text not null,
  content text not null default '',
  event_year int,
  event_month int,
  event_day int,
  location text,
  image_url text,
  audio_url text,
  visibility text not null default 'family',
  recorded_by uuid references public.profiles(id) on delete set null,
  relationship_to_person text,
  authorization text not null default 'self',
  is_modifiable_by_subject boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint biography_records_visibility_check check (
    visibility in ('private', 'direct_family', 'branch_family', 'family', 'admin_only')
  ),
  constraint biography_records_authorization_check check (
    authorization in ('self', 'authorized', 'pending', 'deceased_manager')
  )
);

-- Index for person timeline queries
create index if not exists idx_biography_records_person
  on public.biography_records(person_id, event_year desc, event_month desc, event_day desc);

-- RLS
alter table public.biography_records enable row level security;

-- Select: family members can see records according to visibility
create policy "biography_records_select_family"
  on public.biography_records for select
  using (
    exists (
      select 1 from public.family_memberships fm
      where fm.family_id = biography_records.family_id
        and fm.user_id = auth.uid()
        and fm.join_status = 'active'
    )
  );

-- Insert: family members can create records
create policy "biography_records_insert_family_member"
  on public.biography_records for insert
  with check (
    exists (
      select 1 from public.family_memberships fm
      where fm.family_id = biography_records.family_id
        and fm.user_id = auth.uid()
        and fm.join_status = 'active'
    )
  );

-- Update: record creator or family_admin can update
create policy "biography_records_update_creator_or_admin"
  on public.biography_records for update
  using (
    recorded_by = auth.uid()
    or exists (
      select 1 from public.family_memberships fm
      where fm.family_id = biography_records.family_id
        and fm.user_id = auth.uid()
        and fm.role in ('owner', 'family_admin', 'memory_admin')
        and fm.join_status = 'active'
    )
  );

-- Delete: record creator or family_admin can delete
create policy "biography_records_delete_creator_or_admin"
  on public.biography_records for delete
  using (
    recorded_by = auth.uid()
    or exists (
      select 1 from public.family_memberships fm
      where fm.family_id = biography_records.family_id
        and fm.user_id = auth.uid()
        and fm.role in ('owner', 'family_admin', 'memory_admin')
        and fm.join_status = 'active'
    )
  );
