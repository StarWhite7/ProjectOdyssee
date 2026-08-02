create or replace function public.resolve_ready_turn_mock(target_turn_id uuid) returns text
language plpgsql security definer set search_path='extensions' as $$
declare
  current_turn public.story_turns; first_action text; second_action text; intentions jsonb; character_ids jsonb;
  next_number int; variant int; next_scene text; next_location text; resolution text;
  first_label text; first_description text; second_label text; second_description text;
begin
  if auth.uid() is null or not exists(select 1 from public.story_turns turn where turn.id=target_turn_id and public.is_game_member(turn.game_id)) then raise exception 'forbidden'; end if;
  select * into current_turn from public.story_turns where id=target_turn_id for update;
  if current_turn.resolution_status='resolved' then return 'already_resolved'; end if;
  if (select count(*) from public.player_decisions where turn_id=target_turn_id)<>2 then return 'not_ready'; end if;
  update public.story_turns set resolution_status='claimed',resolution_claimed_at=now(),resolution_error=null where id=target_turn_id and resolution_status in ('open','failed');
  if not found then return 'already_claimed'; end if;
  select min(action_text),max(action_text) into first_action,second_action from public.player_decisions where turn_id=target_turn_id;
  next_number:=current_turn.turn_number+1; variant:=((next_number-1)%6)+1;
  resolution:=case variant
    when 1 then 'Les deux décisions se croisent : l’une consiste à '||lower(first_action)||', tandis que l’autre tente de '||lower(second_action)||'. Un indice concret émerge de leur synchronisation, mais son interprétation reste ouverte.'
    when 2 then 'En choisissant de '||lower(first_action)||' et de '||lower(second_action)||', les personnages déplacent l’équilibre de la situation. Leur initiative attire une réponse inattendue du monde qui les entoure.'
    when 3 then 'L’action de '||lower(first_action)||' rencontre celle de '||lower(second_action)||'. Elles ne s’annulent pas : la première ouvre un passage, la seconde révèle le prix qu’il faudra peut-être payer.'
    when 4 then 'Tandis que l’un décide de '||lower(first_action)||', l’autre préfère '||lower(second_action)||'. Cette différence fait apparaître une vérité dissimulée et modifie subtilement leur relation.'
    when 5 then 'Le choix de '||lower(first_action)||' provoque un mouvement dans la scène. Celui de '||lower(second_action)||' en change la portée : une présence jusque-là silencieuse se manifeste.'
    else 'Leurs décisions — '||lower(first_action)||' et '||lower(second_action)||' — produisent un résultat partiel. Ils progressent, mais la situation acquiert une nouvelle complexité qu’ils devront interpréter.' end;
  next_scene:=case variant
    when 1 then 'Une transmission fragmentée traverse soudain les appareils alentour. Entre les parasites, une voix prononce un nom connu de l’un des personnages, puis indique un rendez-vous avant de disparaître.'
    when 2 then 'Au-delà d’une porte que personne n’avait remarquée, un espace abandonné conserve les traces d’un passage récent. Quelqu’un y a laissé un objet à leur intention, accompagné d’un avertissement ambigu.'
    when 3 then 'La foule et les lumières changent de rythme lorsqu’une silhouette les observe puis s’éloigne. Elle ne semble pas fuir : elle vérifie qu’ils ont compris qu’ils doivent la suivre.'
    when 4 then 'Un témoin accepte enfin de parler, mais exige une preuve de confiance avant de révéler ce qu’il sait. Son récit pourrait rapprocher les personnages ou mettre leurs valeurs à l’épreuve.'
    when 5 then 'Le lieu se met en mouvement autour d’eux : accès condamnés, signaux interrompus, présences qui convergent. Une issue demeure possible, à condition de choisir ce qu’ils refusent d’abandonner.'
    else 'Le calme revient avec une étrangeté nouvelle. Sur une surface restée intacte apparaît une carte incomplète, marquée de deux chemins et d’un symbole lié à leurs découvertes précédentes.' end;
  next_location:=case variant when 1 then 'Relais des communications' when 2 then 'Archive oubliée' when 3 then 'Passage des veilleurs' when 4 then 'Refuge du témoin' when 5 then 'Secteur en quarantaine' else 'Carrefour des traces' end;
  first_label:=case variant when 1 then 'Décoder la transmission' when 2 then 'Examiner l’objet' when 3 then 'Suivre la silhouette' when 4 then 'Offrir une preuve' when 5 then 'Chercher une issue' else 'Étudier la carte' end;
  first_description:=case variant when 1 then 'Isoler les fragments utiles et chercher qui connaît ce nom.' when 2 then 'Relever les marques, l’origine et les risques avant de le toucher.' when 3 then 'Garder la silhouette en vue sans révéler toutes ses intentions.' when 4 then 'Choisir un geste sincère capable de gagner la confiance du témoin.' when 5 then 'Lire les mouvements du lieu pour trouver un passage encore praticable.' else 'Comparer les chemins aux souvenirs et indices déjà réunis.' end;
  second_label:=case variant when 1 then 'Remonter le signal' when 2 then 'Questionner les alentours' when 3 then 'Préparer une diversion' when 4 then 'Négocier autrement' when 5 then 'Protéger l’essentiel' else 'Interroger le symbole' end;
  second_description:=case variant when 1 then 'Chercher la source avant que la connexion ne soit définitivement coupée.' when 2 then 'Identifier qui est passé ici et pourquoi l’objet a été laissé.' when 3 then 'Créer une occasion d’approcher sans tomber dans un piège évident.' when 4 then 'Obtenir une première information sans céder immédiatement à l’exigence.' when 5 then 'Décider ce qui doit être sauvé si tout ne peut pas l’être.' else 'Comprendre à quoi le symbole renvoie dans ce monde.' end;
  select jsonb_object_agg(character.id,jsonb_build_array(
    jsonb_build_object('id',character.id||'-'||next_number||'-a','label',first_label,'description',first_description),
    jsonb_build_object('id',character.id||'-'||next_number||'-b','label',second_label,'description',second_description)
  )),jsonb_agg(character.id) into intentions,character_ids from public.characters character where character.game_id=current_turn.game_id;
  update public.story_turns set resolution_text=resolution,resolution_status='resolved',resolved_at=now() where id=target_turn_id;
  update public.player_decisions set revealed_at=now() where turn_id=target_turn_id;
  insert into public.story_turns(game_id,turn_number,scene_text,location,scene_time,proposed_intentions)
  values(current_turn.game_id,next_number,next_scene,next_location,'Séquence '||next_number,intentions) on conflict(game_id,turn_number) do nothing;
  insert into public.memories(game_id,type,importance,title,summary,involved_entity_ids,source_turn_id)
  select current_turn.game_id,'discovery',least(10,5+(next_number%4)),'Conséquence du tour '||current_turn.turn_number,resolution,character_ids,target_turn_id
  where not exists(select 1 from public.memories memory where memory.source_turn_id=target_turn_id and memory.title='Conséquence du tour '||current_turn.turn_number);
  update public.games set turn_number=next_number,current_phase='decision',resolution_attempts=0,current_turn_deadline=case when play_mode='realtime' then now()+make_interval(secs=>timer_seconds) else null end,updated_at=now() where id=current_turn.game_id;
  insert into public.audit_events(game_id,actor_id,event_type,details) values(current_turn.game_id,auth.uid(),'turn.resolved',jsonb_build_object('turn_id',target_turn_id,'provider','mock','variant',variant));
  return 'resolved';
end $$;

-- Upgrade open scenes produced by the original repetitive Mock template.
update public.story_turns turn set
  scene_text=case (turn.turn_number%6) when 0 then 'Une transmission fragmentée traverse les appareils alentour et prononce un nom connu.' when 1 then 'Une archive oubliée conserve les traces d’un passage récent et un objet laissé à leur intention.' when 2 then 'Une silhouette les observe avant de s’éloigner vers un passage animé.' when 3 then 'Un témoin accepte de parler à condition de recevoir une preuve de confiance.' when 4 then 'Le secteur se referme autour d’eux, mais une issue demeure accessible.' else 'Une carte incomplète révèle deux chemins marqués d’un symbole familier.' end,
  location=case (turn.turn_number%6) when 0 then 'Relais des communications' when 1 then 'Archive oubliée' when 2 then 'Passage des veilleurs' when 3 then 'Refuge du témoin' when 4 then 'Secteur en quarantaine' else 'Carrefour des traces' end,
  proposed_intentions=(select jsonb_object_agg(character.id,jsonb_build_array(
    jsonb_build_object('id',character.id||'-'||turn.turn_number||'-explore','label','Explorer la nouvelle piste','description','Agir sur les éléments concrets révélés par la scène.'),
    jsonb_build_object('id',character.id||'-'||turn.turn_number||'-connect','label','Questionner et relier','description','Chercher un lien avec les personnages, objectifs et souvenirs précédents.')
  )) from public.characters character where character.game_id=turn.game_id)
where turn.resolution_status='open' and turn.turn_number>1 and turn.scene_text like 'La conséquence de leurs choix transforme la situation%';

notify pgrst, 'reload schema';
