import { useEffect, useMemo, useState } from 'react';
import { readCompanySettings, writeCompanySettings } from '../lib/companySettings';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler arquivo.'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  });
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(() => readCompanySettings());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/30 dark:text-emerald-200">
          {msg}
        </div>
      ) : null}

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
            <div className="flex h-24 items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="max-h-20 max-w-full object-contain" />
              ) : (
                <div className="text-xs text-gray-400 dark:text-slate-500">Sem logo</div>
              )}
            </div>
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
