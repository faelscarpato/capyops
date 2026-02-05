import { Env, getSupabaseAdmin, meliFetch, refreshToken, requireUser } from './_shared';

function getIdFromResource(resource?: string | null): string | null {
  if (!resource) return null;
  const parts = resource.split('/').filter(Boolean);
  return parts[parts.length - 1] || null;
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const user = await requireUser(request, env);
  const supabase = getSupabaseAdmin(env);

  const { data: events, error } = await supabase
    .from('meli_webhook_events')
    .select('*')
    .eq('status', 'pending')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(20);
  if (error) throw error;

  let processed = 0;

  for (const ev of events || []) {
    try {
      const { data: account, error: accError } = await supabase
        .from('meli_accounts')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (accError) throw accError;
      if (!account) throw new Error('Conta ML não conectada.');

      let accessToken = account.access_token;
      const expiresAt = account.expires_at ? new Date(account.expires_at).getTime() : 0;
      if (!accessToken || expiresAt < Date.now() + 60000) {
        const refreshed = await refreshToken(env, account.refresh_token);
        accessToken = refreshed.access_token;
        const nextExpiresAt = new Date(Date.now() + Number(refreshed.expires_in || 0) * 1000).toISOString();
        await supabase.from('meli_accounts').update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token ?? account.refresh_token,
          expires_at: nextExpiresAt
        }).eq('id', account.id);
      }

      const topic = String(ev.topic || '');
      const resource = ev.resource as string | null;
      const mlId = getIdFromResource(resource);

      if (!resource) throw new Error('Webhook sem resource.');

      if (topic.includes('orders')) {
        const order = await meliFetch(env, resource, accessToken);
        await supabase.from('meli_orders').upsert({
          user_id: user.id,
          ml_order_id: String(order.id || mlId),
          status: order.status ?? null,
          payload: order
        }, { onConflict: 'ml_order_id' });
        await supabase.from('events').insert({
          user_id: user.id,
          type: 'ml_order',
          title: 'Novo pedido ML',
          body: `Pedido ${order.id} • ${order.status}`,
          payload: order
        });
      } else if (topic.includes('questions')) {
        const q = await meliFetch(env, resource, accessToken);
        const { data: existing } = await supabase.from('ml_questions').select('id').eq('ml_question_id', String(q.id)).maybeSingle();
        if (!existing) {
          await supabase.from('ml_questions').insert({
            ml_question_id: String(q.id),
            item_id: q.item_id ?? null,
            product_id: null,
            buyer_nickname: q.from?.nickname ?? null,
            question_text: q.text ?? '',
            status: q.status ?? 'pending',
            received_at: q.date_created ?? new Date().toISOString()
          });
        }
        await supabase.from('events').insert({
          user_id: user.id,
          type: 'ml_question',
          title: 'Nova pergunta ML',
          body: q.text ?? 'Pergunta recebida',
          payload: q
        });
      } else if (topic.includes('messages')) {
        const msg = await meliFetch(env, resource, accessToken);
        await supabase.from('meli_messages').upsert({
          user_id: user.id,
          ml_message_id: String(msg.id || mlId),
          payload: msg
        }, { onConflict: 'ml_message_id' });
        await supabase.from('events').insert({
          user_id: user.id,
          type: 'ml_message',
          title: 'Nova mensagem ML',
          body: 'Mensagem recebida',
          payload: msg
        });
      } else if (topic.includes('shipments')) {
        const ship = await meliFetch(env, resource, accessToken);
        await supabase.from('meli_shipments').upsert({
          user_id: user.id,
          ml_shipment_id: String(ship.id || mlId),
          status: ship.status ?? null,
          payload: ship
        }, { onConflict: 'ml_shipment_id' });
        await supabase.from('events').insert({
          user_id: user.id,
          type: 'ml_shipment',
          title: 'Atualização de envio ML',
          body: ship.status ?? 'Status atualizado',
          payload: ship
        });
      } else if (topic.includes('feedback')) {
        const fb = await meliFetch(env, resource, accessToken);
        await supabase.from('meli_feedback').upsert({
          user_id: user.id,
          ml_feedback_id: String(fb.id || mlId),
          payload: fb
        }, { onConflict: 'ml_feedback_id' });
        await supabase.from('events').insert({
          user_id: user.id,
          type: 'ml_feedback',
          title: 'Novo feedback ML',
          body: fb.message || 'Feedback recebido',
          payload: fb
        });
      }

      await supabase.from('meli_webhook_events').update({ status: 'processed', processed_at: new Date().toISOString() }).eq('id', ev.id);
      processed += 1;
    } catch (e: any) {
      await supabase.from('meli_webhook_events').update({
        status: 'error',
        error: e?.message ?? 'Erro desconhecido',
        processed_at: new Date().toISOString()
      }).eq('id', ev.id);
    }
  }

  return new Response(JSON.stringify({ processed }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
