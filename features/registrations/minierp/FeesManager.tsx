import { useEffect, useMemo, useState } from 'react';
import { listProducts } from '../../../lib/db';
import { readCategoryRates, upsertCategoryRate, deleteCategoryRate } from '../../../lib/categoryRates';
import { usePricingSettings } from '../../../hooks/usePricingSettings';

function toNumber(value: string): number {
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function FeesManager() {
  const { settings } = usePricingSettings();
  const [rates, setRates] = useState(readCategoryRates());
  const [categories, setCategories] = useState<string[]>([]);

  const [form, setForm] = useState({
    id: '',
    category: '',
    channel: '',
    mlFeePercent: String(settings.mlFeePercent ?? 0),
    taxCbsPercent: String(settings.taxCbsPercent ?? 0),
    taxIbsPercent: String(settings.taxIbsPercent ?? 0),
    taxIsPercent: String(settings.taxIsPercent ?? 0),
    marginPercent: String(settings.defaultMarginPercent ?? 30)
  });

  useEffect(() => {
    (async () => {
      const p = await listProducts({ includeInactive: true });
      const cats = Array.from(new Set(p.map((x) => x.category).filter(Boolean))) as string[];
      setCategories(cats.sort());
    })();
  }, []);

  useEffect(() => {
    setRates(readCategoryRates());
  }, []);

  const hasId = useMemo(() => !!form.id, [form.id]);

  function resetForm() {
    setForm({
      id: '',
      category: '',
      channel: '',
      mlFeePercent: String(settings.mlFeePercent ?? 0),
      taxCbsPercent: String(settings.taxCbsPercent ?? 0),
      taxIbsPercent: String(settings.taxIbsPercent ?? 0),
      taxIsPercent: String(settings.taxIsPercent ?? 0),
      marginPercent: String(settings.defaultMarginPercent ?? 30)
    });
  }

  function save() {
    if (!form.category.trim()) return;
    const next = upsertCategoryRate({
      id: form.id || undefined,
      category: form.category.trim(),
      channel: form.channel.trim() || null,
      mlFeePercent: toNumber(form.mlFeePercent),
      taxCbsPercent: toNumber(form.taxCbsPercent),
      taxIbsPercent: toNumber(form.taxIbsPercent),
      taxIsPercent: toNumber(form.taxIsPercent),
      marginPercent: toNumber(form.marginPercent)
    });
    setRates(next);
    resetForm();
  }

  function edit(id: string) {
    const r = rates.find((x) => x.id === id);
    if (!r) return;
    setForm({
      id: r.id,
      category: r.category,
      channel: r.channel ?? '',
      mlFeePercent: String(r.mlFeePercent),
      taxCbsPercent: String(r.taxCbsPercent),
      taxIbsPercent: String(r.taxIbsPercent),
      taxIsPercent: String(r.taxIsPercent),
      marginPercent: String(r.marginPercent)
    });
  }

  function remove(id: string) {
    setRates(deleteCategoryRate(id));
    if (form.id === id) resetForm();
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="text-sm font-semibold">Taxas por categoria (manual)</div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <div className="label mb-1">Categoria</div>
            <input
              className="input"
              list="category-list"
              value={form.category}
              onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
              placeholder="Ex: Santos"
            />
            <datalist id="category-list">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <div className="label mb-1">Canal</div>
            <input
              className="input"
              value={form.channel}
              onChange={(e) => setForm((s) => ({ ...s, channel: e.target.value }))}
              placeholder="ML, Shopee, etc"
            />
          </div>
          <div>
            <div className="label mb-1">ML (%)</div>
            <input className="input" value={form.mlFeePercent} onChange={(e) => setForm((s) => ({ ...s, mlFeePercent: e.target.value }))} />
          </div>
          <div>
            <div className="label mb-1">CBS (%)</div>
            <input className="input" value={form.taxCbsPercent} onChange={(e) => setForm((s) => ({ ...s, taxCbsPercent: e.target.value }))} />
          </div>
          <div>
            <div className="label mb-1">IBS (%)</div>
            <input className="input" value={form.taxIbsPercent} onChange={(e) => setForm((s) => ({ ...s, taxIbsPercent: e.target.value }))} />
          </div>
          <div>
            <div className="label mb-1">IS (%)</div>
            <input className="input" value={form.taxIsPercent} onChange={(e) => setForm((s) => ({ ...s, taxIsPercent: e.target.value }))} />
          </div>
          <div>
            <div className="label mb-1">Margem (%)</div>
            <input className="input" value={form.marginPercent} onChange={(e) => setForm((s) => ({ ...s, marginPercent: e.target.value }))} />
          </div>
          <div className="md:col-span-6 flex gap-2">
            <button className="btn-primary" type="button" onClick={save}>{hasId ? 'Atualizar' : 'Adicionar'}</button>
            <button className="btn-ghost" type="button" onClick={resetForm}>Limpar</button>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Baseado no Precificador: taxas em % aplicadas sobre o valor da venda. Canal é opcional.
        </div>
      </div>

      <div className="card p-4">
        <div className="text-sm font-semibold">Tabela de taxas</div>
        <div className="table-scroll mt-3">
          <table className="table-base w-full text-left">
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Canal</th>
                <th className="text-right">ML</th>
                <th className="text-right">CBS</th>
                <th className="text-right">IBS</th>
                <th className="text-right">IS</th>
                <th className="text-right">Margem</th>
                <th className="text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => (
                <tr key={r.id}>
                  <td>{r.category}</td>
                  <td>{r.channel || '—'}</td>
                  <td className="text-right">{r.mlFeePercent}%</td>
                  <td className="text-right">{r.taxCbsPercent}%</td>
                  <td className="text-right">{r.taxIbsPercent}%</td>
                  <td className="text-right">{r.taxIsPercent}%</td>
                  <td className="text-right">{r.marginPercent}%</td>
                  <td className="text-right">
                    <button className="btn-ghost text-xs" onClick={() => edit(r.id)}>Editar</button>
                    <button className="btn-ghost text-xs text-red-600" onClick={() => remove(r.id)}>Remover</button>
                  </td>
                </tr>
              ))}
              {!rates.length ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-sm text-gray-500">
                    Nenhuma taxa cadastrada.
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
