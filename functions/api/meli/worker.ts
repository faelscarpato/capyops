import { Env, getSupabaseAdmin, meliFetch, refreshToken, requireUser, resolveOwnerId } from './_shared';

function getIdFromResource(resource?: string | null): string | null {
  if (!resource) return null;
  const parts = resource.split('/').filter(Boolean);
  return parts[parts.length - 1] || null;
}

function isPaidOrder(order: any): boolean {
  if (!order) return false;
  if (order.status === 'paid') return true;
  if (Array.isArray(order.payments)) {
    return order.payments.some((p: any) => p?.status === 'approved' || p?.status === 'paid');
  }
  return false;
}

async function ensureValidToken(env: Env, supabase: any, account: any) {
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
  return accessToken;
}

async function processOrderForSales(supabase: any, ownerId: string, order: any) {
  if (!isPaidOrder(order)) return;

  const orderId = String(order.id || '');
  const buyer = order.buyer || {};
  const buyerName =
    [buyer.first_name, buyer.last_name].filter(Boolean).join(' ').trim() ||
    buyer.nickname ||
    'Cliente ML';
  const buyerEmail = buyer.email || null;

  if (buyerName || buyerEmail) {
    let existingClient: any = null;
    if (buyerEmail) {
      const { data } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', ownerId)
        .eq('email', buyerEmail)
        .maybeSingle();
      existingClient = data ?? null;
    } else {
      const { data } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', ownerId)
        .eq('name', buyerName)
        .maybeSingle();
      existingClient = data ?? null;
    }
    if (!existingClient) {
      await supabase.from('clients').insert({
        user_id: ownerId,
        type: 'PF',
        name: buyerName,
        email: buyerEmail,
        notes: buyer.nickname ? `Cliente ML (${buyer.nickname})` : 'Cliente ML'
      });
    }
  }

  const items = Array.isArray(order.order_items) ? order.order_items : [];
  for (const item of items) {
    const itemId = String(item?.item?.id || item?.item_id || item?.id || '');
    const sku = item?.item?.seller_sku || item?.seller_sku || item?.sku || null;

    let product: any = null;
    if (itemId) {
      const { data } = await supabase
        .from('products')
        .select('id,stock,min_stock,name')
        .eq('user_id', ownerId)
        .eq('ml_listing_id', itemId)
        .maybeSingle();
      product = data ?? null;
    }
    if (!product && sku) {
      const { data } = await supabase
        .from('products')
        .select('id,stock,min_stock,name')
        .eq('user_id', ownerId)
        .eq('sku', sku)
        .maybeSingle();
      product = data ?? null;
    }

    if (!product) {
      await supabase.from('events').insert({
        user_id: ownerId,
        type: 'ml_order_missing_product',
        title: 'Produto não encontrado',
        body: `Pedido ${orderId} • SKU/Item sem match`,
        payload: { order_id: orderId, item_id: itemId, sku }
      });
      continue;
    }

    const { data: existingSale } = await supabase
      .from('sales')
      .select('id')
      .eq('ml_order_id', orderId)
      .eq('product_id', product.id)
      .maybeSingle();
    if (existingSale?.id) continue;

    const qty = Number(item?.quantity ?? 1);
    const unitPrice = Number(item?.unit_price ?? item?.full_unit_price ?? order?.total_amount ?? 0);
    const soldAt = order?.date_closed ?? order?.date_created ?? new Date().toISOString();

    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        user_id: ownerId,
        product_id: product.id,
        quantity: qty,
        channel: 'mercado_livre',
        region: order?.shipping?.receiver_address?.state?.name ?? null,
        sale_price: unitPrice,
        shipping_cost: 0,
        ml_fee_rate: null,
        packaging_cost: null,
        extra_cost: 0,
        notes: `Pedido ML ${orderId}`,
        sold_at: soldAt,
        status: 'completed',
        ml_order_id: orderId
      })
      .select('id')
      .single();
    if (saleError) throw saleError;

    const prevStock = Number(product.stock ?? 0);
    const newStock = prevStock - qty;
    await supabase.from('products').update({ stock: newStock }).eq('id', product.id);
    await supabase.from('stock_movements').insert({
      user_id: ownerId,
      product_id: product.id,
      type: 'SALE',
      quantity: qty,
      previous_stock: prevStock,
      new_stock: newStock,
      reference_id: orderId,
      notes: `Pedido ML ${orderId}`
    });

    if (product.min_stock != null && newStock <= Number(product.min_stock)) {
      await supabase.from('events').insert({
        user_id: ownerId,
        type: 'stock_low',
        title: 'Estoque baixo',
        body: `${product.name || 'Produto'} abaixo do mínimo`,
        payload: { product_id: product.id, stock: newStock }
      });
    }
  }
}

async function syncOrders(env: Env, supabase: any, account: any, ownerId: string) {
  const accessToken = await ensureValidToken(env, supabase, account);

  const { data: lastOrder } = await supabase
    .from('meli_orders')
    .select('updated_at')
    .eq('user_id', ownerId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastTs = lastOrder?.updated_at ? new Date(lastOrder.updated_at).getTime() : 0;
  const since = new Date((lastTs || Date.now() - 7 * 24 * 60 * 60 * 1000) - 60 * 60 * 1000).toISOString();

  const limit = 50;
  let offset = 0;
  let total = 0;
  let safety = 0;

  do {
    const search = await meliFetch(
      env,
      `/orders/search?seller=${account.ml_user_id}&order.date_last_updated.from=${encodeURIComponent(since)}&limit=${limit}&offset=${offset}`,
      accessToken
    );
    const orders: any[] = (search?.results || []) as any[];
    const paging = search?.paging || {};
    total = Number(paging.total ?? orders.length);

    for (const order of orders) {
      const orderId = String(order.id || '');
      await supabase.from('meli_orders').upsert({
        user_id: ownerId,
        ml_order_id: orderId,
        status: order.status ?? null,
        payload: order
      }, { onConflict: 'ml_order_id' });
      await processOrderForSales(supabase, ownerId, order);
    }

    offset += limit;
    safety += 1;
  } while (offset < total && safety < 200);
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const user = await requireUser(request, env);
  const supabase = getSupabaseAdmin(env);
  const ownerId = await resolveOwnerId(supabase, user.id);

  const { data: events, error } = await supabase
    .from('meli_webhook_events')
    .select('*')
    .eq('status', 'pending')
    .eq('user_id', ownerId)
    .order('created_at', { ascending: true })
    .limit(20);
  if (error) throw error;

  let processed = 0;

  const { data: account, error: accError } = await supabase
    .from('meli_accounts')
    .select('*')
    .eq('user_id', ownerId)
    .maybeSingle();
  if (accError) throw accError;
  if (!account) throw new Error('Conta ML não conectada.');

  const accessToken = await ensureValidToken(env, supabase, account);

  // Poll orders to ensure sales sync (even if webhook failed)
  await syncOrders(env, supabase, account, ownerId);

  for (const ev of events || []) {
    try {

      const topic = String(ev.topic || '');
      const resource = ev.resource as string | null;
      const mlId = getIdFromResource(resource);

      if (!resource) throw new Error('Webhook sem resource.');

      if (topic.includes('orders')) {
        const order = await meliFetch(env, resource, accessToken, { 'x-format-new': 'true' });
        const orderId = String(order.id || mlId);
        await supabase.from('meli_orders').upsert({
          user_id: ownerId,
          ml_order_id: orderId,
          status: order.status ?? null,
          payload: order
        }, { onConflict: 'ml_order_id' });
        await processOrderForSales(supabase, ownerId, order);

        if (order.shipping?.id) {
          const ship = await meliFetch(env, `/shipments/${order.shipping.id}`, accessToken, { 'x-format-new': 'true' });
          await supabase.from('meli_shipments').upsert({
            user_id: ownerId,
            ml_shipment_id: String(ship.id || order.shipping.id),
            status: ship.status ?? null,
            payload: ship
          }, { onConflict: 'ml_shipment_id' });
          const deadline =
            ship?.shipping_option?.estimated_handling_limit?.date ??
            ship?.estimated_handling_limit?.date ??
            ship?.date_created ??
            null;
          await supabase.from('events').insert({
            user_id: ownerId,
            type: 'ml_shipment_deadline',
            title: 'Prazo de postagem',
            body: deadline ? `Postar até ${new Date(deadline).toLocaleString('pt-BR')}` : 'Novo envio criado',
            payload: ship
          });
        }
        await supabase.from('events').insert({
          user_id: ownerId,
          type: 'ml_order',
          title: 'Novo pedido ML',
          body: `Pedido ${orderId} • ${order.status}`,
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
          user_id: ownerId,
          type: 'ml_question',
          title: 'Nova pergunta ML',
          body: q.text ?? 'Pergunta recebida',
          payload: q
        });
      } else if (topic.includes('messages')) {
        const msg = await meliFetch(env, resource, accessToken);
        await supabase.from('meli_messages').upsert({
          user_id: ownerId,
          ml_message_id: String(msg.id || mlId),
          payload: msg
        }, { onConflict: 'ml_message_id' });
        await supabase.from('events').insert({
          user_id: ownerId,
          type: 'ml_message',
          title: 'Nova mensagem ML',
          body: 'Mensagem recebida',
          payload: msg
        });
      } else if (topic.includes('shipments')) {
        const ship = await meliFetch(env, resource, accessToken);
        await supabase.from('meli_shipments').upsert({
          user_id: ownerId,
          ml_shipment_id: String(ship.id || mlId),
          status: ship.status ?? null,
          payload: ship
        }, { onConflict: 'ml_shipment_id' });
        await supabase.from('events').insert({
          user_id: ownerId,
          type: 'ml_shipment',
          title: 'Atualização de envio ML',
          body: ship.status ?? 'Status atualizado',
          payload: ship
        });
      } else if (topic.includes('feedback')) {
        const fb = await meliFetch(env, resource, accessToken);
        await supabase.from('meli_feedback').upsert({
          user_id: ownerId,
          ml_feedback_id: String(fb.id || mlId),
          payload: fb
        }, { onConflict: 'ml_feedback_id' });
        await supabase.from('events').insert({
          user_id: ownerId,
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
