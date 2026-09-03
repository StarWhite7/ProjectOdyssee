import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { readAiConfiguration } from '../resolve-turn/ai-provider.ts';
import { buildOpeningGameContext } from '../resolve-turn/game-context.ts';
import { generateOpeningTurn } from './opening-turn.ts';

Deno.serve(async (request) => {
  const cors = createCorsHeaders(
    request.headers.get('Origin'),
    Deno.env.get('APP_URL'),
    Deno.env.get('CORS_ALLOWED_ORIGINS'),
  );
  const preflight = handleCorsPreflight(request, cors);
  if (preflight) return preflight;
  const authorization = request.headers.get('Authorization');
  if (!authorization) return response({ error: 'unauthorized' }, 401, cors);
  const user = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
  });
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  try {
    const { gameId } = (await request.json()) as { gameId?: string };
    if (!gameId) return response({ error: 'game_id_required' }, 400, cors);
    const { data: visible, error: visibilityError } = await user
      .from('games')
      .select('id')
      .eq('id', gameId)
      .single();
    if (visibilityError || !visible) return response({ error: 'forbidden' }, 403, cors);
    const { data: game, error: gameError } = await admin
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();
    if (gameError) throw gameError;
    if (game.status === 'active') return response({ status: 'already_started' }, 200, cors);
    const { data: characters, error: charactersError } = await admin
      .from('characters')
      .select('*')
      .eq('game_id', gameId)
      .eq('is_final', true);
    if (charactersError) throw charactersError;
    if (characters.length !== 2) return response({ status: 'waiting_for_characters' }, 202, cors);
    const { data: existing } = await admin
      .from('story_turns')
      .select('id')
      .eq('game_id', gameId)
      .eq('turn_number', 1)
      .maybeSingle();
    if (!existing) {
      const [{ data: world }, settingsResult, { data: goals }] = await Promise.all([
        admin.from('world_states').select('*').eq('game_id', gameId).maybeSingle(),
        admin.from('game_world_settings').select('*').eq('game_id', gameId).maybeSingle(),
        admin.from('character_goals').select('*').eq('game_id', gameId).eq('status', 'active'),
      ]);
      let worldSettings = settingsResult.data;
      if (!worldSettings) {
        const { data: createdSettings, error: settingsError } = await admin
          .from('game_world_settings')
          .insert({ game_id: gameId, created_by: game.owner_id })
          .select('*')
          .single();
        if (settingsError) throw settingsError;
        worldSettings = createdSettings;
      }
      const openingContext = buildOpeningGameContext({
        game,
        world,
        worldSettings,
        characters,
        goals: goals ?? [],
      });
      const configuration = readAiConfiguration((name) => Deno.env.get(name));
      debugStartGame({
        event: 'start_game_opening_generation',
        gameId,
        provider: configuration.provider,
        model: configuration.provider === 'gemini' ? configuration.model : null,
        hasWorldSettings: Boolean(worldSettings),
        preset: worldSettings?.preset ?? null,
        universeType: worldSettings?.universe_type ?? null,
        characterCount: characters.length,
        callsGemini: configuration.provider === 'gemini',
        usesFallback: false,
      });
      const opening = await generateOpeningTurn(
        configuration,
        openingContext,
        characters.map((character) => character.id),
      );
      debugStartGame({
        event: 'start_game_opening_generated',
        gameId,
        provider: configuration.provider,
        receivedAiResponse: true,
      });
      const { error: turnError } = await admin.from('story_turns').insert({
        game_id: gameId,
        turn_number: 1,
        scene_text: opening.sceneText,
        location: opening.location,
        scene_time: opening.sceneTime,
        proposed_intentions: opening.proposedIntentions,
      });
      if (turnError && turnError.code !== '23505') throw turnError;
      if (!turnError) {
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
    }
    const { error: lockError } = await admin
      .from('game_world_settings')
      .update({ locked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('game_id', gameId)
      .is('locked_at', null);
    if (lockError) throw lockError;
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
    return response({ status: 'started' }, 200, cors);
  } catch (error) {
    console.error(error);
    return response({ error: 'start_failed', message: 'Unable to start game.' }, 500, cors);
  }
});
function response(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function debugStartGame(details: Record<string, unknown>): void {
  if (Deno.env.get('START_GAME_DEBUG') !== 'true') return;
  console.log(JSON.stringify(details));
}
