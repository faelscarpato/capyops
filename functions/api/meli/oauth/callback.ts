import { Env, getSupabaseAdmin, requireUser } from '../_shared';

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const user = await requireUser(request, env);
  const supabase = getSupabaseAdmin(env);

  const body = await request.json().catch(() => ({}));
  const code = String(body.code || '');
  const state = String(body.state || '');
  if (!code || !state) return new Response('Invalid parameters', { status: 400 });

  const { data: stateRow, error: stateError } = await supabase
    .from('meli_oauth_states')
    .select('id,user_id,used_at')
    .eq('state', state)
    .maybeSingle();
  if (stateError) throw stateError;
  if (!stateRow || stateRow.user_id !== user.id || stateRow.used_at) {
    return new Response('Invalid state', { status: 400 });
  }

  const params = new URLSearchParams();
  params.set('grant_type', 'authorization_code');
  params.set('client_id', env.MELI_CLIENT_ID);
  params.set('client_secret', env.MELI_CLIENT_SECRET);
  params.set('code', code);
  params.set('redirect_uri', env.MELI_REDIRECT_URI);

  const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });
  if (!tokenRes.ok) {
    const txt = await tokenRes.text();
    return new Response(txt || 'Token exchange failed', { status: 400 });
  }
  const token = await tokenRes.json();
  const expiresAt = new Date(Date.now() + Number(token.expires_in || 0) * 1000).toISOString();

  let nickname: string | null = null;
  try {
    const profileRes = await fetch(`https://api.mercadolibre.com/users/${token.user_id}`, {
      headers: { Authorization: `Bearer ${token.access_token}` }
    });
    if (profileRes.ok) {
      const profile = await profileRes.json();
      nickname = profile.nickname ?? null;
    }
  } catch {
    // ignore
  }

  const { error: upsertError } = await supabase.from('meli_accounts').upsert(
    {
      user_id: user.id,
      ml_user_id: String(token.user_id ?? ''),
      nickname,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: expiresAt,
      status: 'connected',
      scope: token.scope ?? null
    },
    { onConflict: 'user_id' }
  );
  if (upsertError) throw upsertError;

  await supabase.from('meli_oauth_states').update({ used_at: new Date().toISOString() }).eq('id', stateRow.id);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
