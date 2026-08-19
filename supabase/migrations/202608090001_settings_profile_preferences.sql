alter table public.profiles
  add column if not exists bio text not null default '' check (char_length(bio) <= 200),
  add column if not exists banner_url text,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  friend_request_policy text not null default 'everyone'
    check (friend_request_policy in ('everyone', 'nobody')),
  game_invitation_policy text not null default 'friends'
    check (game_invitation_policy in ('friends', 'nobody')),
  profile_visibility text not null default 'public'
    check (profile_visibility in ('public', 'friends')),
  searchable_by_pseudo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.user_preferences(user_id)
select profile.id
from public.profiles profile
on conflict (user_id) do nothing;

alter table public.user_preferences enable row level security;

drop policy if exists user_preferences_read_own on public.user_preferences;
create policy user_preferences_read_own
  on public.user_preferences
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists user_preferences_insert_own on public.user_preferences;
create policy user_preferences_insert_own
  on public.user_preferences
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists user_preferences_update_own on public.user_preferences;
create policy user_preferences_update_own
  on public.user_preferences
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on public.user_preferences to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-media',
  'profile-media',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists profile_media_read_authenticated on storage.objects;
create policy profile_media_read_authenticated
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'profile-media');

drop policy if exists profile_media_insert_own on storage.objects;
create policy profile_media_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-media'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists profile_media_update_own on storage.objects;
create policy profile_media_update_own
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile-media'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-media'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists profile_media_delete_own on storage.objects;
create policy profile_media_delete_own
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile-media'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create or replace function public.search_social_profiles(search_query text, max_results int default 8)
returns table (
  id uuid,
  display_name text,
  avatar_url text,
  relation_status text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_query text := trim(coalesce(search_query, ''));
  result_limit int := least(greatest(coalesce(max_results, 8), 1), 20);
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if length(normalized_query) < 2 then
    return;
  end if;

  return query
    select
      profile.id,
      profile.display_name,
      profile.avatar_url,
      public.social_relation_status(profile.id)
    from public.profiles profile
    join public.user_preferences preference on preference.user_id = profile.id
    where profile.id <> current_user_id
      and preference.searchable_by_pseudo is true
      and (
        preference.profile_visibility = 'public'
        or public.are_friends(current_user_id, profile.id)
      )
      and profile.display_name ilike '%' || normalized_query || '%'
      and not public.is_blocked_between(current_user_id, profile.id)
    order by profile.display_name asc
    limit result_limit;
end;
$$;

create or replace function public.send_friend_request(target_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  created_request_id uuid;
  inverse_request public.friend_requests;
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if target_user_id is null or target_user_id = current_user_id then
    raise exception 'invalid_friend_request_target';
  end if;

  if exists (
    select 1
    from public.user_preferences preference
    where preference.user_id = target_user_id
      and preference.friend_request_policy = 'nobody'
  ) then
    raise exception 'friend_requests_disabled';
  end if;

  if public.is_blocked_between(current_user_id, target_user_id) then
    raise exception 'interaction_blocked';
  end if;

  if public.are_friends(current_user_id, target_user_id) then
    return 'already_friends';
  end if;

  select *
    into inverse_request
  from public.friend_requests request
  where request.requester_id = target_user_id
    and request.recipient_id = current_user_id
    and request.status = 'pending'
  for update;

  if inverse_request.id is not null then
    delete from public.friend_requests request where request.id = inverse_request.id;
    insert into public.friendships(user_low_id, user_high_id)
      values (least(current_user_id, target_user_id), greatest(current_user_id, target_user_id))
      on conflict (user_low_id, user_high_id) do nothing;
    insert into public.notifications(user_id, type, actor_id)
      values (target_user_id, 'friend_request_accepted', current_user_id);
    return 'accepted';
  end if;

  begin
    insert into public.friend_requests(requester_id, recipient_id)
      values (current_user_id, target_user_id)
      returning id into created_request_id;
  exception when unique_violation then
    return 'pending';
  end;

  insert into public.notifications(user_id, type, actor_id, friend_request_id)
    values (target_user_id, 'friend_request_received', current_user_id, created_request_id);

  return 'pending';
end;
$$;

create or replace function public.send_game_invitation(target_game_id uuid, target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_game public.games;
  active_players int;
  created_invitation_id uuid;
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if target_user_id is null or target_user_id = current_user_id then
    raise exception 'invalid_game_invitation_target';
  end if;

  if exists (
    select 1
    from public.user_preferences preference
    where preference.user_id = target_user_id
      and preference.game_invitation_policy = 'nobody'
  ) then
    raise exception 'game_invitations_disabled';
  end if;

  if public.is_blocked_between(current_user_id, target_user_id) then
    raise exception 'interaction_blocked';
  end if;

  if not public.are_friends(current_user_id, target_user_id) then
    raise exception 'not_friends';
  end if;

  select *
    into target_game
  from public.games game
  where game.id = target_game_id
  for update;

  if target_game.id is null then
    raise exception 'game_not_found';
  end if;

  if not exists (
    select 1
    from public.game_players player
    where player.game_id = target_game_id
      and player.player_id = current_user_id
      and player.abandoned_at is null
  ) then
    raise exception 'not_game_member';
  end if;

  if exists (
    select 1
    from public.game_players player
    where player.game_id = target_game_id
      and player.player_id = target_user_id
      and player.abandoned_at is null
  ) then
    raise exception 'already_game_member';
  end if;

  select count(*)
    into active_players
  from public.game_players player
  where player.game_id = target_game_id
    and player.abandoned_at is null;

  if active_players >= 2 then
    raise exception 'game_full';
  end if;

  if target_game.status not in ('waiting', 'character_creation', 'ready') then
    raise exception 'game_not_invitable';
  end if;

  begin
    insert into public.game_invitations(game_id, sender_id, recipient_id)
      values (target_game_id, current_user_id, target_user_id)
      returning id into created_invitation_id;
  exception when unique_violation then
    select invitation.id
      into created_invitation_id
    from public.game_invitations invitation
    where invitation.game_id = target_game_id
      and invitation.recipient_id = target_user_id
      and invitation.status = 'pending'
    limit 1;
  end;

  insert into public.notifications(user_id, type, actor_id, game_id, game_invitation_id)
    values (
      target_user_id,
      'game_invitation_received',
      current_user_id,
      target_game_id,
      created_invitation_id
    );

  return created_invitation_id;
end;
$$;
