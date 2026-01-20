-- Seed manual (substitua {{USER_ID}} pelo UUID do seu usuário em auth.users)
-- Dica: pegue em Supabase Dashboard -> Authentication -> Users

insert into public.app_settings (user_id)
values ('{{USER_ID}}')
on conflict (user_id) do nothing;

insert into public.products (user_id, name, variant, size_cm, material, cost, price, stock, min_stock, notes)
values
  ('{{USER_ID}}', 'São Miguel Arcanjo Gargano', 'branco',    20, 'resina_marmorizada', 45, 159.90, 0, 2, 'Mix inicial'),
  ('{{USER_ID}}', 'São Miguel Arcanjo Gargano', 'sombreado', 20, 'resina_marmorizada', 50, 179.90, 0, 2, 'Mix inicial'),
  ('{{USER_ID}}', 'Carlo Acutis',               'branco',    20, 'resina_marmorizada', 45, 159.90, 0, 2, 'Mix inicial'),
  ('{{USER_ID}}', 'Carlo Acutis',               'sombreado', 20, 'resina_marmorizada', 50, 179.90, 0, 2, 'Mix inicial'),
  ('{{USER_ID}}', 'Sagrada Família',            'branco',    20, 'resina_marmorizada', 50, 179.90, 0, 2, 'Mix inicial'),
  ('{{USER_ID}}', 'Sagrada Família',            'sombreado', 20, 'resina_marmorizada', 55, 199.90, 0, 2, 'Mix inicial'),
  ('{{USER_ID}}', 'Nossa Senhora Aparecida',    'branco',    23, 'resina_marmorizada', 45, 169.90, 0, 2, 'Mix inicial'),
  ('{{USER_ID}}', 'Nossa Senhora Aparecida',    'sombreado', 23, 'resina_marmorizada', 50, 189.90, 0, 2, 'Mix inicial'),
  ('{{USER_ID}}', 'São Miguel Veronese',        'branco',    30, 'resina_marmorizada', 90, 299.90, 0, 1, 'Premium âncora'),
  ('{{USER_ID}}', 'São Miguel Veronese',        'sombreado', 30, 'resina_marmorizada',100, 349.90, 0, 1, 'Premium âncora')
on conflict (user_id, name, variant, size_cm) do nothing;
