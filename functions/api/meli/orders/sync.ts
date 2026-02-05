import { Env, getSupabaseAdmin, meliFetch, refreshToken, requireUser, resolveOwnerId } from '../_shared';

async function getAccountAndToken(env: Env, userId: string, supabase: any) {
  const { data: account, error } = await supabase.from('meli_accounts').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
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

  return { account, accessToken };
}

function isPaidOrder(order: any): boolean {
  if (!order) return false;
  if (order.status === 'paid') return true;
  if (Array.isArray(order.payments)) {
    return order.payments.some((p: any) => p?.status === 'approved' || p?.status === 'paid');
  }
  return false;
}

async function ensureClient(supabase: any, ownerId: string, order: any) {
  const buyer = order?.buyer || {};
  const buyerName =
    [buyer.first_name, buyer.last_name].filter(Boolean).join(' ').trim() ||
    buyer.nickname ||
    'Cliente ML';
  const buyerEmail = buyer.email || null;

  if (!buyerName && !buyerEmail) return;

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

async function createSalesAndStock(supabase: any, ownerId: string, order: any) {
  if (!isPaidOrder(order)) return;

  const orderId = String(order.id || '');
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

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const user = await requireUser(request, env);
  const supabase = getSupabaseAdmin(env);
  const ownerId = await resolveOwnerId(supabase, user.id);

  const { account, accessToken } = await getAccountAndToken(env, ownerId, supabase);

  const { data: lastOrder } = await supabase
    .from('meli_orders')
    .select('updated_at')
    .eq('user_id', ownerId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastTs = lastOrder?.updated_at ? new Date(lastOrder.updated_at).getTime() : 0;
  const since = new Date((lastTs || Date.now() - 7 * 24 * 60 * 60 * 1000) - 60 * 60 * 1000).toISOString();

  let synced = 0;
  let sales_created = 0;
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

    for (const item of orders) {
      const orderId = String(item.id || '');
      const order = await meliFetch(env, `/orders/${orderId}`, accessToken, { 'x-format-new': 'true' });

      await supabase.from('meli_orders').upsert({
        user_id: ownerId,
        ml_order_id: orderId,
        status: order.status ?? null,
        payload: order
      }, { onConflict: 'ml_order_id' });

      await ensureClient(supabase, ownerId, order);
      await createSalesAndStock(supabase, ownerId, order);
      synced += 1;
      if (isPaidOrder(order)) sales_created += 1;
    }

    offset += limit;
    safety += 1;
  } while (offset < total && safety < 200);

  return new Response(JSON.stringify({ synced, sales_created }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
