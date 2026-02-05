import { useEffect, useMemo, useState } from 'react';
import { Crosshair, RefreshCw } from 'lucide-react';
import type { CompetitorTracking, Product } from '../lib/types';
import { listCompetitorTracking, listProducts, updateCompetitorTracking, upsertCompetitorTracking } from '../lib/db';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';

function fmtBRL(value: number | null | undefined) {
  if (value == null) return '—';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export default function CompetitorTrackingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<CompetitorTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState({
    my_product_id: '',
    competitor_mlb_id: '',
    target_price: ''
  });

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const [p, r] = await Promise.all([listProducts(), listCompetitorTracking()]);
      setProducts(p);
      setRows(r);
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao carregar tracking.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  async function addTracking() {
    if (!form.my_product_id) {
      setErr('Selecione um produto.');
      return;
    }
    if (!form.competitor_mlb_id.trim()) {
      setErr('Informe o ID do concorrente.');
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const target = Number(String(form.target_price).replace(',', '.'));
      await upsertCompetitorTracking({
        my_product_id: form.my_product_id,
        competitor_mlb_id: form.competitor_mlb_id.trim(),
        target_price: Number.isFinite(target) && target > 0 ? target : null
      });
      setForm({ my_product_id: '', competitor_mlb_id: '', target_price: '' });
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao salvar tracking.');
    } finally {
      setBusy(false);
    }
  }

  async function simulateCheck(row: CompetitorTracking, refreshAfter = true, toggleBusy = true) {
    const product = productMap.get(row.my_product_id);
    const base = row.last_price ?? row.target_price ?? product?.price ?? 120;
    const next = Math.max(1, base * randomBetween(0.92, 1.08));
    if (toggleBusy) setBusy(true);
    try {
      await updateCompetitorTracking(row.id, {
        last_price: Number(next.toFixed(2)),
        last_checked_at: new Date().toISOString()
      });
      if (refreshAfter) {
        await refresh();
      }
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao atualizar preco.');
    } finally {
      if (toggleBusy) setBusy(false);
    }
  }

  async function simulateAll() {
    setBusy(true);
    try {
      for (const row of rows) {
        // eslint-disable-next-line no-await-in-loop
        await simulateCheck(row, false, false);
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const alerts = rows.filter((r) => r.target_price != null && r.last_price != null && r.last_price < r.target_price);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Competitor Tracking"
        subtitle="Pronto para plugar a consulta GET /items/{id} do ML."
        actions={
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={refresh} disabled={loading}>
              <RefreshCw className="h-4 w-4" />
              {loading ? 'Atualizando...' : 'Atualizar'}
            </button>
            <button className="btn-primary" onClick={simulateAll} disabled={busy || !rows.length}>
              {busy ? 'Simulando...' : 'Simular checagem geral'}
            </button>
          </div>
        }
      />

      {err ? (
        <div className="alert alert-error">
          {err}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Monitorados</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-slate-100">{rows.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Alertas</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-slate-100">{alerts.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Ultima checagem</div>
          <div className="mt-1 text-sm text-gray-700 dark:text-slate-200">
            {rows[0]?.last_checked_at ? fmtDate(rows[0].last_checked_at) : '—'}
          </div>
        </div>
      </div>

      <SectionCard
        title="Adicionar concorrente"
        action={
          <button className="btn-primary" onClick={addTracking} disabled={busy}>
            {busy ? 'Salvando...' : 'Salvar tracking'}
          </button>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <div className="label mb-1">Produto interno</div>
            <select
              className="input"
              value={form.my_product_id}
              onChange={(e) => setForm((prev) => ({ ...prev, my_product_id: e.target.value }))}
            >
              <option value="">Selecionar produto</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.size_cm ? `${p.size_cm}cm` : ''} • {p.variant}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="label mb-1">ID do concorrente (MLB)</div>
            <input
              className="input"
              value={form.competitor_mlb_id}
              onChange={(e) => setForm((prev) => ({ ...prev, competitor_mlb_id: e.target.value }))}
              placeholder="MLB123456789"
            />
          </div>
          <div>
            <div className="label mb-1">Preco alvo (opcional)</div>
            <input
              className="input"
              inputMode="decimal"
              value={form.target_price}
              onChange={(e) => setForm((prev) => ({ ...prev, target_price: e.target.value }))}
              placeholder="Ex: 169,90"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Monitoramento" action={<Crosshair className="h-4 w-4 text-gray-500 dark:text-slate-400" />}>
        <div className="table-scroll">
          <table className="table-base w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-2 py-2 font-semibold">Produto</th>
                <th className="px-2 py-2 font-semibold">Concorrente</th>
                <th className="px-2 py-2 text-right font-semibold">Ultimo preco</th>
                <th className="px-2 py-2 text-right font-semibold">Preco alvo</th>
                <th className="px-2 py-2 text-right font-semibold">Checado em</th>
                <th className="px-2 py-2 text-center font-semibold">Status</th>
                <th className="px-2 py-2 text-center font-semibold">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const product = productMap.get(row.my_product_id);
                const isAlert = row.target_price != null && row.last_price != null && row.last_price < row.target_price;
                return (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-900">
                    <td className="px-2 py-3">
                      {product ? `${product.name} ${product.size_cm ? `${product.size_cm}cm` : ''}` : row.my_product_id}
                    </td>
                    <td className="px-2 py-3">{row.competitor_mlb_id}</td>
                    <td className="px-2 py-3 text-right">{fmtBRL(row.last_price)}</td>
                    <td className="px-2 py-3 text-right">{fmtBRL(row.target_price)}</td>
                    <td className="px-2 py-3 text-right">{fmtDate(row.last_checked_at)}</td>
                    <td className="px-2 py-3 text-center">
                      {isAlert ? (
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:border-amber-900/60 dark:bg-amber-900/30 dark:text-amber-200">
                          Abaixo do alvo
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/30 dark:text-emerald-200">
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-center">
                      <button className="btn-ghost" onClick={() => simulateCheck(row)} disabled={busy}>
                        Simular
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!rows.length ? (
                <tr>
                  <td colSpan={7} className="px-2 py-6 text-center text-sm text-gray-500 dark:text-slate-400">
                    Nenhum concorrente cadastrado.
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



