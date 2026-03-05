/**
 * CAPYOPS - Webhook Receiver Visionário para Mercado Livre
 * * Este arquivo foi reescrito para ser 100% resiliente.
 * Nada de prender o MELI esperando o banco de dados responder.
 * Recebemos, agradecemos (200 OK) e jogamos o trabalho pesado para background (waitUntil).
 */

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

interface MeliWebhookPayload {
  resource: string;
  user_id: number;
  topic: string;
  application_id: number;
  attempts: number;
  sent: string;
  received: string;
}

/**
 * Função principal de processamento em background.
 * Ela só roda DEPOIS que o Worker já retornou o 200 OK para o Mercado Livre.
 */
async function processNotificationBackground(
  payload: MeliWebhookPayload,
  env: Env,
  traceId: string
): Promise<void> {
  const logCtx = { traceId, topic: payload.topic, resource: payload.resource };
  
  console.log(JSON.stringify({
    level: 'INFO',
    message: 'Iniciando processamento em background da notificação',
    ...logCtx
  }));

  try {
    // Exemplo de roteamento baseado no tópico
    switch (payload.topic) {
      case 'items':
        console.log(JSON.stringify({ level: 'INFO', message: 'Notificação de Item recebida', ...logCtx }));
        // Aqui você faria o fetch do item específico e atualizaria o Supabase
        // await handleItemUpdate(payload.resource, env);
        break;
      case 'orders_v2':
      case 'orders':
        console.log(JSON.stringify({ level: 'INFO', message: 'Notificação de Pedido (Order) recebida', ...logCtx }));
        // await handleOrderUpdate(payload.resource, env);
        break;
      case 'messages':
        console.log(JSON.stringify({ level: 'INFO', message: 'Notificação de Mensagem recebida', ...logCtx }));
        // await handleMessage(payload.resource, env);
        break;
      case 'questions':
        console.log(JSON.stringify({ level: 'INFO', message: 'Notificação de Pergunta recebida', ...logCtx }));
        // await handleQuestion(payload.resource, env);
        break;
      default:
        console.log(JSON.stringify({ 
          level: 'WARN', 
          message: 'Tópico não mapeado ou ignorado', 
          ...logCtx 
        }));
    }

    console.log(JSON.stringify({ level: 'INFO', message: 'Processamento concluído com sucesso', ...logCtx }));

  } catch (error) {
    // Logs estruturados para facilitar a busca em ferramentas de observabilidade
    console.error(JSON.stringify({
      level: 'ERROR',
      message: 'Falha catastrófica ao processar webhook em background',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...logCtx
    }));
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env, waitUntil } = context;
  const traceId = crypto.randomUUID(); // Nosso salvador da pátria para rastreabilidade

  let payload: MeliWebhookPayload | null = null;

  try {
    // Clonamos a request para garantir que não vamos quebrar a stream de leitura
    payload = await request.clone().json<MeliWebhookPayload>();
  } catch (error) {
    console.warn(JSON.stringify({ level: 'WARN', traceId, message: 'Payload inválido ou vazio recebido.' }));
    return new Response('Bad Request: Invalid JSON', { status: 400 });
  }

  // Validação minimalista e direta
  if (!payload || !payload.resource || !payload.topic) {
    console.warn(JSON.stringify({ level: 'WARN', traceId, message: 'Payload estruturalmente inválido.', payload }));
    return new Response('Bad Request: Missing required fields', { status: 400 });
  }

  console.log(JSON.stringify({
    level: 'INFO',
    traceId,
    message: 'Webhook recebido do MELI. Aceitando requisição.',
    topic: payload.topic,
    resource: payload.resource
  }));

  // A MÁGICA ACONTECE AQUI:
  // waitUntil diz ao Cloudflare: "Pode devolver a resposta pro cliente, mas mantenha a máquina ligada até essa promessa resolver."
  waitUntil(
    processNotificationBackground(payload, env, traceId)
  );

  // Resposta na velocidade da luz para o Mercado Livre (adeus Timeout 504)
  return new Response('Acknowledge', { 
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'X-Trace-Id': traceId
    }
  });
};
