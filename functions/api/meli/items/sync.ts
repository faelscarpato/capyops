import { Env, getSupabaseAdmin, meliFetch, refreshToken, requireUser } from '../_shared';

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

  const { account, accessToken } = await getAccountAndToken(env, user.id, supabase);

  const search = await meliFetch(env, `/users/${account.ml_user_id}/items/search`, accessToken);
  const ids: string[] = (search?.results || []) as string[];
  if (!ids.length) {
    return new Response(JSON.stringify({ synced: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const chunks: string[][] = [];
  const size = 20;
  for (let i = 0; i < ids.length; i += size) chunks.push(ids.slice(i, i + size));

  let synced = 0;

  for (const chunk of chunks) {
    const items = await meliFetch(env, `/items?ids=${chunk.join(',')}`, accessToken);

    for (const it of items || []) {
      const body = it.body || {};
      const mlId = body.id;
      if (!mlId) continue;

      let visitCount: number | null = null;
      try {
        const v = await meliFetch(env, `/visits/items?ids=${mlId}`, accessToken);
        visitCount = typeof v?.[mlId] === 'number' ? v[mlId] : null;
      } catch {
        visitCount = null;
      }

      await supabase.from('ml_listings').upsert({
        ml_listing_id: mlId,
        title: body.title ?? null,
        url: body.permalink ?? body.url ?? null,
        price: body.price ?? null,
        status: body.status ?? null,
        sold_quantity: body.sold_quantity ?? null,
        visits: visitCount,
        thumbnail: body.thumbnail ?? null,
        images_count: Array.isArray(body.pictures) ? body.pictures.length : null,
        description_chars: null,
        has_full_description: null,
        listed_at: body.date_created ?? null,
        payload: body,
        last_sync_at: new Date().toISOString(),
        user_id: user.id
      }, { onConflict: 'ml_listing_id' });
      synced += 1;
    }
  }

  return new Response(JSON.stringify({ synced }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
