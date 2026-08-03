import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { runLoadContextStep } from './load-context-logging';

describe('loadContext query logging', () => {
  it('logs the step before a successful query', async () => {
    const logger = { log: vi.fn(), error: vi.fn() };

    await expect(
      runLoadContextStep(
        'world_states',
        () => Promise.resolve({ data: { game_id: 'game-1' }, error: null }),
        logger,
      ),
    ).resolves.toEqual({ game_id: 'game-1' });
    expect(logger.log).toHaveBeenCalledWith(
      JSON.stringify({ event: 'load_context_step', step: 'world_states' }),
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs only PostgREST diagnostic fields and immediately rethrows the same error', async () => {
    const logger = { log: vi.fn(), error: vi.fn() };
    const error = {
      code: '42501',
      message: 'permission denied for table memories',
      details: 'technical details',
      hint: 'technical hint',
    };

    await expect(
      runLoadContextStep('memories', () => Promise.resolve({ data: null, error }), logger),
    ).rejects.toBe(error);
    expect(logger.error).toHaveBeenCalledWith(
      JSON.stringify({
        event: 'load_context_failed',
        step: 'memories',
        errorCode: '42501',
        errorMessage: 'permission denied for table memories',
        details: 'technical details',
        hint: 'technical hint',
      }),
    );
  });

  it('covers every context query and keeps the admin client on the service-role key', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'supabase/functions/resolve-turn/index.ts'),
      'utf8',
    );
    for (const step of [
      'story_turns',
      'games',
      'world_states',
      'characters',
      'character_goals',
      'recent_turns',
      'memories',
      'narrative_summaries',
    ]) {
      expect(source).toContain(`runLoadContextStep('${step}'`);
    }
    expect(source).toMatch(
      /const admin = createClient\(\s*Deno\.env\.get\('SUPABASE_URL'\)!\s*,\s*Deno\.env\.get\('SUPABASE_SERVICE_ROLE_KEY'\)!/,
    );
  });
});
