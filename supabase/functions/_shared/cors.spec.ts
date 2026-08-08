import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { allowedCorsHeaders, createCorsHeaders, handleCorsPreflight } from './cors';

describe('shared Edge Function CORS', () => {
  it('allows the official Supabase client headers without widening the origin', () => {
    const headers = createCorsHeaders('https://projectodyssee.pages.dev');

    expect(headers['Access-Control-Allow-Origin']).toBe('https://projectodyssee.pages.dev');
    expect(headers['Access-Control-Allow-Headers']?.split(', ')).toEqual([
      'authorization',
      'apikey',
      'content-type',
      'x-client-info',
      'x-cron-secret',
    ]);
    expect(headers['Access-Control-Allow-Origin']).not.toBe('*');
    expect(new Set(allowedCorsHeaders).size).toBe(allowedCorsHeaders.length);
  });

  it('returns a complete 204 response for OPTIONS only', () => {
    const headers = createCorsHeaders('https://projectodyssee.pages.dev');
    const response = handleCorsPreflight(
      new Request('https://example.test', { method: 'OPTIONS' }),
      headers,
    );

    expect(response?.status).toBe(204);
    expect(response?.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://projectodyssee.pages.dev',
    );
    expect(response?.headers.get('Access-Control-Allow-Headers')).toContain('x-client-info');
    expect(handleCorsPreflight(new Request('https://example.test'), headers)).toBeNull();
  });

  it.each(['resolve-turn', 'start-game', 'expire-turns'])(
    'keeps %s on the shared CORS implementation',
    (functionName) => {
      const source = readFileSync(
        resolve(process.cwd(), `supabase/functions/${functionName}/index.ts`),
        'utf8',
      );

      expect(source).toContain("from '../_shared/cors.ts'");
      expect(source).toContain('createCorsHeaders');
      expect(source).toContain('handleCorsPreflight');
      expect(source).not.toContain("'Access-Control-Allow-Origin': '*'");
    },
  );

  it('does not expose raw internal errors from targeted Edge Functions', () => {
    for (const functionName of ['start-game', 'expire-turns']) {
      const source = readFileSync(
        resolve(process.cwd(), `supabase/functions/${functionName}/index.ts`),
        'utf8',
      );

      expect(source).toContain('console.error(error)');
      expect(source).not.toContain('error.message');
    }
  });

  it('keeps obvious start-game reads scoped to required columns', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'supabase/functions/start-game/index.ts'),
      'utf8',
    );

    expect(source).toContain(".select('status,play_mode,timer_seconds')");
    expect(source).toContain(".select('id')");
    expect(source).not.toContain(".select('*')");
  });
});
