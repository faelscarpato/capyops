import { Env, getSupabaseAdmin, randomState, requireUser } from '../_shared';

function base64UrlEncode(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomVerifier() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes.buffer);
}

async function createPkce() {
  const verifier = randomVerifier();
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const challenge = base64UrlEncode(digest);
  return { verifier, challenge };
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const user = await requireUser(request, env);
  const supabase = getSupabaseAdmin(env);

  const state = randomState();
  const { verifier, challenge } = await createPkce();

  const { error } = await supabase.from('meli_oauth_states').insert({
    user_id: user.id,
    state,
    code_verifier: verifier,
    code_challenge: challenge,
    code_challenge_method: 'S256'
  });
  if (error) throw error;

  const authUrl = new URL(env.MELI_AUTH_URL || 'https://auth.mercadolivre.com.br/authorization');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', env.MELI_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', env.MELI_REDIRECT_URI);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  return new Response(JSON.stringify({ url: authUrl.toString() }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
