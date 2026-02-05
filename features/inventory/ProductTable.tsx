import { Edit3, Power, Trash2 } from 'lucide-react';
import type { Product } from '../../lib/types';
import { fmtBRL } from '../../lib/utils';

type Props = {
  items: Product[];
  onEdit: (p: Product) => void;
  onToggleActive: (p: Product) => void;
  onDelete: (p: Product) => void;
};

export default function ProductTable({ items, onEdit, onToggleActive, onDelete }: Props) {
  if (items.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-gray-500 dark:text-slate-400">Nenhum produto encontrado com os filtros aplicados.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="table-scroll max-h-[55vh] sm:max-h-[60vh]">
        <table className="table-base min-w-full text-sm">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left">Produto</th>
              <th className="px-3 py-2 text-left">Categoria</th>
              <th className="px-3 py-2 text-left">ML</th>
              <th className="px-3 py-2 text-right">Estoque</th>
              <th className="px-3 py-2 text-right">Mín.</th>
              <th className="px-3 py-2 text-right">Custo</th>
              <th className="px-3 py-2 text-left">Fornecedor</th>
              <th className="px-3 py-2 text-right">Lead</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {items.map((p) => {
              const critical = p.stock <= (p.min_stock ?? 0);
              return (
                <tr key={p.id} className={!p.is_active ? 'opacity-60' : ''}>
                  <td className="px-3 py-2">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900 dark:text-slate-100">
                        {p.name}
                        {p.size_cm ? ` • ${p.size_cm}cm` : ''} • {p.variant}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-slate-400">
                        {p.sku ? `SKU: ${p.sku}` : p.material ? `Material: ${p.material}` : ''}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700 dark:text-slate-300">{p.category ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-700 dark:text-slate-300">{p.ml_listing_id ?? '—'}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${critical ? 'text-red-600 dark:text-red-300' : 'text-gray-900 dark:text-slate-100'}`}>
                    {p.stock}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600 dark:text-slate-300">{p.min_stock}</td>
                  <td className="px-3 py-2 text-right text-gray-600 dark:text-slate-300">{fmtBRL(p.cost)}</td>
                  <td className="px-3 py-2 text-xs text-gray-700 dark:text-slate-300">{p.supplier_name ?? '—'}</td>
                  <td className="px-3 py-2 text-right text-gray-600 dark:text-slate-300">{p.lead_time_days ?? '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <button className="btn-ghost" onClick={() => onEdit(p)} title="Editar">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button className="btn-ghost" onClick={() => onToggleActive(p)} title={p.is_active ? 'Desativar' : 'Ativar'}>
                        <Power className="h-4 w-4" />
                      </button>
                      <button className="btn-ghost" onClick={() => onDelete(p)} title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


