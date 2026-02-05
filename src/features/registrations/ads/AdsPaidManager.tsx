import { useEffect, useMemo, useState } from 'react';
import { deletePaidCampaign, readPaidCampaigns, upsertPaidCampaign } from '../../../lib/adsSettings';

function toNumber(value: string): number {
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function AdsPaidManager() {
  const [items, setItems] = useState(readPaidCampaigns());
  const [form, setForm] = useState({
    id: '',
    platform: '',
    campaign: '',
    daily_budget: '0',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    status: 'ativo'
  });

  useEffect(() => {
    setItems(readPaidCampaigns());
  }, []);

  const totalDaily = useMemo(() => items.reduce((acc, c) => acc + (c.status === 'ativo' ? c.daily_budget : 0), 0), [items]);

  function reset() {
    setForm({
      id: '',
      platform: '',
      campaign: '',
      daily_budget: '0',
      start_date: new Date().toISOString().slice(0, 10),
      end_date: '',
      status: 'ativo'
    });
  }

  function save() {
    if (!form.platform.trim() || !form.campaign.trim()) return;
    const next = upsertPaidCampaign({
      id: form.id || undefined,
      platform: form.platform.trim(),
      campaign: form.campaign.trim(),
      daily_budget: toNumber(form.daily_budget),
      start_date: form.start_date,
      end_date: form.end_date || null,
      status: form.status
    });
    setItems(next);
    reset();
  }

  function edit(id: string) {
    const c = items.find((x) => x.id === id);
    if (!c) return;
    setForm({
      id: c.id,
      platform: c.platform,
      campaign: c.campaign,
      daily_budget: String(c.daily_budget),
      start_date: c.start_date,
      end_date: c.end_date ?? '',
      status: c.status
    });
  }

  function remove(id: string) {
    setItems(deletePaidCampaign(id));
    if (form.id === id) reset();
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="text-sm font-semibold">Campanhas de tráfego pago</div>
        <div className="mt-2 text-xs text-gray-500">Orçamentos diários para controle rápido.</div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-6">
          <div>
            <div className="label mb-1">Plataforma</div>
            <input className="input" value={form.platform} onChange={(e) => setForm((s) => ({ ...s, platform: e.target.value }))} placeholder="ML Ads" />
          </div>
          <div className="md:col-span-2">
            <div className="label mb-1">Campanha</div>
            <input className="input" value={form.campaign} onChange={(e) => setForm((s) => ({ ...s, campaign: e.target.value }))} placeholder="Produto âncora" />
          </div>
          <div>
            <div className="label mb-1">Budget/dia</div>
            <input className="input" value={form.daily_budget} onChange={(e) => setForm((s) => ({ ...s, daily_budget: e.target.value }))} />
          </div>
          <div>
            <div className="label mb-1">Inicio</div>
            <input className="input" type="date" value={form.start_date} onChange={(e) => setForm((s) => ({ ...s, start_date: e.target.value }))} />
          </div>
          <div>
            <div className="label mb-1">Fim</div>
            <input className="input" type="date" value={form.end_date} onChange={(e) => setForm((s) => ({ ...s, end_date: e.target.value }))} />
          </div>
          <div>
            <div className="label mb-1">Status</div>
            <select className="input" value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}>
              <option value="ativo">Ativo</option>
              <option value="pausado">Pausado</option>
            </select>
          </div>
          <div className="md:col-span-6 flex gap-2">
            <button className="btn-primary" type="button" onClick={save}>{form.id ? 'Atualizar' : 'Adicionar'}</button>
            <button className="btn-ghost" type="button" onClick={reset}>Limpar</button>
            <div className="ml-auto text-xs text-gray-500">Budget ativo/dia: R$ {totalDaily.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="text-sm font-semibold">Lista de campanhas</div>
        <div className="table-scroll mt-3">
          <table className="table-base w-full text-left">
            <thead>
              <tr>
                <th>Plataforma</th>
                <th>Campanha</th>
                <th className="text-right">Budget/dia</th>
                <th>Periodo</th>
                <th>Status</th>
                <th className="text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td>{c.platform}</td>
                  <td>{c.campaign}</td>
                  <td className="text-right">R$ {c.daily_budget.toFixed(2)}</td>
                  <td>{c.start_date}{c.end_date ? ` → ${c.end_date}` : ''}</td>
                  <td>{c.status}</td>
                  <td className="text-right">
                    <button className="btn-ghost text-xs" onClick={() => edit(c.id)}>Editar</button>
                    <button className="btn-ghost text-xs text-red-600" onClick={() => remove(c.id)}>Remover</button>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-gray-500">
                    Nenhuma campanha cadastrada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
