import { GeminiApiError, publicGeminiError } from './gemini-error.ts';

type RpcClient = {
  rpc(
    name: string,
    parameters: { target_turn_id: string; safe_error: string },
  ): PromiseLike<unknown>;
};

export async function handleResolutionFailure(
  admin: RpcClient,
  turnId: string,
  error: unknown,
  headers: Record<string, string>,
): Promise<Response> {
  if (turnId) {
    const safeError = error instanceof GeminiApiError ? error.code : 'unexpected_resolution_error';
    await admin.rpc('fail_turn_resolution', {
      target_turn_id: turnId,
      safe_error: safeError,
    });
  }

  if (error instanceof GeminiApiError && error.retryable) {
    return response(publicGeminiError(error), error.status, headers);
  }

  return response(
    {
      error: 'resolution_failed',
      message: 'La résolution a échoué sans perdre les décisions. Vous pouvez réessayer.',
    },
    500,
    headers,
  );
}

function response(value: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
