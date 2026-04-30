create table if not exists public.family_outputs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.family_spaces(id) on delete cascade,
  creator_user_id uuid references public.profiles(id) on delete set null,
  output_type text not null,
  title text not null,
  description text,
  status text default 'draft',
  preview_data jsonb default '{}'::jsonb,
  generated_url text,
  visibility text default 'family',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'family_outputs_output_type_check') then
    alter table public.family_outputs
      add constraint family_outputs_output_type_check check (
        output_type in (
          'three_generation_tree',
          'family_memory_book',
          'family_story_book',
          'family_yearbook'
        )
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'family_outputs_status_check') then
    alter table public.family_outputs
      add constraint family_outputs_status_check check (status in ('draft', 'preview_ready', 'archived'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'family_outputs_visibility_check') then
    alter table public.family_outputs
      add constraint family_outputs_visibility_check check (visibility in ('private', 'family', 'public'));
  end if;
end $$;

create index if not exists family_outputs_family_id_idx on public.family_outputs (family_id);
create index if not exists family_outputs_creator_user_id_idx on public.family_outputs (creator_user_id);
create index if not exists family_outputs_output_type_idx on public.family_outputs (output_type);
create index if not exists family_outputs_status_idx on public.family_outputs (status);
create index if not exists family_outputs_created_at_idx on public.family_outputs (created_at);

drop trigger if exists set_family_outputs_updated_at on public.family_outputs;
create trigger set_family_outputs_updated_at
before update on public.family_outputs
for each row execute function public.set_updated_at();

create or replace function public.is_family_output_admin(target_family_id uuid)
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

alter table public.family_outputs enable row level security;

drop policy if exists "family_outputs_select_family_member" on public.family_outputs;
create policy "family_outputs_select_family_member"
on public.family_outputs for select
using (public.is_family_member(family_id));

drop policy if exists "family_outputs_insert_output_admin" on public.family_outputs;
create policy "family_outputs_insert_output_admin"
on public.family_outputs for insert
with check (
  auth.uid() is not null
  and public.is_family_output_admin(family_id)
  and creator_user_id = auth.uid()
);

drop policy if exists "family_outputs_update_creator_draft_or_output_admin" on public.family_outputs;
create policy "family_outputs_update_creator_draft_or_output_admin"
on public.family_outputs for update
using (
  public.is_family_output_admin(family_id)
  or (creator_user_id = auth.uid() and status = 'draft')
)
with check (
  public.is_family_output_admin(family_id)
  or (creator_user_id = auth.uid() and status = 'draft')
);

drop policy if exists "family_outputs_delete_output_admin" on public.family_outputs;
create policy "family_outputs_delete_output_admin"
on public.family_outputs for delete
using (public.is_family_output_admin(family_id));
