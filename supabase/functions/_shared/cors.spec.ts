import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  allowedCorsHeaders,
  allowedCorsOrigins,
  createCorsHeaders,
  handleCorsPreflight,
} from './cors';

describe('shared Edge Function CORS', () => {
  it('allows localhost and production origins without widening the origin', () => {
    expect(allowedCorsOrigins).toEqual([
      'http://localhost:4200',
      'https://projectodyssee.pages.dev',
    ]);
    expect(createCorsHeaders('http://localhost:4200')['Access-Control-Allow-Origin']).toBe(
      'http://localhost:4200',
    );
    expect(
      createCorsHeaders('https://projectodyssee.pages.dev')['Access-Control-Allow-Origin'],
    ).toBe('https://projectodyssee.pages.dev');
  });

  it('allows the official Supabase client headers without reflecting unknown origins', () => {
    const headers = createCorsHeaders(
      'https://attacker.example',
      'https://projectodyssee.pages.dev',
    );

    expect(headers['Access-Control-Allow-Origin']).toBe('https://projectodyssee.pages.dev');
    expect(headers['Access-Control-Allow-Headers']?.split(', ')).toEqual([
      'authorization',
      'apikey',
      'content-type',
      'x-client-info',
      'x-cron-secret',
    ]);
    expect(headers['Access-Control-Allow-Origin']).not.toBe('*');
    expect(headers['Access-Control-Allow-Origin']).not.toBe('https://attacker.example');
    expect(new Set(allowedCorsHeaders).size).toBe(allowedCorsHeaders.length);
  });

  it('falls back to the production origin when no allowlisted origin is available', () => {
    const headers = createCorsHeaders(undefined, 'https://attacker.example');

    expect(headers['Access-Control-Allow-Origin']).toBe('https://projectodyssee.pages.dev');
  });

  it('returns a complete 204 response for OPTIONS only', () => {
    const headers = createCorsHeaders('http://localhost:4200');
    const response = handleCorsPreflight(
      new Request('https://example.test', { method: 'OPTIONS' }),
      headers,
    );

    expect(response?.status).toBe(204);
    expect(response?.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:4200');
    expect(response?.headers.get('Access-Control-Allow-Headers')).toContain('x-client-info');
    expect(handleCorsPreflight(new Request('https://example.test'), headers)).toBeNull();
  });

  it.each(['resolve-turn', 'start-game', 'delete-account', 'expire-turns'])(
    'keeps %s on request-scoped shared CORS',
    (functionName) => {
      const source = readFileSync(
        resolve(process.cwd(), `supabase/functions/${functionName}/index.ts`),
        'utf8',
      );

      expect(source).toContain("from '../_shared/cors.ts'");
      expect(source).toContain('createCorsHeaders');
      expect(source).toContain("request.headers.get('Origin')");
      expect(source).toContain('handleCorsPreflight');
      expect(source).not.toContain("'Access-Control-Allow-Origin': '*'");
      expect(source).not.toContain("const cors = createCorsHeaders(Deno.env.get('APP_URL'))");
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

  it('keeps start-game CORS responses scoped to the current request', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'supabase/functions/start-game/index.ts'),
      'utf8',
    );

    expect(source).toContain("createCorsHeaders(request.headers.get('Origin')");
    expect(source).toContain("return response({ status: 'started' }, 200, cors)");
    expect(source).toContain("return response({ error: 'start_failed'");
  });
});
