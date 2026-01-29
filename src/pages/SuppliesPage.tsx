import { useEffect, useMemo, useState } from 'react';
import type { Supply } from '../lib/types';
import { listSupplies, upsertSupply, updateSupply } from '../lib/db';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import StatusChip from '../ui/StatusChip';

function toNumber(v: string): number {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export default function SuppliesPage() {
  const [loading, setLoading] = useState(true);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [draft, setDraft] = useState({
    name: '',
    category: '',
    supplier_name: '',
    unit: 'un',
    cost_per_unit: 0,
    stock_qty: 0,
    min_qty: 0
  });

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const s = await listSupplies();
      setSupplies(s);
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao carregar insumos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const rows = useMemo(() => {
    return supplies.map((s) => ({
      ...s,
      status: (s.stock_qty ?? 0) <= (s.min_qty ?? 0) ? 'COMPRAR' : 'OK'
    }));
  }, [supplies]);

  async function onCreate() {
    setErr(null);
    try {
      await upsertSupply({
        name: draft.name.trim(),
        category: draft.category.trim(),
        supplier_name: draft.supplier_name.trim() || null,
        unit: draft.unit.trim(),
        cost_per_unit: draft.cost_per_unit,
        stock_qty: draft.stock_qty,
        min_qty: draft.min_qty,
        is_active: true
      } as any);
      setNewOpen(false);
      setDraft({ name: '', category: '', supplier_name: '', unit: 'un', cost_per_unit: 0, stock_qty: 0, min_qty: 0 });
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao criar insumo.');
    }
  }

  async function quickUpdate(id: string, patch: Partial<Supply>) {
    setErr(null);
    try {
      await updateSupply(id, patch);
      setSupplies((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } as Supply : s)));
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao atualizar insumo.');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insumos"
        subtitle="Cadastro e controle de insumos de embalagem."
        actions={
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={refresh} disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar'}
            </button>
            <button className="btn-primary" onClick={() => setNewOpen(true)}>
              Novo insumo
            </button>
          </div>
        }
      />

      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-200">
          {err}
        </div>
      ) : null}

      {newOpen ? (
        <SectionCard
          title="Cadastrar novo insumo"
          action={
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" onClick={onCreate}>
                Salvar
              </button>
              <button className="btn-ghost" onClick={() => setNewOpen(false)}>
                Cancelar
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <div className="label mb-1">Nome</div>
              <input
                className="input"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Caixa 18x18x25"
              />
            </div>
            <div>
              <div className="label mb-1">Categoria</div>
              <input
                className="input"
                value={draft.category}
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                placeholder="caixa / fita / bolha"
              />
            </div>
            <div>
              <div className="label mb-1">Fornecedor</div>
              <input
                className="input"
                value={draft.supplier_name}
                onChange={(e) => setDraft((d) => ({ ...d, supplier_name: e.target.value }))}
                placeholder="Fornecedor ABC"
              />
            </div>
            <div>
              <div className="label mb-1">Unidade</div>
              <input
                className="input"
                value={draft.unit}
                onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
                placeholder="un / m / rolo"
              />
            </div>
            <div>
              <div className="label mb-1">Custo por unidade</div>
              <input
                className="input"
                inputMode="decimal"
                value={String(draft.cost_per_unit)}
                onChange={(e) => setDraft((d) => ({ ...d, cost_per_unit: toNumber(e.target.value) }))}
              />
            </div>
            <div>
              <div className="label mb-1">Quantidade em estoque</div>
              <input
                className="input"
                value={String(draft.stock_qty)}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, stock_qty: Math.max(0, toNumber(e.target.value)) }))
                }
                inputMode="decimal"
              />
            </div>
            <div>
              <div className="label mb-1">Quantidade mínima</div>
              <input
                className="input"
                value={String(draft.min_qty)}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, min_qty: Math.max(0, toNumber(e.target.value)) }))
                }
                inputMode="decimal"
              />
            </div>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Insumos">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-2 py-2 font-semibold">Insumo</th>
                <th className="px-2 py-2 font-semibold">Categoria</th>
                <th className="px-2 py-2 font-semibold">Unidade</th>
                <th className="px-2 py-2 font-semibold">Fornecedor</th>
                <th className="px-2 py-2 text-right font-semibold">Custo</th>
                <th className="px-2 py-2 text-center font-semibold">Estoque</th>
                <th className="px-2 py-2 text-center font-semibold">Mínimo</th>
                <th className="px-2 py-2 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-900">
                  <td className="px-2 py-3">
                    <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">{s.name}</div>
                  </td>
                  <td className="px-2 py-3">{s.category}</td>
                  <td className="px-2 py-3">{s.unit}</td>
                  <td className="px-2 py-3">
                    <input
                      className="input w-40"
                      value={s.supplier_name ?? ''}
                      onChange={(e) => quickUpdate(s.id, { supplier_name: e.target.value })}
                      placeholder="Fornecedor"
                    />
                  </td>
                  <td className="px-2 py-3 text-right">
                    <input
                      className="input w-24 text-right"
                      value={String(s.cost_per_unit)}
                      onChange={(e) => quickUpdate(s.id, { cost_per_unit: toNumber(e.target.value) })}
                    />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <input
                      className="input w-20 text-center"
                      value={String(s.stock_qty)}
                      onChange={(e) =>
                        quickUpdate(s.id, { stock_qty: Math.max(0, toNumber(e.target.value)) })
                      }
                      inputMode="decimal"
                    />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <input
                      className="input w-20 text-center"
                      value={String(s.min_qty)}
                      onChange={(e) =>
                        quickUpdate(s.id, { min_qty: Math.max(0, toNumber(e.target.value)) })
                      }
                      inputMode="decimal"
                    />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <StatusChip status={s.status} />
                  </td>
                </tr>
              ))}
              {!rows.length && !loading ? (
                <tr>
                  <td colSpan={8} className="px-2 py-6">
                    <div className="text-center text-sm text-gray-500 dark:text-slate-400">
                      Nenhum insumo cadastrado.
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
