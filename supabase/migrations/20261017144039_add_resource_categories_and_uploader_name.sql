alter table public.resources
  add column if not exists category text not null default 'lecture_notes';

alter table public.resources
  add column if not exists uploaded_by_name text not null default 'LASU student';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'resources_category_check'
      and conrelid = 'public.resources'::regclass
  ) then
    alter table public.resources
      add constraint resources_category_check
      check (category in ('past_question', 'lecture_notes', 'course_handout', 'study_guide'));
  end if;
end;
$$;

update public.resources
set category = case when kind = 'past_question' then 'past_question' else 'lecture_notes' end
where category not in ('past_question', 'lecture_notes', 'course_handout', 'study_guide')
   or (kind = 'past_question' and category = 'lecture_notes');

update public.resources as resource
set uploaded_by_name = coalesce(
  nullif(left(trim(concat_ws(' ',
    nullif(user_record.raw_user_meta_data ->> 'first_name', ''),
    nullif(user_record.raw_user_meta_data ->> 'last_name', '')
  )), 80), ''),
  'LASU student'
)
from auth.users as user_record
where resource.uploaded_by = user_record.id
  and resource.uploaded_by_name = 'LASU student';

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
    )), ''), 'LASU student'),
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
