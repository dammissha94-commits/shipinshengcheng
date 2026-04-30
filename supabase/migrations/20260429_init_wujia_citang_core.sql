create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  phone text,
  elder_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_spaces (
  id uuid primary key default gen_random_uuid(),
  surname text not null,
  name text not null,
  display_name text not null,
  founder_user_id uuid references public.profiles(id) on delete set null,
  family_type text not null default 'small_family',
  visibility text not null default 'private',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_spaces_family_type_check check (
    family_type in ('small_family', 'branch_family', 'organization')
  ),
  constraint family_spaces_visibility_check check (
    visibility in ('private', 'family', 'public')
  ),
  constraint family_spaces_status_check check (
    status in ('active', 'archived', 'disabled')
  )
);

create table if not exists public.family_memberships (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.family_spaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  join_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_memberships_family_user_unique unique (family_id, user_id),
  constraint family_memberships_role_check check (
    role in ('owner', 'family_admin', 'memory_admin', 'member', 'viewer')
  ),
  constraint family_memberships_join_status_check check (
    join_status in ('pending', 'active', 'removed')
  )
);

create table if not exists public.person_profiles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.family_spaces(id) on delete cascade,
  bound_user_id uuid references public.profiles(id) on delete set null,
  surname text,
  given_name text,
  display_name text not null,
  gender text,
  birth_year int,
  death_year int,
  living_status text not null default 'alive',
  claim_status text not null default 'unclaimed',
  visibility text not null default 'family',
  bio text,
  portrait_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint person_profiles_gender_check check (
    gender is null or gender in ('male', 'female', 'unknown')
  ),
  constraint person_profiles_living_status_check check (
    living_status in ('alive', 'deceased', 'unknown')
  ),
  constraint person_profiles_claim_status_check check (
    claim_status in ('unclaimed', 'claimed', 'disputed')
  ),
  constraint person_profiles_visibility_check check (
    visibility in ('private', 'family', 'public')
  )
);

create table if not exists public.person_relations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.family_spaces(id) on delete cascade,
  from_person_id uuid not null references public.person_profiles(id) on delete cascade,
  to_person_id uuid not null references public.person_profiles(id) on delete cascade,
  relation_type text not null,
  is_primary boolean not null default true,
  status text not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  confirmed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint person_relations_relation_unique unique (
    from_person_id,
    to_person_id,
    relation_type
  ),
  constraint person_relations_relation_type_check check (
    relation_type in ('parent_of', 'child_of', 'spouse_of', 'sibling_of', 'grandparent_of')
  ),
  constraint person_relations_status_check check (
    status in ('active', 'pending', 'disputed', 'removed')
  )
);

create table if not exists public.invite_tokens (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.family_spaces(id) on delete cascade,
  inviter_user_id uuid references public.profiles(id) on delete set null,
  invitee_person_id uuid references public.person_profiles(id) on delete set null,
  token text unique not null,
  invite_type text not null default 'claim_person',
  status text not null default 'pending',
  expires_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invite_tokens_invite_type_check check (
    invite_type in ('join_family', 'claim_person')
  ),
  constraint invite_tokens_status_check check (
    status in ('pending', 'claimed', 'expired', 'revoked')
  )
);

create table if not exists public.action_logs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.family_spaces(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  target_type text not null,
  target_id uuid,
  action_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.person_profiles alter column display_name set not null;
alter table public.invite_tokens alter column inviter_user_id drop not null;
alter table public.action_logs alter column target_type set not null;
alter table public.action_logs alter column action_type set not null;
alter table public.action_logs alter column metadata set not null;

alter table public.family_spaces drop constraint if exists family_spaces_family_type_check;
alter table public.family_spaces add constraint family_spaces_family_type_check check (
  family_type in ('small_family', 'branch_family', 'organization')
);

alter table public.family_spaces drop constraint if exists family_spaces_visibility_check;
alter table public.family_spaces add constraint family_spaces_visibility_check check (
  visibility in ('private', 'family', 'public')
);

alter table public.family_spaces drop constraint if exists family_spaces_status_check;
alter table public.family_spaces add constraint family_spaces_status_check check (
  status in ('active', 'archived', 'disabled')
);

alter table public.family_memberships drop constraint if exists family_memberships_role_check;
alter table public.family_memberships add constraint family_memberships_role_check check (
  role in ('owner', 'family_admin', 'memory_admin', 'member', 'viewer')
);

alter table public.family_memberships drop constraint if exists family_memberships_join_status_check;
alter table public.family_memberships add constraint family_memberships_join_status_check check (
  join_status in ('pending', 'active', 'removed')
);

alter table public.person_profiles drop constraint if exists person_profiles_gender_check;
alter table public.person_profiles add constraint person_profiles_gender_check check (
  gender is null or gender in ('male', 'female', 'unknown')
);

alter table public.person_profiles drop constraint if exists person_profiles_living_status_check;
alter table public.person_profiles add constraint person_profiles_living_status_check check (
  living_status in ('alive', 'deceased', 'unknown')
);

alter table public.person_profiles drop constraint if exists person_profiles_claim_status_check;
alter table public.person_profiles add constraint person_profiles_claim_status_check check (
  claim_status in ('unclaimed', 'claimed', 'disputed')
);

alter table public.person_profiles drop constraint if exists person_profiles_visibility_check;
alter table public.person_profiles add constraint person_profiles_visibility_check check (
  visibility in ('private', 'family', 'public')
);

alter table public.person_relations drop constraint if exists person_relations_relation_unique;
alter table public.person_relations add constraint person_relations_relation_unique unique (
  from_person_id,
  to_person_id,
  relation_type
);

alter table public.person_relations drop constraint if exists person_relations_relation_type_check;
alter table public.person_relations add constraint person_relations_relation_type_check check (
  relation_type in ('parent_of', 'child_of', 'spouse_of', 'sibling_of', 'grandparent_of')
);

alter table public.person_relations drop constraint if exists person_relations_status_check;
alter table public.person_relations add constraint person_relations_status_check check (
  status in ('active', 'pending', 'disputed', 'removed')
);

alter table public.invite_tokens drop constraint if exists invite_tokens_inviter_user_id_fkey;
alter table public.invite_tokens add constraint invite_tokens_inviter_user_id_fkey
foreign key (inviter_user_id) references public.profiles(id) on delete set null;

alter table public.invite_tokens drop constraint if exists invite_tokens_invite_type_check;
alter table public.invite_tokens add constraint invite_tokens_invite_type_check check (
  invite_type in ('join_family', 'claim_person')
);

alter table public.invite_tokens drop constraint if exists invite_tokens_status_check;
alter table public.invite_tokens add constraint invite_tokens_status_check check (
  status in ('pending', 'claimed', 'expired', 'revoked')
);

create index if not exists family_spaces_founder_user_id_idx on public.family_spaces (founder_user_id);
create index if not exists family_spaces_surname_idx on public.family_spaces (surname);
create index if not exists family_memberships_family_id_idx on public.family_memberships (family_id);
create index if not exists family_memberships_user_id_idx on public.family_memberships (user_id);
create index if not exists family_memberships_role_idx on public.family_memberships (role);
create index if not exists person_profiles_family_id_idx on public.person_profiles (family_id);
create index if not exists person_profiles_bound_user_id_idx on public.person_profiles (bound_user_id);
create index if not exists person_profiles_claim_status_idx on public.person_profiles (claim_status);
create index if not exists person_profiles_living_status_idx on public.person_profiles (living_status);
create index if not exists person_relations_family_id_idx on public.person_relations (family_id);
create index if not exists person_relations_from_person_id_idx on public.person_relations (from_person_id);
create index if not exists person_relations_to_person_id_idx on public.person_relations (to_person_id);
create index if not exists person_relations_relation_type_idx on public.person_relations (relation_type);
create index if not exists invite_tokens_token_idx on public.invite_tokens (token);
create index if not exists invite_tokens_family_id_idx on public.invite_tokens (family_id);
create index if not exists invite_tokens_invitee_person_id_idx on public.invite_tokens (invitee_person_id);
create index if not exists action_logs_family_id_idx on public.action_logs (family_id);
create index if not exists action_logs_actor_user_id_idx on public.action_logs (actor_user_id);
create index if not exists action_logs_action_type_idx on public.action_logs (action_type);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_family_spaces_updated_at on public.family_spaces;
create trigger set_family_spaces_updated_at
before update on public.family_spaces
for each row execute function public.set_updated_at();

drop trigger if exists set_family_memberships_updated_at on public.family_memberships;
create trigger set_family_memberships_updated_at
before update on public.family_memberships
for each row execute function public.set_updated_at();

drop trigger if exists set_person_profiles_updated_at on public.person_profiles;
create trigger set_person_profiles_updated_at
before update on public.person_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_person_relations_updated_at on public.person_relations;
create trigger set_person_relations_updated_at
before update on public.person_relations
for each row execute function public.set_updated_at();

drop trigger if exists set_invite_tokens_updated_at on public.invite_tokens;
create trigger set_invite_tokens_updated_at
before update on public.invite_tokens
for each row execute function public.set_updated_at();

create or replace function public.is_family_member(target_family_id uuid)
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
  );
$$;

create or replace function public.is_family_admin(target_family_id uuid)
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
      and role in ('owner', 'family_admin')
  );
$$;

alter table public.profiles enable row level security;
alter table public.family_spaces enable row level security;
alter table public.family_memberships enable row level security;
alter table public.person_profiles enable row level security;
alter table public.person_relations enable row level security;
alter table public.invite_tokens enable row level security;
alter table public.action_logs enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "family_spaces_select_founder_or_member" on public.family_spaces;
create policy "family_spaces_select_founder_or_member"
on public.family_spaces for select
using (founder_user_id = auth.uid() or public.is_family_member(id));

drop policy if exists "family_spaces_insert_founder" on public.family_spaces;
create policy "family_spaces_insert_founder"
on public.family_spaces for insert
with check (founder_user_id = auth.uid());

drop policy if exists "family_spaces_update_founder_or_admin" on public.family_spaces;
create policy "family_spaces_update_founder_or_admin"
on public.family_spaces for update
using (founder_user_id = auth.uid() or public.is_family_admin(id))
with check (founder_user_id = auth.uid() or public.is_family_admin(id));

drop policy if exists "family_memberships_select_family_member" on public.family_memberships;
create policy "family_memberships_select_family_member"
on public.family_memberships for select
using (public.is_family_member(family_id));

drop policy if exists "family_memberships_insert_admin_or_initial_owner" on public.family_memberships;
create policy "family_memberships_insert_admin_or_initial_owner"
on public.family_memberships for insert
with check (
  public.is_family_admin(family_id)
  or exists (
    select 1
    from public.family_spaces
    where id = family_id
      and founder_user_id = auth.uid()
      and user_id = auth.uid()
      and role = 'owner'
      and join_status = 'active'
  )
);

drop policy if exists "family_memberships_update_admin" on public.family_memberships;
create policy "family_memberships_update_admin"
on public.family_memberships for update
using (public.is_family_admin(family_id))
with check (public.is_family_admin(family_id));

drop policy if exists "family_memberships_delete_admin" on public.family_memberships;
create policy "family_memberships_delete_admin"
on public.family_memberships for delete
using (public.is_family_admin(family_id));

drop policy if exists "person_profiles_select_family_member" on public.person_profiles;
create policy "person_profiles_select_family_member"
on public.person_profiles for select
using (public.is_family_member(family_id));

drop policy if exists "person_profiles_insert_family_admin" on public.person_profiles;
create policy "person_profiles_insert_family_admin"
on public.person_profiles for insert
with check (public.is_family_admin(family_id));

drop policy if exists "person_profiles_update_family_admin" on public.person_profiles;
create policy "person_profiles_update_family_admin"
on public.person_profiles for update
using (public.is_family_admin(family_id))
with check (public.is_family_admin(family_id));

drop policy if exists "person_relations_select_family_member" on public.person_relations;
create policy "person_relations_select_family_member"
on public.person_relations for select
using (public.is_family_member(family_id));

drop policy if exists "person_relations_insert_family_admin" on public.person_relations;
create policy "person_relations_insert_family_admin"
on public.person_relations for insert
with check (public.is_family_admin(family_id));

drop policy if exists "person_relations_update_family_admin" on public.person_relations;
create policy "person_relations_update_family_admin"
on public.person_relations for update
using (public.is_family_admin(family_id))
with check (public.is_family_admin(family_id));

drop policy if exists "invite_tokens_select_inviter_or_admin" on public.invite_tokens;
create policy "invite_tokens_select_inviter_or_admin"
on public.invite_tokens for select
using (inviter_user_id = auth.uid() or public.is_family_admin(family_id));

drop policy if exists "invite_tokens_insert_family_admin" on public.invite_tokens;
create policy "invite_tokens_insert_family_admin"
on public.invite_tokens for insert
with check (public.is_family_admin(family_id));

drop policy if exists "invite_tokens_update_inviter_or_admin" on public.invite_tokens;
create policy "invite_tokens_update_inviter_or_admin"
on public.invite_tokens for update
using (inviter_user_id = auth.uid() or public.is_family_admin(family_id))
with check (inviter_user_id = auth.uid() or public.is_family_admin(family_id));

drop policy if exists "action_logs_select_family_member" on public.action_logs;
create policy "action_logs_select_family_member"
on public.action_logs for select
using (public.is_family_member(family_id));

drop policy if exists "action_logs_insert_authenticated" on public.action_logs;
create policy "action_logs_insert_authenticated"
on public.action_logs for insert
with check (
  auth.uid() is not null
  and (actor_user_id is null or actor_user_id = auth.uid())
);
