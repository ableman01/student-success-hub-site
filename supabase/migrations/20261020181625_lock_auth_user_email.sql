create or replace function public.reject_auth_email_changes ()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    raise exception 'Email addresses cannot be changed after account creation.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.reject_auth_email_changes () from public, anon, authenticated;
grant execute on function public.reject_auth_email_changes () to supabase_auth_admin;

drop trigger if exists prevent_auth_user_email_change on auth.users;
create trigger prevent_auth_user_email_change
  before update of email on auth.users
  for each row
  execute function public.reject_auth_email_changes ();
