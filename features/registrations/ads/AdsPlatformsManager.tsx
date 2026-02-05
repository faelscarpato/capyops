import { useEffect, useState } from 'react';
import { deleteAdsPlatform, readAdsPlatforms, upsertAdsPlatform } from '../../../lib/adsSettings';

function toNumber(value: string): number {
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function AdsPlatformsManager() {
  const [items, setItems] = useState(readAdsPlatforms());
  const [form, setForm] = useState({
    id: '',
    name: '',
    fee_percent: '0',
    avg_shipping_cost: '0',
    notes: ''
  });

  useEffect(() => {
    setItems(readAdsPlatforms());
  }, []);

  function reset() {
    setForm({ id: '', name: '', fee_percent: '0', avg_shipping_cost: '0', notes: '' });
  }

  function save() {
    if (!form.name.trim()) return;
    const next = upsertAdsPlatform({
      id: form.id || undefined,
      name: form.name.trim(),
      fee_percent: toNumber(form.fee_percent),
      avg_shipping_cost: toNumber(form.avg_shipping_cost),
      notes: form.notes.trim() || null
    });
    setItems(next);
    reset();
  }

  function edit(id: string) {
    const p = items.find((x) => x.id === id);
    if (!p) return;
    setForm({
      id: p.id,
      name: p.name,
      fee_percent: String(p.fee_percent),
      avg_shipping_cost: String(p.avg_shipping_cost),
      notes: p.notes ?? ''
    });
  }

  function remove(id: string) {
    setItems(deleteAdsPlatform(id));
    if (form.id === id) reset();
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="text-sm font-semibold">Plataformas e taxas</div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="label mb-1">Plataforma</div>
            <input className="input" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="Mercado Livre" />
          </div>
          <div>
            <div className="label mb-1">Taxa (%)</div>
            <input className="input" value={form.fee_percent} onChange={(e) => setForm((s) => ({ ...s, fee_percent: e.target.value }))} />
          </div>
          <div>
            <div className="label mb-1">Frete médio (R$)</div>
            <input className="input" value={form.avg_shipping_cost} onChange={(e) => setForm((s) => ({ ...s, avg_shipping_cost: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <div className="label mb-1">Notas</div>
            <input className="input" value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} placeholder="Observacoes" />
          </div>
          <div className="md:col-span-5 flex gap-2">
            <button className="btn-primary" type="button" onClick={save}>{form.id ? 'Atualizar' : 'Adicionar'}</button>
            <button className="btn-ghost" type="button" onClick={reset}>Limpar</button>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="text-sm font-semibold">Tabela de plataformas</div>
        <div className="table-scroll mt-3">
          <table className="table-base w-full text-left">
            <thead>
              <tr>
                <th>Plataforma</th>
                <th className="text-right">Taxa</th>
                <th className="text-right">Frete médio</th>
                <th>Notas</th>
                <th className="text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td className="text-right">{p.fee_percent}%</td>
                  <td className="text-right">R$ {p.avg_shipping_cost.toFixed(2)}</td>
                  <td className="table-muted">{p.notes || '—'}</td>
                  <td className="text-right">
                    <button className="btn-ghost text-xs" onClick={() => edit(p.id)}>Editar</button>
                    <button className="btn-ghost text-xs text-red-600" onClick={() => remove(p.id)}>Remover</button>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-gray-500">
                    Nenhuma plataforma cadastrada.
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
