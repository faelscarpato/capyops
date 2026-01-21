import { supabase } from './supabase';
import type {
  Product,
  Supply,
  Expense,
  PackingKit,
  PackingKitItem,
  PurchaseQuote,
  PurchaseQuoteItem
} from './types';

// === Produtos ===

export async function listProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })
    .order('variant', { ascending: true });
  if (error) throw error;
  return (data as Product[]) ?? [];
}

export async function upsertProduct(p: Partial<Product> & { name: string; variant: string }): Promise<void> {
  const { error } = await supabase.from('products').upsert(p, { onConflict: 'user_id,name,variant,size_cm' });
  if (error) throw error;
}

export async function updateProduct(id: string, patch: Partial<Product>): Promise<void> {
  const { error } = await supabase.from('products').update(patch).eq('id', id);
  if (error) throw error;
}

export async function applySale(args: {
  product_id: string;
  quantity: number;
  channel: string;
  sale_price: number;
  shipping_cost?: number;
  ml_fee_rate?: number | null;
  packaging_cost?: number | null;
  extra_cost?: number;
  notes?: string | null;
  sold_at?: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('apply_sale', {
    p_product_id: args.product_id,
    p_quantity: args.quantity,
    p_channel: args.channel,
    p_sale_price: args.sale_price,
    p_shipping_cost: args.shipping_cost ?? 0,
    p_ml_fee_rate: args.ml_fee_rate ?? null,
    p_packaging_cost: args.packaging_cost ?? null,
    p_extra_cost: args.extra_cost ?? 0,
    p_notes: args.notes ?? null,
    p_sold_at: args.sold_at ?? new Date().toISOString()
  });
  if (error) throw error;
  return data as string;
}

// === Tarefas diárias ===

export async function ensureTodayTasks(_defaultTasks: string[]): Promise<void> {
  const { error } = await supabase.rpc('ensure_daily_tasks');
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
    .gte('sold_at', since);
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
};

export async function listSalesInRange(startISO: string, endISO: string): Promise<SaleRow[]> {
  const { data, error } = await supabase
    .from('sales')
    .select('sold_at,quantity,sale_price,shipping_cost,ml_fee_rate,packaging_cost,extra_cost')
    .gte('sold_at', startISO)
    .lte('sold_at', endISO);
  if (error) throw error;
  return (data as SaleRow[]) ?? [];
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
  const { error } = await supabase.from('supplies').upsert(p, { onConflict: 'user_id,name' });
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

export async function addExpense(e: {
  category: string;
  amount: number;
  payment_method?: string | null;
  vendor?: string | null;
  notes?: string | null;
  paid_at?: string;
}): Promise<void> {
  const { error } = await supabase.from('expenses').insert({
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
  const { error } = await supabase.from('packing_kits').upsert(p, { onConflict: 'user_id,name' });
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
  const { error } = await supabase.from('packing_kit_items').upsert(p, { onConflict: 'kit_id,supply_id' });
  if (error) throw error;
}

export async function updatePackingKitItem(id: string, patch: Partial<PackingKitItem>): Promise<void> {
  const { error } = await supabase.from('packing_kit_items').update(patch).eq('id', id);
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
  const { data, error } = await supabase
    .from('purchase_quotes')
    .insert({
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
  description: string;
  unit: string;
  qty: number;
  unit_cost: number;
}): Promise<void> {
  const { error } = await supabase.from('purchase_quote_items').insert({
    quote_id: p.quote_id,
    supply_id: p.supply_id ?? null,
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
