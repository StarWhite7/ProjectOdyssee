create function public.delete_game_for_all(target_game_id uuid) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked_game_id uuid;
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select game.id into locked_game_id
  from public.games game
  where game.id = target_game_id
  for update;

  if locked_game_id is null then
    return 'already_deleted';
  end if;

  if not exists (
    select 1 from public.game_players member
    where member.game_id = target_game_id
      and member.player_id = auth.uid()
      and member.abandoned_at is null
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  delete from public.audit_events event where event.game_id = target_game_id;
  delete from public.games game where game.id = target_game_id;
  return 'deleted';
end
$$;

revoke all on function public.delete_game_for_all(uuid) from public;
grant execute on function public.delete_game_for_all(uuid) to authenticated;

notify pgrst, 'reload schema';
