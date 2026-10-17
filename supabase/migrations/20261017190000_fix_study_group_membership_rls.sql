drop policy if exists "Owners can add themselves as a member" on public.study_group_members;
drop policy if exists "Students can create study groups" on public.study_groups;

revoke insert on public.study_groups from authenticated;
revoke insert on public.study_group_members from authenticated;

notify pgrst, 'reload schema';
