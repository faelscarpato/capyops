export type Product = {
  id: string;
  name: string;
  variant: string;
  size_cm: number | null;
  sku?: string | null;
  category?: string | null;
  supplier_name?: string | null;
  lead_time_days?: number | null;
  ml_listing_id?: string | null;
  material: string;
  notes: string | null;
  cost: number;
  price: number;
  packing_kit_id: string | null;
  packaging_cost: number | null;
  weight_kg?: number | null; // Added
  stock: number;
  min_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SaleStatus = 'completed' | 'cancelled' | 'returned' | 'exchanged';

export type Sale = {
  id: string;
  product_id: string;
  ml_order_id?: string | null;
  quantity: number;
  channel: string;
  region: string | null;
  sale_price: number;
  shipping_cost: number;
  ml_fee_rate: number | null;
  packaging_cost: number | null;
  extra_cost: number;
  notes: string | null;
  sold_at: string;
  status?: SaleStatus;
  created_at: string;
  updated_at: string;
};

export type SaleException = {
  id: string;
  sale_id: string;
  type: 'cancellation' | 'return' | 'exchange';
  reason: string | null;
  restock_inventory: boolean;
  refund_amount: number;
  created_at: string;
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
  supplier_name: string | null;
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

export type MlListing = {
  id: string;
  ml_listing_id: string;
  title: string;
  url: string | null;
  price?: number | null;
  sold_quantity?: number | null;
  visits?: number | null;
  images_count: number | null;
  description_chars: number | null;
  has_full_description: boolean | null;
  listed_at: string | null;
  status?: string | null;
  payload?: any | null;
  last_sync_at?: string | null;
  notes: string | null;
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

export type MlQuestion = {
  id: string;
  ml_question_id: string | null;
  item_id: string | null;
  product_id: string | null;
  buyer_nickname: string | null;
  question_text: string;
  status: string;
  received_at: string;
  answered_at: string | null;
  answer_text: string | null;
  created_at: string;
  updated_at: string;
};

export type MeliMessage = {
  id: string;
  user_id: string;
  ml_message_id: string;
  payload: any | null;
  created_at: string;
  updated_at: string;
};

export type MeliFeedback = {
  id: string;
  user_id: string;
  ml_feedback_id: string;
  payload: any | null;
  created_at: string;
  updated_at: string;
};

export type CompetitorTracking = {
  id: string;
  my_product_id: string;
  competitor_mlb_id: string;
  last_price: number | null;
  target_price: number | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
};

// === Novos Cadastros (v2) ===

export type Client = {
  id: string;
  user_id: string;
  type: 'PF' | 'PJ';
  name: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  notes?: string | null;
  created_at?: string;
};

export type Supplier = {
  id: string;
  user_id: string;
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  doc_cnpj?: string | null;
  address?: string | null;
  lead_time_days?: number | null;
  notes?: string | null;
  created_at?: string;
};

export type StockMovement = {
  id: string;
  user_id: string;
  product_id: string;
  type: 'IN' | 'OUT' | 'ADJUST' | 'SALE' | 'RETURN';
  quantity: number;
  previous_stock?: number | null;
  new_stock?: number | null;
  reference_id?: string | null;
  notes?: string | null;
  created_at?: string;
};
