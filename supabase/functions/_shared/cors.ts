const defaultOrigin = 'http://localhost:4200';

export const allowedCorsHeaders = [
  'authorization',
  'apikey',
  'content-type',
  'x-client-info',
  'x-cron-secret',
] as const;

export function createCorsHeaders(appUrl?: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': appUrl?.trim() || defaultOrigin,
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
