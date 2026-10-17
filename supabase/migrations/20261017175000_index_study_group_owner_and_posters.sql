create index if not exists study_groups_owner_idx
  on public.study_groups (owner_id);

create index if not exists study_group_posts_user_idx
  on public.study_group_posts (user_id);

notify pgrst, 'reload schema';
