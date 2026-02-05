import { useEffect, useMemo, useState } from 'react';
import { listProducts, updateProduct } from '../../../lib/db';
import type { Product } from '../../../lib/types';

export default function AdsSkuManager() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await listProducts({ includeInactive: true });
      setItems(data);
      const initial: Record<string, string> = {};
      for (const p of data) initial[p.id] = p.ml_listing_id ?? '';
      setDrafts(initial);
      setLoading(false);
    })();
  }, []);

  const hasChanges = useMemo(() => {
    return items.some((p) => (drafts[p.id] ?? '') !== (p.ml_listing_id ?? ''));
  }, [items, drafts]);

  async function saveAll() {
    setError(null);
    setSaving(true);
    try {
      for (const p of items) {
        const next = (drafts[p.id] ?? '').trim();
        if (next !== (p.ml_listing_id ?? '')) {
          // eslint-disable-next-line no-await-in-loop
          await updateProduct(p.id, { ml_listing_id: next || null });
        }
      }
      const refreshed = await listProducts({ includeInactive: true });
      setItems(refreshed);
      const nextDrafts: Record<string, string> = {};
      for (const p of refreshed) nextDrafts[p.id] = p.ml_listing_id ?? '';
      setDrafts(nextDrafts);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao salvar IDs de anúncios.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="text-sm font-semibold">Mapa de SKUs</div>
        <div className="text-xs text-gray-500 mt-1">
          Relacione SKU interno, categoria e ID de anúncio.
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button className="btn-primary text-xs" type="button" onClick={saveAll} disabled={saving || !hasChanges}>
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
          {error ? <span className="text-xs text-red-600">{error}</span> : null}
        </div>
      </div>
      <div className="card p-4">
        <div className="table-scroll">
          <table className="table-base w-full text-left">
            <thead>
              <tr>
                <th>Produto</th>
                <th>SKU</th>
                <th>Categoria</th>
                <th>ID do anúncio (ML)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>{p.name} {p.variant ? `• ${p.variant}` : ''}</td>
                  <td className="table-muted">{p.sku || '—'}</td>
                  <td className="table-muted">{p.category || '—'}</td>
                  <td>
                    <input
                      className="input"
                      value={drafts[p.id] ?? ''}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      placeholder="MLB123456789"
                    />
                  </td>
                  <td>{p.is_active ? 'Ativo' : 'Inativo'}</td>
                </tr>
              ))}
              {!items.length && !loading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-gray-500">
                    Nenhum SKU encontrado.
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
