import { createClient } from '@supabase/supabase-js';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  MELI_APP_ID: string;
  MELI_CLIENT_SECRET: string;
  MELI_REDIRECT_URI: string;
  MELI_API_URL?: string;
  MELI_AUTH_URL?: string;
}

export function getMeliApiUrl(env: Env): string {
  return env.MELI_API_URL || 'https://api.mercadolibre.com';
}

export function getMeliAuthUrl(env: Env): string {
  return env.MELI_AUTH_URL || 'https://auth.mercadolivre.com.br';
}

export function randomState(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

export function getSupabaseAdmin(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

export function createErrorResponse(message: string, status: number = 400, traceId?: string): Response {
  return new Response(
    JSON.stringify({
      error: true,
      message,
      traceId: traceId || crypto.randomUUID(),
      timestamp: new Date().toISOString()
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

export async function requireUser(request: Request, env: Env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Unauthorized: Missing Authorization header');
  }

  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: authHeader,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY
    }
  });

  if (!response.ok) {
    throw new Error('Unauthorized: Invalid token');
  }

  return await response.json();
}

export async function resolveOwnerId(supabase: ReturnType<typeof getSupabaseAdmin>, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('owner_id')
    .eq('member_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data?.owner_id || userId;
}

export async function refreshToken(env: Env, currentRefreshToken: string) {
  const payload = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: env.MELI_APP_ID,
    client_secret: env.MELI_CLIENT_SECRET,
    refresh_token: currentRefreshToken
  });

  const response = await fetch(`${getMeliAuthUrl(env)}/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: payload.toString()
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Falha ao renovar token do MELI: ${errText}`);
  }

  return (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    user_id?: number;
    scope?: string;
    token_type?: string;
  };
}

export async function meliFetch(
  env: Env,
  endpoint: string,
  accessToken: string,
  extraHeaders?: Record<string, string>,
  init: RequestInit = {}
): Promise<any> {
  const baseUrl = getMeliApiUrl(env);
  const url = endpoint.startsWith('http://') || endpoint.startsWith('https://') ? endpoint : `${baseUrl}${endpoint}`;
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${accessToken}`);
  headers.set('Accept', 'application/json');
  Object.entries(extraHeaders || {}).forEach(([key, value]) => headers.set(key, value));

  const response = await fetch(url, {
    ...init,
    headers
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Falha ao consultar Mercado Livre (${response.status}): ${errText || endpoint}`);
  }

  return await response.json();
}
