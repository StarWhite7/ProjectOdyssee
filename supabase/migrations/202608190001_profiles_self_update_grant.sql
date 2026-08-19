alter table public.profiles enable row level security;

drop policy if exists profiles_update_self on public.profiles;

create policy profiles_update_self
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

grant update (
  display_name,
  avatar_url,
  bio,
  banner_url,
  updated_at
)
  on table public.profiles
  to authenticated;

notify pgrst, 'reload schema';
