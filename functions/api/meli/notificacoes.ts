import { Env, getSupabaseAdmin } from './_shared';

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const req = ctx.request;
  const supabase = getSupabaseAdmin(ctx.env);

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = { raw: await req.text() };
  }

  const payload = body || {};
  const topic = payload.topic ?? payload.type ?? null;
  const resource = payload.resource ?? null;
  let userId: string | null = null;
  const mlUserId = payload.user_id ? String(payload.user_id) : null;
  if (mlUserId) {
    const { data: acc } = await supabase
      .from('meli_accounts')
      .select('user_id')
      .eq('ml_user_id', mlUserId)
      .maybeSingle();
    userId = acc?.user_id ?? null;
  }

  await supabase.from('meli_webhook_events').insert({
    user_id: userId,
    topic,
    resource,
    payload,
    status: 'pending'
  });

  return new Response('ok', { status: 200 });
};
