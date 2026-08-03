import { describe, expect, it, vi } from 'vitest';
import { AiConfigurationError } from './ai-provider';
import { GeminiResponseError } from './gemini-client';
import { geminiErrorFromResponse, publicGeminiError } from './gemini-error';
import { handleResolutionFailure } from './resolution-error';

describe('Gemini API errors', () => {
  it('maps 429 RESOURCE_EXHAUSTED to a retryable public response', async () => {
    const error = await geminiErrorFromResponse(
      new Response(JSON.stringify({ error: { status: 'RESOURCE_EXHAUSTED', message: 'secret' } }), {
        status: 429,
      }),
    );
    expect(error).toMatchObject({ status: 429, code: 'GEMINI_QUOTA_EXHAUSTED', retryable: true });
    expect(JSON.stringify(publicGeminiError(error))).not.toContain('secret');
  });

  it('maps a non-JSON 429 without exposing its body', async () => {
    const error = await geminiErrorFromResponse(
      new Response('upstream body with GEMINI_API_KEY=secret', { status: 429 }),
    );
    const publicError = publicGeminiError(error);
    expect(error).toMatchObject({ status: 429, retryable: true });
    expect(JSON.stringify(publicError)).not.toContain('secret');
  });

  it('maps 503 to temporary unavailability', async () => {
    const error = await geminiErrorFromResponse(new Response('', { status: 503 }));
    expect(error).toMatchObject({
      status: 503,
      code: 'GEMINI_TEMPORARILY_UNAVAILABLE',
      retryable: true,
    });
    const response = await handleResolutionFailure(
      { rpc: vi.fn().mockResolvedValue({}) },
      'turn-id',
      error,
      {},
    );
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: 'ai_temporarily_unavailable',
      retryable: true,
    });
  });

  it.each([
    [400, 'INVALID_ARGUMENT', 400, 'GEMINI_INVALID_REQUEST', false],
    [403, 'PERMISSION_DENIED', 403, 'GEMINI_AUTHORIZATION_FAILED', false],
    [404, 'NOT_FOUND', 404, 'GEMINI_MODEL_NOT_FOUND', false],
    [429, 'RESOURCE_EXHAUSTED', 429, 'GEMINI_QUOTA_EXHAUSTED', true],
    [500, 'INTERNAL', 500, 'GEMINI_INTERNAL_ERROR', false],
    [503, 'UNAVAILABLE', 503, 'GEMINI_TEMPORARILY_UNAVAILABLE', true],
  ])(
    'preserves HTTP %i and maps %s safely',
    async (httpStatus, googleStatus, googleCode, code, retryable) => {
      const error = await geminiErrorFromResponse(
        new Response(
          JSON.stringify({
            error: { status: googleStatus, code: googleCode, message: 'Safe Google diagnostic' },
          }),
          { status: httpStatus },
        ),
      );

      expect(error).toMatchObject({
        status: httpStatus,
        httpStatus,
        googleStatus,
        googleCode,
        code,
        safeMessage: 'Safe Google diagnostic',
        retryable,
      });
    },
  );

  it('classifies a non-JSON response from its real HTTP status without logging its body', async () => {
    const error = await geminiErrorFromResponse(
      new Response('raw upstream response containing private data', { status: 418 }),
    );
    expect(error).toMatchObject({
      httpStatus: 418,
      googleStatus: null,
      googleCode: null,
      safeMessage: null,
      code: 'GEMINI_REQUEST_FAILED',
      retryable: false,
    });
    expect(JSON.stringify(error)).not.toContain('private data');
  });

  it('truncates the Google message to 300 characters and removes the API key', async () => {
    const apiKey = 'AIza-test-secret-key-that-must-never-leak';
    const error = await geminiErrorFromResponse(
      new Response(
        JSON.stringify({
          error: {
            status: 'INVALID_ARGUMENT',
            code: 400,
            message: `${'x'.repeat(180)}${apiKey}${'y'.repeat(180)}`,
          },
        }),
        { status: 400 },
      ),
      apiKey,
    );

    expect(error.safeMessage?.length).toBeLessThanOrEqual(300);
    expect(error.safeMessage).not.toContain(apiKey);
    expect(JSON.stringify(error)).not.toContain(apiKey);
  });

  it('never returns the safe Google diagnostic to the player', async () => {
    const error = await geminiErrorFromResponse(
      new Response(
        JSON.stringify({
          error: { status: 'INVALID_ARGUMENT', code: 400, message: 'Internal Google diagnostic' },
        }),
        { status: 400 },
      ),
    );
    const response = await handleResolutionFailure(
      { rpc: vi.fn().mockResolvedValue({}) },
      'turn-id',
      error,
      {},
    );

    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('Internal Google diagnostic');
  });

  it('records the recoverable turn before returning a retryable response', async () => {
    const apiError = await geminiErrorFromResponse(new Response('', { status: 429 }));
    const rpc = vi.fn().mockResolvedValue({});
    const response = await handleResolutionFailure({ rpc }, 'turn-id', apiError, {});
    expect(rpc).toHaveBeenCalledWith('fail_turn_resolution', {
      target_turn_id: 'turn-id',
      safe_error: 'GEMINI_QUOTA_EXHAUSTED',
    });
    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({
      error: 'ai_temporarily_unavailable',
      retryable: true,
    });
  });

  it('keeps unexpected errors generic while still recording the failed turn', async () => {
    const rpc = vi.fn().mockResolvedValue({});
    const response = await handleResolutionFailure(
      { rpc },
      'turn-id',
      new Error('internal secret'),
      {},
    );
    expect(rpc).toHaveBeenCalledOnce();
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('internal secret');
  });

  it('returns a safe non-retryable configuration error and releases the claimed turn', async () => {
    const rpc = vi.fn().mockResolvedValue({});
    const response = await handleResolutionFailure(
      { rpc },
      'turn-id',
      new AiConfigurationError('gemini_not_configured'),
      {},
    );

    expect(rpc).toHaveBeenCalledWith('fail_turn_resolution', {
      target_turn_id: 'turn-id',
      safe_error: 'gemini_not_configured',
    });
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'ai_configuration_error',
      retryable: false,
      message: 'Le moteur narratif est mal configuré.',
    });
  });

  it('records a Gemini response error with its safe code', async () => {
    const rpc = vi.fn().mockResolvedValue({});
    const logger = { error: vi.fn() };
    await handleResolutionFailure(
      { rpc },
      'turn-id',
      new GeminiResponseError('invalid_ai_response'),
      {},
      'generate_resolution',
      logger,
    );

    expect(rpc).toHaveBeenCalledWith('fail_turn_resolution', {
      target_turn_id: 'turn-id',
      safe_error: 'invalid_ai_response',
    });
    expect(logger.error).toHaveBeenCalledWith(
      JSON.stringify({
        event: 'resolution_failed',
        stage: 'generate_resolution',
        errorName: 'GeminiResponseError',
        errorCode: 'invalid_ai_response',
        retryable: false,
      }),
    );
  });

  it('logs complete_resolution with only a safe PostgREST code', async () => {
    const rpc = vi.fn().mockResolvedValue({});
    const logger = { error: vi.fn() };
    await handleResolutionFailure(
      { rpc },
      'turn-id',
      {
        code: 'PGRST204',
        message: 'private-decision gemini-secret service-role-secret narrative-response',
      },
      {},
      'complete_resolution',
      logger,
    );

    const output = JSON.stringify(logger.error.mock.calls);
    expect(output).toContain('complete_resolution');
    expect(output).toContain('PGRST204');
    expect(output).not.toContain('private-decision');
    expect(output).not.toContain('gemini-secret');
    expect(output).not.toContain('service-role-secret');
    expect(output).not.toContain('narrative-response');
  });
});
