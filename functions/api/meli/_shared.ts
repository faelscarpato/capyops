/**
 * CAPYOPS - Core Shared Meli Environment
 * Arquitetura de tipagem estrita para garantir que nenhuma variável de ambiente fuja do controle.
 */

export interface Env {
  // Supabase
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  
  // Mercado Livre Config
  MELI_APP_ID: string;
  MELI_CLIENT_SECRET: string;
  MELI_REDIRECT_URI: string;
  MELI_API_URL?: string; // Opcional, tem fallback
}

/**
 * Retorna a URL base do Mercado Livre, priorizando a env var, com fallback para produção.
 */
export function getMeliApiUrl(env: Env): string {
  return env.MELI_API_URL || 'https://api.mercadolibre.com';
}

/**
 * Formata um erro para resposta padrão da API
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
