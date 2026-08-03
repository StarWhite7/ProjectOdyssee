import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { readAiConfiguration, resolveWithProvider } from './ai-provider.ts';
import { callGemini } from './gemini-client.ts';
import { buildMockResolutionNarration } from './mock-resolution.ts';
import { handleResolutionFailure } from './resolution-error.ts';
import { validateAndNormalizeResult } from './resolution-result.ts';
import type { ResolutionStage } from './resolution-error.ts';

const cors = createCorsHeaders(Deno.env.get('APP_URL'));

Deno.serve(async (request) => {
  const preflight = handleCorsPreflight(request, cors);
  if (preflight) return preflight;
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
  let turnId = '';
  let stage: ResolutionStage = 'claim';
  try {
    const body = (await request.json()) as { turnId?: string };
    turnId = body.turnId?.trim() ?? '';
    if (!/^[0-9a-f-]{36}$/i.test(turnId)) return json({ error: 'invalid_turn_id' }, 400);
    const { data: claimed, error: claimError } = await userClient.rpc('claim_turn_resolution', {
      target_turn_id: turnId,
    });
    if (claimError) throw claimError;
    if (!claimed) return json({ status: 'already_claimed_or_not_ready' }, 202);
    stage = 'load_context';
    const context = await loadContext(admin, turnId);
    stage = 'read_ai_configuration';
    const configuration = readAiConfiguration((name) => Deno.env.get(name));
    const characterIds = context.characters.map((character) => character.id);
    stage = 'generate_resolution';
    const generatedResult = await resolveWithProvider(configuration, context, {
      gemini: (geminiContext, model, apiKey) =>
        callGemini(geminiContext, characterIds, model, apiKey),
      mock: mockResolution,
    });
    stage = 'validate_result';
    const result = validateAndNormalizeResult(generatedResult, characterIds);
    stage = 'complete_resolution';
    const { data: nextTurnId, error: completionError } = await admin.rpc(
      'complete_turn_resolution',
      { target_turn_id: turnId, result },
    );
    if (completionError) throw completionError;
    return json({ status: 'resolved', nextTurnId });
  } catch (error) {
    return handleResolutionFailure(admin, turnId, error, cors, stage);
  }
});

async function loadContext(admin: ReturnType<typeof createClient>, turnId: string) {
  const { data: turn, error } = await admin
    .from('story_turns')
    .select('*,player_decisions(*)')
    .eq('id', turnId)
    .single();
  if (error) throw error;
  const [game, world, characters, goals, recentTurns, memories, summaries] = await Promise.all([
    admin.from('games').select('*').eq('id', turn.game_id).single(),
    admin.from('world_states').select('*').eq('game_id', turn.game_id).single(),
    admin.from('characters').select('*').eq('game_id', turn.game_id),
    admin.from('character_goals').select('*').eq('game_id', turn.game_id).eq('status', 'active'),
    admin
      .from('story_turns')
      .select('*')
      .eq('game_id', turn.game_id)
      .lt('turn_number', turn.turn_number)
      .order('turn_number', { ascending: false })
      .limit(Number(Deno.env.get('RECENT_TURNS_CONTEXT_COUNT') ?? 6)),
    admin
      .from('memories')
      .select('*')
      .eq('game_id', turn.game_id)
      .order('importance', { ascending: false })
      .limit(12),
    admin
      .from('narrative_summaries')
      .select('*')
      .eq('game_id', turn.game_id)
      .order('through_turn_number', { ascending: false })
      .limit(1),
  ]);
  for (const response of [game, world, characters, goals, recentTurns, memories, summaries])
    if (response.error) throw response.error;
  return {
    game: game.data,
    world: world.data,
    characters: characters.data ?? [],
    goals: goals.data ?? [],
    currentTurn: turn,
    decisions: turn.player_decisions ?? [],
    recentTurns: recentTurns.data ?? [],
    memories: memories.data ?? [],
    summary: summaries.data?.[0] ?? null,
  };
}

function mockResolution(context: Awaited<ReturnType<typeof loadContext>>) {
  const actions = context.decisions.map(
    (decision: { action_text: string }) => decision.action_text,
  );
  const next = Number(context.currentTurn.turn_number) + 1;
  return {
    resolutionNarration: buildMockResolutionNarration(actions),
    nextScene: {
      text: 'La conséquence de leurs choix transforme la situation. Un détail jusque-là invisible apparaît, et chacun reste libre de décider de la suite.',
      location: context.currentTurn.location,
      sceneTime: `Tour ${next}`,
    },
    proposedIntentions: Object.fromEntries(
      context.characters.map((character: { id: string }) => [
        character.id,
        [
          {
            id: `${character.id}-${next}-observe`,
            label: 'Observer',
            description: 'Lire les signes discrets de la scène.',
          },
          {
            id: `${character.id}-${next}-act`,
            label: 'Agir',
            description: 'Prendre une initiative fidèle à ses valeurs.',
          },
        ],
      ]),
    ),
    memoryCandidates: [
      {
        type: 'discovery',
        importance: 7,
        title: `La piste du tour ${context.currentTurn.turn_number}`,
        summary: 'Les décisions combinées ont révélé une nouvelle piste.',
        involvedCharacterIds: context.characters.map((character: { id: string }) => character.id),
      },
    ],
    relationshipChanges: [],
    worldChanges: [],
    goalChanges: [],
  };
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
