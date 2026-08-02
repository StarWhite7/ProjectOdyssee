import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const auth = request.headers.get('Authorization');
  if (!auth) return json({ error: 'unauthorized' }, 401);
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: auth } } },
  );
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  try {
    const body = (await request.json()) as { turnId?: string };
    if (!body.turnId) return json({ error: 'turnId_required' }, 400);
    const { data: claimed, error: claimError } = await userClient.rpc('claim_turn_resolution', {
      target_turn_id: body.turnId,
    });
    if (claimError) throw claimError;
    if (!claimed) return json({ status: 'already_claimed_or_not_ready' }, 202);
    const { data: turn, error: turnError } = await admin
      .from('story_turns')
      .select('*, player_decisions(*)')
      .eq('id', body.turnId)
      .single();
    if (turnError) throw turnError;
    const decisions = (turn.player_decisions as Array<{ action_text: string }>).map(
      (d) => d.action_text,
    );
    const resolution = `Les deux initiatives se rejoignent : ${decisions.join(' tandis que ')}. Leur rencontre ouvre une piste nouvelle sans décider de leur prochain geste.`;
    const { error: updateError } = await admin
      .from('story_turns')
      .update({
        resolution_text: resolution,
        resolution_status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', body.turnId)
      .eq('resolution_status', 'claimed');
    if (updateError) throw updateError;
    await admin.from('audit_events').insert({
      game_id: turn.game_id,
      event_type: 'turn.resolved',
      details: { turn_id: body.turnId, provider: Deno.env.get('AI_PROVIDER') ?? 'mock' },
    });
    return json({ status: 'resolved', resolution });
  } catch (error) {
    return json(
      { error: 'resolution_failed', message: error instanceof Error ? error.message : 'unknown' },
      500,
    );
  }
});
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
