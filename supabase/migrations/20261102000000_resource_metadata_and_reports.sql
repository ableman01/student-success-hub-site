alter table public.resources
  add column if not exists academic_year text,
  add column if not exists semester text,
  add column if not exists source text;

update public.resources set uploaded_by_name = 'Student Contributor';

create or replace function public.set_resource_uploader_name ()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.uploaded_by_name := 'Student Contributor';
  return new;
end;
$$;

alter table public.resources
  add constraint resources_academic_year_length check (academic_year is null or length(trim(academic_year)) between 4 and 20),
  add constraint resources_semester_length check (semester is null or length(trim(semester)) between 2 and 40),
  add constraint resources_source_length check (source is null or length(trim(source)) between 2 and 240);

create table if not exists public.resource_reports (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  institution_key text not null,
  reason text not null check (reason in ('incorrect', 'duplicate', 'inappropriate')),
  details text check (details is null or length(details) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  moderator_comment text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists resource_reports_moderation_queue_idx
  on public.resource_reports (institution_key, status, created_at desc);
create unique index if not exists resource_reports_one_open_per_student_idx
  on public.resource_reports(resource_id, reporter_id) where status = 'pending';

alter table public.resource_reports enable row level security;
revoke all on public.resource_reports from anon, authenticated;
grant select, insert on public.resource_reports to authenticated;
grant update (status, moderator_comment, reviewed_at) on public.resource_reports to authenticated;

drop policy if exists "Students can report resources at their institution" on public.resource_reports;
create policy "Students can report resources at their institution"
  on public.resource_reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and institution_key = (select public.current_student_institution_key())
    and status = 'pending'
    and exists (
      select 1 from public.resources resource
      where resource.id = resource_reports.resource_id
        and resource.institution_key = (select public.current_student_institution_key())
        and resource.status = 'approved'
        and resource.uploaded_by <> (select auth.uid())
    )
  );

drop policy if exists "Students can read their own resource reports" on public.resource_reports;
create policy "Students can read their own resource reports"
  on public.resource_reports for select to authenticated
  using (reporter_id = (select auth.uid()));

drop policy if exists "Institution moderators can manage resource reports" on public.resource_reports;
create policy "Institution moderators can manage resource reports"
  on public.resource_reports for all to authenticated
  using (
    institution_key = (select public.current_student_institution_key())
    and exists (select 1 from public.resource_moderators moderator where moderator.user_id = (select auth.uid()))
  )
  with check (
    institution_key = (select public.current_student_institution_key())
    and exists (select 1 from public.resource_moderators moderator where moderator.user_id = (select auth.uid()))
  );

create or replace function public.set_resource_report_institution_key ()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select resource.institution_key into new.institution_key
  from public.resources resource
  where resource.id = new.resource_id
    and resource.institution_key = (select public.current_student_institution_key())
    and resource.status = 'approved'
    and resource.uploaded_by <> (select auth.uid());
  if new.institution_key is null then
    raise exception 'This resource cannot be reported from your account.';
  end if;
  return new;
end;
$$;

revoke all on function public.set_resource_report_institution_key () from public, anon, authenticated;
drop trigger if exists set_resource_report_institution_key on public.resource_reports;
create trigger set_resource_report_institution_key
  before insert on public.resource_reports
  for each row execute function public.set_resource_report_institution_key();

notify pgrst, 'reload schema';
