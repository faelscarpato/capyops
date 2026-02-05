import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, AlertCircle, Download, RefreshCw, Edit2 } from 'lucide-react';
import { exportToCSV } from '../lib/utils';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import type { MlListing } from '../lib/types';
import { listMlListings } from '../lib/db';
import { meliSyncItems, meliUpdateItem } from '../lib/meliApi';

function daysBetween(iso: string | null) {
  if (!iso) return null;
  const start = new Date(iso).getTime();
  const now = Date.now();
  if (!Number.isFinite(start)) return null;
  const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function ListingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<MlListing[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [editing, setEditing] = useState<MlListing | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editColor, setEditColor] = useState('');

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const rows = await listMlListings();
      setItems(rows);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar anúncios.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      await meliSyncItems();
      await refresh();
    } catch (e: any) {
      setError(e?.message || 'Falha ao sincronizar catálogo.');
    } finally {
      setSyncing(false);
    }
  }

  function openEdit(it: MlListing) {
    setEditing(it);
    setEditTitle(it.title || '');
    setEditPrice(String(it.price ?? ''));
    setEditStock('');
    setEditColor('');
  }

  async function saveEdit() {
    if (!editing) return;
    setError(null);
    try {
      const payload: any = {};
      if (editTitle.trim()) payload.title = editTitle.trim();
      if (editPrice) payload.price = Number(String(editPrice).replace(',', '.'));
      if (editStock) payload.available_quantity = Number(String(editStock).replace(',', '.'));
      if (editColor.trim()) {
        payload.attributes = [{ id: 'COLOR', value_name: editColor.trim() }];
      }
      await meliUpdateItem({ ml_listing_id: editing.ml_listing_id, data: payload });
      setEditing(null);
      await refresh();
    } catch (e: any) {
      setError(e?.message || 'Falha ao atualizar anúncio.');
    }
  }

  const [filter, setFilter] = useState('');

  const stats = useMemo(() => {
    const total = items.length;
    const ok = items.filter((x) => (x.images_count ?? 0) >= 6 && x.has_full_description).length;
    const weakDesc = items.filter((x) => x.has_full_description === false).length;
    const lowImgs = items.filter((x) => (x.images_count ?? 0) < 6).length;
    return { total, ok, weakDesc, lowImgs };
  }, [items]);

  const filtered = useMemo(() => {
    if (!items) return [];
    if (!filter) return items;
    const s = filter.toLowerCase();
    return items.filter(i =>
      (i?.title || '').toLowerCase().includes(s) ||
      (i?.ml_listing_id || '').toLowerCase().includes(s)
    );
  }, [items, filter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard de Anúncios (ML)"
        subtitle="Monitore a saúde e performance dos seus anúncios."
        actions={
          <div className="flex gap-2">
            <button className="btn-ghost flex items-center gap-1" onClick={handleSync} disabled={syncing}>
              <RefreshCw size={16} /> {syncing ? 'Sincronizando...' : 'Sync catálogo'}
            </button>
            <button className="btn-ghost flex items-center gap-1" onClick={() => exportToCSV(items, 'anuncios.csv')}>
              <Download size={16} /> CSV
            </button>
            <button className="btn-primary" onClick={() => window.location.href = '/cadastros'}>
              Gerenciar Anúncios (Cadastros)
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SectionCard title="Total" className="md:col-span-1">
          <div className="text-3xl font-semibold">{loading ? '—' : stats.total}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">Anúncios cadastrados</div>
        </SectionCard>
        <SectionCard title="Saudáveis (OK)" className="md:col-span-1 border-l-4 border-l-green-400">
          <div className="text-3xl font-semibold">{loading ? '—' : stats.ok}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">≥ 6 imagens + descrição completa</div>
        </SectionCard>
        <SectionCard title="Descrição fraca" className="md:col-span-1 border-l-4 border-l-yellow-400">
          <div className="text-3xl font-semibold">{loading ? '—' : stats.weakDesc}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">Melhorar descrição</div>
        </SectionCard>
        <SectionCard title="Poucas imagens" className="md:col-span-1 border-l-4 border-l-red-400">
          <div className="text-3xl font-semibold">{loading ? '—' : stats.lowImgs}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">Abaixo de 6 fotos</div>
        </SectionCard>
      </div>

      {error && (
        <div className="alert alert-error flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <SectionCard title="Monitoramento de Anúncios">
        <div className="mb-4">
          <input
            className="input w-full max-w-sm"
            placeholder="Filtrar anúncios..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
        <div className="table-scroll">
          <table className="table-base w-full text-left">
            <thead>
              <tr>
                <th className="p-3">Anúncio</th>
                <th className="p-3 text-center">Imagens</th>
                <th className="p-3 text-center">Descrição</th>
                <th className="p-3 text-center">Dias no ar</th>
                <th className="p-3 text-center">Visitas</th>
                <th className="p-3 text-center">Preço</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                    Carregando análise...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                    Nenhum anúncio para monitorar.
                  </td>
                </tr>
              ) : (
                filtered.map((it) => {
                  const days = daysBetween(it.listed_at);
                  const okImgs = (it.images_count ?? 0) >= 6;
                  const okDesc = it.has_full_description === true;
                  return (
                    <tr key={it.id}>
                      <td className="p-3">
                        <div className="font-medium text-gray-900 dark:text-slate-100">{it.title}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">{it.ml_listing_id}</div>
                        {it.url && (
                          <a
                            href={it.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs text-cyan-700 hover:underline dark:text-cyan-300"
                          >
                            Ver no ML <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`badge ${okImgs ? 'badge-success' : 'badge-danger'}`}>
                          {it.images_count ?? 0}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`badge ${okDesc ? 'badge-success' : 'badge-warning'}`}>
                          {okDesc ? 'Completa' : 'Pendente'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{days == null ? '—' : `${days}d`}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{it.visits ?? '—'}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{it.price != null ? `R$ ${Number(it.price).toFixed(2)}` : '—'}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="badge badge-neutral">{it.status || 'Ativo'}</span>
                      </td>
                      <td className="p-3 text-center">
                        <button className="btn-ghost text-xs" onClick={() => openEdit(it)}>
                          <Edit2 className="h-3 w-3" /> Editar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-lg p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Editar anúncio</h3>
              <button className="btn-ghost" type="button" onClick={() => setEditing(null)}>Fechar</button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <label className="block text-xs">
                Título
                <input className="input w-full mt-1" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </label>
              <label className="block text-xs">
                Preço (R$)
                <input className="input w-full mt-1" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
              </label>
              <label className="block text-xs">
                Estoque (available_quantity)
                <input className="input w-full mt-1" value={editStock} onChange={(e) => setEditStock(e.target.value)} />
              </label>
              <label className="block text-xs">
                Cor (atributo)
                <input className="input w-full mt-1" value={editColor} onChange={(e) => setEditColor(e.target.value)} placeholder="Ex: Branco" />
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-ghost" type="button" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="btn-primary" type="button" onClick={saveEdit}>Salvar</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

