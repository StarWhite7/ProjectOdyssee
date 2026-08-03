import { describe, expect, it, vi } from 'vitest';
import { AiConfigurationError } from './ai-provider';
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

  it.each([400, 500])('maps a non-temporary %i to a non-retryable failure', async (status) => {
    const error = await geminiErrorFromResponse(
      new Response(JSON.stringify({ error: { status: 'INVALID_ARGUMENT' } }), { status }),
    );
    expect(error).toMatchObject({ status: 500, code: 'GEMINI_REQUEST_FAILED', retryable: false });
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
});
