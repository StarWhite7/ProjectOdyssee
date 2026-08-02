-- Cross-table invariants cannot be expressed with CHECK constraints.
create or replace function public.validate_decision_membership() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.story_turns turn
    join public.characters character on character.id = new.character_id
    where turn.id = new.turn_id
      and turn.game_id = new.game_id
      and turn.resolution_status = 'open'
      and character.game_id = new.game_id
      and character.owner_id = new.player_id
  ) then raise exception 'invalid_decision_context'; end if;
  return new;
end $$;
create trigger validate_decision_before_insert before insert on public.player_decisions
for each row execute function public.validate_decision_membership();

-- A decision from the other player remains invisible until persistence has completed.
drop policy decisions_read_secret on public.player_decisions;
create policy decisions_read_secret on public.player_decisions for select to authenticated
using (
  public.is_game_member(game_id)
  and (
    player_id = auth.uid()
    or exists (select 1 from public.story_turns turn where turn.id = turn_id and turn.resolution_status = 'resolved')
  )
);

create or replace function public.claim_turn_resolution(target_turn_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare claimed uuid;
begin
  if auth.role() <> 'service_role' and not exists (
    select 1 from public.story_turns turn where turn.id = target_turn_id and public.is_game_member(turn.game_id)
  ) then raise exception 'forbidden'; end if;
  update public.story_turns turn set
    resolution_status = 'claimed', resolution_claimed_at = now(), resolution_error = null
  where turn.id = target_turn_id
    and (turn.resolution_status = 'open' or (turn.resolution_status = 'failed' and turn.resolution_claimed_at < now() - interval '5 seconds'))
    and (select count(*) from public.player_decisions decision where decision.turn_id = turn.id) = 2
  returning id into claimed;
  return claimed is not null;
end $$;

create function public.complete_turn_resolution(target_turn_id uuid, result jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  current_turn public.story_turns;
  next_turn_id uuid;
  candidate jsonb;
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden'; end if;
  select * into current_turn from public.story_turns where id = target_turn_id for update;
  if current_turn.id is null then raise exception 'turn_not_found'; end if;
  if current_turn.resolution_status = 'resolved' then
    select id into next_turn_id from public.story_turns where game_id = current_turn.game_id and turn_number = current_turn.turn_number + 1;
    return next_turn_id;
  end if;
  if current_turn.resolution_status <> 'claimed' then raise exception 'turn_not_claimed'; end if;
  if jsonb_typeof(result->'resolutionNarration') <> 'string' or jsonb_typeof(result->'nextScene'->'text') <> 'string' then raise exception 'invalid_ai_result'; end if;

  update public.story_turns set resolution_text = result->>'resolutionNarration', resolution_status = 'resolved', resolved_at = now(), resolution_error = null where id = target_turn_id;
  update public.player_decisions set revealed_at = now() where turn_id = target_turn_id;
  insert into public.story_turns(game_id, turn_number, scene_text, location, scene_time, proposed_intentions)
  values(current_turn.game_id, current_turn.turn_number + 1, result->'nextScene'->>'text', result->'nextScene'->>'location', result->'nextScene'->>'sceneTime', coalesce(result->'proposedIntentions','{}'::jsonb))
  on conflict(game_id,turn_number) do nothing returning id into next_turn_id;
  if next_turn_id is null then select id into next_turn_id from public.story_turns where game_id=current_turn.game_id and turn_number=current_turn.turn_number+1; end if;

  for candidate in select value from jsonb_array_elements(coalesce(result->'memoryCandidates','[]'::jsonb)) loop
    insert into public.memories(game_id,type,importance,title,summary,involved_entity_ids,source_turn_id)
    values(current_turn.game_id,candidate->>'type',greatest(1,least(10,(candidate->>'importance')::int)),left(candidate->>'title',160),left(candidate->>'summary',1200),coalesce(candidate->'involvedCharacterIds','[]'::jsonb),target_turn_id);
  end loop;
  update public.games set turn_number=current_turn.turn_number+1,current_phase='decision',resolution_attempts=0,current_turn_deadline=case when play_mode='realtime' then now()+make_interval(secs=>timer_seconds) else null end,updated_at=now() where id=current_turn.game_id;
  insert into public.audit_events(game_id,event_type,details) values(current_turn.game_id,'turn.resolved',jsonb_build_object('turn_id',target_turn_id,'next_turn_id',next_turn_id));
  return next_turn_id;
end $$;
revoke all on function public.complete_turn_resolution(uuid,jsonb) from public;
grant execute on function public.complete_turn_resolution(uuid,jsonb) to service_role;

create function public.fail_turn_resolution(target_turn_id uuid, safe_error text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden'; end if;
  update public.story_turns set resolution_status='failed',resolution_error=left(safe_error,500) where id=target_turn_id and resolution_status='claimed';
  update public.games set resolution_attempts=resolution_attempts+1,updated_at=now() where id=(select game_id from public.story_turns where id=target_turn_id);
end $$;
revoke all on function public.fail_turn_resolution(uuid,text) from public;
grant execute on function public.fail_turn_resolution(uuid,text) to service_role;

create function public.expire_due_turns() returns table(turn_id uuid)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden'; end if;
  return query
  with due as (
    select turn.id, turn.game_id
    from public.story_turns turn join public.games game on game.id=turn.game_id
    where game.play_mode='realtime' and game.current_turn_deadline<=now() and turn.resolution_status='open' and turn.turn_number=game.turn_number
    for update of turn skip locked
  ), missing as (
    select due.id as turn_id_value, player.player_id, character.id as character_id, due.game_id
    from due join public.game_players player on player.game_id=due.game_id and player.abandoned_at is null
    join public.characters character on character.game_id=due.game_id and character.owner_id=player.player_id
    where not exists(select 1 from public.player_decisions decision where decision.turn_id=due.id and decision.player_id=player.player_id)
  ), inserted as (
    insert into public.player_decisions(game_id,turn_id,player_id,character_id,source,action_text)
    select game_id,turn_id_value,player_id,character_id,'timeout','Le personnage hésite et observe la situation' from missing
    on conflict(turn_id,player_id) do nothing returning player_decisions.turn_id
  )
  select distinct due.id from due where (select count(*) from public.player_decisions decision where decision.turn_id=due.id)=2;
end $$;
revoke all on function public.expire_due_turns() from public;
grant execute on function public.expire_due_turns() to service_role;

-- Restrict direct game updates: mutable gameplay state is server-owned.
drop policy games_update_owner on public.games;
create policy games_update_owner_settings on public.games for update to authenticated
using(owner_id=auth.uid()) with check(owner_id=auth.uid());
revoke update on public.games from authenticated;
grant update(title,timer_seconds) on public.games to authenticated;

create policy world_insert_owner on public.world_states for insert to authenticated
with check (
  exists(select 1 from public.games game where game.id=game_id and game.owner_id=auth.uid())
);
