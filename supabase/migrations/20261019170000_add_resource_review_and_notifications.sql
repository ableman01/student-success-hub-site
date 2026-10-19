alter table public.resources
  add column if not exists status text not null default 'approved',
  add column if not exists reviewed_at timestamptz;

alter table public.resources
  alter column status set default 'pending';

alter table public.resources
  drop constraint if exists resources_status_check;
alter table public.resources
  add constraint resources_status_check
  check (status in ('pending', 'approved', 'rejected'));
alter table public.resources
  drop constraint if exists resources_category_check;
alter table public.resources
  add constraint resources_category_check
  check (category in ('past_question', 'lecture_notes', 'course_handout', 'study_guide', 'assignment'));

create table if not exists public.resource_moderators (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.resource_moderators enable row level security;
drop policy if exists "Moderators can view their own role" on public.resource_moderators;
create policy "Moderators can view their own role"
  on public.resource_moderators for select
  to authenticated
  using ((select auth.uid()) = user_id);
grant select on public.resource_moderators to anon, authenticated;

insert into public.resource_moderators (user_id)
select id from auth.users where id = '4b49e7de-d90c-47a2-bd92-23bcddf9afd8'
on conflict (user_id) do nothing;

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users (id) on delete cascade,
  resource_id uuid references public.resources (id) on delete set null,
  type text not null check (type in ('resource_uploaded', 'resource_approved', 'resource_rejected')),
  message text not null check (length(message) <= 500),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists app_notifications_recipient_created_idx
  on public.app_notifications (recipient_id, created_at desc);

alter table public.app_notifications enable row level security;
drop policy if exists "Users can read their notifications" on public.app_notifications;
create policy "Users can read their notifications"
  on public.app_notifications for select
  to authenticated
  using ((select auth.uid()) = recipient_id);
drop policy if exists "Users can mark their notifications read" on public.app_notifications;
create policy "Users can mark their notifications read"
  on public.app_notifications for update
  to authenticated
  using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);
grant select on public.app_notifications to authenticated;
grant update (is_read) on public.app_notifications to authenticated;

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
drop trigger if exists notify_resource_upload on public.resources;
create trigger notify_resource_upload
  after insert on public.resources
  for each row execute function public.notify_resource_upload();

create or replace function public.notify_resource_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status and new.status in ('approved', 'rejected') then
    insert into public.app_notifications (recipient_id, resource_id, type, message)
    values (
      new.uploaded_by,
      new.id,
      case when new.status = 'approved' then 'resource_approved' else 'resource_rejected' end,
      'Your upload "' || left(new.title, 300) || '" was '
        || case when new.status = 'approved' then 'approved and is now available to students.'
                else 'not approved. Please review it and upload a corrected copy if needed.' end
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

drop policy if exists "Anyone can read shared resources" on public.resources;
create policy "Students can read approved resources and their own uploads"
  on public.resources for select
  to anon, authenticated
  using (
    status = 'approved'
    or (select auth.uid()) = uploaded_by
    or exists (
      select 1 from public.resource_moderators as moderator
      where moderator.user_id = (select auth.uid())
    )
  );

drop policy if exists "Resource moderators can review uploads" on public.resources;
create policy "Resource moderators can review uploads"
  on public.resources for update
  to authenticated
  using (exists (
    select 1 from public.resource_moderators as moderator
    where moderator.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.resource_moderators as moderator
    where moderator.user_id = (select auth.uid())
  ));
grant update (status, reviewed_at) on public.resources to authenticated;

update storage.buckets
set public = false
where id = 'student-resources';

drop policy if exists "Anyone can read shared resource PDFs" on storage.objects;
create policy "Students can read approved and owned resource PDFs"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'student-resources'
    and exists (
      select 1 from public.resources as resource
      where resource.file_path = name
        and (
          resource.status = 'approved'
          or resource.uploaded_by = (select auth.uid())
          or exists (
            select 1 from public.resource_moderators as moderator
            where moderator.user_id = (select auth.uid())
          )
        )
    )
  );

notify pgrst, 'reload schema';
