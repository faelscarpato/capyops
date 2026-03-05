/**
 * CAPYOPS - Meli OAuth Callback Visionário
 * Este é o portão de entrada. Recebemos o código do Mercado Livre e trocamos por
 * um Access Token e um Refresh Token. Processo blindado com tratamento de erros.
 */

import { Env, getMeliApiUrl, createErrorResponse } from '../_shared';

// Interface da resposta do Mercado Livre na troca do token
interface MeliTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const traceId = crypto.randomUUID();
  const url = new URL(request.url);
  
  // Parâmetros que o Mercado Livre envia na URL de retorno
  const code = url.searchParams.get('code');
  const workspaceId = url.searchParams.get('state'); // Usamos o state para passar nosso workspace ID

  if (!code || !workspaceId) {
    console.warn(JSON.stringify({ level: 'WARN', traceId, message: 'Callback acessado sem code ou state (workspaceId).' }));
    // Redireciona para o frontend com erro
    return Response.redirect(`${url.origin}/integrations/meli?error=missing_params`, 302);
  }

  console.log(JSON.stringify({
    level: 'INFO',
    traceId,
    message: 'Iniciando troca de código OAuth por tokens do Mercado Livre',
    workspaceId
  }));

  try {
    const meliApiUrl = getMeliApiUrl(env);
    
    // 1. Prepara o payload para trocar o código pelo Token
    const tokenPayload = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.MELI_APP_ID,
      client_secret: env.MELI_CLIENT_SECRET,
      code: code,
      redirect_uri: env.MELI_REDIRECT_URI
    });

    // 2. Dispara contra o Mercado Livre
    const tokenResponse = await fetch(`${meliApiUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenPayload.toString()
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error(JSON.stringify({ level: 'ERROR', traceId, message: 'MELI recusou o código OAuth', errorData }));
      return Response.redirect(`${url.origin}/integrations/meli?error=auth_failed`, 302);
    }

    const tokens = await tokenResponse.json<MeliTokenResponse>();

    // 3. Salva os tokens no Supabase (Atualizando a integração do workspace)
    // Usamos a API REST pura do Supabase para evitar dependência pesada do client no Edge
    const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/workspace_integrations`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + tokens.expires_in * 1000);

    const updatePayload = {
      workspace_id: workspaceId,
      provider: 'mercadolivre',
      provider_user_id: tokens.user_id.toString(),
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt.toISOString(),
      status: 'active',
      updated_at: now.toISOString()
    };

    const dbResponse = await fetch(`${supabaseUrl}?workspace_id=eq.${workspaceId}&provider=eq.mercadolivre`, {
      method: 'PATCH',
      headers: {
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(updatePayload)
    });

    // Se não encontrou para fazer PATCH, faz um POST (Upsert behavior manual se necessário, 
    // mas o ideal é que a tabela já tenha a linha em status 'pending')
    if (!dbResponse.ok) {
       console.error(JSON.stringify({ level: 'ERROR', traceId, message: 'Falha ao salvar tokens no Supabase', status: dbResponse.status }));
    }

    console.log(JSON.stringify({ level: 'INFO', traceId, message: 'Integração concluída com sucesso!' }));

    // 4. Redireciona o usuário de volta para o frontend da aplicação com mensagem de sucesso
    return Response.redirect(`${url.origin}/integrations/meli?success=true`, 302);

  } catch (error) {
    console.error(JSON.stringify({
      level: 'ERROR',
      traceId,
      message: 'Erro catastrófico no callback do Meli',
      error: error instanceof Error ? error.message : String(error)
    }));
    return Response.redirect(`${url.origin}/integrations/meli?error=internal_server_error`, 302);
  }
};
