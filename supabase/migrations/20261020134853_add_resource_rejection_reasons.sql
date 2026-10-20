alter table public.resources
  add column if not exists review_comment text;

alter table public.resources
  drop constraint if exists resources_review_comment_length_check,
  add constraint resources_review_comment_length_check
    check (review_comment is null or length(review_comment) <= 400);

grant update (status, reviewed_at, review_comment) on public.resources to authenticated;

create or replace function public.require_resource_rejection_reason()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status is distinct from new.status
    and new.status = 'rejected'
    and nullif(trim(new.review_comment), '') is null then
    raise exception 'Add a reviewer comment before rejecting this upload.';
  end if;
  return new;
end;
$$;

revoke all on function public.require_resource_rejection_reason() from public, anon, authenticated;
drop trigger if exists require_resource_rejection_reason on public.resources;
create trigger require_resource_rejection_reason
  before update of status on public.resources
  for each row execute function public.require_resource_rejection_reason();

create or replace function public.notify_resource_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  notification_message text;
begin
  if old.status is distinct from new.status and new.status in ('approved', 'rejected') then
    notification_message := case
      when new.status = 'rejected' then
        'Your upload "' || left(new.title, 100) || '" was not approved. Reason: '
          || left(coalesce(nullif(trim(new.review_comment), ''), 'No reason was provided.'), 300)
      else
        'Your upload "' || left(new.title, 100) || '" was approved and is now available to students.'
          || case when nullif(trim(new.review_comment), '') is null then '' else ' Note: ' || left(trim(new.review_comment), 300) end
    end;

    insert into public.app_notifications (recipient_id, resource_id, type, message)
    values (
      new.uploaded_by,
      new.id,
      case when new.status = 'approved' then 'resource_approved' else 'resource_rejected' end,
      left(notification_message, 500)
    );
  end if;
  return new;
end;
$$;

revoke all on function public.notify_resource_review() from public, anon, authenticated;
drop trigger if exists notify_resource_review on public.resources;
create trigger notify_resource_review
  after update of status on public.resources
  for each row execute function public.notify_resource_review();

drop policy if exists "Students can read approved and owned resource PDFs" on storage.objects;
create policy "Students can read approved and pending owned resource PDFs"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'student-resources'
    and exists (
      select 1 from public.resources as resource
      where resource.file_path = name
        and (
          resource.status = 'approved'
          or (resource.status = 'pending' and resource.uploaded_by = (select auth.uid()))
          or exists (
            select 1 from public.resource_moderators as moderator
            where moderator.user_id = (select auth.uid())
          )
        )
    )
  );

notify pgrst, 'reload schema';
