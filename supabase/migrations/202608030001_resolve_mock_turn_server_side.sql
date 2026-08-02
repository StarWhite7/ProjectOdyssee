create function public.resolve_ready_turn_mock(target_turn_id uuid) returns text
language plpgsql security definer set search_path='extensions' as $$
declare current_turn public.story_turns; first_action text; second_action text; intentions jsonb; character_ids jsonb;
begin
  if auth.uid() is null or not exists(select 1 from public.story_turns turn where turn.id=target_turn_id and public.is_game_member(turn.game_id)) then raise exception 'forbidden'; end if;
  select * into current_turn from public.story_turns where id=target_turn_id for update;
  if current_turn.resolution_status='resolved' then return 'already_resolved'; end if;
  if (select count(*) from public.player_decisions where turn_id=target_turn_id)<>2 then return 'not_ready'; end if;
  update public.story_turns set resolution_status='claimed',resolution_claimed_at=now(),resolution_error=null where id=target_turn_id and resolution_status in ('open','failed');
  if not found then return 'already_claimed'; end if;
  select min(action_text),max(action_text) into first_action,second_action from public.player_decisions where turn_id=target_turn_id;
  select jsonb_object_agg(character.id,jsonb_build_array(
    jsonb_build_object('id',character.id||'-'||(current_turn.turn_number+1)||'-observe','label','Observer','description','Lire les signes discrets de la scène.'),
    jsonb_build_object('id',character.id||'-'||(current_turn.turn_number+1)||'-act','label','Agir','description','Prendre une initiative fidèle à ses valeurs.')
  )),jsonb_agg(character.id) into intentions,character_ids from public.characters character where character.game_id=current_turn.game_id;
  update public.story_turns set resolution_text='Tandis que l’un choisit de '||lower(first_action)||', l’autre décide de '||lower(second_action)||'. Leurs initiatives se rencontrent et révèlent une piste nouvelle sans refermer leurs possibilités.',resolution_status='resolved',resolved_at=now() where id=target_turn_id;
  update public.player_decisions set revealed_at=now() where turn_id=target_turn_id;
  insert into public.story_turns(game_id,turn_number,scene_text,location,scene_time,proposed_intentions)
  values(current_turn.game_id,current_turn.turn_number+1,'La conséquence de leurs choix transforme la situation. Un détail jusque-là invisible apparaît, et chacun reste libre de décider de la suite.',current_turn.location,'Tour '||(current_turn.turn_number+1),intentions)
  on conflict(game_id,turn_number) do nothing;
  insert into public.memories(game_id,type,importance,title,summary,involved_entity_ids,source_turn_id)
  select current_turn.game_id,'discovery',7,'La piste du tour '||current_turn.turn_number,'Les décisions combinées ont révélé une nouvelle piste.',character_ids,target_turn_id
  where not exists(select 1 from public.memories memory where memory.source_turn_id=target_turn_id and memory.title='La piste du tour '||current_turn.turn_number);
  update public.games set turn_number=current_turn.turn_number+1,current_phase='decision',resolution_attempts=0,current_turn_deadline=case when play_mode='realtime' then now()+make_interval(secs=>timer_seconds) else null end,updated_at=now() where id=current_turn.game_id;
  insert into public.audit_events(game_id,actor_id,event_type,details) values(current_turn.game_id,auth.uid(),'turn.resolved',jsonb_build_object('turn_id',target_turn_id,'provider','mock'));
  return 'resolved';
end $$;
revoke all on function public.resolve_ready_turn_mock(uuid) from public;
grant execute on function public.resolve_ready_turn_mock(uuid) to authenticated;
notify pgrst, 'reload schema';
