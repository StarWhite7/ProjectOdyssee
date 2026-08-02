begin;
-- Run with: supabase test db (after creating three Auth fixtures in a local stack).
-- These assertions are documented executable probes for the critical policies.
select plan(8);
select has_table('public','games','games exists');
select has_table('public','player_decisions','decisions exist');
select col_is_unique('public','player_decisions',array['turn_id','player_id'],'one decision per player and turn');
select policies_are('public','character_goals',array['goals_read_visible'],'private goal policy exists');
select policies_are('public','player_decisions',array['decisions_insert_own','decisions_read_secret'],'secret decision policies exist');
select function_privs_are('public','complete_turn_resolution',array['uuid','jsonb'],'service_role',array['EXECUTE'],'completion is server-only');
select function_privs_are('public','expire_due_turns',array[]::text[],'service_role',array['EXECUTE'],'timer expiration is server-only');
select function_returns('public','claim_turn_resolution',array['uuid'],'boolean','claim reports lock ownership');
select * from finish();
rollback;
