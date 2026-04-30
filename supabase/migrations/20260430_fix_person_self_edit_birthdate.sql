create or replace function public.enforce_person_profile_self_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_family_admin(old.family_id) then
    return new;
  end if;

  if auth.uid() is null then
    raise exception '请先登录';
  end if;

  if old.bound_user_id is distinct from auth.uid() then
    raise exception '当前账号无权修改该家人档案';
  end if;

  if new.family_id is distinct from old.family_id
    or new.bound_user_id is distinct from old.bound_user_id
    or new.claim_status is distinct from old.claim_status
    or new.living_status is distinct from old.living_status
    or new.visibility is distinct from old.visibility
    or new.surname is distinct from old.surname
    or new.given_name is distinct from old.given_name
    or new.display_name is distinct from old.display_name
    or new.gender is distinct from old.gender
    or new.death_year is distinct from old.death_year
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
  then
    raise exception '你暂无权限修改该字段';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_person_profile_self_edit_trigger on public.person_profiles;
create trigger enforce_person_profile_self_edit_trigger
before update on public.person_profiles
for each row execute function public.enforce_person_profile_self_edit();
