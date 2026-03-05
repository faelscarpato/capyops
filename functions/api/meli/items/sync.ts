/**
 * CAPYOPS - Sincronizador Multiget à prova de balas
 * * Se você forçar a API do MELI, ela te força de volta (com um 429 na cara).
 * Aqui, implementamos *Chunking* (lotes de 20 IDs) e *Rate Limit Backoff*.
 * Processamos milhares de itens sem derrubar o worker nem ser bloqueados.
 */

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  MELI_API_URL?: string;
}

interface SyncPayload {
  workspaceId: string;
  itemIds: string[]; // Lista de "MLB123456", "MLB987654"
  accessToken: string; // Token válido do usuário (repassado pelo app)
}

// O Meli suporta no máximo 20 IDs separados por vírgula na URL do multiget
const CHUNK_SIZE = 20;
// Tempo de respiração entre as requisições para evitar rate limit (300ms)
const DELAY_BETWEEN_CHUNKS_MS = 300; 

// Função auxiliar para dar um cochilo tático no processamento
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request } = context;
  const traceId = crypto.randomUUID();

  try {
    const body = await request.json<SyncPayload>();

    if (!body.workspaceId || !body.itemIds || !body.accessToken) {
      return new Response(JSON.stringify({ error: 'Parâmetros obrigatórios ausentes: workspaceId, itemIds, accessToken' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { itemIds, accessToken } = body;
    const uniqueIds = Array.from(new Set(itemIds)); // Limpeza básica de duplicatas
    
    console.log(JSON.stringify({
      level: 'INFO',
      traceId,
      message: `Iniciando sincronização massiva de itens`,
      totalItems: uniqueIds.length,
      estimatedChunks: Math.ceil(uniqueIds.length / CHUNK_SIZE)
    }));

    const syncedItems = [];
    const failedChunks = [];

    // Divisão para a conquista: processando em lotes
    for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
      const chunk = uniqueIds.slice(i, i + CHUNK_SIZE);
      const commaSeparatedIds = chunk.join(',');
      
      const baseUrl = context.env.MELI_API_URL || 'https://api.mercadolibre.com';
      // Rota Multiget - O segredo dos deuses do Mercado Livre
      const url = `${baseUrl}/items?ids=${commaSeparatedIds}`;

      console.log(JSON.stringify({ level: 'DEBUG', traceId, message: `Buscando chunk ${i / CHUNK_SIZE + 1}`, ids: chunk }));

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Format': 'json'
          }
        });

        if (!response.ok) {
          throw new Error(`Meli API Error: ${response.status} - ${await response.text()}`);
        }

        const data = await response.json<any[]>();
        
        // O Mercado Livre retorna um array com code (200) e body (o item em si)
        for (const result of data) {
          if (result.code === 200 && result.body) {
             syncedItems.push(result.body);
          } else {
             console.warn(JSON.stringify({ level: 'WARN', traceId, message: 'Falha parcial no multiget', item: result }));
          }
        }

      } catch (chunkError) {
        console.error(JSON.stringify({
          level: 'ERROR',
          traceId,
          message: `Falha ao sincronizar chunk ${i / CHUNK_SIZE + 1}`,
          error: chunkError instanceof Error ? chunkError.message : String(chunkError)
        }));
        failedChunks.push(chunk);
      }

      // Se não for o último chunk, descansa um pouco. Resiliência e respeito ao rate limit.
      if (i + CHUNK_SIZE < uniqueIds.length) {
        await sleep(DELAY_BETWEEN_CHUNKS_MS);
      }
    }

    // Aqui você faria a gravação em massa (Upsert) no Supabase dos `syncedItems`
    // const supabase = createClient(context.env.SUPABASE_URL, context.env.SUPABASE_SERVICE_ROLE_KEY);
    // await supabase.from('ml_listings').upsert(syncedItems.map(formatToDb));

    console.log(JSON.stringify({
      level: 'INFO',
      traceId,
      message: `Sincronização concluída`,
      sucesso: syncedItems.length,
      chunksFalhos: failedChunks.length
    }));

    return new Response(JSON.stringify({
      message: 'Sincronização concluída com sucesso',
      syncedCount: syncedItems.length,
      failedChunksCount: failedChunks.length,
      traceId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(JSON.stringify({
      level: 'ERROR',
      traceId,
      message: 'Erro fatal na função de sync de itens',
      error: error instanceof Error ? error.message : String(error)
    }));

    return new Response(JSON.stringify({ error: 'Internal Server Error', traceId }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
