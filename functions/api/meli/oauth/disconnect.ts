import { Env, getSupabaseAdmin, requireUser } from '../_shared';

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const user = await requireUser(request, env);
  const supabase = getSupabaseAdmin(env);

  const { error } = await supabase.from('meli_accounts').delete().eq('user_id', user.id);
  if (error) throw error;

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
