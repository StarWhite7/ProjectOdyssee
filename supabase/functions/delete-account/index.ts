import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

const cors = createCorsHeaders(Deno.env.get('APP_URL'));

Deno.serve(async (request) => {
  const preflight = handleCorsPreflight(request, cors);
  if (preflight) return preflight;
  if (request.method !== 'POST') return response({ error: 'method_not_allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization) return response({ error: 'unauthorized' }, 401);

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authorization } } },
  );
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const body = (await request.json().catch(() => ({}))) as { confirmation?: string };
    if (body.confirmation !== 'SUPPRIMER') {
      return response({ error: 'confirmation_required' }, 400);
    }

    const { data, error: userError } = await userClient.auth.getUser();
    if (userError || !data.user) return response({ error: 'unauthorized' }, 401);

    const userId = data.user.id;

    const { data: files, error: listError } = await admin.storage
      .from('profile-media')
      .list(userId, { limit: 1000 });
    if (listError) throw listError;

    const paths = (files ?? []).map((file) => `${userId}/${file.name}`);
    if (paths.length) {
      const { error: removeError } = await admin.storage.from('profile-media').remove(paths);
      if (removeError) throw removeError;
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return response({ status: 'deleted' });
  } catch (error) {
    console.error(error);
    return response({ error: 'delete_account_failed' }, 500);
  }
});

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
