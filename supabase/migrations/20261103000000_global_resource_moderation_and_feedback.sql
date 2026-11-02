alter table public.resource_moderators
  add column if not exists is_global_admin boolean not null default false;

-- The original site creator remains the only cross-institution administrator.
update public.resource_moderators
set is_global_admin = true
where user_id = '4b49e7de-d90c-47a2-bd92-23bcddf9afd8';

create or replace function public.is_global_resource_admin ()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.resource_moderators moderator
    where moderator.user_id = (select auth.uid())
      and moderator.is_global_admin
  )
$$;

revoke all on function public.is_global_resource_admin () from public, anon;
grant execute on function public.is_global_resource_admin () to authenticated;

alter table public.resources
  add column if not exists institution_name text,
  add column if not exists institution_type text;

update public.resources resource
set institution_name = profile.institution,
    institution_type = profile.institution_type
from public.student_profiles profile
where profile.institution_key = resource.institution_key
  and (resource.institution_name is null or resource.institution_type is null);

create or replace function public.set_resource_institution_key ()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select profile.institution_key, profile.institution, profile.institution_type
    into new.institution_key, new.institution_name, new.institution_type
  from public.student_profiles profile
  where profile.user_id = (select auth.uid());

  if new.institution_key is null then
    raise exception 'Your account does not have an institution profile.';
  end if;
  return new;
end;
$$;

drop policy if exists "Global admins can read resources across institutions" on public.resources;
create policy "Global admins can read resources across institutions"
  on public.resources for select to authenticated
  using ((select public.is_global_resource_admin()));

drop policy if exists "Global admins can review resources across institutions" on public.resources;
create policy "Global admins can review resources across institutions"
  on public.resources for update to authenticated
  using ((select public.is_global_resource_admin()))
  with check ((select public.is_global_resource_admin()));

drop policy if exists "Global admins can delete resources across institutions" on public.resources;
create policy "Global admins can delete resources across institutions"
  on public.resources for delete to authenticated
  using ((select public.is_global_resource_admin()));

drop policy if exists "Global admins can read PDFs across institutions" on storage.objects;
create policy "Global admins can read PDFs across institutions"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'student-resources'
    and (select public.is_global_resource_admin())
    and exists (
      select 1 from public.resources resource
      where resource.file_path = name
    )
  );

drop policy if exists "Global admins can delete PDFs across institutions" on storage.objects;
create policy "Global admins can delete PDFs across institutions"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'student-resources'
    and (select public.is_global_resource_admin())
  );

alter table public.resource_reports
  add column if not exists institution_name text,
  add column if not exists institution_type text;

alter table public.resource_reports
  drop constraint if exists resource_reports_reason_check;
alter table public.resource_reports
  add constraint resource_reports_reason_check
  check (reason in ('comment', 'incorrect', 'duplicate', 'inappropriate'));

update public.resource_reports report
set institution_name = profile.institution,
    institution_type = profile.institution_type
from public.student_profiles profile
where profile.user_id = report.reporter_id
  and (report.institution_name is null or report.institution_type is null);

drop policy if exists "Global admins can view all resource feedback" on public.resource_reports;
create policy "Global admins can view all resource feedback"
  on public.resource_reports for select to authenticated
  using ((select public.is_global_resource_admin()));

drop policy if exists "Global admins can review all resource feedback" on public.resource_reports;
create policy "Global admins can review all resource feedback"
  on public.resource_reports for update to authenticated
  using ((select public.is_global_resource_admin()))
  with check ((select public.is_global_resource_admin()));

create or replace function public.set_resource_report_institution_key ()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select resource.institution_key, profile.institution, profile.institution_type
    into new.institution_key, new.institution_name, new.institution_type
  from public.resources resource
  join public.student_profiles profile
    on profile.user_id = (select auth.uid())
   and profile.institution_key = resource.institution_key
  where resource.id = new.resource_id
    and resource.status = 'approved'
    and resource.uploaded_by <> (select auth.uid());

  if new.institution_key is null then
    raise exception 'This resource cannot be reported from your account.';
  end if;
  return new;
end;
$$;

create or replace function public.notify_resource_upload ()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.app_notifications (recipient_id, resource_id, type, message)
  select moderator.user_id, new.id, 'resource_uploaded',
    'New upload awaiting review: ' || left(new.title, 350)
  from public.resource_moderators moderator
  left join public.student_profiles profile on profile.user_id = moderator.user_id
  where moderator.is_global_admin
     or profile.institution_key = new.institution_key;
  return new;
end;
$$;

notify pgrst, 'reload schema';
