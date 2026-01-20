import { supabase } from './supabase';
import type { Product } from './types';

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

export async function ensureTodayTasks(defaultTasks: string[]): Promise<void> {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const task_date = `${yyyy}-${mm}-${dd}`;

  const payload = defaultTasks.map((task_name) => ({ task_name, task_date, done: false }));
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
    net_est += (line_gross - fee - shipping - packaging - extra);
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
