create function public.get_turn_submission_status(target_turn_id uuid)
returns table(player_id uuid,submitted boolean)
language plpgsql security definer set search_path='extensions' as $$
declare target_game_id uuid;
begin
  select turn.game_id into target_game_id from public.story_turns turn where turn.id=target_turn_id;
  if target_game_id is null then raise exception 'turn_not_found'; end if;
  if auth.uid() is null or not public.is_game_member(target_game_id) then raise exception 'forbidden'; end if;
  return query
  select member.player_id,exists(
    select 1 from public.player_decisions decision
    where decision.turn_id=target_turn_id and decision.player_id=member.player_id
  )
  from public.game_players member
  where member.game_id=target_game_id and member.abandoned_at is null;
end $$;
revoke all on function public.get_turn_submission_status(uuid) from public;
grant execute on function public.get_turn_submission_status(uuid) to authenticated;
notify pgrst, 'reload schema';
