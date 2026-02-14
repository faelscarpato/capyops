import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, Download, AlertTriangle, Package } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import StatusChip from '../ui/StatusChip';
import DataToolbar from '../ui/DataToolbar';
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
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('todos');
  const [hideInactive, setHideInactive] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const sinceISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      // Ensure we handle Promise.all failure gracefully or catch individually?
      // For now, if one fails, we catch block catches it.
      const [p, s] = await Promise.all([listProducts(), listSalesSince(sinceISO)]);
      setProducts(p as Product[] || []);
      setSales(s || []);
    } catch (err) {
      console.error("InventoryPage load error:", err);
      setError('Falha ao carregar estoque.');
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
          <p className="text-xs uppercase text-[color:var(--muted)] font-semibold">Valor em Estoque</p>
          <p className="mt-1 text-2xl font-semibold text-[color:var(--text)]">
            {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-[color:var(--muted)] font-semibold">Total de Itens</p>
          <p className="mt-1 text-2xl font-semibold text-[color:var(--text)]">{filtered.reduce((acc, p) => acc + p.stock, 0)} un</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-[color:var(--danger)] font-semibold">Itens em Risco (15d)</p>
          <p className="mt-1 text-2xl font-semibold text-[color:var(--danger)]">{riskCount}</p>
          <AlertTriangle className="mt-2 h-4 w-4 text-[color:var(--danger)]" />
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-[color:var(--muted)] font-semibold">Vendas (30d)</p>
          <p className="mt-1 text-2xl font-semibold text-[color:var(--primary)]">{filtered.reduce((acc, p) => acc + p.total30d, 0)} un</p>
        </div>
      </div>

      <SectionCard title="Consulta de Produtos">
        <DataToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nome ou SKU..."
          filterAction={
            <select
              className="input w-full sm:w-44"
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              aria-label="Filtrar por categoria"
            >
              <option value="todos">Todas categorias</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          }
          sortAction={
            <button
              onClick={() => setHideInactive(!hideInactive)}
              className="btn-ghost"
              type="button"
            >
              <Filter className="h-4 w-4" />
              {hideInactive ? 'Ocultando inativos' : 'Mostrando inativos'}
            </button>
          }
        />

        {error ? <div className="mt-4 alert alert-error">{error}</div> : null}

        {loading ? (
          <div className="mt-4 rounded-lg border border-[color:var(--border)] p-4 text-sm text-[color:var(--muted)]">
            Carregando inventário...
          </div>
        ) : null}

        <div className="mt-4 hidden md:block">
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
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td className="p-3">
                      <div className="font-medium text-[color:var(--text)]">{p.name}</div>
                      <div className="text-xs text-[color:var(--muted)]">{p.sku || '-'} • {p.variant}</div>
                    </td>
                    <td className="p-3 text-[color:var(--muted)]">{p.category}</td>
                    <td className="p-3 text-right font-medium">R$ {p.cost.toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <span className={`font-semibold ${p.stock < (p.min_stock || 5) ? 'text-[color:var(--danger)]' : 'text-[color:var(--text)]'}`}>
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
                {filtered.length === 0 && !loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-[color:var(--muted)]">Nenhum produto encontrado.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:hidden">
          {filtered.map((p) => (
            <div key={p.id} className="card p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-[color:var(--text)]">{p.name}</div>
                  <div className="text-xs text-[color:var(--muted)]">{p.sku || '-'} • {p.variant}</div>
                </div>
                <StatusChip isActive={p.is_active} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-2">Categoria: {p.category || '—'}</div>
                <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-2">Custo: R$ {p.cost.toFixed(2)}</div>
                <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-2">Estoque: {p.stock}</div>
                <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-2">
                  {p.daysRemaining < 900 ? `Dias: ${p.daysRemaining.toFixed(0)}` : 'Dias: —'}
                </div>
              </div>
            </div>
          ))}
          {!filtered.length && !loading ? (
            <div className="rounded-lg border border-[color:var(--border)] px-4 py-6 text-center text-sm text-[color:var(--muted)]">
              Nenhum produto encontrado.
            </div>
          ) : null}
        </div>
      </SectionCard>
    </div>
  );
}

