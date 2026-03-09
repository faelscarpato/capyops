import { Env, getMeliApiUrl, getMeliAuthUrl, getSupabaseAdmin, requireUser, resolveOwnerId } from '../_shared';

interface CallbackBody {
  code?: string;
  state?: string;
}

interface MeliTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  user_id: number;
  refresh_token: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const user = await requireUser(request, env);
  const supabase = getSupabaseAdmin(env);
  const ownerId = await resolveOwnerId(supabase, user.id);

  const body = (await request.json().catch(() => ({}))) as CallbackBody;
  const code = String(body.code || '');
  const state = String(body.state || '');

  if (!code || !state) {
    return new Response(JSON.stringify({ ok: false, message: 'Parâmetros inválidos no callback.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { data: oauthState, error: stateError } = await supabase
    .from('meli_oauth_states')
    .select('*')
    .eq('state', state)
    .eq('user_id', ownerId)
    .is('used_at', null)
    .maybeSingle();

  if (stateError) throw stateError;
  if (!oauthState?.code_verifier) {
    return new Response(JSON.stringify({ ok: false, message: 'Estado OAuth inválido ou expirado.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const tokenPayload = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: env.MELI_APP_ID,
    client_secret: env.MELI_CLIENT_SECRET,
    code,
    redirect_uri: env.MELI_REDIRECT_URI,
    code_verifier: String(oauthState.code_verifier)
  });

  const tokenResponse = await fetch(`${getMeliAuthUrl(env)}/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: tokenPayload.toString()
  });

  if (!tokenResponse.ok) {
    const errorData = await tokenResponse.text();
    return new Response(JSON.stringify({ ok: false, message: `MELI recusou o código OAuth: ${errorData}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const tokens = (await tokenResponse.json()) as MeliTokenResponse;

  const meResponse = await fetch(`${getMeliApiUrl(env)}/users/me`, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      Accept: 'application/json'
    }
  });
  const me = meResponse.ok ? await meResponse.json() : null;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + tokens.expires_in * 1000).toISOString();

  const { error: upsertError } = await supabase.from('meli_accounts').upsert({
    user_id: ownerId,
    ml_user_id: String(tokens.user_id || me?.id || ''),
    nickname: me?.nickname || null,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    status: 'active',
    scope: tokens.scope || null,
    updated_at: now.toISOString()
  }, { onConflict: 'user_id' });
  if (upsertError) throw upsertError;

  await supabase
    .from('meli_oauth_states')
    .update({ used_at: now.toISOString() })
    .eq('id', oauthState.id);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
