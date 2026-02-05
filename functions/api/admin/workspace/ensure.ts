import { Env, getSupabaseAdmin, requireUser } from '../../meli/_shared';

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const user = await requireUser(request, env);
  const supabase = getSupabaseAdmin(env);

  const { data: member } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('member_id', user.id)
    .maybeSingle();

  if (!member) {
    await supabase.from('workspace_members').insert({
      owner_id: user.id,
      member_id: user.id,
      role: 'owner'
    });
    return new Response(JSON.stringify({ owner_id: user.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ owner_id: member.owner_id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
