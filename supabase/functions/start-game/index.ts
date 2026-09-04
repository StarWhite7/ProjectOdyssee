import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { AiConfigurationError, readAiConfiguration } from '../resolve-turn/ai-provider.ts';
import { buildOpeningGameContext } from '../resolve-turn/game-context.ts';
import { GeminiResponseError } from '../resolve-turn/gemini-client.ts';
import { GeminiApiError } from '../resolve-turn/gemini-error.ts';
import { generateOpeningTurn, OpeningTurnValidationError } from './opening-turn.ts';

type StartGameStage =
  | 'parse_request'
  | 'check_visibility'
  | 'load_game'
  | 'load_characters'
  | 'load_existing_turn'
  | 'load_opening_context'
  | 'ensure_world_settings'
  | 'read_ai_configuration'
  | 'generate_opening'
  | 'insert_opening_turn'
  | 'insert_initial_goals'
  | 'lock_world_settings'
  | 'activate_game'
  | 'audit_event';

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
  let stage: StartGameStage = 'parse_request';
  try {
    const { gameId } = (await request.json()) as { gameId?: string };
    if (!gameId) return response({ error: 'game_id_required' }, 400, cors);
    stage = 'check_visibility';
    const { data: visible, error: visibilityError } = await user
      .from('games')
      .select('id')
      .eq('id', gameId)
      .single();
    if (visibilityError || !visible) return response({ error: 'forbidden' }, 403, cors);
    stage = 'load_game';
    const { data: game, error: gameError } = await admin
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();
    if (gameError) throw gameError;
    if (game.status === 'active') return response({ status: 'already_started' }, 200, cors);
    stage = 'load_characters';
    const { data: characters, error: charactersError } = await admin
      .from('characters')
      .select('*')
      .eq('game_id', gameId)
      .eq('is_final', true);
    if (charactersError) throw charactersError;
    if (characters.length !== 2) return response({ status: 'waiting_for_characters' }, 202, cors);
    stage = 'load_existing_turn';
    const { data: existing } = await admin
      .from('story_turns')
      .select('id')
      .eq('game_id', gameId)
      .eq('turn_number', 1)
      .maybeSingle();
    if (!existing) {
      stage = 'load_opening_context';
      const [
        { data: world, error: worldError },
        settingsResult,
        { data: goals, error: goalsError },
      ] = await Promise.all([
        admin.from('world_states').select('*').eq('game_id', gameId).maybeSingle(),
        admin.from('game_world_settings').select('*').eq('game_id', gameId).maybeSingle(),
        admin.from('character_goals').select('*').eq('game_id', gameId).eq('status', 'active'),
      ]);
      if (worldError) throw worldError;
      if (settingsResult.error) throw settingsResult.error;
      if (goalsError) throw goalsError;
      let worldSettings = settingsResult.data;
      if (!worldSettings) {
        stage = 'ensure_world_settings';
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
      stage = 'read_ai_configuration';
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
      stage = 'generate_opening';
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
      stage = 'insert_opening_turn';
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
        stage = 'insert_initial_goals';
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
    stage = 'lock_world_settings';
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
    stage = 'activate_game';
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
    stage = 'audit_event';
    const { error: auditError } = await admin
      .from('audit_events')
      .insert({ game_id: gameId, event_type: 'game.started' });
    if (auditError) throw auditError;
    return response({ status: 'started' }, 200, cors);
  } catch (error) {
    const failure = classifyStartGameError(error);
    console.error(
      JSON.stringify({
        event: 'start_game_failed',
        stage,
        errorName: failure.errorName,
        errorCode: failure.code,
        retryable: failure.retryable,
      }),
    );
    return response(
      {
        error: failure.error,
        code: failure.code,
        stage,
        retryable: failure.retryable,
        message: failure.message,
      },
      failure.status,
      cors,
    );
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

function classifyStartGameError(error: unknown): {
  error: string;
  errorName: string;
  code: string;
  status: number;
  retryable: boolean;
  message: string;
} {
  if (error instanceof GeminiApiError) {
    return {
      error: error.retryable ? 'ai_temporarily_unavailable' : 'ai_generation_failed',
      errorName: error.name,
      code: error.code,
      status: error.retryable ? error.status : 502,
      retryable: error.retryable,
      message: error.retryable
        ? 'Le moteur narratif est momentanément indisponible. Réessayez dans quelques instants.'
        : 'Le moteur narratif n’a pas pu générer l’ouverture de l’aventure.',
    };
  }
  if (error instanceof AiConfigurationError) {
    return {
      error: 'ai_configuration_error',
      errorName: error.name,
      code: error.code,
      status: 500,
      retryable: false,
      message: 'Le moteur narratif est mal configuré.',
    };
  }
  if (error instanceof GeminiResponseError || error instanceof OpeningTurnValidationError) {
    return {
      error: 'ai_generation_failed',
      errorName: error.name,
      code: error.code,
      status: 502,
      retryable: false,
      message: 'Le moteur narratif n’a pas fourni une ouverture exploitable.',
    };
  }
  if (isRecord(error) && isSafeTechnicalCode(error['code'])) {
    return {
      error: 'start_failed',
      errorName: 'PostgrestError',
      code: error['code'],
      status: 500,
      retryable: false,
      message: 'Impossible de démarrer l’aventure.',
    };
  }
  return {
    error: 'start_failed',
    errorName: error instanceof Error ? error.name : 'UnknownError',
    code: 'unexpected_start_game_error',
    status: 500,
    retryable: false,
    message: 'Impossible de démarrer l’aventure.',
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isSafeTechnicalCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z0-9_]{2,64}$/i.test(value);
}
