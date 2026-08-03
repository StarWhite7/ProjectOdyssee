import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

const cors = createCorsHeaders(Deno.env.get('APP_URL'));
Deno.serve(async (request) => {
  const preflight = handleCorsPreflight(request, cors);
  if (preflight) return preflight;
  const authorization = request.headers.get('Authorization');
  if (!authorization) return response({ error: 'unauthorized' }, 401);
  const user = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
  });
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  try {
    const { gameId } = (await request.json()) as { gameId?: string };
    if (!gameId) return response({ error: 'game_id_required' }, 400);
    const { data: visible, error: visibilityError } = await user
      .from('games')
      .select('id')
      .eq('id', gameId)
      .single();
    if (visibilityError || !visible) return response({ error: 'forbidden' }, 403);
    const { data: game, error: gameError } = await admin
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();
    if (gameError) throw gameError;
    if (game.status === 'active') return response({ status: 'already_started' });
    const { data: characters, error: charactersError } = await admin
      .from('characters')
      .select('*')
      .eq('game_id', gameId)
      .eq('is_final', true);
    if (charactersError) throw charactersError;
    if (characters.length !== 2) return response({ status: 'waiting_for_characters' }, 202);
    const { data: existing } = await admin
      .from('story_turns')
      .select('id')
      .eq('game_id', gameId)
      .eq('turn_number', 1)
      .maybeSingle();
    if (!existing) {
      const intentions = Object.fromEntries(
        characters.map((character) => [
          character.id,
          [
            {
              id: `${character.id}-1-observe`,
              label: 'Observer les détails',
              description: 'Lire les signes discrets de la scène.',
            },
            {
              id: `${character.id}-1-act`,
              label: 'Prendre l’initiative',
              description: 'Agir directement selon ses valeurs.',
            },
          ],
        ]),
      );
      const { error: turnError } = await admin.from('story_turns').insert({
        game_id: gameId,
        turn_number: 1,
        scene_text:
          'Le monde retient son souffle. Un message inattendu vient de relier les deux personnages, mais son origine reste incertaine.',
        location: 'Le seuil de l’aventure',
        scene_time: 'Premier soir',
        proposed_intentions: intentions,
      });
      if (turnError) throw turnError;
      const { error: goalsError } = await admin.from('character_goals').insert(
        characters.map((character, index) => ({
          game_id: gameId,
          character_id: character.id,
          visibility: 'private',
          category: index ? 'relational' : 'exploration',
          description: index
            ? 'Comprendre ce que votre partenaire ne parvient pas encore à dire.'
            : 'Découvrir la vérité sans sacrifier vos valeurs.',
        })),
      );
      if (goalsError) throw goalsError;
    }
    const deadline =
      game.play_mode === 'realtime'
        ? new Date(Date.now() + Number(game.timer_seconds) * 1000).toISOString()
        : null;
    const { error: updateError } = await admin
      .from('games')
      .update({
        status: 'active',
        turn_number: 1,
        current_phase: 'decision',
        current_turn_deadline: deadline,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId)
      .neq('status', 'active');
    if (updateError) throw updateError;
    await admin.from('audit_events').insert({ game_id: gameId, event_type: 'game.started' });
    return response({ status: 'started' });
  } catch (error) {
    return response(
      { error: 'start_failed', message: error instanceof Error ? error.message : 'unknown' },
      500,
    );
  }
});
function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
