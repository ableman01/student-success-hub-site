alter table public.resources
  alter column uploaded_by_name set default 'Student';

update public.resources as resource
set uploaded_by_name = coalesce(
  nullif(left(trim(concat_ws(' ',
    nullif(user_record.raw_user_meta_data ->> 'first_name', ''),
    nullif(user_record.raw_user_meta_data ->> 'last_name', '')
  )), 80), ''),
  'Student'
)
from auth.users as user_record
where resource.uploaded_by = user_record.id
  and resource.uploaded_by_name in ('Student Contributor', 'LASU student', 'Student');

create or replace function public.set_resource_uploader_name()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.uploaded_by_name := left(
    coalesce(nullif(trim(concat_ws(' ',
      nullif(auth.jwt() -> 'user_metadata' ->> 'first_name', ''),
      nullif(auth.jwt() -> 'user_metadata' ->> 'last_name', '')
    )), ''), 'Student'),
    80
  );
  return new;
end;
$$;

drop trigger if exists set_resource_uploader_name on public.resources;
create trigger set_resource_uploader_name
  before insert on public.resources
  for each row execute function public.set_resource_uploader_name();

notify pgrst, 'reload schema';
