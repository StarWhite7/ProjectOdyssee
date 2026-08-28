create table if not exists public.game_world_settings (
  game_id uuid primary key references public.games(id) on delete cascade,
  preset text not null default 'classic_fantasy' check (preset in (
    'classic_fantasy','dark_fantasy','modern_fantasy','science_fiction','cyberpunk',
    'post_apocalyptic','real_life','historical','mystery_investigation','horror','custom'
  )),
  title text not null default '' check (length(title) <= 160),
  universe_type text not null default 'fantasy' check (universe_type in (
    'fantasy','modern_fantasy','science_fiction','cyberpunk','realistic_contemporary',
    'historical','post_apocalyptic','horror','steampunk','other'
  )),
  universe_custom text not null default '' check (length(universe_custom) <= 120),
  magic_level text not null default 'present' check (magic_level in (
    'none','rare','present','very_present','other'
  )),
  magic_custom text not null default '' check (length(magic_custom) <= 120),
  technology_level text not null default 'medieval' check (technology_level in (
    'primitive','medieval','industrial','modern','futuristic','very_advanced','other'
  )),
  technology_custom text not null default '' check (length(technology_custom) <= 120),
  atmospheres text[] not null default array['adventurous','epic']::text[] check (
    cardinality(atmospheres) between 1 and 3
    and atmospheres <@ array[
      'epic','adventurous','mysterious','light','dramatic','dark','horrific',
      'romantic','melancholic','humorous','other'
    ]::text[]
  ),
  atmosphere_custom text not null default '' check (length(atmosphere_custom) <= 120),
  narrative_pace text not null default 'balanced' check (narrative_pace in (
    'contemplative','balanced','dynamic'
  )),
  timer_mode text not null default 'none' check (timer_mode in ('none','timed')),
  timer_seconds int check (timer_seconds is null or timer_seconds between 120 and 3600),
  romance_level text not null default 'possible' check (romance_level in (
    'none','possible','important'
  )),
  player_death_level text not null default 'consequential' check (player_death_level in (
    'impossible','consequential','free'
  )),
  intimate_content_level text not null default 'fade_to_black' check (intimate_content_level in (
    'none','suggested','fade_to_black'
  )),
  desired_elements text[] not null default array['exploration','mysteries','creatures']::text[] check (
    cardinality(desired_elements) between 1 and 4
    and desired_elements <@ array[
      'exploration','mysteries','combats','puzzles','politics','relationships',
      'discoveries','survival','large_battles','creatures','magic','other'
    ]::text[]
  ),
  desired_elements_custom text not null default '' check (length(desired_elements_custom) <= 160),
  forbidden_elements text[] not null default array[]::text[] check (
    cardinality(forbidden_elements) <= 12
    and forbidden_elements <@ array[
      'graphic_violence','torture','horror','spiders_insects','illness','grief',
      'animal_violence','kidnapping','betrayal','harassment','other'
    ]::text[]
  ),
  forbidden_elements_custom text not null default '' check (length(forbidden_elements_custom) <= 160),
  world_logic text not null default 'coherent' check (world_logic in (
    'realistic','coherent','very_free'
  )),
  free_description text not null default '' check (length(free_description) <= 1200),
  allow_player2_edit boolean not null default false,
  locked_at timestamptz,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (timer_mode = 'none' and timer_seconds is null)
    or (timer_mode = 'timed' and timer_seconds between 120 and 3600)
  )
);

alter table public.game_world_settings enable row level security;
alter table public.game_world_settings replica identity full;

create or replace function public.create_default_game_world_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.game_world_settings(game_id, created_by)
    values (new.id, new.owner_id)
  on conflict (game_id) do nothing;
  return new;
end;
$$;

drop trigger if exists game_world_settings_create_default on public.games;
create trigger game_world_settings_create_default
after insert on public.games
for each row execute function public.create_default_game_world_settings();

insert into public.game_world_settings(game_id, created_by)
select game.id, game.owner_id
from public.games game
on conflict (game_id) do nothing;

create policy game_world_settings_read_member
on public.game_world_settings
for select
to authenticated
using (public.is_game_member(game_id));

grant select on table public.game_world_settings to authenticated;
grant select, insert, update on table public.game_world_settings to service_role;

create or replace function public.get_game_world_settings(target_game_id uuid)
returns public.game_world_settings
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_game public.games;
  settings public.game_world_settings;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select *
    into target_game
  from public.games game
  where game.id = target_game_id;

  if target_game.id is null then
    raise exception 'game_not_found';
  end if;

  if not public.is_game_member(target_game_id) then
    raise exception 'forbidden';
  end if;

  insert into public.game_world_settings(game_id, created_by)
    values (target_game_id, target_game.owner_id)
  on conflict (game_id) do nothing;

  select *
    into settings
  from public.game_world_settings
  where game_id = target_game_id;

  return settings;
end;
$$;

create or replace function public.save_game_world_settings(
  target_game_id uuid,
  selected_preset text,
  selected_title text,
  selected_universe_type text,
  selected_universe_custom text,
  selected_magic_level text,
  selected_magic_custom text,
  selected_technology_level text,
  selected_technology_custom text,
  selected_atmospheres text[],
  selected_atmosphere_custom text,
  selected_narrative_pace text,
  selected_timer_mode text,
  selected_timer_seconds int,
  selected_romance_level text,
  selected_player_death_level text,
  selected_intimate_content_level text,
  selected_desired_elements text[],
  selected_desired_elements_custom text,
  selected_forbidden_elements text[],
  selected_forbidden_elements_custom text,
  selected_world_logic text,
  selected_free_description text,
  selected_allow_player2_edit boolean
)
returns public.game_world_settings
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_game public.games;
  current_settings public.game_world_settings;
  updated_settings public.game_world_settings;
  is_host boolean;
  final_allow_player2_edit boolean;
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select *
    into target_game
  from public.games game
  where game.id = target_game_id
  for update;

  if target_game.id is null then
    raise exception 'game_not_found';
  end if;

  if not public.is_game_member(target_game_id) then
    raise exception 'forbidden';
  end if;

  insert into public.game_world_settings(game_id, created_by)
    values (target_game_id, target_game.owner_id)
  on conflict (game_id) do nothing;

  select *
    into current_settings
  from public.game_world_settings
  where game_id = target_game_id
  for update;

  if target_game.status not in ('waiting', 'character_creation', 'ready') or current_settings.locked_at is not null then
    raise exception 'world_settings_locked';
  end if;

  is_host := target_game.owner_id = current_user_id;
  if not is_host and not current_settings.allow_player2_edit then
    raise exception 'world_settings_read_only';
  end if;

  if not is_host and selected_allow_player2_edit is distinct from current_settings.allow_player2_edit then
    raise exception 'world_settings_permission_forbidden';
  end if;

  final_allow_player2_edit := case
    when is_host then coalesce(selected_allow_player2_edit, false)
    else current_settings.allow_player2_edit
  end;

  update public.game_world_settings
    set preset = selected_preset,
        title = trim(coalesce(selected_title, '')),
        universe_type = selected_universe_type,
        universe_custom = trim(coalesce(selected_universe_custom, '')),
        magic_level = selected_magic_level,
        magic_custom = trim(coalesce(selected_magic_custom, '')),
        technology_level = selected_technology_level,
        technology_custom = trim(coalesce(selected_technology_custom, '')),
        atmospheres = coalesce(selected_atmospheres, array[]::text[]),
        atmosphere_custom = trim(coalesce(selected_atmosphere_custom, '')),
        narrative_pace = selected_narrative_pace,
        timer_mode = selected_timer_mode,
        timer_seconds = case when selected_timer_mode = 'timed' then selected_timer_seconds else null end,
        romance_level = selected_romance_level,
        player_death_level = selected_player_death_level,
        intimate_content_level = selected_intimate_content_level,
        desired_elements = coalesce(selected_desired_elements, array[]::text[]),
        desired_elements_custom = trim(coalesce(selected_desired_elements_custom, '')),
        forbidden_elements = coalesce(selected_forbidden_elements, array[]::text[]),
        forbidden_elements_custom = trim(coalesce(selected_forbidden_elements_custom, '')),
        world_logic = selected_world_logic,
        free_description = trim(coalesce(selected_free_description, '')),
        allow_player2_edit = final_allow_player2_edit,
        updated_at = now()
  where game_id = target_game_id
  returning * into updated_settings;

  update public.games
    set title = case when updated_settings.title <> '' then updated_settings.title else title end,
        timer_seconds = updated_settings.timer_seconds,
        updated_at = now()
  where id = target_game_id;

  return updated_settings;
end;
$$;

create or replace function public.start_game_if_ready(target_game_id uuid) returns text
language plpgsql security definer set search_path='extensions' as $$
declare target_game public.games; character_count int; intentions jsonb;
begin
  if auth.uid() is null or not public.is_game_member(target_game_id) then raise exception 'forbidden'; end if;
  select * into target_game from public.games where id=target_game_id for update;
  if target_game.id is null then raise exception 'game_not_found'; end if;
  if target_game.status='active' then return 'already_started'; end if;
  select count(*) into character_count from public.characters where game_id=target_game_id and is_final;
  if character_count<>2 then return 'waiting_for_characters'; end if;

  insert into public.game_world_settings(game_id, created_by)
    values(target_game_id, target_game.owner_id)
  on conflict(game_id) do nothing;
  update public.game_world_settings
    set locked_at=coalesce(locked_at, now()),
        updated_at=now()
  where game_id=target_game_id;

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

revoke all on function public.create_default_game_world_settings() from public;
revoke all on function public.get_game_world_settings(uuid) from public;
revoke all on function public.save_game_world_settings(uuid,text,text,text,text,text,text,text,text,text[],text,text,text,int,text,text,text,text[],text,text[],text,text,text,boolean) from public;
revoke all on function public.start_game_if_ready(uuid) from public;
grant execute on function public.get_game_world_settings(uuid) to authenticated;
grant execute on function public.save_game_world_settings(uuid,text,text,text,text,text,text,text,text,text[],text,text,text,int,text,text,text,text[],text,text[],text,text,text,boolean) to authenticated;
grant execute on function public.start_game_if_ready(uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.game_world_settings;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

notify pgrst, 'reload schema';
