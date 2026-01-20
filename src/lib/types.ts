export type Product = {
  id: string;
  name: string;
  variant: string;
  size_cm: number | null;
  material: string;
  notes: string | null;
  cost: number;
  price: number;
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
