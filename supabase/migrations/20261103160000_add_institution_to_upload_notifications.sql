create or replace function public.notify_resource_upload ()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.app_notifications (recipient_id, resource_id, type, message)
  select moderator.user_id, new.id, 'resource_uploaded',
    left(concat_ws(
      ' · ',
      'New upload awaiting review: ' || left(new.title, 240),
      coalesce(nullif(left(btrim(new.institution_type), 100), ''), 'Institution'),
      coalesce(nullif(left(btrim(new.institution_name), 120), ''), left(new.institution_key, 120))
    ), 500)
  from public.resource_moderators moderator
  left join public.student_profiles profile on profile.user_id = moderator.user_id
  where moderator.is_global_admin
     or profile.institution_key = new.institution_key;
  return new;
end;
$$;

revoke all on function public.notify_resource_upload () from public, anon, authenticated;

notify pgrst, 'reload schema';
