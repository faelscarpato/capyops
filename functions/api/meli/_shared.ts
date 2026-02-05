import { createClient } from '@supabase/supabase-js';

export type Env = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  MELI_CLIENT_ID: string;
  MELI_CLIENT_SECRET: string;
  MELI_REDIRECT_URI: string;
  MELI_BASE_URL?: string;
  MELI_AUTH_URL?: string;
};

export function getSupabaseAdmin(env: Env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase env vars missing');
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
}

export async function requireUser(req: Request, env: Env) {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) throw new Error('Unauthorized');
  const supabase = getSupabaseAdmin(env);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error('Unauthorized');
  return data.user;
}

export function randomState() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function meliFetch(env: Env, path: string, accessToken: string) {
  const base = env.MELI_BASE_URL || 'https://api.mercadolibre.com';
  const url = path.startsWith('http') ? path : `${base}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(`ML API error ${res.status}`);
  return res.json();
}

export async function refreshToken(env: Env, refreshTokenValue: string) {
  const body = new URLSearchParams();
  body.set('grant_type', 'refresh_token');
  body.set('client_id', env.MELI_CLIENT_ID);
  body.set('client_secret', env.MELI_CLIENT_SECRET);
  body.set('refresh_token', refreshTokenValue);

  const res = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || 'ML refresh failed');
  }
  return res.json();
}
