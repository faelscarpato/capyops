import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import type { Product } from '../lib/types';
import { listProducts, listSalesSince } from '../lib/db';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';

const DEFAULT_LEAD_TIME_KEY = 'capyops_lead_time_default_days';
const LEAD_TIME_OVERRIDES_KEY = 'capyops_lead_time_overrides';

function readLeadTimeDefault(): number {
  const raw = localStorage.getItem(DEFAULT_LEAD_TIME_KEY);
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
}

function writeLeadTimeDefault(value: number) {
  localStorage.setItem(DEFAULT_LEAD_TIME_KEY, String(value));
}

function readLeadTimeOverrides(): Record<string, number> {
  const raw = localStorage.getItem(LEAD_TIME_OVERRIDES_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function writeLeadTimeOverrides(overrides: Record<string, number>) {
  localStorage.setItem(LEAD_TIME_OVERRIDES_KEY, JSON.stringify(overrides));
}

function fmtNumber(value: number) {
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(2);
}

export default function PredictiveStockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Array<{ product_id: string; quantity: number; sold_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [leadTimeDefault, setLeadTimeDefault] = useState(() => readLeadTimeDefault());
  const [leadTimeOverrides, setLeadTimeOverrides] = useState<Record<string, number>>(() => readLeadTimeOverrides());

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const sinceISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [p, s] = await Promise.all([listProducts(), listSalesSince(sinceISO)]);
      setProducts(p);
      setSales(s);
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    writeLeadTimeDefault(leadTimeDefault);
  }, [leadTimeDefault]);

  useEffect(() => {
    writeLeadTimeOverrides(leadTimeOverrides);
  }, [leadTimeOverrides]);

  const metrics = useMemo(() => {
    const totals = new Map<string, number>();
    for (const sale of sales) {
      const qty = Number(sale.quantity ?? 0);
      totals.set(sale.product_id, (totals.get(sale.product_id) ?? 0) + qty);
    }
    return products.map((p) => {
      const total30d = totals.get(p.id) ?? 0;
      const avgDaily = total30d / 30;
      const daysRemaining = avgDaily > 0 ? Number(p.stock ?? 0) / avgDaily : Infinity;
      const leadTime = leadTimeOverrides[p.id] ?? leadTimeDefault;
      const isRisk = avgDaily > 0 && daysRemaining < leadTime;
      return {
        product: p,
        total30d,
        avgDaily,
        daysRemaining,
        leadTime,
        isRisk
      };
    });
  }, [products, sales, leadTimeDefault, leadTimeOverrides]);

  const atRisk = metrics.filter((m) => m.isRisk);

  function updateLeadTime(productId: string, value: string) {
    const parsed = Number(String(value).replace(',', '.'));
    setLeadTimeOverrides((prev) => ({
      ...prev,
      [productId]: Number.isFinite(parsed) && parsed > 0 ? parsed : leadTimeDefault
    }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estoque preditivo"
        subtitle="Runway de estoque com base nos ultimos 30 dias."
        actions={
          <button className="btn-ghost" onClick={refresh} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        }
      />

      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-200">
          {err}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
            Itens em risco
          </div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-slate-100">{atRisk.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
            Total monitorado
          </div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-slate-100">{metrics.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
            Lead time padrao (dias)
          </div>
          <input
            className="input mt-2 w-24"
            inputMode="decimal"
            value={String(leadTimeDefault)}
            onChange={(e) => {
              const parsed = Number(String(e.target.value).replace(',', '.'));
              setLeadTimeDefault(Number.isFinite(parsed) && parsed > 0 ? parsed : leadTimeDefault);
            }}
          />
        </div>
      </div>

      <SectionCard
        title="Runway por produto"
        action={<AlertTriangle className="h-4 w-4 text-gray-500 dark:text-slate-400" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-2 py-2 font-semibold">Produto</th>
                <th className="px-2 py-2 text-right font-semibold">Estoque</th>
                <th className="px-2 py-2 text-right font-semibold">Vendas 30d</th>
                <th className="px-2 py-2 text-right font-semibold">Media/dia</th>
                <th className="px-2 py-2 text-right font-semibold">Dias restantes</th>
                <th className="px-2 py-2 text-right font-semibold">Lead time</th>
                <th className="px-2 py-2 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((row) => (
                <tr key={row.product.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-900">
                  <td className="px-2 py-3">
                    {row.product.name} {row.product.size_cm ? `${row.product.size_cm}cm` : ''} • {row.product.variant}
                  </td>
                  <td className="px-2 py-3 text-right">{row.product.stock}</td>
                  <td className="px-2 py-3 text-right">{fmtNumber(row.total30d)}</td>
                  <td className="px-2 py-3 text-right">{fmtNumber(row.avgDaily)}</td>
                  <td className="px-2 py-3 text-right">
                    {Number.isFinite(row.daysRemaining) ? fmtNumber(row.daysRemaining) : '—'}
                  </td>
                  <td className="px-2 py-3 text-right">
                    <input
                      className="input w-20 text-right"
                      inputMode="decimal"
                      value={String(row.leadTime)}
                      onChange={(e) => updateLeadTime(row.product.id, e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-3 text-center">
                    {row.isRisk ? (
                      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-200">
                        Repor agora
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/30 dark:text-emerald-200">
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {!metrics.length && !loading ? (
                <tr>
                  <td colSpan={7} className="px-2 py-6 text-center text-sm text-gray-500 dark:text-slate-400">
                    Nenhum produto encontrado.
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
