import { supabase } from './supabase';
import { requestJson } from './http';

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error('Sessão inválida.');
  return token;
}

export async function ensureWorkspace(): Promise<{ owner_id: string }> {
  const token = await getAccessToken();
  const data = await requestJson<{ owner_id: string }>('/api/admin/workspace/ensure', {
    method: 'POST',
    // Evita 431 (Request Header Fields Too Large) se existirem cookies enormes no domínio.
    // Autenticação é por Bearer token; não precisamos enviar cookies.
    credentials: 'omit',
    headers: { Authorization: `Bearer ${token}` },
    timeoutMs: 15_000,
    actionLabel: 'garantir workspace'
  });
  if (data?.owner_id) window.localStorage.setItem('workspace_owner_id', data.owner_id);
  return data;
}

export async function inviteWorkspaceMember(email: string, role: string): Promise<void> {
  const token = await getAccessToken();
  await requestJson<{ ok?: boolean }>('/api/admin/workspace/invite', {
    method: 'POST',
    credentials: 'omit',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, role }),
    timeoutMs: 15_000,
    actionLabel: 'convidar colaborador'
  });
}

export function getWorkspaceOwnerId(): string | null {
  return window.localStorage.getItem('workspace_owner_id');
}
