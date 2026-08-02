import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (request) => {
  const expected = Deno.env.get('CRON_SECRET');
  if (!expected || request.headers.get('x-cron-secret') !== expected)
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, serviceKey);
  const { data: due, error } = await admin.rpc('expire_due_turns');
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
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
  return new Response(
    JSON.stringify({
      expired: due?.length ?? 0,
      triggered: results.filter((result) => result.status === 'fulfilled').length,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
