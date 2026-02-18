import { useEffect, useMemo, useState } from 'react';
import { readCompanySettings, writeCompanySettings } from '../lib/companySettings';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import { inviteWorkspaceMember } from '../lib/workspaceApi';
import { listWorkspaceMembers, type WorkspaceMember } from '../lib/db';
import InstallOptionsPanel from '../components/InstallOptionsPanel';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler arquivo.'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  });
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(() => readCompanySettings());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const logoPreview = useMemo(() => settings.logo_data_url || settings.logo_url, [settings.logo_data_url, settings.logo_url]);

  function update<K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    writeCompanySettings(settings);
    setMsg('Configuracoes salvas.');
    setTimeout(() => setMsg(null), 2000);
  }

  useEffect(() => {
    writeCompanySettings(settings);
  }, [settings]);

  useEffect(() => {
    let alive = true;
    async function loadMembers() {
      try {
        const data = await listWorkspaceMembers();
        if (alive) setMembers(data);
      } catch {
        // ignore
      }
    }
    loadMembers();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setProfileName(String(user?.user_metadata?.full_name ?? ''));
    setProfileAvatarUrl(String(user?.user_metadata?.avatar_url ?? ''));
  }, [user?.id, user?.user_metadata]);

  async function handleLogoUpload(file?: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await toDataUrl(file);
      update('logo_data_url', dataUrl);
      update('logo_url', '');
    } finally {
      setBusy(false);
    }
  }

  function clearLogo() {
    update('logo_data_url', '');
    update('logo_url', '');
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) {
      setInviteMsg('Informe um email válido.');
      return;
    }
    setInviting(true);
    setInviteMsg(null);
    try {
      await inviteWorkspaceMember(inviteEmail.trim(), inviteRole);
      setInviteMsg('Convite enviado com sucesso.');
      setInviteEmail('');
      const data = await listWorkspaceMembers();
      setMembers(data);
    } catch (e: any) {
      setInviteMsg(e?.message ?? 'Falha ao convidar colaborador.');
    } finally {
      setInviting(false);
    }
  }

  async function handleProfileAvatarUpload(file?: File | null) {
    if (!file) return;
    setSavingProfile(true);
    try {
      const dataUrl = await toDataUrl(file);
      setProfileAvatarUrl(dataUrl);
      const { error } = await supabase.auth.updateUser({
        data: {
          ...(user?.user_metadata ?? {}),
          full_name: profileName.trim(),
          avatar_url: dataUrl
        }
      });
      if (error) throw error;
      setProfileMsg('Avatar atualizado.');
      setTimeout(() => setProfileMsg(null), 2000);
    } catch (e: any) {
      setProfileMsg(e?.message ?? 'Falha ao atualizar avatar.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          ...(user?.user_metadata ?? {}),
          full_name: profileName.trim(),
          avatar_url: profileAvatarUrl.trim()
        }
      });
      if (error) throw error;
      setProfileMsg('Perfil atualizado.');
      setTimeout(() => setProfileMsg(null), 2000);
    } catch (e: any) {
      setProfileMsg(e?.message ?? 'Falha ao atualizar perfil.');
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuracoes"
        subtitle="Dados da loja para documentos e exportacoes."
        actions={
          <button className="btn-primary" onClick={save}>
            Salvar
          </button>
        }
      />

      {msg ? (
        <div className="alert alert-success">
          {msg}
        </div>
      ) : null}

      <SectionCard title="Instalacao do aplicativo">
        <InstallOptionsPanel />
      </SectionCard>

      <SectionCard title="Perfil do usuario">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <div className="label mb-1">Nome de exibicao</div>
            <input
              className="input"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Seu nome"
            />
          </div>
          <div>
            <div className="label mb-1">URL do avatar</div>
            <input
              className="input"
              value={profileAvatarUrl}
              onChange={(e) => setProfileAvatarUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <div className="label mb-1">Upload de avatar</div>
            <input
              type="file"
              accept="image/*"
              className="input"
              onChange={(e) => handleProfileAvatarUpload(e.target.files?.[0])}
              disabled={savingProfile}
            />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="card flex h-12 w-12 items-center justify-center overflow-hidden rounded-full">
            {profileAvatarUrl ? (
              <img src={profileAvatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-gray-500">
                {(profileName || user?.email || 'U').slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <button className="btn-primary" onClick={handleSaveProfile} disabled={savingProfile}>
            {savingProfile ? 'Salvando...' : 'Salvar perfil'}
          </button>
          {profileMsg ? <div className="text-xs text-gray-500 dark:text-slate-400">{profileMsg}</div> : null}
        </div>
      </SectionCard>

      <SectionCard title="Identidade da loja">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="label mb-1">Nome da loja</div>
            <input className="input" value={settings.store_name} onChange={(e) => update('store_name', e.target.value)} />
          </div>
          <div>
            <div className="label mb-1">Razao social</div>
            <input className="input" value={settings.legal_name} onChange={(e) => update('legal_name', e.target.value)} />
          </div>
          <div>
            <div className="label mb-1">CPF</div>
            <input className="input" value={settings.cpf} onChange={(e) => update('cpf', e.target.value)} />
          </div>
          <div>
            <div className="label mb-1">CNPJ</div>
            <input className="input" value={settings.cnpj} onChange={(e) => update('cnpj', e.target.value)} />
          </div>
          <div>
            <div className="label mb-1">Email</div>
            <input className="input" value={settings.email} onChange={(e) => update('email', e.target.value)} />
          </div>
          <div>
            <div className="label mb-1">Telefone</div>
            <input className="input" value={settings.phone} onChange={(e) => update('phone', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <div className="label mb-1">Endereco</div>
            <input className="input" value={settings.address} onChange={(e) => update('address', e.target.value)} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Logotipo">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <div className="label mb-1">Link do logo (URL)</div>
            <input
              className="input"
              value={settings.logo_url}
              onChange={(e) => update('logo_url', e.target.value)}
              placeholder="https://..."
            />
            <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">
              Dica: para PDF offline, prefira upload para salvar localmente.
            </div>
          </div>
          <div>
            <div className="label mb-1">Upload do logo</div>
            <input
              type="file"
              accept="image/*"
              className="input"
              onChange={(e) => handleLogoUpload(e.target.files?.[0])}
              disabled={busy}
            />
            <button className="btn-ghost mt-2" type="button" onClick={clearLogo}>
              Remover logo
            </button>
          </div>
          <div>
            <div className="label mb-1">Preview</div>
            <div className="card flex h-24 items-center justify-center">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="max-h-20 max-w-full object-contain" />
              ) : (
                <div className="text-xs text-gray-400 dark:text-slate-500">Sem logo</div>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Colaboradores (SaaS)">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="label mb-1">Email do colaborador</div>
            <input
              className="input"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colaborador@email.com"
            />
          </div>
          <div>
            <div className="label mb-1">Função</div>
            <select className="input" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              <option value="member">Colaborador</option>
              <option value="manager">Gestor</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button className="btn-primary" onClick={handleInvite} disabled={inviting}>
            {inviting ? 'Enviando...' : 'Convidar'}
          </button>
          {inviteMsg ? <div className="text-xs text-gray-500 dark:text-slate-400">{inviteMsg}</div> : null}
        </div>
        <div className="mt-4 text-xs text-gray-500 dark:text-slate-400">
          O colaborador terá acesso imediato aos dados desta conta ao aceitar o convite.
        </div>
        <div className="mt-4">
          <div className="label mb-2">Equipe conectada</div>
          <div className="table-scroll">
            <table className="table-base w-full text-left text-xs">
              <thead>
                <tr>
                  <th>Membro</th>
                  <th>Owner</th>
                  <th>Função</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td className="truncate">{m.member_id}</td>
                    <td className="truncate">{m.owner_id}</td>
                    <td>{m.role || '-'}</td>
                  </tr>
                ))}
                {!members.length ? (
                  <tr>
                    <td colSpan={3} className="py-3 text-center text-gray-500">Nenhum colaborador ainda.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Impostos (configuracoes globais)">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <div className="label mb-1">Aliquota CBS (%)</div>
            <input
              className="input"
              inputMode="decimal"
              value={String(settings.tax_cbs)}
              onChange={(e) => update('tax_cbs', Number(String(e.target.value).replace(',', '.')) || 0)}
            />
          </div>
          <div>
            <div className="label mb-1">Aliquota IBS (%)</div>
            <input
              className="input"
              inputMode="decimal"
              value={String(settings.tax_ibs)}
              onChange={(e) => update('tax_ibs', Number(String(e.target.value).replace(',', '.')) || 0)}
            />
          </div>
          <div>
            <div className="label mb-1">Aliquota IS (%)</div>
            <input
              className="input"
              inputMode="decimal"
              value={String(settings.tax_is)}
              onChange={(e) => update('tax_is', Number(String(e.target.value).replace(',', '.')) || 0)}
            />
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">
          Essas aliquotas sao usadas no Dashboard e no Precificador.
        </div>
      </SectionCard>
    </div>
  );
}
