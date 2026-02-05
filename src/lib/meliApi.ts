import { supabase } from './supabase';

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error('Sessão inválida.');
  return token;
}

export async function meliOAuthStart(): Promise<{ url: string }> {
  const token = await getAccessToken();
  const res = await fetch('/api/meli/oauth/start', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) throw new Error('Falha ao iniciar OAuth.');
  return res.json();
}

export async function meliOAuthCallback(code: string, state: string): Promise<{ ok: boolean }> {
  const token = await getAccessToken();
  const res = await fetch('/api/meli/oauth/callback', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code, state })
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || 'Falha ao concluir OAuth.');
  }
  return res.json();
}

export async function meliDisconnect(): Promise<{ ok: boolean }> {
  const token = await getAccessToken();
  const res = await fetch('/api/meli/oauth/disconnect', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Falha ao desconectar.');
  return res.json();
}

export async function meliProcessWorker(): Promise<{ processed: number }> {
  const token = await getAccessToken();
  const res = await fetch('/api/meli/worker', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Falha ao processar pendências.');
  return res.json();
}

export async function meliSyncOrders(): Promise<{ synced: number }> {
  const token = await getAccessToken();
  const res = await fetch('/api/meli/orders/sync', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Falha ao sincronizar pedidos.');
  return res.json();
}

export async function meliSyncItems(): Promise<{ synced: number }> {
  const token = await getAccessToken();
  const res = await fetch('/api/meli/items/sync', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Falha ao sincronizar catálogo.');
  return res.json();
}

export async function meliUpdateItem(payload: { ml_listing_id: string; data: any }): Promise<{ ok: boolean }> {
  const token = await getAccessToken();
  const res = await fetch('/api/meli/items/update', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ml_listing_id: payload.ml_listing_id, payload: payload.data })
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || 'Falha ao atualizar anúncio.');
  }
  return res.json();
}

export async function meliDownloadLabel(shipmentId: string): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch('/api/meli/shipments/label', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ shipment_id: shipmentId })
  });
  if (!res.ok) throw new Error('Falha ao baixar etiqueta.');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `etiqueta-${shipmentId}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
