import { Env, getSupabaseAdmin, requireUser, resolveOwnerId } from '../_shared';

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const user = await requireUser(request, env);
  const supabase = getSupabaseAdmin(env);
  const ownerId = await resolveOwnerId(supabase, user.id);

  const { error: accountError } = await supabase.from('meli_accounts').delete().eq('user_id', ownerId);
  if (accountError) throw accountError;

  await supabase
    .from('meli_oauth_states')
    .delete()
    .eq('user_id', ownerId)
    .is('used_at', null);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
