import { useEffect, useState } from 'react';
import type { Supply } from '../../../lib/types';
import { listSupplies, upsertSupply, updateSupply } from '../../../lib/db';

function toNumber(v: string): number {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export default function PackagingManager() {
  const [items, setItems] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<Supply> | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data = await listSupplies();
      const packs = data.filter((s) => String(s.category || '').toLowerCase().includes('embal'));
      setItems(packs);
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao carregar embalagens.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!editing?.name) return;
    setErr(null);
    try {
      await upsertSupply({
        ...(editing as any),
        name: editing.name,
        category: editing.category || 'Embalagem',
        unit: editing.unit || 'un'
      });
      setEditing(null);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao salvar embalagem.');
    }
  }

  async function toggleActive(item: Supply) {
    setErr(null);
    try {
      await updateSupply(item.id, { is_active: !item.is_active });
      await load();
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao atualizar embalagem.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="text-sm font-semibold">Embalagens cadastradas</div>
        <div className="text-xs text-gray-500 mt-1">Usa o mesmo cadastro de insumos filtrado por categoria "Embalagem".</div>
        <div className="mt-3 flex gap-2">
          <button className="btn-primary text-xs" type="button" onClick={() => setEditing({})}>
            Nova Embalagem
          </button>
        </div>
        {err ? <div className="mt-2 text-xs text-red-600">{err}</div> : null}
      </div>

      {editing ? (
        <div className="card p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="block text-xs">
              Nome
              <input className="input w-full mt-1" value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </label>
            <label className="block text-xs">
              Categoria
              <input className="input w-full mt-1" value={editing.category || 'Embalagem'} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
            </label>
            <label className="block text-xs">
              Unidade
              <input className="input w-full mt-1" value={editing.unit || 'un'} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} />
            </label>
            <label className="block text-xs">
              Fornecedor
              <input className="input w-full mt-1" value={editing.supplier_name || ''} onChange={(e) => setEditing({ ...editing, supplier_name: e.target.value })} />
            </label>
            <label className="block text-xs">
              Custo unit.
              <input className="input w-full mt-1" value={String(editing.cost_per_unit || 0)} onChange={(e) => setEditing({ ...editing, cost_per_unit: toNumber(e.target.value) })} />
            </label>
            <label className="block text-xs">
              Estoque
              <input className="input w-full mt-1" value={String(editing.stock_qty || 0)} onChange={(e) => setEditing({ ...editing, stock_qty: toNumber(e.target.value) })} />
            </label>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button className="btn-ghost text-xs" type="button" onClick={() => setEditing(null)}>Cancelar</button>
            <button className="btn-primary text-xs" type="button" onClick={save}>Salvar</button>
          </div>
        </div>
      ) : null}

      <div className="card p-4">
        <div className="table-scroll">
          <table className="table-base w-full text-left">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Fornecedor</th>
                <th className="text-right">Custo</th>
                <th className="text-center">Estoque</th>
                <th className="text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">{s.name}</td>
                  <td>{s.category}</td>
                  <td className="table-muted">{s.supplier_name || '—'}</td>
                  <td className="text-right">R$ {Number(s.cost_per_unit || 0).toFixed(2)}</td>
                  <td className="text-center">{s.stock_qty}</td>
                  <td className="text-right">
                    <button className="btn-ghost text-xs" onClick={() => setEditing(s)}>Editar</button>
                    <button className="btn-ghost text-xs" onClick={() => toggleActive(s)}>{s.is_active ? 'Desativar' : 'Ativar'}</button>
                  </td>
                </tr>
              ))}
              {!items.length && !loading ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-gray-500">Nenhuma embalagem encontrada.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
