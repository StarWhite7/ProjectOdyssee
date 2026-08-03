import { AiConfigurationError } from './ai-provider.ts';
import { GeminiApiError, publicGeminiError } from './gemini-error.ts';
import { GeminiResponseError } from './gemini-client.ts';
import { ResolutionValidationError } from './resolution-result.ts';

export type ResolutionStage =
  | 'claim'
  | 'load_context'
  | 'read_ai_configuration'
  | 'generate_resolution'
  | 'validate_result'
  | 'complete_resolution';

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
  stage: ResolutionStage = 'claim',
  logger: Pick<Console, 'error'> = console,
): Promise<Response> {
  const classification = classifyResolutionError(error);
  logger.error(
    JSON.stringify({
      event: 'resolution_failed',
      stage,
      errorName: classification.errorName,
      errorCode: classification.errorCode,
      retryable: classification.retryable,
    }),
  );
  if (turnId) {
    await admin.rpc('fail_turn_resolution', {
      target_turn_id: turnId,
      safe_error: classification.errorCode,
    });
  }

  if (error instanceof GeminiApiError && error.retryable) {
    return response(publicGeminiError(error), error.status, headers);
  }

  if (error instanceof AiConfigurationError) {
    return response(
      {
        error: 'ai_configuration_error',
        retryable: false,
        message: 'Le moteur narratif est mal configuré.',
      },
      500,
      headers,
    );
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

export function classifyResolutionError(error: unknown): {
  errorName: string;
  errorCode: string;
  retryable: boolean;
} {
  if (error instanceof GeminiApiError)
    return { errorName: error.name, errorCode: error.code, retryable: error.retryable };
  if (error instanceof GeminiResponseError || error instanceof AiConfigurationError)
    return { errorName: error.name, errorCode: error.code, retryable: false };
  if (error instanceof ResolutionValidationError)
    return { errorName: error.name, errorCode: error.code, retryable: false };
  if (isRecord(error) && isSafeTechnicalCode(error['code']))
    return { errorName: 'PostgrestError', errorCode: error['code'], retryable: false };
  if (error instanceof Error && isKnownLegacyCode(error.message))
    return { errorName: 'Error', errorCode: error.message, retryable: false };
  return {
    errorName: error instanceof Error ? 'Error' : 'UnknownError',
    errorCode: 'unexpected_resolution_error',
    retryable: false,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isSafeTechnicalCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z0-9_]{2,64}$/i.test(value);
}

function isKnownLegacyCode(value: string): boolean {
  return [
    'empty_ai_response',
    'invalid_ai_response',
    'invalid_resolution',
    'invalid_next_scene',
    'invalid_intentions',
  ].includes(value);
}

function response(value: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
