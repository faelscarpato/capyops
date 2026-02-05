import { Env, getSupabaseAdmin, meliFetch, refreshToken, requireUser, resolveOwnerId } from '../_shared';

async function getAccountAndToken(env: Env, userId: string, supabase: any) {
  const { data: account, error } = await supabase.from('meli_accounts').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!account) throw new Error('Conta ML não conectada.');

  let accessToken = account.access_token;
  const expiresAt = account.expires_at ? new Date(account.expires_at).getTime() : 0;
  if (!accessToken || expiresAt < Date.now() + 60000) {
    const refreshed = await refreshToken(env, account.refresh_token);
    accessToken = refreshed.access_token;
    const nextExpiresAt = new Date(Date.now() + Number(refreshed.expires_in || 0) * 1000).toISOString();
    await supabase.from('meli_accounts').update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token ?? account.refresh_token,
      expires_at: nextExpiresAt
    }).eq('id', account.id);
  }

  return { accessToken };
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const user = await requireUser(request, env);
  const supabase = getSupabaseAdmin(env);
  const ownerId = await resolveOwnerId(supabase, user.id);

  const { accessToken } = await getAccountAndToken(env, ownerId, supabase);

  const { data: orders, error } = await supabase
    .from('meli_orders')
    .select('payload')
    .eq('user_id', ownerId)
    .order('updated_at', { ascending: false })
    .limit(120);
  if (error) throw error;

  const ids = new Set<string>();
  for (const row of (orders as any[]) ?? []) {
    const payload = row?.payload || {};
    const shipId = payload?.shipping?.id;
    if (shipId) ids.add(String(shipId));
  }

  let synced = 0;

  for (const shipmentId of ids) {
    try {
      const ship = await meliFetch(env, `/shipments/${shipmentId}`, accessToken, { 'x-format-new': 'true' });
      await supabase.from('meli_shipments').upsert({
        user_id: ownerId,
        ml_shipment_id: String(ship.id || shipmentId),
        status: ship.status ?? null,
        payload: ship
      }, { onConflict: 'ml_shipment_id' });
      synced += 1;
    } catch {
      // ignore individual shipment failures
    }
  }

  return new Response(JSON.stringify({ synced }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
