drop policy if exists "family_stories_select_family_member" on public.family_stories;
create policy "family_stories_select_by_visibility"
on public.family_stories for select
using (
  public.is_family_member(family_id)
  and (
    visibility in ('family', 'public')
    or author_user_id = auth.uid()
    or public.is_family_content_admin(family_id)
  )
);

drop policy if exists "family_photos_select_family_member" on public.family_photos;
create policy "family_photos_select_by_visibility"
on public.family_photos for select
using (
  public.is_family_member(family_id)
  and (
    visibility in ('family', 'public')
    or uploader_user_id = auth.uid()
    or public.is_family_content_admin(family_id)
  )
);

drop policy if exists "family_meetings_select_family_member" on public.family_meetings;
create policy "family_meetings_select_by_visibility"
on public.family_meetings for select
using (
  public.is_family_member(family_id)
  and (
    visibility in ('family', 'public')
    or creator_user_id = auth.uid()
    or public.is_family_admin(family_id)
  )
);

drop policy if exists "family_outputs_select_family_member" on public.family_outputs;
create policy "family_outputs_select_by_visibility"
on public.family_outputs for select
using (
  public.is_family_member(family_id)
  and (
    visibility in ('family', 'public')
    or creator_user_id = auth.uid()
    or public.is_family_content_admin(family_id)
  )
);

drop policy if exists "family_calendar_events_select_family_member" on public.family_calendar_events;
create policy "family_calendar_events_select_by_visibility"
on public.family_calendar_events for select
using (
  public.is_family_member(family_id)
  and (
    visibility in ('family', 'public')
    or creator_user_id = auth.uid()
    or public.is_family_content_admin(family_id)
  )
);
