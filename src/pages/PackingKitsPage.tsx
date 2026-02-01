import { useEffect, useMemo, useState } from 'react';
import type { PackingKit, PackingKitItem, Supply } from '../lib/types';
import {
  listPackingKits,
  listPackingKitItems,
  listSupplies,
  listAllPackingKitItems
} from '../lib/db';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import { ExternalLink } from 'lucide-react';
import StatusChip from '../ui/StatusChip';

function fmtBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function PackingKitsPage() {
  const [kits, setKits] = useState<PackingKit[]>([]);
  const [allItems, setAllItems] = useState<PackingKitItem[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [selectedKitId, setSelectedKitId] = useState<string | null>(null);
  const [items, setItems] = useState<PackingKitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function refreshKits() {
    setLoading(true);
    setErr(null);
    try {
      const k = await listPackingKits();
      setKits(k);
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao carregar kits.');
    } finally {
      setLoading(false);
    }
  }

  async function refreshSupplies() {
    try {
      const s = await listSupplies();
      setSupplies(s);
    } catch {
      // ignore
    }
  }

  async function refreshAllItems() {
    try {
      const it = await listAllPackingKitItems();
      setAllItems(it);
    } catch {
      setAllItems([]);
    }
  }

  async function refreshItems(kitId: string) {
    try {
      const it = await listPackingKitItems(kitId);
      setItems(it);
    } catch {
      setItems([]);
    }
  }

  useEffect(() => {
    refreshKits();
    refreshSupplies();
    refreshAllItems();
  }, []);

  useEffect(() => {
    if (selectedKitId) {
      refreshItems(selectedKitId);
    } else {
      setItems([]);
    }
  }, [selectedKitId]);

  const kitTotals = useMemo(() => {
    const supplyMap = new Map(supplies.map((s) => [s.id, s]));
    const totalMap = new Map<string, number>();
    const countMap = new Map<string, number>();

    for (const item of allItems) {
      const supply = supplyMap.get(item.supply_id);
      const cost = Number(supply?.cost_per_unit ?? 0) * Number(item.qty_per_order ?? 0);
      totalMap.set(item.kit_id, (totalMap.get(item.kit_id) ?? 0) + cost);
      countMap.set(item.kit_id, (countMap.get(item.kit_id) ?? 0) + 1);
    }

    return { totalMap, countMap };
  }, [allItems, supplies]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kits de Embalagem"
        subtitle="Agrupamento de insumos para cada tipo de produto."
        actions={
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={refreshKits} disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar'}
            </button>
            <button
              className="btn-primary flex items-center gap-2"
              onClick={() => window.location.href = '/cadastros?tab=logistica&sub=kits'}
            >
              <ExternalLink size={16} /> Gerenciar (Cadastros)
            </button>
          </div>
        }
      />

      {err ? (
        <div className="alert alert-error">
          {err}
        </div>
      ) : null}

      <SectionCard title="Kits cadastrados">
        <div className="table-scroll">
          <table className="table-base w-full text-left">
            <thead>
              <tr>
                <th>Kit</th>
                <th className="text-right">Custo total</th>
                <th className="text-center">Itens</th>
                <th className="text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {kits.map((k) => (
                <tr key={k.id}>
                  <td>
                    <div className="text-sm font-semibold">{k.name}</div>
                  </td>
                  <td className="text-right">
                    {fmtBRL(kitTotals.totalMap.get(k.id) ?? 0)}
                  </td>
                  <td className="text-center">{kitTotals.countMap.get(k.id) ?? 0}</td>
                  <td className="text-center">
                    <button
                      className={`btn-ghost ${selectedKitId === k.id ? 'bg-indigo-50 text-indigo-700 dark:bg-cyan-400/15 dark:text-cyan-200' : ''}`}
                      onClick={() => setSelectedKitId(k.id)}
                    >
                      Visualizar
                    </button>
                  </td>
                </tr>
              ))}
              {!kits.length && !loading ? (
                <tr>
                  <td colSpan={4} className="px-2 py-6">
                    <div className="text-center text-sm text-gray-500 dark:text-slate-400">
                      Nenhum kit cadastrado.
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {selectedKitId ? (
        <SectionCard
          title={`Itens do kit selecionado (${kits.find((k) => k.id === selectedKitId)?.name ?? ''})`}
        >
          <div className="mt-4 table-scroll">
            <table className="table-base w-full text-left">
              <thead>
                <tr>
                  <th>Insumo</th>
                  <th className="text-right">Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const s = supplies.find((sup) => sup.id === it.supply_id);
                  return (
                    <tr key={it.id}>
                      <td>{s?.name ?? it.supply_id}</td>
                      <td className="text-right">{it.qty_per_order}</td>
                    </tr>
                  );
                })}
                {!items.length ? (
                  <tr>
                    <td colSpan={2} className="px-2 py-6">
                      <div className="text-center text-sm text-gray-500 dark:text-slate-400">
                        Nenhum item no kit.
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}


