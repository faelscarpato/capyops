import { supabase } from './supabase';
import { getWorkspaceOwnerId } from './workspaceApi';
import type {
  Product,
  Sale,
  SaleException,
  SaleStatus,
  Supply,
  Expense,
  PackingKit,
  PackingKitItem,
  PurchaseQuote,
  PurchaseQuoteItem,
  MlQuestion,
  CompetitorTracking,
  MlListing,
  Client,
  Supplier,
  StockMovement
} from './types';

async function resolveOwnerId(): Promise<string> {
  const ownerId = getWorkspaceOwnerId();
  if (ownerId) return ownerId;
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const userId = data.user?.id;
  if (!userId) throw new Error('Usuário não autenticado.');
  return userId;
}

// === Produtos ===

export async function listProducts(opts?: { includeInactive?: boolean }): Promise<Product[]> {
  let q = supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true })
    .order('variant', { ascending: true });

  if (!opts?.includeInactive) {
    q = q.eq('is_active', true);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data as Product[]) ?? [];
}

export async function upsertProduct(p: Partial<Product> & { name: string; variant: string }): Promise<void> {
  if (p.ml_listing_id) {
    await ensureMlListing(p.ml_listing_id);
  }
  const ownerId = await resolveOwnerId();
  const { error } = await supabase.from('products').upsert(
    { ...p, user_id: ownerId },
    { onConflict: 'user_id,name,variant,size_cm' }
  );
  if (error) throw error;
}

export async function updateProduct(id: string, patch: Partial<Product>): Promise<void> {
  if (patch.ml_listing_id) {
    await ensureMlListing(patch.ml_listing_id);
  }
  const { error } = await supabase.from('products').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

export async function applySale(args: {
  product_id: string;
  quantity: number;
  channel: string;
  region?: string | null;
  sale_price: number;
  shipping_cost?: number;
  ml_fee_rate?: number | null;
  packaging_cost?: number | null;
  extra_cost?: number;
  notes?: string | null;
  sold_at?: string;
}): Promise<string> {
  const ownerId = await resolveOwnerId();
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('stock')
    .eq('id', args.product_id)
    .single();
  if (productError) throw productError;
  const prevStock = Number(product?.stock ?? 0);
  const newStock = prevStock - Number(args.quantity ?? 0);

  const { data: sale, error } = await supabase
    .from('sales')
    .insert({
      user_id: ownerId,
      product_id: args.product_id,
      quantity: args.quantity,
      channel: args.channel,
      region: args.region ?? null,
      sale_price: args.sale_price,
      shipping_cost: args.shipping_cost ?? 0,
      ml_fee_rate: args.ml_fee_rate ?? null,
      packaging_cost: args.packaging_cost ?? null,
      extra_cost: args.extra_cost ?? 0,
      notes: args.notes ?? null,
      sold_at: args.sold_at ?? new Date().toISOString(),
      status: 'completed'
    })
    .select('id')
    .single();
  if (error) throw error;
  const saleId = sale?.id as string;

  const { error: updateError } = await supabase.from('products').update({ stock: newStock }).eq('id', args.product_id);
  if (updateError) throw updateError;

  await supabase.from('stock_movements').insert({
    user_id: ownerId,
    product_id: args.product_id,
    type: 'SALE',
    quantity: args.quantity,
    previous_stock: prevStock,
    new_stock: newStock,
    reference_id: saleId,
    notes: args.notes ?? null
  });

  return saleId;
}

// === Tarefas diárias ===

export async function ensureTodayTasks(_defaultTasks: string[]): Promise<void> {
  const { error } = await supabase.rpc('ensure_daily_tasks');
  if (error) throw error;
}

export async function createTodayTask(task_name: string): Promise<void> {
  const task_date = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from('daily_tasks').insert({ task_date, task_name, done: false });
  if (error) throw error;
}

export async function getTodayTasks(): Promise<Array<{ id: string; task_name: string; done: boolean }>> {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const task_date = `${yyyy}-${mm}-${dd}`;

  const { data, error } = await supabase
    .from('daily_tasks')
    .select('id,task_name,done')
    .eq('task_date', task_date)
    .order('task_name', { ascending: true });
  if (error) throw error;
  return (data as any[]) ?? [];
}

export async function setTaskDone(id: string, done: boolean): Promise<void> {
  const { error } = await supabase.from('daily_tasks').update({ done }).eq('id', id);
  if (error) throw error;
}

// === Resumo de vendas ===

export async function getSalesSummaryLastNDays(days: number): Promise<{ gross: number; net_est: number; count: number }> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('sales')
    .select('quantity,sale_price,shipping_cost,ml_fee_rate,packaging_cost,extra_cost,product_id')
    .gte('sold_at', since)
    .or('status.is.null,status.eq.completed');
  if (error) throw error;

  let gross = 0;
  let net_est = 0;
  let count = 0;

  for (const row of (data as any[]) ?? []) {
    const qty = Number(row.quantity ?? 0);
    const sale_price = Number(row.sale_price ?? 0);
    const shipping = Number(row.shipping_cost ?? 0);
    const fee_rate = row.ml_fee_rate == null ? 0.17 : Number(row.ml_fee_rate);
    const packaging = row.packaging_cost == null ? 8 : Number(row.packaging_cost);
    const extra = Number(row.extra_cost ?? 0);

    const line_gross = qty * sale_price;
    const fee = line_gross * fee_rate;

    gross += line_gross;
    net_est += line_gross - fee - shipping - packaging - extra;
    count += 1;
  }

  return { gross, net_est, count };
}

export type TodaySaleRow = {
  sold_at: string;
  quantity: number;
  sale_price: number;
  product_id: string;
};

export async function listTodaySales(): Promise<TodaySaleRow[]> {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const startISO = new Date(`${yyyy}-${mm}-${dd}T00:00:00`).toISOString();
  const endISO = new Date(`${yyyy}-${mm}-${dd}T23:59:59`).toISOString();

  const { data, error } = await supabase
    .from('sales')
    .select('sold_at,quantity,sale_price,product_id')
    .gte('sold_at', startISO)
    .lte('sold_at', endISO)
    .or('status.is.null,status.eq.completed')
    .order('sold_at', { ascending: false });
  if (error) throw error;
  return (data as TodaySaleRow[]) ?? [];
}

export type SaleRow = {
  sold_at: string;
  quantity: number;
  sale_price: number;
  shipping_cost: number | null;
  ml_fee_rate: number | null;
  packaging_cost: number | null;
  extra_cost: number | null;
  product_id: string;
  region: string | null;
};

export async function listSalesInRange(startISO: string, endISO: string): Promise<SaleRow[]> {
  const { data, error } = await supabase
    .from('sales')
    .select('sold_at,quantity,sale_price,shipping_cost,ml_fee_rate,packaging_cost,extra_cost,product_id,region')
    .gte('sold_at', startISO)
    .lte('sold_at', endISO)
    .or('status.is.null,status.eq.completed');
  if (error) throw error;
  return (data as SaleRow[]) ?? [];
}

export type SalesHistoryRow = Sale & {
  product: { name: string; variant: string } | null;
};

export async function getSalesHistory(): Promise<SalesHistoryRow[]> {
  const { data, error } = await supabase
    .from('sales')
    .select('*,product:products(name,variant)')
    .order('sold_at', { ascending: false });
  if (error) throw error;
  return (data as SalesHistoryRow[]) ?? [];
}

export async function createSaleException(
  saleId: string,
  productId: string,
  qty: number,
  exceptionData: {
    type: SaleException['type'];
    reason?: string | null;
    restock_inventory?: boolean;
    refund_amount?: number;
  }
): Promise<void> {
  const { error: insertError } = await supabase.from('sale_exceptions').insert({
    sale_id: saleId,
    type: exceptionData.type,
    reason: exceptionData.reason ?? null,
    restock_inventory: exceptionData.restock_inventory ?? true,
    refund_amount: exceptionData.refund_amount ?? 0
  });
  if (insertError) throw insertError;

  const statusMap: Record<SaleException['type'], SaleStatus> = {
    cancellation: 'cancelled',
    return: 'returned',
    exchange: 'exchanged'
  };
  const { error: statusError } = await supabase.from('sales').update({ status: statusMap[exceptionData.type] }).eq('id', saleId);
  if (statusError) throw statusError;

  if (exceptionData.restock_inventory ?? true) {
    const { data: product, error: productError } = await supabase.from('products').select('stock').eq('id', productId).single();
    if (productError) throw productError;
    const currentStock = Number(product?.stock ?? 0);
    const { error: updateError } = await supabase.from('products').update({ stock: currentStock + Number(qty ?? 0) }).eq('id', productId);
    if (updateError) throw updateError;
  }
}

// === Insumos ===

export async function listSupplies(): Promise<Supply[]> {
  const { data, error } = await supabase
    .from('supplies')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data as Supply[]) ?? [];
}

export async function upsertSupply(p: Partial<Supply> & { name: string; category: string; unit: string }): Promise<void> {
  const ownerId = await resolveOwnerId();
  const { error } = await supabase.from('supplies').upsert(
    { ...p, user_id: ownerId },
    { onConflict: 'user_id,name' }
  );
  if (error) throw error;
}

export async function updateSupply(id: string, patch: Partial<Supply>): Promise<void> {
  const { error } = await supabase.from('supplies').update(patch).eq('id', id);
  if (error) throw error;
}

// === Despesas ===

export async function listExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase.from('expenses').select('*').order('paid_at', { ascending: false });
  if (error) throw error;
  return (data as Expense[]) ?? [];
}

export async function listExpensesInRange(startISO: string, endISO: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .gte('paid_at', startISO)
    .lte('paid_at', endISO)
    .order('paid_at', { ascending: true });
  if (error) throw error;
  return (data as Expense[]) ?? [];
}

export async function addExpense(e: {
  category: string;
  amount: number;
  payment_method?: string | null;
  vendor?: string | null;
  notes?: string | null;
  paid_at?: string;
}): Promise<void> {
  const ownerId = await resolveOwnerId();
  const { error } = await supabase.from('expenses').insert({
    user_id: ownerId,
    category: e.category,
    amount: e.amount,
    payment_method: e.payment_method ?? null,
    vendor: e.vendor ?? null,
    notes: e.notes ?? null,
    paid_at: e.paid_at ?? new Date().toISOString()
  });
  if (error) throw error;
}

// === Kits de Embalagem ===

export async function listPackingKits(): Promise<PackingKit[]> {
  const { data, error } = await supabase
    .from('packing_kits')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data as PackingKit[]) ?? [];
}

export async function upsertPackingKit(p: Partial<PackingKit> & { name: string }): Promise<void> {
  const ownerId = await resolveOwnerId();
  const { error } = await supabase.from('packing_kits').upsert(
    { ...p, user_id: (p as any).user_id ?? ownerId },
    { onConflict: 'user_id,name' }
  );
  if (error) throw error;
}

export async function updatePackingKit(id: string, patch: Partial<PackingKit>): Promise<void> {
  const { error } = await supabase.from('packing_kits').update(patch).eq('id', id);
  if (error) throw error;
}

export async function listPackingKitItems(kitId: string): Promise<PackingKitItem[]> {
  const { data, error } = await supabase
    .from('packing_kit_items')
    .select('*')
    .eq('kit_id', kitId);
  if (error) throw error;
  return (data as PackingKitItem[]) ?? [];
}

export async function listAllPackingKitItems(): Promise<PackingKitItem[]> {
  const { data, error } = await supabase.from('packing_kit_items').select('*');
  if (error) throw error;
  return (data as PackingKitItem[]) ?? [];
}

export async function upsertPackingKitItem(p: Partial<PackingKitItem> & { kit_id: string; supply_id: string; qty_per_order: number }): Promise<void> {
  const ownerId = await resolveOwnerId();
  const { error } = await supabase.from('packing_kit_items').upsert(
    { ...p, user_id: (p as any).user_id ?? ownerId },
    { onConflict: 'kit_id,supply_id' }
  );
  if (error) throw error;
}

export async function updatePackingKitItem(id: string, patch: Partial<PackingKitItem>): Promise<void> {
  const { error } = await supabase.from('packing_kit_items').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deletePackingKitItem(id: string): Promise<void> {
  const { error } = await supabase.from('packing_kit_items').delete().eq('id', id);
  if (error) throw error;
}

export async function applyPackingKit(kit_id: string): Promise<number> {
  const { data, error } = await supabase.rpc('apply_packing_kit', { p_kit_id: kit_id });
  if (error) throw error;
  return data as number;
}

export async function getPackingKitCost(kit_id: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_packing_kit_cost', { p_kit_id: kit_id });
  if (error) throw error;
  return data as number;
}

// === Orcamentos ===

export async function listPurchaseQuotes(): Promise<PurchaseQuote[]> {
  const { data, error } = await supabase
    .from('purchase_quotes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as PurchaseQuote[]) ?? [];
}

export async function createPurchaseQuote(p: {
  supplier_name: string;
  title?: string | null;
  status?: string;
  notes?: string | null;
}): Promise<PurchaseQuote> {
  const ownerId = await resolveOwnerId();
  const { data, error } = await supabase
    .from('purchase_quotes')
    .insert({
      user_id: ownerId,
      supplier_name: p.supplier_name,
      title: p.title ?? null,
      status: p.status ?? 'draft',
      notes: p.notes ?? null
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as PurchaseQuote;
}

export async function updatePurchaseQuote(id: string, patch: Partial<PurchaseQuote>): Promise<void> {
  const { error } = await supabase.from('purchase_quotes').update(patch).eq('id', id);
  if (error) throw error;
}

export async function listPurchaseQuoteItems(quoteId: string): Promise<PurchaseQuoteItem[]> {
  const { data, error } = await supabase
    .from('purchase_quote_items')
    .select('*')
    .eq('quote_id', quoteId);
  if (error) throw error;
  return (data as PurchaseQuoteItem[]) ?? [];
}

export async function listAllPurchaseQuoteItems(): Promise<PurchaseQuoteItem[]> {
  const { data, error } = await supabase.from('purchase_quote_items').select('*');
  if (error) throw error;
  return (data as PurchaseQuoteItem[]) ?? [];
}

export async function addPurchaseQuoteItem(p: {
  quote_id: string;
  supply_id?: string | null;
  product_id?: string | null;
  description: string;
  unit: string;
  qty: number;
  unit_cost: number;
}): Promise<void> {
  const ownerId = await resolveOwnerId();
  const { error } = await supabase.from('purchase_quote_items').insert({
    user_id: ownerId,
    quote_id: p.quote_id,
    supply_id: p.supply_id ?? null,
    product_id: p.product_id ?? null,
    description: p.description,
    unit: p.unit,
    qty: p.qty,
    unit_cost: p.unit_cost
  });
  if (error) throw error;
}

export async function updatePurchaseQuoteItem(id: string, patch: Partial<PurchaseQuoteItem>): Promise<void> {
  const { error } = await supabase.from('purchase_quote_items').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deletePurchaseQuoteItem(id: string): Promise<void> {
  const { error } = await supabase.from('purchase_quote_items').delete().eq('id', id);
  if (error) throw error;
}

// === Perguntas ML ===

export async function listMlQuestions(): Promise<MlQuestion[]> {
  const { data, error } = await supabase
    .from('ml_questions')
    .select('*')
    .order('received_at', { ascending: false });
  if (error) throw error;
  return (data as MlQuestion[]) ?? [];
}

export async function getPendingMlQuestionsCount(): Promise<number> {
  const { count, error } = await supabase
    .from('ml_questions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');
  if (error) throw error;
  return count ?? 0;
}

export async function listPendingMlQuestions(limit = 5): Promise<MlQuestion[]> {
  const { data, error } = await supabase
    .from('ml_questions')
    .select('*')
    .eq('status', 'pending')
    .order('received_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as MlQuestion[]) ?? [];
}

export async function createMlQuestion(payload: {
  ml_question_id?: string | null;
  item_id?: string | null;
  product_id?: string | null;
  buyer_nickname?: string | null;
  question_text: string;
  status?: string;
  received_at?: string;
}): Promise<MlQuestion> {
  const { data, error } = await supabase
    .from('ml_questions')
    .insert({
      ml_question_id: payload.ml_question_id ?? null,
      item_id: payload.item_id ?? null,
      product_id: payload.product_id ?? null,
      buyer_nickname: payload.buyer_nickname ?? null,
      question_text: payload.question_text,
      status: payload.status ?? 'pending',
      received_at: payload.received_at ?? new Date().toISOString()
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as MlQuestion;
}

export async function answerMlQuestion(id: string, answer_text: string): Promise<void> {
  const { error } = await supabase
    .from('ml_questions')
    .update({
      status: 'answered',
      answer_text,
      answered_at: new Date().toISOString()
    })
    .eq('id', id);
  if (error) throw error;
}

export async function setMlQuestionStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('ml_questions')
    .update({
      status,
      answered_at: status === 'answered' ? new Date().toISOString() : null
    })
    .eq('id', id);
  if (error) throw error;
}

// === Competitor Tracking ===

export async function listCompetitorTracking(): Promise<CompetitorTracking[]> {
  const { data, error } = await supabase
    .from('competitor_tracking')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as CompetitorTracking[]) ?? [];
}

/**
 * Alertas simples: considera "em alerta" quando last_price <= target_price.
 * Sem depender de API externa (por enquanto).
 */
export async function getCompetitorAlertCount(): Promise<number> {
  const { data, error } = await supabase
    .from('competitor_tracking')
    .select('id,last_price,target_price')
    .not('last_price', 'is', null)
    .not('target_price', 'is', null);
  if (error) throw error;
  const rows = (data as any[]) ?? [];
  return rows.filter((r) => Number(r.last_price) <= Number(r.target_price)).length;
}

export async function listCompetitorAlerts(limit = 5): Promise<CompetitorTracking[]> {
  const { data, error } = await supabase
    .from('competitor_tracking')
    .select('*')
    .not('last_price', 'is', null)
    .not('target_price', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  const rows = (data as CompetitorTracking[]) ?? [];
  const filtered = rows.filter((r) => Number(r.last_price ?? Infinity) <= Number(r.target_price ?? -Infinity));
  return filtered.slice(0, limit);
}

export async function upsertCompetitorTracking(payload: {
  my_product_id: string;
  competitor_mlb_id: string;
  target_price?: number | null;
}): Promise<void> {
  const ownerId = await resolveOwnerId();
  const { error } = await supabase.from('competitor_tracking').upsert(
    {
      user_id: ownerId,
      my_product_id: payload.my_product_id,
      competitor_mlb_id: payload.competitor_mlb_id,
      target_price: payload.target_price ?? null
    },
    { onConflict: 'user_id,my_product_id,competitor_mlb_id' }
  );
  if (error) throw error;
}

export async function updateCompetitorTracking(id: string, patch: Partial<CompetitorTracking>): Promise<void> {
  const { error } = await supabase.from('competitor_tracking').update(patch).eq('id', id);
  if (error) throw error;
}

// === Estoque preditivo ===

export type SalesSampleRow = {
  product_id: string;
  quantity: number;
  sold_at: string;
};

export async function listSalesSince(startISO: string): Promise<SalesSampleRow[]> {
  const { data, error } = await supabase
    .from('sales')
    .select('product_id,quantity,sold_at')
    .gte('sold_at', startISO)
    .or('status.is.null,status.eq.completed');
  if (error) throw error;
  return (data as SalesSampleRow[]) ?? [];
}

export async function getExceptionRateLastNDays(
  days: number
): Promise<{ rate: number; total: number; problem: number }> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { count: totalCount, error: totalError } = await supabase
    .from('sales')
    .select('id', { count: 'exact', head: true })
    .gte('sold_at', since);
  if (totalError) throw totalError;

  const { count: problemCount, error: problemError } = await supabase
    .from('sales')
    .select('id', { count: 'exact', head: true })
    .gte('sold_at', since)
    .in('status', ['cancelled', 'returned', 'exchanged']);
  if (problemError) throw problemError;

  const total = totalCount ?? 0;
  const problem = problemCount ?? 0;
  const rate = total > 0 ? (problem / total) * 100 : 0;
  return { rate, total, problem };
}

// === Mercado Livre — Anúncios ===

export async function listMlListings(): Promise<MlListing[]> {
  const { data, error } = await supabase
    .from('ml_listings')
    .select('*')
    .order('listed_at', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as MlListing[]) ?? [];
}

export async function upsertMlListing(listing: Partial<MlListing> & { ml_listing_id: string }): Promise<void> {
  const payload: any = { ...listing };
  // do not send id if empty
  if (!payload.id) delete payload.id;
  const { error } = await supabase.from('ml_listings').upsert(payload, { onConflict: 'ml_listing_id' });
  if (error) throw error;
}

export async function deleteMlListing(id: string): Promise<void> {
  const { error } = await supabase.from('ml_listings').delete().eq('id', id);
  if (error) throw error;
}

// === Mercado Livre (Accounts + Events) ===

export type MeliAccount = {
  id: string;
  user_id: string;
  ml_user_id: string | null;
  nickname: string | null;
  status: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getMeliAccount(): Promise<MeliAccount | null> {
  const { data, error } = await supabase.from('meli_accounts').select('*').maybeSingle();
  if (error) throw error;
  return (data as MeliAccount) ?? null;
}

export type InternalEvent = {
  id: string;
  type: string | null;
  title: string | null;
  body: string | null;
  payload: any | null;
  created_at: string;
  read_at: string | null;
};

export async function listInternalEvents(limit = 10): Promise<InternalEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as InternalEvent[]) ?? [];
}

export async function getUnreadInternalEventsCount(): Promise<number> {
  const { count, error } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

export async function markInternalEventRead(id: string): Promise<void> {
  const { error } = await supabase.from('events').update({ read_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export type MeliShipment = {
  id: string;
  ml_shipment_id: string;
  status: string | null;
  payload: any | null;
  created_at: string;
  updated_at: string;
};

export type MeliOrder = {
  id: string;
  ml_order_id: string;
  status: string | null;
  payload: any | null;
  created_at: string;
  updated_at: string;
};

export async function listMeliOrders(limit = 50): Promise<MeliOrder[]> {
  const { data, error } = await supabase
    .from('meli_orders')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as MeliOrder[]) ?? [];
}

export async function listMeliShipments(limit = 10): Promise<MeliShipment[]> {
  const { data, error } = await supabase
    .from('meli_shipments')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as MeliShipment[]) ?? [];
}

export type MeliHealthSignals = {
  orders_at: string | null;
  items_at: string | null;
  questions_at: string | null;
  messages_at: string | null;
  shipments_at: string | null;
  feedback_at: string | null;
};

async function latestTimestamp(table: string, column: string) {
  const { data, error } = await supabase
    .from(table)
    .select(column)
    .order(column, { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as any)?.[column] ?? null;
}

export async function getMeliHealthSignals(): Promise<MeliHealthSignals> {
  const [orders_at, messages_at, shipments_at, feedback_at, questions_at, items_sync] = await Promise.all([
    latestTimestamp('meli_orders', 'updated_at'),
    latestTimestamp('meli_messages', 'updated_at'),
    latestTimestamp('meli_shipments', 'updated_at'),
    latestTimestamp('meli_feedback', 'updated_at'),
    latestTimestamp('ml_questions', 'received_at'),
    latestTimestamp('ml_listings', 'last_sync_at')
  ]);

  return {
    orders_at,
    items_at: items_sync,
    questions_at,
    messages_at,
    shipments_at,
    feedback_at
  };
}

export type WorkspaceMember = {
  id: string;
  owner_id: string;
  member_id: string;
  role: string | null;
  created_at: string;
};

export async function listWorkspaceMembers(): Promise<WorkspaceMember[]> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as WorkspaceMember[]) ?? [];
}

// === Clientes (v2) ===

export async function listClients(type?: 'PF' | 'PJ'): Promise<Client[]> {
  let q = supabase.from('clients').select('*').order('name');
  if (type) q = q.eq('type', type);
  const { data, error } = await q;
  if (error) throw error;
  return (data as Client[]) ?? [];
}

export async function upsertClient(p: Partial<Client> & { name: string; type: 'PF' | 'PJ' }): Promise<void> {
  const ownerId = await resolveOwnerId();
  const { error } = await supabase.from('clients').upsert({ ...p, user_id: ownerId });
  if (error) throw error;
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
}

// === Fornecedores (v2) ===

export async function listSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase.from('suppliers').select('*').order('name');
  if (error) throw error;
  return (data as Supplier[]) ?? [];
}

export async function upsertSupplier(p: Partial<Supplier> & { name: string }): Promise<void> {
  const ownerId = await resolveOwnerId();
  const { error } = await supabase.from('suppliers').upsert({ ...p, user_id: ownerId });
  if (error) throw error;
}

export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (error) throw error;
}

// === Stock Movements (Audit) ===

export async function logStockMovement(m: Omit<StockMovement, 'id' | 'user_id' | 'created_at'>): Promise<void> {
  const ownerId = await resolveOwnerId();
  const { error } = await supabase.from('stock_movements').insert({ ...m, user_id: ownerId });
  if (error) throw error;
}

async function ensureMlListing(mlListingId: string): Promise<void> {
  const ownerId = await resolveOwnerId();

  const { data: existing, error: selectError } = await supabase
    .from('ml_listings')
    .select('id')
    .eq('ml_listing_id', mlListingId)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing?.id) return;

  const { error: insertError } = await supabase
      .from('ml_listings')
      .upsert(
      { ml_listing_id: mlListingId, ml_item_id: mlListingId, title: mlListingId, user_id: ownerId },
      { onConflict: 'ml_listing_id' }
    );
  if (insertError) throw insertError;
}
