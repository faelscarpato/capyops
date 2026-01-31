import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, AlertCircle, Download } from 'lucide-react';
import { exportToCSV } from '../lib/utils';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import type { MlListing } from '../lib/types';
import { listMlListings } from '../lib/db';

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
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
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
        <div className="overflow-x-auto">
          <table className="table w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="p-3">Anúncio</th>
                <th className="p-3 text-center">Imagens</th>
                <th className="p-3 text-center">Descrição</th>
                <th className="p-3 text-center">Dias no ar</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
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
                    <tr key={it.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
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
                        <span className={`px-2 py-1 rounded text-xs font-medium ${okImgs ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {it.images_count ?? 0}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${okDesc ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {okDesc ? 'Completa' : 'Pendente'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{days == null ? '—' : `${days}d`}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-xs text-gray-400 uppercase">{it.status || 'Ativo'}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
