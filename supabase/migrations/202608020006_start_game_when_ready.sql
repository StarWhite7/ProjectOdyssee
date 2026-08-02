create function public.start_game_if_ready(target_game_id uuid) returns text
language plpgsql security definer set search_path='extensions' as $$
declare target_game public.games; character_count int; intentions jsonb;
begin
  if auth.uid() is null or not public.is_game_member(target_game_id) then raise exception 'forbidden'; end if;
  select * into target_game from public.games where id=target_game_id for update;
  if target_game.id is null then raise exception 'game_not_found'; end if;
  if target_game.status='active' then return 'already_started'; end if;
  select count(*) into character_count from public.characters where game_id=target_game_id and is_final;
  if character_count<>2 then return 'waiting_for_characters'; end if;

  select jsonb_object_agg(character.id,jsonb_build_array(
    jsonb_build_object('id',character.id||'-1-observe','label','Observer les détails','description','Lire les signes discrets de la scène.'),
    jsonb_build_object('id',character.id||'-1-act','label','Prendre l’initiative','description','Agir directement selon ses valeurs.')
  )) into intentions from public.characters character where character.game_id=target_game_id and character.is_final;

  insert into public.story_turns(game_id,turn_number,scene_text,location,scene_time,proposed_intentions)
  values(target_game_id,1,'Le monde retient son souffle. Un message inattendu vient de relier les deux personnages, mais son origine reste incertaine.','Le seuil de l’aventure','Premier soir',intentions)
  on conflict(game_id,turn_number) do nothing;
  insert into public.character_goals(game_id,character_id,visibility,category,description)
  select target_game_id,character.id,'private',case when row_number() over(order by character.created_at)=1 then 'exploration' else 'relational' end,
    case when row_number() over(order by character.created_at)=1 then 'Découvrir la vérité sans sacrifier vos valeurs.' else 'Comprendre ce que votre partenaire ne parvient pas encore à dire.' end
  from public.characters character where character.game_id=target_game_id and character.is_final
  and not exists(select 1 from public.character_goals goal where goal.game_id=target_game_id and goal.character_id=character.id);
  update public.games set status='active',turn_number=1,current_phase='decision',current_turn_deadline=case when play_mode='realtime' then now()+make_interval(secs=>timer_seconds) else null end,updated_at=now() where id=target_game_id;
  insert into public.audit_events(game_id,actor_id,event_type) values(target_game_id,auth.uid(),'game.started');
  return 'started';
end $$;
revoke all on function public.start_game_if_ready(uuid) from public;
grant execute on function public.start_game_if_ready(uuid) to authenticated;
notify pgrst, 'reload schema';
