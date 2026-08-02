export type GeminiErrorCode =
  'GEMINI_QUOTA_EXHAUSTED' | 'GEMINI_TEMPORARILY_UNAVAILABLE' | 'GEMINI_REQUEST_FAILED';

export class GeminiApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: GeminiErrorCode,
    readonly retryable: boolean,
  ) {
    super(code);
    this.name = 'GeminiApiError';
  }
}

type GoogleErrorEnvelope = {
  error?: { status?: unknown; code?: unknown; message?: unknown };
};

export async function geminiErrorFromResponse(response: Response): Promise<GeminiApiError> {
  const rawBody = await response.text().catch(() => '');
  let envelope: GoogleErrorEnvelope = {};
  if (rawBody) {
    try {
      envelope = JSON.parse(rawBody) as GoogleErrorEnvelope;
    } catch {
      // A non-JSON Google response is classified from its HTTP status only.
    }
  }

  const googleStatus =
    typeof envelope.error?.status === 'string' ? envelope.error.status.toUpperCase() : '';
  const googleCode = envelope.error?.code;
  const isResourceExhausted =
    googleStatus === 'RESOURCE_EXHAUSTED' ||
    googleCode === 429 ||
    googleCode === '429' ||
    response.status === 429;
  if (isResourceExhausted) {
    return new GeminiApiError(429, 'GEMINI_QUOTA_EXHAUSTED', true);
  }

  const isUnavailable =
    response.status === 503 ||
    googleStatus === 'UNAVAILABLE' ||
    googleCode === 503 ||
    googleCode === '503';
  if (isUnavailable) {
    return new GeminiApiError(503, 'GEMINI_TEMPORARILY_UNAVAILABLE', true);
  }

  return new GeminiApiError(500, 'GEMINI_REQUEST_FAILED', false);
}

export function publicGeminiError(error: GeminiApiError) {
  return {
    error: 'ai_temporarily_unavailable' as const,
    code: error.code,
    retryable: true as const,
    message:
      'L’Oracle est momentanément indisponible. Vos décisions sont conservées. Réessayez dans quelques instants.',
  };
}
