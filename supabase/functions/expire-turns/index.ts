import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

const cors = createCorsHeaders(Deno.env.get('APP_URL'));

Deno.serve(async (request) => {
  const preflight = handleCorsPreflight(request, cors);
  if (preflight) return preflight;
  const expected = Deno.env.get('CRON_SECRET');
  if (!expected || request.headers.get('x-cron-secret') !== expected)
    return response({ error: 'unauthorized' }, 401);
  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, serviceKey);
  const { data: due, error } = await admin.rpc('expire_due_turns');
  if (error) return response({ error: error.message }, 500);
  const results = await Promise.allSettled(
    ((due ?? []) as Array<{ turn_id: string }>).map((row) =>
      fetch(`${url}/functions/v1/resolve-turn`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ turnId: row.turn_id }),
      }),
    ),
  );
  return response({
    expired: due?.length ?? 0,
    triggered: results.filter((result) => result.status === 'fulfilled').length,
  });
});

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
