create or replace function public.notify_resource_upload()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.app_notifications (recipient_id, resource_id, type, message)
  select moderator.user_id, new.id, 'resource_uploaded',
    'New upload awaiting review: ' || left(new.title, 350)
  from public.resource_moderators as moderator;
  return new;
end;
$$;

revoke all on function public.notify_resource_upload() from public, anon, authenticated;
