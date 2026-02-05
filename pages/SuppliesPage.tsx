import { useEffect, useMemo, useState } from 'react';
import type { Supply } from '../lib/types';
import { listSupplies, updateSupply } from '../lib/db';
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
            <button className="btn-primary" onClick={() => window.location.href = '/app/catalogo?catalogTab=produtos&regTab=logistica&sub=insumos'}>
              Gerenciar em Cadastros
            </button>
          </div>
        }
      />

      {err ? (
        <div className="alert alert-error">
          {err}
        </div>
      ) : null}

      <SectionCard title="Insumos">
        <div className="table-scroll">
          <table className="table-base w-full text-left">
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Categoria</th>
                <th>Unidade</th>
                <th>Fornecedor</th>
                <th className="text-right">Custo</th>
                <th className="text-center">Estoque</th>
                <th className="text-center">Mínimo</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="text-sm font-semibold">{s.name}</div>
                  </td>
                  <td className="table-muted">{s.category}</td>
                  <td className="table-muted">{s.unit}</td>
                  <td>
                    <input
                      className="input w-40"
                      value={s.supplier_name ?? ''}
                      onChange={(e) => quickUpdate(s.id, { supplier_name: e.target.value })}
                      placeholder="Fornecedor"
                    />
                  </td>
                  <td className="text-right">
                    <input
                      className="input w-24 text-right"
                      value={String(s.cost_per_unit)}
                      onChange={(e) => quickUpdate(s.id, { cost_per_unit: toNumber(e.target.value) })}
                    />
                  </td>
                  <td className="text-center">
                    <input
                      className="input w-20 text-center"
                      value={String(s.stock_qty)}
                      onChange={(e) =>
                        quickUpdate(s.id, { stock_qty: Math.max(0, toNumber(e.target.value)) })
                      }
                      inputMode="decimal"
                    />
                  </td>
                  <td className="text-center">
                    <input
                      className="input w-20 text-center"
                      value={String(s.min_qty)}
                      onChange={(e) =>
                        quickUpdate(s.id, { min_qty: Math.max(0, toNumber(e.target.value)) })
                      }
                      inputMode="decimal"
                    />
                  </td>
                  <td className="text-center">
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


