import { describe, expect, it, vi } from 'vitest';
import type { GeminiApiError } from './gemini-error';
import { callGemini, GeminiResponseError, parseGeminiJson } from './gemini-client';

const payload = (text: string) => ({ candidates: [{ content: { parts: [{ text }] } }] });
const logger = () => ({ log: vi.fn(), error: vi.fn() });

describe('Gemini client', () => {
  it('posts the expected request and parses a successful JSON result', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload('{"resolutionNarration":"ok"}')), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const logs = logger();

    await expect(
      callGemini(
        { safe: 'context' },
        ['character-1', 'character-2'],
        'gemini/test model',
        'secret/key',
        fetcher,
        logs,
      ),
    ).resolves.toEqual({ resolutionNarration: 'ok' });
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, request] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/models/gemini%2Ftest%20model:generateContent?key=secret%2Fkey');
    expect(request).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(request.body).toContain('system_instruction');
    expect(request.body).toContain('responseMimeType');
    expect(request.body).toContain('expectedCharacterIds');
    expect(request.body).toContain('character-1');
    expect(logs.log.mock.calls.flat().join(' ')).toContain('gemini_request_succeeded');
  });

  it('sends foundational world settings inside gameData for every generation', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload('{"resolutionNarration":"ok"}')), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await callGemini(
      {
        foundationalWorldRules:
          'universe_type: cyberpunk\nmagic_level: none\nforbidden_elements: torture',
      },
      ['character-1'],
      'gemini-2.5-flash',
      'key',
      fetcher,
      logger(),
    );

    const [, request] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(request.body).toContain('foundationalWorldRules');
    expect(request.body).toContain('universe_type');
    expect(request.body).toContain('magic_level');
    expect(request.body).toContain('forbidden_elements');
    expect(request.body).toContain('torture');
  });

  it('accepts a single Markdown JSON fence', () => {
    expect(parseGeminiJson('```json\n{"value":1}\n```')).toEqual({ value: 1 });
  });

  it('rejects empty, non-JSON and truncated successful responses', async () => {
    for (const text of ['', '{"value":']) {
      const responsePayload = text ? payload(text) : { candidates: [] };
      const request = callGemini(
        {},
        ['character-1'],
        'gemini-2.5-flash',
        'key',
        vi.fn().mockResolvedValue(new Response(JSON.stringify(responsePayload), { status: 200 })),
        logger(),
      );
      await expect(request).rejects.toBeInstanceOf(GeminiResponseError);
    }
  });

  it.each([
    [429, 'GEMINI_QUOTA_EXHAUSTED'],
    [503, 'GEMINI_TEMPORARILY_UNAVAILABLE'],
  ])('preserves retryable HTTP %i errors', async (status, code) => {
    const logs = logger();
    const request = callGemini(
      { decision: 'private action' },
      ['character-1'],
      'gemini-2.5-flash',
      'gemini-secret-key',
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ error: { status: code } }), { status })),
      logs,
    );

    await expect(request).rejects.toMatchObject<GeminiApiError>({ status, code, retryable: true });
    const output = JSON.stringify([...logs.log.mock.calls, ...logs.error.mock.calls]);
    expect(output).toContain('gemini_request_failed');
    expect(output).not.toContain('gemini-secret-key');
    expect(output).not.toContain('private action');
  });

  it('logs the safe structured Google diagnostic and keeps the player response generic', async () => {
    const logs = logger();
    const apiKey = 'AIza-client-secret-key-that-must-not-leak';
    const request = callGemini(
      { decision: 'private action' },
      ['character-1'],
      'gemini-2.5-flash',
      apiKey,
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              status: 'INVALID_ARGUMENT',
              code: 400,
              message: `Invalid request using ${apiKey}`,
            },
          }),
          { status: 400 },
        ),
      ),
      logs,
    );

    await expect(request).rejects.toMatchObject({ code: 'GEMINI_INVALID_REQUEST' });
    expect(logs.error).toHaveBeenCalledWith(
      JSON.stringify({
        event: 'gemini_request_failed',
        model: 'gemini-2.5-flash',
        httpStatus: 400,
        googleStatus: 'INVALID_ARGUMENT',
        googleCode: 400,
        code: 'GEMINI_INVALID_REQUEST',
        safeMessage: 'Invalid request using [REDACTED]',
        retryable: false,
      }),
    );
    expect(JSON.stringify(logs.error.mock.calls)).not.toContain(apiKey);
    expect(JSON.stringify(logs.error.mock.calls)).not.toContain('private action');
  });

  it('does not expose keys, service-role values or decisions in logs', async () => {
    const logs = logger();
    await expect(
      callGemini(
        { decision: 'private-decision', serviceRole: 'service-role-secret' },
        ['character-1'],
        'gemini-2.5-flash',
        'gemini-secret-key',
        vi.fn().mockResolvedValue(new Response('not-json', { status: 200 })),
        logs,
      ),
    ).rejects.toBeInstanceOf(GeminiResponseError);
    const output = JSON.stringify([...logs.log.mock.calls, ...logs.error.mock.calls]);

    expect(output).not.toContain('gemini-secret-key');
    expect(output).not.toContain('service-role-secret');
    expect(output).not.toContain('private-decision');
  });
});
