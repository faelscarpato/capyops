import { Env, getSupabaseAdmin, requireUser } from '../../meli/_shared';

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const user = await requireUser(request, env);
  const supabase = getSupabaseAdmin(env);

  const body = await request.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const role = String(body.role || 'member');
  if (!email) return new Response('Email obrigatório', { status: 400 });

  const { data: self } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('owner_id', user.id)
    .eq('member_id', user.id)
    .maybeSingle();
  if (!self) return new Response('Somente o owner pode convidar.', { status: 403 });

  let targetUserId: string | null = null;
  const { data: existingUser, error: getErr } = await supabase.auth.admin.getUserByEmail(email);
  if (getErr) throw getErr;
  if (existingUser?.user) {
    targetUserId = existingUser.user.id;
  } else {
    const { data: invited, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email);
    if (inviteErr) throw inviteErr;
    targetUserId = invited.user?.id ?? null;
  }

  if (!targetUserId) return new Response('Falha ao criar usuário.', { status: 400 });

  const { error } = await supabase.from('workspace_members').upsert({
    owner_id: user.id,
    member_id: targetUserId,
    role
  }, { onConflict: 'owner_id,member_id' });
  if (error) throw error;

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
