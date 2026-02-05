import { useEffect, useState } from 'react';
import { listMlListings } from '../../../lib/db';
import type { MlListing } from '../../../lib/types';

export default function AdsOrganicManager() {
  const [items, setItems] = useState<MlListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await listMlListings();
      setItems(data);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="text-sm font-semibold">Anúncios orgânicos</div>
        <div className="text-xs text-gray-500 mt-1">
          Lista base de anúncios sem vínculo a campanhas pagas.
        </div>
      </div>
      <div className="card p-4">
        <div className="table-scroll">
          <table className="table-base w-full text-left">
            <thead>
              <tr>
                <th>Titulo</th>
                <th>ID</th>
                <th>Status</th>
                <th>Dias no ar</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td>{it.title}</td>
                  <td className="table-muted">{it.ml_listing_id}</td>
                  <td>{it.status || 'Ativo'}</td>
                  <td className="table-muted">{it.listed_at ? Math.floor((Date.now() - new Date(it.listed_at).getTime()) / 86400000) + 'd' : '—'}</td>
                </tr>
              ))}
              {!items.length && !loading ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-sm text-gray-500">
                    Nenhum anúncio encontrado.
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
