export type LoadContextStep =
  | 'story_turns'
  | 'games'
  | 'world_states'
  | 'game_world_settings'
  | 'characters'
  | 'character_goals'
  | 'recent_turns'
  | 'memories'
  | 'narrative_summaries';

type QueryResult<T> = { data: T; error: unknown };
type Logger = Pick<Console, 'log' | 'error'>;

export async function runLoadContextStep<T>(
  step: LoadContextStep,
  query: () => PromiseLike<QueryResult<T>>,
  logger: Logger = console,
): Promise<T> {
  logger.log(JSON.stringify({ event: 'load_context_step', step }));
  let result: QueryResult<T>;
  try {
    result = await query();
  } catch (error) {
    logFailure(logger, step, error);
    throw error;
  }
  if (result.error) {
    logFailure(logger, step, result.error);
    throw result.error;
  }
  return result.data;
}

function logFailure(logger: Logger, step: LoadContextStep, error: unknown): void {
  const record = isRecord(error) ? error : {};
  logger.error(
    JSON.stringify({
      event: 'load_context_failed',
      step,
      errorCode: stringOrNull(record['code']),
      errorMessage: error instanceof Error ? error.message : stringOrNull(record['message']),
      details: stringOrNull(record['details']),
      hint: stringOrNull(record['hint']),
    }),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}
