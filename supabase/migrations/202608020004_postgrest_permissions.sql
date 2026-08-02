grant usage on schema public to authenticated;
grant select on table
  public.profiles,
  public.games,
  public.game_players,
  public.characters,
  public.world_states,
  public.character_goals,
  public.story_turns,
  public.player_decisions,
  public.memories,
  public.relationships,
  public.narrative_summaries
to authenticated;
grant insert,update,delete on table public.characters to authenticated;
grant insert on table public.player_decisions to authenticated;
grant execute on function public.create_game(text,public.play_mode,int,jsonb) to authenticated;
grant execute on function public.join_game_by_code(text) to authenticated;
grant execute on function public.claim_turn_resolution(uuid) to authenticated;

notify pgrst, 'reload schema';
