grant usage on schema public to service_role;

grant select on table
  public.story_turns,
  public.player_decisions,
  public.games,
  public.world_states,
  public.characters,
  public.character_goals,
  public.memories,
  public.narrative_summaries
to service_role;

grant insert,update on table
  public.story_turns,
  public.player_decisions,
  public.memories,
  public.games,
  public.audit_events
to service_role;

grant usage,select on sequence public.audit_events_id_seq to service_role;
