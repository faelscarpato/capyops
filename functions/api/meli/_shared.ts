/**
 * CAPYOPS - Core Shared Meli Environment & Utilities
 * O motor blindado da tua integração com o Mercado Livre.
 * Contém tipagens fortes, autenticação de utilizadores, gerador de states,
 * cliente admin do banco e um cliente HTTP com auto-refresh de tokens.
 */

import { createClient } from '@supabase/supabase-js';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  MELI_APP_ID: string;
  MELI_CLIENT_SECRET: string;
  MELI_REDIRECT_URI: string;
  MELI_API_URL?: string;
}

/**
 * Retorna o URL base do Mercado Livre
 */
export function getMeliApiUrl(env: Env): string {
  return env.MELI_API_URL || 'https://api.mercadolibre.com';
}

/**
 * Retorna uma string aleatória segura para usar como "state" no fluxo OAuth do MELI,
 * prevenindo ataques de CSRF (Cross-Site Request Forgery).
 */
export function randomState(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

/**
 * Inicializa e retorna o cliente Supabase com privilégios administrativos (Service Role).
 * Essencial para as rotas que precisam ignorar RLS (Row Level Security) e gerenciar workspaces.
 */
export function getSupabaseAdmin(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

/**
 * Padronização de respostas de erro
 */
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

/**
 * Valida o JWT do utilizador via Supabase e devolve os dados do utilizador.
 * Impede que a tua API seja chamada por utilizadores não autenticados.
 */
export async function requireUser(request: Request, env: Env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Unauthorized: Missing Authorization header');
  }

  // Usamos a API REST do Supabase para validar o token rapidamente sem instanciar o SDK pesado
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'Authorization': authHeader,
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY
    }
  });

  if (!response.ok) {
    throw new Error('Unauthorized: Invalid token');
  }

  const user = await response.json();
  return user;
}

/**
 * Recupera o ID do utilizador do Mercado Livre e os tokens associados ao Workspace
 */
export async function resolveOwnerId(workspaceId: string, env: Env) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/workspace_integrations?workspace_id=eq.${workspaceId}&provider=eq.mercadolivre&select=*`, {
    headers: {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });

  if (!response.ok) throw new Error('Falha ao aceder às integrações do workspace');
  
  const data = await response.json() as any[];
  if (!data || data.length === 0) throw new Error('Integração com Mercado Livre não encontrada para este workspace');
  
  return data[0]; // Retorna a linha completa (access_token, refresh_token, provider_user_id)
}

/**
 * Fluxo de Refresh Token à prova de bala.
 * Comunica com o MELI, adquire novos tokens e guarda imediatamente no Supabase.
 */
export async function refreshToken(workspaceId: string, currentRefreshToken: string, env: Env) {
  const meliApiUrl = getMeliApiUrl(env);
  
  const payload = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: env.MELI_APP_ID,
    client_secret: env.MELI_CLIENT_SECRET,
    refresh_token: currentRefreshToken
  });

  const response = await fetch(`${meliApiUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: payload.toString()
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Falha ao renovar token do MELI: ${errText}`);
  }

  const tokens = await response.json() as any;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + tokens.expires_in * 1000);

  // Guarda os novos tokens no Supabase
  await fetch(`${env.SUPABASE_URL}/rest/v1/workspace_integrations?workspace_id=eq.${workspaceId}&provider=eq.mercadolivre`, {
    method: 'PATCH',
    headers: {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt.toISOString(),
      updated_at: now.toISOString()
    })
  });

  return tokens.access_token;
}

/**
 * Fetch Wrapper Visionário: `meliFetch`
 * Faz a chamada ao Mercado Livre. Se apanhar um erro 401 (Token Expirado),
 * renova o token automaticamente nos bastidores e tenta novamente sem interromper o fluxo!
 */
export async function meliFetch(
  endpoint: string, 
  options: RequestInit, 
  workspaceId: string, 
  env: Env,
  isRetry = false
): Promise<Response> {
  const baseUrl = getMeliApiUrl(env);
  const integration = await resolveOwnerId(workspaceId, env);
  
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${integration.access_token}`);
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers
  });

  // Se o token expirou e ainda não tentámos renovar
  if (response.status === 401 && !isRetry) {
    console.log(`Token expirado para workspace ${workspaceId}. A iniciar Auto-Refresh...`);
    try {
      // Renova o token
      const newAccessToken = await refreshToken(workspaceId, integration.refresh_token, env);
      
      // Tenta a requisição novamente com o novo token
      const retryHeaders = new Headers(options.headers || {});
      retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);
      
      return await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers: retryHeaders
      });
    } catch (refreshError) {
      console.error('Auto-Refresh falhou', refreshError);
      throw refreshError;
    }
  }

  return response;
}
