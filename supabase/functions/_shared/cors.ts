const defaultOrigin = 'https://projectodyssee.pages.dev';

export const allowedCorsOrigins = [
  'http://localhost:4200',
  'https://projectodyssee.pages.dev',
] as const;

const allowedOrigins = new Set<string>(allowedCorsOrigins);

export const allowedCorsHeaders = [
  'authorization',
  'apikey',
  'content-type',
  'x-client-info',
  'x-cron-secret',
] as const;

export function createCorsHeaders(
  requestOrigin?: string | null,
  configuredAppUrl?: string | null,
): Record<string, string> {
  const origin = allowedOrigin(requestOrigin) ?? allowedOrigin(configuredAppUrl) ?? defaultOrigin;

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': allowedCorsHeaders.join(', '),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

export function handleCorsPreflight(
  request: Request,
  headers: Record<string, string>,
): Response | null {
  return request.method === 'OPTIONS' ? new Response(null, { status: 204, headers }) : null;
}

function allowedOrigin(value?: string | null): string | null {
  const origin = value?.trim();
  return origin && allowedOrigins.has(origin) ? origin : null;
}
