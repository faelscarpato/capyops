import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, Download, AlertTriangle, Package } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import StatusChip from '../ui/StatusChip';
import { listProducts, listSalesSince } from '../lib/db';
import type { Product } from '../lib/types';

// Helper for CSV export
function exportToCSV(data: any[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(obj => Object.values(obj).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  const csvKey = [headers, ...rows].join('\n');
  const blob = new Blob([csvKey], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

export default function InventoryPage() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('todos');
  const [hideInactive, setHideInactive] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const sinceISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      // Ensure we handle Promise.all failure gracefully or catch individually?
      // For now, if one fails, we catch block catches it.
      const [p, s] = await Promise.all([listProducts(), listSalesSince(sinceISO)]);
      setProducts(p as Product[] || []);
      setSales(s || []);
    } catch (err) {
      console.error("InventoryPage load error:", err);
      // Optional: setError state to show message in UI
    } finally {
      setLoading(false);
    }
  }

  // Predictive Logic
  const metrics = useMemo(() => {
    if (!products || !Array.isArray(products)) return [];

    const totals = new Map<string, number>();
    for (const sale of (sales || [])) {
      if (!sale) continue;
      const qty = Number(sale.quantity ?? 0);
      const pid = sale.product_id;
      if (pid) totals.set(pid, (totals.get(pid) ?? 0) + qty);
    }
    return products.map(p => {
      if (!p) return null; // Should not happen but typescript safeguard
      const total30d = totals.get(p.id) ?? 0;
      const avgDaily = total30d / 30;
      // Safeguard div by zero or weird stock
      const stock = Number(p.stock ?? 0);
      const daysRemaining = avgDaily > 0 ? stock / avgDaily : 999;
      const isRisk = avgDaily > 0 && daysRemaining < 15;
      return {
        ...p,
        stock,
        total30d,
        avgDaily,
        daysRemaining,
        isRisk
      };
    }).filter(Boolean) as any[]; // Remove nulls
  }, [products, sales]);

  const filterFlag = (searchParams.get('f') || '').toLowerCase();

  const filtered = metrics.filter(p => {
    if (!p) return false;
    if (hideInactive && !p.is_active) return false;
    if (filterCategory !== 'todos' && p.category !== filterCategory) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!p.name?.toLowerCase().includes(s) && !p.sku?.toLowerCase().includes(s)) return false;
    }
    if (filterFlag === 'critical') {
      const min = Number(p.min_stock ?? 0);
      if (Number(p.stock ?? 0) > min) return false;
    }
    return true;
  });

  const categories = Array.from(new Set(products?.map(p => p.category))).filter((c): c is string => !!c).sort();
  const totalValue = filtered.reduce((acc, p) => acc + ((p.stock || 0) * (p.cost || 0)), 0);
  const riskCount = filtered.filter(p => p.isRisk).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estoque & Previsão"
        subtitle="Visão geral do inventário, valores e ruptura."
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => exportToCSV(filtered, 'estoque.csv')}
              className="btn-ghost"
            >
              <Download className="w-4 h-4" /> Exportar
            </button>
            <button
              className="btn-ghost"
              onClick={() => window.location.href = '/app/catalogo?catalogTab=previsao'}
            >
              Estoque preditivo
            </button>
            <button
              className="btn-primary"
              onClick={() => window.location.href = '/app/catalogo?catalogTab=produtos&regTab=estoque'}
            >
              Gerenciar Estoque (Cadastros)
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs uppercase text-gray-500 font-semibold">Valor em Estoque</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">
            {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-gray-500 font-semibold">Total de Itens</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">{filtered.reduce((acc, p) => acc + p.stock, 0)} un</p>
        </div>
        <div className="card relative overflow-hidden p-4">
          <p className="text-xs uppercase text-red-500 font-semibold">Itens em Risco (15d)</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{riskCount}</p>
          <AlertTriangle className="absolute right-[-10px] bottom-[-10px] text-red-100 w-20 h-20 pointer-events-none" />
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-gray-500 font-semibold">Vendas (30d)</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{filtered.reduce((acc, p) => acc + p.total30d, 0)} un</p>
        </div>
      </div>

      <SectionCard title="Consulta de Produtos">
        <div className="mb-6 flex flex-col gap-4 md:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              className="input w-full pl-10"
              placeholder="Buscar por nome ou SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              className="input w-full sm:w-40"
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
            >
              <option value="todos">Todas Categorias</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              onClick={() => setHideInactive(!hideInactive)}
              className={`btn-ghost ${hideInactive ? 'bg-indigo-50 text-indigo-700 dark:bg-cyan-400/15 dark:text-cyan-200' : ''}`}
            >
              {hideInactive ? 'Ocultando Inativos' : 'Mostrando Inativos'}
            </button>
          </div>
        </div>

        <div className="table-scroll max-h-[55vh] sm:max-h-[60vh]">
          <table className="table-base w-full text-left">
            <thead>
              <tr>
                <th className="p-3">Produto</th>
                <th className="p-3">Categoria</th>
                <th className="p-3 text-right">Custo</th>
                <th className="p-3 text-center">Estoque</th>
                <th className="p-3 text-center">Dias Restantes</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                  <td className="p-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{p.name}</div>
                    <div className="text-xs text-gray-400">{p.sku || '-'} • {p.variant}</div>
                  </td>
                  <td className="p-3 text-gray-600 dark:text-gray-400">{p.category}</td>
                  <td className="p-3 text-right font-medium">R$ {p.cost.toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <span className={`font-bold ${p.stock < (p.min_stock || 5) ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {p.daysRemaining < 900 ? (
                      <span className={`badge ${p.daysRemaining < 15 ? 'badge-danger' : 'badge-success'}`}>
                        {p.daysRemaining.toFixed(0)} dias
                      </span>
                    ) : (
                      <span className="table-muted">-</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <StatusChip isActive={p.is_active} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Nenhum produto encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

