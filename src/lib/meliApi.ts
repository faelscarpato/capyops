import { supabase } from './supabase';
import { requestBlob, requestJson } from './http';

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error('Sessão inválida.');
  return token;
}

export async function meliOAuthStart(): Promise<{ url: string }> {
  const token = await getAccessToken();
  return requestJson<{ url: string }>('/api/meli/oauth/start', {
    method: 'POST',
    credentials: 'omit',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    timeoutMs: 15_000,
    actionLabel: 'iniciar OAuth'
  });
}

export async function meliOAuthCallback(code: string, state: string): Promise<{ ok: boolean }> {
  const token = await getAccessToken();
  return requestJson<{ ok: boolean }>('/api/meli/oauth/callback', {
    method: 'POST',
    credentials: 'omit',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code, state }),
    timeoutMs: 15_000,
    actionLabel: 'concluir OAuth'
  });
}

export async function meliDisconnect(): Promise<{ ok: boolean }> {
  const token = await getAccessToken();
  return requestJson<{ ok: boolean }>('/api/meli/oauth/disconnect', {
    method: 'POST',
    credentials: 'omit',
    headers: { Authorization: `Bearer ${token}` },
    timeoutMs: 15_000,
    actionLabel: 'desconectar integração'
  });
}

export async function meliProcessWorker(): Promise<{ processed: number }> {
  const token = await getAccessToken();
  return requestJson<{ processed: number }>('/api/meli/worker', {
    method: 'POST',
    credentials: 'omit',
    headers: { Authorization: `Bearer ${token}` },
    timeoutMs: 15_000,
    actionLabel: 'processar pendências'
  });
}

export async function meliSyncOrders(): Promise<{ synced: number }> {
  const token = await getAccessToken();
  return requestJson<{ synced: number }>('/api/meli/orders/sync', {
    method: 'POST',
    credentials: 'omit',
    headers: { Authorization: `Bearer ${token}` },
    timeoutMs: 15_000,
    actionLabel: 'sincronizar pedidos'
  });
}

export async function meliSyncItems(): Promise<{ synced: number }> {
  const token = await getAccessToken();
  return requestJson<{ synced: number }>('/api/meli/items/sync', {
    method: 'POST',
    credentials: 'omit',
    headers: { Authorization: `Bearer ${token}` },
    timeoutMs: 15_000,
    actionLabel: 'sincronizar catálogo'
  });
}

export async function meliUpdateItem(payload: { ml_listing_id: string; data: any }): Promise<{ ok: boolean }> {
  const token = await getAccessToken();
  return requestJson<{ ok: boolean }>('/api/meli/items/update', {
    method: 'POST',
    credentials: 'omit',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ml_listing_id: payload.ml_listing_id, payload: payload.data }),
    timeoutMs: 15_000,
    actionLabel: 'atualizar anúncio'
  });
}

export async function meliDownloadLabel(shipmentId: string): Promise<void> {
  const token = await getAccessToken();
  const blob = await requestBlob('/api/meli/shipments/label', {
    method: 'POST',
    credentials: 'omit',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ shipment_id: shipmentId }),
    timeoutMs: 20_000,
    actionLabel: 'baixar etiqueta'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `etiqueta-${shipmentId}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function meliSyncShipments(): Promise<{ synced: number }> {
  const token = await getAccessToken();
  return requestJson<{ synced: number }>('/api/meli/shipments/sync', {
    method: 'POST',
    credentials: 'omit',
    headers: { Authorization: `Bearer ${token}` },
    timeoutMs: 15_000,
    actionLabel: 'sincronizar envios'
  });
}
