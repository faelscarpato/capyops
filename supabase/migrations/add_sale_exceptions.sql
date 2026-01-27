-- Adiciona status na tabela de vendas
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed';

-- Tabela de excecoes
CREATE TABLE IF NOT EXISTS public.sale_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('cancellation', 'return', 'exchange')),
  reason text,
  restock_inventory boolean DEFAULT true,
  refund_amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.sale_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own exceptions" ON public.sale_exceptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own exceptions" ON public.sale_exceptions FOR INSERT WITH CHECK (auth.uid() = user_id);
