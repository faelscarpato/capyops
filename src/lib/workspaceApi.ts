import { supabase } from './supabase';

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error('Sessão inválida.');
  return token;
}

export async function ensureWorkspace(): Promise<{ owner_id: string }> {
  const token = await getAccessToken();
  const res = await fetch('/api/admin/workspace/ensure', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Falha ao garantir workspace.');
  const data = await res.json();
  if (data?.owner_id) window.localStorage.setItem('workspace_owner_id', data.owner_id);
  return data;
}

export async function inviteWorkspaceMember(email: string, role: string): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch('/api/admin/workspace/invite', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, role })
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || 'Falha ao convidar colaborador.');
  }
}

export function getWorkspaceOwnerId(): string | null {
  return window.localStorage.getItem('workspace_owner_id');
}
