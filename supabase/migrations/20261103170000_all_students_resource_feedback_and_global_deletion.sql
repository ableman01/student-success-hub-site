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
    )
  );

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
    and resource.status = 'approved';

  if new.institution_key is null then
    raise exception 'This resource cannot be reported from your account.';
  end if;
  return new;
end;
$$;

revoke all on function public.set_resource_report_institution_key () from public, anon, authenticated;

drop policy if exists "Global admins can delete resources across institutions" on public.resources;
create policy "Global admins can delete resources across institutions"
  on public.resources for delete to authenticated
  using ((select public.is_global_resource_admin()));

drop policy if exists "Global admins can delete PDFs across institutions" on storage.objects;
create policy "Global admins can delete PDFs across institutions"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'student-resources'
    and (select public.is_global_resource_admin())
  );

grant delete on public.resources to authenticated;

notify pgrst, 'reload schema';
