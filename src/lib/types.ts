export type Product = {
  id: string;
  name: string;
  variant: string;
  size_cm: number | null;
  material: string;
  notes: string | null;
  cost: number;
  price: number;
  packing_kit_id: string | null;
  packaging_cost: number | null;
  stock: number;
  min_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Sale = {
  id: string;
  product_id: string;
  quantity: number;
  channel: string;
  sale_price: number;
  shipping_cost: number;
  ml_fee_rate: number | null;
  packaging_cost: number | null;
  extra_cost: number;
  notes: string | null;
  sold_at: string;
  created_at: string;
  updated_at: string;
};

export type DailyTask = {
  id: string;
  task_name: string;
  task_date: string; // YYYY-MM-DD
  done: boolean;
  created_at: string;
  updated_at: string;
};

export type Alert = {
  id: string;
  product_id: string | null;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  resolved: boolean;
  created_at: string;
  resolved_at: string | null;
};

// === Novos tipos ===

export type Supply = {
  id: string;
  name: string;
  category: string;
  unit: string;
  cost_per_unit: number;
  stock_qty: number;
  min_qty: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Expense = {
  id: string;
  category: string;
  amount: number;
  payment_method: string | null;
  vendor: string | null;
  notes: string | null;
  paid_at: string;
  created_at: string;
  updated_at: string;
};

export type PackingKit = {
  id: string;
  name: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PackingKitItem = {
  id: string;
  kit_id: string;
  supply_id: string;
  qty_per_order: number;
  created_at: string;
  updated_at: string;
};

export type PurchaseQuote = {
  id: string;
  supplier_name: string;
  title: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PurchaseQuoteItem = {
  id: string;
  quote_id: string;
  supply_id: string | null;
  product_id: string | null;
  description: string;
  unit: string;
  qty: number;
  unit_cost: number;
  created_at: string;
  updated_at: string;
};
