create or replace function public.start_game_if_ready(target_game_id uuid) returns text
language plpgsql
security definer
set search_path=''
as $$
declare
  target_game public.games;
  final_character_count int;
  existing_first_turn uuid;
begin
  if auth.uid() is null or not public.is_game_member(target_game_id) then
    raise exception 'forbidden';
  end if;

  select * into target_game
  from public.games
  where id = target_game_id
  for update;

  if target_game.id is null then
    raise exception 'game_not_found';
  end if;

  if target_game.status = 'active' then
    return 'already_started';
  end if;

  select count(*) into final_character_count
  from public.characters
  where game_id = target_game_id
    and is_final = true;

  if final_character_count <> 2 then
    return 'waiting_for_characters';
  end if;

  select id into existing_first_turn
  from public.story_turns
  where game_id = target_game_id
    and turn_number = 1;

  if existing_first_turn is null then
    raise exception 'start_game_requires_edge_function';
  end if;

  update public.game_world_settings
  set locked_at = coalesce(locked_at, now()),
      updated_at = now()
  where game_id = target_game_id;

  update public.games
  set status = 'active',
      turn_number = 1,
      current_phase = 'decision',
      current_turn_deadline = case
        when play_mode = 'realtime' then now() + make_interval(secs => timer_seconds)
        else null
      end,
      updated_at = now()
  where id = target_game_id;

  insert into public.audit_events(game_id, actor_id, event_type, details)
  values(
    target_game_id,
    auth.uid(),
    'game.started',
    jsonb_build_object('source', 'generated_opening_existing_turn')
  );

  return 'started';
end;
$$;

revoke all on function public.start_game_if_ready(uuid) from public;
grant execute on function public.start_game_if_ready(uuid) to authenticated;
