create or replace function public.create_family_space_with_owner(
  p_surname text,
  p_owner_name text,
  p_self_gender text,
  p_self_birth_year int default null,
  p_name text default null,
  p_display_name text default null,
  p_visibility text default 'private'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  family_row public.family_spaces;
  membership_row public.family_memberships;
  person_row public.person_profiles;
  resolved_display_name text;
begin
  if current_user_id is null then
    raise exception '请先登录';
  end if;

  if p_surname is null or btrim(p_surname) = '' then
    raise exception '请填写姓氏';
  end if;

  if p_owner_name is null or btrim(p_owner_name) = '' then
    raise exception '请填写姓名';
  end if;

  resolved_display_name := coalesce(nullif(btrim(p_display_name), ''), btrim(p_surname) || '氏祠堂');

  insert into public.family_spaces (
    surname,
    name,
    display_name,
    founder_user_id,
    family_type,
    visibility,
    status
  )
  values (
    btrim(p_surname),
    coalesce(nullif(btrim(p_name), ''), resolved_display_name),
    resolved_display_name,
    current_user_id,
    'small_family',
    coalesce(p_visibility, 'private'),
    'active'
  )
  returning * into family_row;

  insert into public.family_memberships (
    family_id,
    user_id,
    role,
    join_status
  )
  values (
    family_row.id,
    current_user_id,
    'owner',
    'active'
  )
  returning * into membership_row;

  insert into public.person_profiles (
    family_id,
    bound_user_id,
    surname,
    given_name,
    display_name,
    gender,
    birth_year,
    death_year,
    living_status,
    claim_status,
    visibility,
    created_by
  )
  values (
    family_row.id,
    current_user_id,
    btrim(p_surname),
    btrim(p_owner_name),
    btrim(p_owner_name),
    p_self_gender,
    p_self_birth_year,
    null,
    'alive',
    'claimed',
    'family',
    current_user_id
  )
  returning * into person_row;

  insert into public.action_logs (
    family_id,
    actor_user_id,
    target_type,
    target_id,
    action_type,
    metadata
  )
  values (
    family_row.id,
    current_user_id,
    'family_space',
    family_row.id,
    'create_family_space',
    jsonb_build_object(
      'person_id', person_row.id,
      'membership_id', membership_row.id
    )
  );

  return jsonb_build_object(
    'family', to_jsonb(family_row),
    'membership', to_jsonb(membership_row),
    'person', to_jsonb(person_row)
  );
end;
$$;

grant execute on function public.create_family_space_with_owner(
  text,
  text,
  text,
  int,
  text,
  text,
  text
) to authenticated;
