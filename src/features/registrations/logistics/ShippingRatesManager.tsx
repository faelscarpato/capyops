import { useEffect, useState } from 'react';
import { deleteShippingRate, readShippingRates, upsertShippingRate } from '../../../lib/logisticsSettings';

function toNumber(value: string): number {
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function ShippingRatesManager() {
  const [items, setItems] = useState(readShippingRates());
  const [form, setForm] = useState({
    id: '',
    region: 'BR',
    carrier: 'Correios',
    service: 'Padrao',
    base_cost: '0',
    cost_per_kg: '0',
    eta_days: '3',
    notes: ''
  });

  useEffect(() => {
    setItems(readShippingRates());
  }, []);

  function reset() {
    setForm({
      id: '',
      region: 'BR',
      carrier: 'Correios',
      service: 'Padrao',
      base_cost: '0',
      cost_per_kg: '0',
      eta_days: '3',
      notes: ''
    });
  }

  function save() {
    if (!form.region.trim() || !form.carrier.trim() || !form.service.trim()) return;
    const next = upsertShippingRate({
      id: form.id || undefined,
      region: form.region.trim(),
      carrier: form.carrier.trim(),
      service: form.service.trim(),
      base_cost: toNumber(form.base_cost),
      cost_per_kg: toNumber(form.cost_per_kg),
      eta_days: toNumber(form.eta_days),
      notes: form.notes.trim() || null
    });
    setItems(next);
    reset();
  }

  function edit(id: string) {
    const r = items.find((x) => x.id === id);
    if (!r) return;
    setForm({
      id: r.id,
      region: r.region,
      carrier: r.carrier,
      service: r.service,
      base_cost: String(r.base_cost),
      cost_per_kg: String(r.cost_per_kg),
      eta_days: String(r.eta_days),
      notes: r.notes ?? ''
    });
  }

  function remove(id: string) {
    setItems(deleteShippingRate(id));
    if (form.id === id) reset();
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="text-sm font-semibold">Taxas e prazos de frete</div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-6">
          <div>
            <div className="label mb-1">Regiao</div>
            <input className="input" value={form.region} onChange={(e) => setForm((s) => ({ ...s, region: e.target.value }))} placeholder="BR, SP, Sul" />
          </div>
          <div>
            <div className="label mb-1">Transportadora</div>
            <input className="input" value={form.carrier} onChange={(e) => setForm((s) => ({ ...s, carrier: e.target.value }))} />
          </div>
          <div>
            <div className="label mb-1">Servico</div>
            <input className="input" value={form.service} onChange={(e) => setForm((s) => ({ ...s, service: e.target.value }))} />
          </div>
          <div>
            <div className="label mb-1">Custo base (R$)</div>
            <input className="input" value={form.base_cost} onChange={(e) => setForm((s) => ({ ...s, base_cost: e.target.value }))} />
          </div>
          <div>
            <div className="label mb-1">Custo por kg (R$)</div>
            <input className="input" value={form.cost_per_kg} onChange={(e) => setForm((s) => ({ ...s, cost_per_kg: e.target.value }))} />
          </div>
          <div>
            <div className="label mb-1">Prazo (dias)</div>
            <input className="input" value={form.eta_days} onChange={(e) => setForm((s) => ({ ...s, eta_days: e.target.value }))} />
          </div>
          <div className="md:col-span-3">
            <div className="label mb-1">Notas</div>
            <input className="input" value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} placeholder="Observacoes" />
          </div>
          <div className="md:col-span-6 flex gap-2">
            <button className="btn-primary" type="button" onClick={save}>{form.id ? 'Atualizar' : 'Adicionar'}</button>
            <button className="btn-ghost" type="button" onClick={reset}>Limpar</button>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="text-sm font-semibold">Tabela de fretes</div>
        <div className="table-scroll mt-3">
          <table className="table-base w-full text-left">
            <thead>
              <tr>
                <th>Regiao</th>
                <th>Transportadora</th>
                <th>Servico</th>
                <th className="text-right">Base</th>
                <th className="text-right">/kg</th>
                <th className="text-right">Prazo</th>
                <th className="text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td>{r.region}</td>
                  <td>{r.carrier}</td>
                  <td>{r.service}</td>
                  <td className="text-right">R$ {r.base_cost.toFixed(2)}</td>
                  <td className="text-right">R$ {r.cost_per_kg.toFixed(2)}</td>
                  <td className="text-right">{r.eta_days}d</td>
                  <td className="text-right">
                    <button className="btn-ghost text-xs" onClick={() => edit(r.id)}>Editar</button>
                    <button className="btn-ghost text-xs text-red-600" onClick={() => remove(r.id)}>Remover</button>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-sm text-gray-500">
                    Nenhuma taxa de frete cadastrada.
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
