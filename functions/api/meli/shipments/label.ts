import { Env, getSupabaseAdmin, refreshToken, requireUser, resolveOwnerId } from '../_shared';

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

  const body = await request.json().catch(() => ({}));
  const shipmentId = String(body.shipment_id || '');
  if (!shipmentId) return new Response('shipment_id required', { status: 400 });

  const { accessToken } = await getAccountAndToken(env, ownerId, supabase);

  const res = await fetch(`https://api.mercadolibre.com/shipment_labels?shipment_ids=${shipmentId}&response_type=pdf`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const txt = await res.text();
    return new Response(txt || 'Label fetch failed', { status: 400 });
  }

  const blob = await res.arrayBuffer();
  return new Response(blob, {
    status: 200,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'application/pdf',
      'Content-Disposition': `attachment; filename=etiqueta-${shipmentId}.pdf`
    }
  });
};
