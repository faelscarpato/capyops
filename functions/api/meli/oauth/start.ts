import { Env, getSupabaseAdmin, randomState, requireUser } from '../_shared';

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const user = await requireUser(request, env);
  const supabase = getSupabaseAdmin(env);

  const state = randomState();

  const { error } = await supabase.from('meli_oauth_states').insert({
    user_id: user.id,
    state
  });
  if (error) throw error;

  const authUrl = new URL(env.MELI_AUTH_URL || 'https://auth.mercadolivre.com.br/authorization');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', env.MELI_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', env.MELI_REDIRECT_URI);
  authUrl.searchParams.set('state', state);

  return new Response(JSON.stringify({ url: authUrl.toString() }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
