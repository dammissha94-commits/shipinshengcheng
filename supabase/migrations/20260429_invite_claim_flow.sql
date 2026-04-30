create or replace function public.get_invite_claim_context(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  invite_row public.invite_tokens;
  family_row public.family_spaces;
  person_row public.person_profiles;
begin
  select *
  into invite_row
  from public.invite_tokens
  where token = p_token
  limit 1;

  if not found then
    raise exception '邀请链接不存在';
  end if;

  if invite_row.status = 'claimed' then
    raise exception '该邀请已被认领';
  end if;

  if invite_row.status = 'revoked' then
    raise exception '该邀请已撤销';
  end if;

  if invite_row.status = 'expired'
    or (invite_row.expires_at is not null and invite_row.expires_at < now()) then
    raise exception '该邀请已过期';
  end if;

  if invite_row.status <> 'pending' then
    raise exception '该邀请当前不可认领';
  end if;

  if invite_row.invitee_person_id is null then
    raise exception '该邀请未绑定待认领成员';
  end if;

  select *
  into family_row
  from public.family_spaces
  where id = invite_row.family_id;

  if not found then
    raise exception '邀请对应的数字家堂不存在';
  end if;

  select *
  into person_row
  from public.person_profiles
  where id = invite_row.invitee_person_id;

  if not found then
    raise exception '邀请对应的家人档案不存在';
  end if;

  return jsonb_build_object(
    'invite', to_jsonb(invite_row),
    'family', to_jsonb(family_row),
    'person', to_jsonb(person_row)
  );
end;
$$;

create or replace function public.claim_invite_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.invite_tokens;
  family_row public.family_spaces;
  person_row public.person_profiles;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception '请先登录';
  end if;

  select *
  into invite_row
  from public.invite_tokens
  where token = p_token
  for update;

  if not found then
    raise exception '邀请链接不存在';
  end if;

  if invite_row.status = 'claimed' then
    raise exception '该邀请已被认领';
  end if;

  if invite_row.status = 'revoked' then
    raise exception '该邀请已撤销';
  end if;

  if invite_row.status = 'expired'
    or (invite_row.expires_at is not null and invite_row.expires_at < now()) then
    raise exception '该邀请已过期';
  end if;

  if invite_row.status <> 'pending' then
    raise exception '该邀请当前不可认领';
  end if;

  if invite_row.invitee_person_id is null then
    raise exception '该邀请未绑定待认领成员';
  end if;

  select *
  into person_row
  from public.person_profiles
  where id = invite_row.invitee_person_id
  for update;

  if not found then
    raise exception '邀请对应的家人档案不存在';
  end if;

  if person_row.claim_status <> 'unclaimed' then
    raise exception '该家人档案已被认领';
  end if;

  update public.person_profiles
  set bound_user_id = current_user_id,
      claim_status = 'claimed',
      updated_at = now()
  where id = person_row.id
  returning * into person_row;

  update public.invite_tokens
  set status = 'claimed',
      claimed_at = now(),
      updated_at = now()
  where id = invite_row.id
  returning * into invite_row;

  insert into public.family_memberships (
    family_id,
    user_id,
    role,
    join_status
  )
  values (
    invite_row.family_id,
    current_user_id,
    'member',
    'active'
  )
  on conflict (family_id, user_id)
  do update set
    join_status = 'active',
    updated_at = now();

  insert into public.action_logs (
    family_id,
    actor_user_id,
    target_type,
    target_id,
    action_type,
    metadata
  )
  values (
    invite_row.family_id,
    current_user_id,
    'person_profile',
    person_row.id,
    'claim_person',
    jsonb_build_object(
      'token_id', invite_row.id,
      'family_id', invite_row.family_id
    )
  );

  select *
  into family_row
  from public.family_spaces
  where id = invite_row.family_id;

  return jsonb_build_object(
    'invite', to_jsonb(invite_row),
    'family', to_jsonb(family_row),
    'person', to_jsonb(person_row)
  );
end;
$$;

grant execute on function public.get_invite_claim_context(text) to anon, authenticated;
grant execute on function public.claim_invite_token(text) to authenticated;
