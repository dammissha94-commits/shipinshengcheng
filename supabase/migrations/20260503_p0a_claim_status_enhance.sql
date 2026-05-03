-- P0-A: Enhance claim_status to support reject and hidden states
-- Safe alteration: only expands the constraint, does NOT delete data

-- 1. Expand claim_status to include 'rejected' and 'hidden'
alter table public.person_profiles
  drop constraint if exists person_profiles_claim_status_check;

alter table public.person_profiles
  add constraint person_profiles_claim_status_check check (
    claim_status in ('unclaimed', 'claimed', 'disputed', 'rejected', 'hidden')
  );

-- 2. Update claim_invite_token function to handle rejection
create or replace function public.reject_invite_token(p_token text)
returns void
language plpgsql
security definer
as $$
declare
  v_invite record;
  v_user_id uuid;
begin
  -- Get current user
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception '请先登录';
  end if;

  -- Find valid invite
  select * into v_invite
  from public.invite_tokens
  where token = p_token and status = 'pending';

  if not found then
    raise exception '邀请链接无效或已过期';
  end if;

  -- Mark invite as rejected
  update public.invite_tokens set status = 'rejected' where id = v_invite.id;

  -- Mark person profile as rejected
  update public.person_profiles
  set claim_status = 'rejected', updated_at = now()
  where id = v_invite.invitee_person_id
    and claim_status = 'unclaimed';

  -- Log action
  insert into public.action_logs (family_id, actor_user_id, target_type, target_id, action_type, metadata)
  values (v_invite.family_id, v_user_id, 'invite_token', v_invite.id, 'reject_invite_token',
          jsonb_build_object('person_id', v_invite.invitee_person_id));
end;
$$;

-- 3. Add an RLS-compatible update policy for person_profiles to allow rejection
-- (existing policies already allow bound_user updates; add rejected for family_admin)
drop policy if exists "person_profiles_update_reject" on public.person_profiles;
create policy "person_profiles_update_reject"
  on public.person_profiles for update
  using (
    exists (
      select 1 from public.family_memberships fm
      where fm.family_id = person_profiles.family_id
        and fm.user_id = auth.uid()
        and fm.join_status = 'active'
    )
  );
