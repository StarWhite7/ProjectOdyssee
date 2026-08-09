create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status = 'pending'),
  created_at timestamptz not null default now(),
  check (requester_id <> recipient_id)
);

create unique index friend_requests_pending_pair_unique
  on public.friend_requests (least(requester_id, recipient_id), greatest(requester_id, recipient_id))
  where status = 'pending';
create index friend_requests_requester_idx on public.friend_requests(requester_id, created_at desc);
create index friend_requests_recipient_idx on public.friend_requests(recipient_id, created_at desc);

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_low_id uuid not null references public.profiles(id) on delete cascade,
  user_high_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_low_id < user_high_id),
  unique (user_low_id, user_high_id)
);

create index friendships_low_idx on public.friendships(user_low_id, created_at desc);
create index friendships_high_idx on public.friendships(user_high_id, created_at desc);

create table public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index user_blocks_blocked_idx on public.user_blocks(blocked_id);

create table public.game_invitations (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (sender_id <> recipient_id)
);

create unique index game_invitations_pending_game_recipient_unique
  on public.game_invitations(game_id, recipient_id)
  where status = 'pending';
create index game_invitations_sender_idx on public.game_invitations(sender_id, created_at desc);
create index game_invitations_recipient_idx on public.game_invitations(recipient_id, created_at desc);
create index game_invitations_game_idx on public.game_invitations(game_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (
    type in (
      'friend_request_received',
      'friend_request_accepted',
      'game_invitation_received',
      'game_invitation_accepted',
      'game_invitation_declined'
    )
  ),
  actor_id uuid references public.profiles(id) on delete set null,
  game_id uuid references public.games(id) on delete cascade,
  friend_request_id uuid references public.friend_requests(id) on delete set null,
  game_invitation_id uuid references public.game_invitations(id) on delete set null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_user_idx on public.notifications(user_id, created_at desc);
create index notifications_unread_idx on public.notifications(user_id, created_at desc) where read_at is null;

alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.user_blocks enable row level security;
alter table public.game_invitations enable row level security;
alter table public.notifications enable row level security;

create function public.are_friends(first_user_id uuid, second_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.friendships friendship
    where friendship.user_low_id = least(first_user_id, second_user_id)
      and friendship.user_high_id = greatest(first_user_id, second_user_id)
  );
$$;

create function public.is_blocked_between(first_user_id uuid, second_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_blocks block
    where (block.blocker_id = first_user_id and block.blocked_id = second_user_id)
       or (block.blocker_id = second_user_id and block.blocked_id = first_user_id)
  );
$$;

create function public.social_relation_status(target_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null or target_user_id is null or current_user_id = target_user_id then
    return 'self';
  end if;

  if exists (
    select 1
    from public.user_blocks block
    where block.blocker_id = current_user_id and block.blocked_id = target_user_id
  ) then
    return 'blocked';
  end if;

  if exists (
    select 1
    from public.user_blocks block
    where block.blocker_id = target_user_id and block.blocked_id = current_user_id
  ) then
    return 'blocked_by_them';
  end if;

  if public.are_friends(current_user_id, target_user_id) then
    return 'friend';
  end if;

  if exists (
    select 1
    from public.friend_requests request
    where request.requester_id = current_user_id
      and request.recipient_id = target_user_id
      and request.status = 'pending'
  ) then
    return 'request_sent';
  end if;

  if exists (
    select 1
    from public.friend_requests request
    where request.requester_id = target_user_id
      and request.recipient_id = current_user_id
      and request.status = 'pending'
  ) then
    return 'request_received';
  end if;

  return 'none';
end;
$$;

create function public.search_social_profiles(search_query text, max_results int default 8)
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
    where profile.id <> current_user_id
      and profile.display_name ilike '%' || normalized_query || '%'
      and not public.is_blocked_between(current_user_id, profile.id)
    order by profile.display_name asc
    limit result_limit;
end;
$$;

create function public.send_friend_request(target_user_id uuid)
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

create function public.accept_friend_request(request_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_request public.friend_requests;
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select *
    into target_request
  from public.friend_requests request
  where request.id = request_id
    and request.recipient_id = current_user_id
    and request.status = 'pending'
  for update;

  if target_request.id is null then
    raise exception 'friend_request_not_found';
  end if;

  if public.is_blocked_between(current_user_id, target_request.requester_id) then
    raise exception 'interaction_blocked';
  end if;

  insert into public.friendships(user_low_id, user_high_id)
    values (
      least(current_user_id, target_request.requester_id),
      greatest(current_user_id, target_request.requester_id)
    )
    on conflict (user_low_id, user_high_id) do nothing;

  delete from public.friend_requests request where request.id = target_request.id;

  insert into public.notifications(user_id, type, actor_id)
    values (target_request.requester_id, 'friend_request_accepted', current_user_id);

  return 'accepted';
end;
$$;

create function public.decline_friend_request(request_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  deleted_count int;
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  delete from public.friend_requests request
  where request.id = request_id
    and request.recipient_id = current_user_id
    and request.status = 'pending';

  get diagnostics deleted_count = row_count;
  if deleted_count = 0 then
    raise exception 'friend_request_not_found';
  end if;

  return 'declined';
end;
$$;

create function public.cancel_friend_request(request_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  deleted_count int;
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  delete from public.friend_requests request
  where request.id = request_id
    and request.requester_id = current_user_id
    and request.status = 'pending';

  get diagnostics deleted_count = row_count;
  if deleted_count = 0 then
    raise exception 'friend_request_not_found';
  end if;

  return 'cancelled';
end;
$$;

create function public.remove_friend(friend_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  deleted_count int;
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  delete from public.friendships friendship
  where friendship.user_low_id = least(current_user_id, friend_user_id)
    and friendship.user_high_id = greatest(current_user_id, friend_user_id);

  get diagnostics deleted_count = row_count;
  if deleted_count = 0 then
    raise exception 'friendship_not_found';
  end if;

  return 'removed';
end;
$$;

create function public.block_user(target_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if target_user_id is null or target_user_id = current_user_id then
    raise exception 'invalid_block_target';
  end if;

  insert into public.user_blocks(blocker_id, blocked_id)
    values (current_user_id, target_user_id)
    on conflict (blocker_id, blocked_id) do nothing;

  delete from public.friend_requests request
  where (request.requester_id = current_user_id and request.recipient_id = target_user_id)
     or (request.requester_id = target_user_id and request.recipient_id = current_user_id);

  delete from public.friendships friendship
  where friendship.user_low_id = least(current_user_id, target_user_id)
    and friendship.user_high_id = greatest(current_user_id, target_user_id);

  update public.game_invitations invitation
    set status = 'cancelled',
        responded_at = now()
  where invitation.status = 'pending'
    and (
      (invitation.sender_id = current_user_id and invitation.recipient_id = target_user_id)
      or
      (invitation.sender_id = target_user_id and invitation.recipient_id = current_user_id)
    );

  return 'blocked';
end;
$$;

create function public.unblock_user(target_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  delete from public.user_blocks block
  where block.blocker_id = current_user_id
    and block.blocked_id = target_user_id;

  return 'unblocked';
end;
$$;

create function public.send_game_invitation(target_game_id uuid, target_user_id uuid)
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

create function public.accept_game_invitation(invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_invitation public.game_invitations;
  target_game public.games;
  active_players int;
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select *
    into target_invitation
  from public.game_invitations invitation
  where invitation.id = invitation_id
    and invitation.recipient_id = current_user_id
    and invitation.status = 'pending'
  for update;

  if target_invitation.id is null then
    raise exception 'game_invitation_not_found';
  end if;

  if public.is_blocked_between(current_user_id, target_invitation.sender_id) then
    raise exception 'interaction_blocked';
  end if;

  select *
    into target_game
  from public.games game
  where game.id = target_invitation.game_id
  for update;

  if target_game.id is null then
    raise exception 'game_not_found';
  end if;

  if target_game.status not in ('waiting', 'character_creation', 'ready') then
    raise exception 'game_not_joinable';
  end if;

  if exists (
    select 1
    from public.game_players player
    where player.game_id = target_invitation.game_id
      and player.player_id = current_user_id
      and player.abandoned_at is null
  ) then
    update public.game_invitations invitation
      set status = 'accepted',
          responded_at = now()
    where invitation.id = target_invitation.id;
    return target_invitation.game_id;
  end if;

  select count(*)
    into active_players
  from public.game_players player
  where player.game_id = target_invitation.game_id
    and player.abandoned_at is null;

  if active_players >= 2 then
    raise exception 'game_full';
  end if;

  insert into public.game_players(game_id, player_id)
    values (target_invitation.game_id, current_user_id)
    on conflict (game_id, player_id) do update
      set abandoned_at = null,
          last_seen_at = now();

  update public.game_invitations invitation
    set status = 'accepted',
        responded_at = now()
  where invitation.id = target_invitation.id;

  update public.games game
    set status = 'character_creation',
        updated_at = now()
  where game.id = target_invitation.game_id
    and game.status = 'waiting'
    and (
      select count(*)
      from public.game_players player
      where player.game_id = target_invitation.game_id
        and player.abandoned_at is null
    ) = 2;

  insert into public.notifications(user_id, type, actor_id, game_id, game_invitation_id)
    values (
      target_invitation.sender_id,
      'game_invitation_accepted',
      current_user_id,
      target_invitation.game_id,
      target_invitation.id
    );

  return target_invitation.game_id;
end;
$$;

create function public.decline_game_invitation(invitation_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_invitation public.game_invitations;
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select *
    into target_invitation
  from public.game_invitations invitation
  where invitation.id = invitation_id
    and invitation.recipient_id = current_user_id
    and invitation.status = 'pending'
  for update;

  if target_invitation.id is null then
    raise exception 'game_invitation_not_found';
  end if;

  update public.game_invitations invitation
    set status = 'declined',
        responded_at = now()
  where invitation.id = target_invitation.id;

  insert into public.notifications(user_id, type, actor_id, game_id, game_invitation_id)
    values (
      target_invitation.sender_id,
      'game_invitation_declined',
      current_user_id,
      target_invitation.game_id,
      target_invitation.id
    );

  return 'declined';
end;
$$;

create function public.cancel_game_invitation(invitation_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  updated_count int;
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  update public.game_invitations invitation
    set status = 'cancelled',
        responded_at = now()
  where invitation.id = invitation_id
    and invitation.sender_id = current_user_id
    and invitation.status = 'pending';

  get diagnostics updated_count = row_count;
  if updated_count = 0 then
    raise exception 'game_invitation_not_found';
  end if;

  return 'cancelled';
end;
$$;

create function public.get_my_notifications(max_results int default 12)
returns table (
  id uuid,
  type text,
  actor_id uuid,
  actor_display_name text,
  actor_avatar_url text,
  game_id uuid,
  game_title text,
  created_at timestamptz,
  read_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  result_limit int := least(greatest(coalesce(max_results, 12), 1), 50);
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  return query
    select
      notification.id,
      notification.type,
      notification.actor_id,
      actor.display_name,
      actor.avatar_url,
      notification.game_id,
      game.title,
      notification.created_at,
      notification.read_at
    from public.notifications notification
    left join public.profiles actor on actor.id = notification.actor_id
    left join public.games game on game.id = notification.game_id
    where notification.user_id = current_user_id
    order by notification.created_at desc
    limit result_limit;
end;
$$;

create function public.mark_notification_read(notification_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  update public.notifications notification
    set read_at = coalesce(notification.read_at, now())
  where notification.id = notification_id
    and notification.user_id = current_user_id;

  return 'read';
end;
$$;

create function public.mark_all_notifications_read()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  update public.notifications notification
    set read_at = coalesce(notification.read_at, now())
  where notification.user_id = current_user_id
    and notification.read_at is null;

  return 'read';
end;
$$;

create policy profiles_read_social_edges
  on public.profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or public.are_friends(auth.uid(), id)
    or exists (
      select 1
      from public.friend_requests request
      where (request.requester_id = auth.uid() and request.recipient_id = profiles.id)
         or (request.recipient_id = auth.uid() and request.requester_id = profiles.id)
    )
    or exists (
      select 1
      from public.game_invitations invitation
      where (invitation.sender_id = auth.uid() and invitation.recipient_id = profiles.id)
         or (invitation.recipient_id = auth.uid() and invitation.sender_id = profiles.id)
    )
    or exists (
      select 1
      from public.user_blocks block
      where block.blocker_id = auth.uid()
        and block.blocked_id = profiles.id
    )
  );

create policy friend_requests_read_participants
  on public.friend_requests
  for select
  to authenticated
  using (requester_id = auth.uid() or recipient_id = auth.uid());

create policy friendships_read_participants
  on public.friendships
  for select
  to authenticated
  using (user_low_id = auth.uid() or user_high_id = auth.uid());

create policy blocks_read_own
  on public.user_blocks
  for select
  to authenticated
  using (blocker_id = auth.uid());

create policy blocks_insert_own
  on public.user_blocks
  for insert
  to authenticated
  with check (blocker_id = auth.uid());

create policy blocks_delete_own
  on public.user_blocks
  for delete
  to authenticated
  using (blocker_id = auth.uid());

create policy game_invitations_read_participants
  on public.game_invitations
  for select
  to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());

create policy notifications_read_own
  on public.notifications
  for select
  to authenticated
  using (user_id = auth.uid());

create policy notifications_update_own_read_state
  on public.notifications
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select on public.friend_requests to authenticated;
grant select on public.friendships to authenticated;
grant select, insert, delete on public.user_blocks to authenticated;
grant select on public.game_invitations to authenticated;
grant select on public.notifications to authenticated;
grant update(read_at) on public.notifications to authenticated;

revoke all on function public.are_friends(uuid, uuid) from public;
revoke all on function public.is_blocked_between(uuid, uuid) from public;
revoke all on function public.social_relation_status(uuid) from public;
revoke all on function public.search_social_profiles(text, int) from public;
revoke all on function public.send_friend_request(uuid) from public;
revoke all on function public.accept_friend_request(uuid) from public;
revoke all on function public.decline_friend_request(uuid) from public;
revoke all on function public.cancel_friend_request(uuid) from public;
revoke all on function public.remove_friend(uuid) from public;
revoke all on function public.block_user(uuid) from public;
revoke all on function public.unblock_user(uuid) from public;
revoke all on function public.send_game_invitation(uuid, uuid) from public;
revoke all on function public.accept_game_invitation(uuid) from public;
revoke all on function public.decline_game_invitation(uuid) from public;
revoke all on function public.cancel_game_invitation(uuid) from public;
revoke all on function public.get_my_notifications(int) from public;
revoke all on function public.mark_notification_read(uuid) from public;
revoke all on function public.mark_all_notifications_read() from public;

grant execute on function public.are_friends(uuid, uuid) to authenticated;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;
grant execute on function public.social_relation_status(uuid) to authenticated;
grant execute on function public.search_social_profiles(text, int) to authenticated;
grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.accept_friend_request(uuid) to authenticated;
grant execute on function public.decline_friend_request(uuid) to authenticated;
grant execute on function public.cancel_friend_request(uuid) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;
grant execute on function public.send_game_invitation(uuid, uuid) to authenticated;
grant execute on function public.accept_game_invitation(uuid) to authenticated;
grant execute on function public.decline_game_invitation(uuid) to authenticated;
grant execute on function public.cancel_game_invitation(uuid) to authenticated;
grant execute on function public.get_my_notifications(int) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
