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
end $$;

create index if not exists family_meeting_opinions_family_id_idx
  on public.family_meeting_opinions (family_id);
create index if not exists family_meeting_opinions_meeting_id_idx
  on public.family_meeting_opinions (meeting_id);
create index if not exists family_meeting_opinions_author_user_id_idx
  on public.family_meeting_opinions (author_user_id);
create index if not exists family_meeting_opinions_status_idx
  on public.family_meeting_opinions (status);
create index if not exists family_meeting_opinions_created_at_idx
  on public.family_meeting_opinions (created_at);

drop trigger if exists set_family_meeting_opinions_updated_at on public.family_meeting_opinions;
create trigger set_family_meeting_opinions_updated_at
before update on public.family_meeting_opinions
for each row execute function public.set_updated_at();

alter table public.family_meeting_opinions enable row level security;

drop policy if exists "family_meeting_opinions_select_active_by_visibility" on public.family_meeting_opinions;
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
  public.is_family_member(family_id)
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
