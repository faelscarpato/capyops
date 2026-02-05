import { Env, getSupabaseAdmin, refreshToken, requireUser } from '../_shared';

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

  return { account, accessToken };
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const user = await requireUser(request, env);
  const supabase = getSupabaseAdmin(env);

  const body = await request.json().catch(() => ({}));
  const listingId = String(body.ml_listing_id || '');
  const payload = body.payload || {};
  if (!listingId) return new Response('ml_listing_id required', { status: 400 });

  const { accessToken } = await getAccountAndToken(env, user.id, supabase);

  const res = await fetch(`https://api.mercadolibre.com/items/${listingId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const txt = await res.text();
    return new Response(txt || 'ML update failed', { status: 400 });
  }

  const updated = await res.json();

  await supabase.from('ml_listings').update({
    title: updated.title ?? null,
    price: updated.price ?? null,
    status: updated.status ?? null,
    sold_quantity: updated.sold_quantity ?? null,
    thumbnail: updated.thumbnail ?? null,
    last_sync_at: new Date().toISOString(),
    payload: updated
  }).eq('ml_listing_id', listingId);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
