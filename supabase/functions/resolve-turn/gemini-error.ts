export type GeminiErrorCode =
  | 'GEMINI_QUOTA_EXHAUSTED'
  | 'GEMINI_TEMPORARILY_UNAVAILABLE'
  | 'GEMINI_INVALID_REQUEST'
  | 'GEMINI_AUTHORIZATION_FAILED'
  | 'GEMINI_MODEL_NOT_FOUND'
  | 'GEMINI_INTERNAL_ERROR'
  | 'GEMINI_REQUEST_FAILED';

export class GeminiApiError extends Error {
  readonly status: number;

  constructor(
    readonly httpStatus: number,
    readonly code: GeminiErrorCode,
    readonly retryable: boolean,
    readonly googleStatus: string | null,
    readonly googleCode: number | null,
    readonly safeMessage: string | null,
  ) {
    super(code);
    this.name = 'GeminiApiError';
    this.status = httpStatus;
  }
}

type GoogleErrorEnvelope = {
  error?: { status?: unknown; code?: unknown; message?: unknown };
};

export async function geminiErrorFromResponse(
  response: Response,
  apiKey?: string,
): Promise<GeminiApiError> {
  const rawBody = await response.text().catch(() => '');
  let envelope: GoogleErrorEnvelope = {};
  if (rawBody) {
    try {
      envelope = JSON.parse(rawBody) as GoogleErrorEnvelope;
    } catch {
      // A non-JSON Google response is classified from its HTTP status only.
    }
  }

  const httpStatus = response.status;
  const googleStatus = normalizeGoogleStatus(envelope.error?.status);
  const googleCode = normalizeGoogleCode(envelope.error?.code);
  const safeMessage = sanitizeGoogleMessage(envelope.error?.message, apiKey);
  const isResourceExhausted =
    googleStatus === 'RESOURCE_EXHAUSTED' || googleCode === 429 || httpStatus === 429;
  if (isResourceExhausted) {
    return new GeminiApiError(
      httpStatus,
      'GEMINI_QUOTA_EXHAUSTED',
      true,
      googleStatus,
      googleCode,
      safeMessage,
    );
  }

  const isUnavailable = httpStatus === 503 || googleStatus === 'UNAVAILABLE' || googleCode === 503;
  if (isUnavailable) {
    return new GeminiApiError(
      httpStatus,
      'GEMINI_TEMPORARILY_UNAVAILABLE',
      true,
      googleStatus,
      googleCode,
      safeMessage,
    );
  }

  let code: GeminiErrorCode = 'GEMINI_REQUEST_FAILED';
  if (httpStatus === 400) code = 'GEMINI_INVALID_REQUEST';
  else if (httpStatus === 401 || httpStatus === 403) code = 'GEMINI_AUTHORIZATION_FAILED';
  else if (httpStatus === 404) code = 'GEMINI_MODEL_NOT_FOUND';
  else if (httpStatus >= 500) code = 'GEMINI_INTERNAL_ERROR';
  return new GeminiApiError(httpStatus, code, false, googleStatus, googleCode, safeMessage);
}

function normalizeGoogleStatus(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return /^[A-Z][A-Z0-9_]{0,63}$/.test(normalized) ? normalized : null;
}

function normalizeGoogleCode(value: unknown): number | null {
  const code = typeof value === 'string' && /^\d{3}$/.test(value) ? Number(value) : value;
  return typeof code === 'number' && Number.isInteger(code) ? code : null;
}

function sanitizeGoogleMessage(value: unknown, apiKey?: string): string | null {
  if (typeof value !== 'string') return null;
  let message = value;
  for (const secret of [apiKey, apiKey ? encodeURIComponent(apiKey) : undefined]) {
    if (secret) message = message.replaceAll(secret, '[REDACTED]');
  }
  message = message
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED]')
    .replace(/([?&]key=)[^&\s]+/gi, '$1[REDACTED]');
  return message.slice(0, 300);
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
