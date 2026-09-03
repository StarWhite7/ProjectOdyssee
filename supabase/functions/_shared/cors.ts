const defaultOrigin = 'https://playnerys.com';

export const allowedCorsOrigins = [
  'http://localhost:4200',
  'https://playnerys.com',
  'https://www.playnerys.com',
  'https://projectodyssee.pages.dev',
] as const;

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
  configuredAllowedOrigins?: string | null,
): Record<string, string> {
  const allowedOrigins = createAllowedOrigins(configuredAllowedOrigins);
  const origin =
    allowedOrigin(requestOrigin, allowedOrigins) ??
    allowedOrigin(configuredAppUrl, allowedOrigins) ??
    defaultOrigin;

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

function createAllowedOrigins(configuredAllowedOrigins?: string | null): Set<string> {
  const origins = new Set<string>(allowedCorsOrigins);

  for (const origin of configuredAllowedOrigins?.split(',') ?? []) {
    addConfiguredOrigin(origins, origin);
  }

  return origins;
}

function addConfiguredOrigin(origins: Set<string>, value?: string | null): void {
  const origin = normalizeOrigin(value);
  if (origin) origins.add(origin);
}

function allowedOrigin(
  value: string | null | undefined,
  allowedOrigins: Set<string>,
): string | null {
  const origin = normalizeOrigin(value);
  return origin && allowedOrigins.has(origin) ? origin : null;
}

function normalizeOrigin(value?: string | null): string | null {
  const origin = value?.trim();
  if (!origin) return null;

  try {
    const url = new URL(origin);
    if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol)) return null;
    return url.origin;
  } catch {
    return null;
  }
}
