insert into public.profiles(id,display_name,created_at)
select user_account.id,coalesce(nullif(user_account.raw_user_meta_data->>'display_name',''),split_part(user_account.email,'@',1),'Voyageur'),user_account.created_at
from auth.users user_account on conflict(id) do nothing;

alter table public.games drop constraint if exists games_invite_code_check;
alter table public.games add constraint games_invite_code_check check(invite_code ~ '^[A-Z0-9]{5}-[A-Z0-9]{5}$');

create function public.create_game(game_title text,selected_play_mode public.play_mode,selected_timer_seconds int,world_definition jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare created_game_id uuid; generated_code text; account auth.users;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if length(trim(game_title)) not between 1 and 160 then raise exception 'invalid_title'; end if;
  if selected_play_mode='realtime' and (selected_timer_seconds is null or selected_timer_seconds not between 10 and 3600) then raise exception 'invalid_timer'; end if;
  if selected_play_mode='asynchronous' then selected_timer_seconds:=null; end if;
  if jsonb_typeof(world_definition)<>'object' then raise exception 'invalid_world'; end if;
  if (select count(*) from public.games game join public.game_players player on player.game_id=game.id where player.player_id=auth.uid() and game.status in ('waiting','character_creation','ready','active','paused'))>=20 then raise exception 'too_many_active_games'; end if;
  select * into account from auth.users where id=auth.uid();
  insert into public.profiles(id,display_name) values(account.id,coalesce(nullif(account.raw_user_meta_data->>'display_name',''),split_part(account.email,'@',1),'Voyageur')) on conflict(id) do nothing;
  loop
    generated_code:=upper(substr(encode(extensions.gen_random_bytes(6),'hex'),1,5)||'-'||substr(encode(extensions.gen_random_bytes(6),'hex'),1,5));
    exit when not exists(select 1 from public.games where invite_code=generated_code);
  end loop;
  insert into public.games(invite_code,owner_id,title,play_mode,timer_seconds,invite_expires_at) values(generated_code,auth.uid(),trim(game_title),selected_play_mode,selected_timer_seconds,now()+interval '7 days') returning id into created_game_id;
  insert into public.world_states(game_id,definition) values(created_game_id,world_definition);
  insert into public.audit_events(game_id,actor_id,event_type) values(created_game_id,auth.uid(),'game.created');
  return created_game_id;
end $$;
revoke all on function public.create_game(text,public.play_mode,int,jsonb) from public;
grant execute on function public.create_game(text,public.play_mode,int,jsonb) to authenticated;
