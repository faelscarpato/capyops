import { useEffect, useMemo, useState } from 'react';
import { listProducts, listSalesInRange } from '../../../lib/db';
import type { Product } from '../../../lib/types';
import { readCategoryRates } from '../../../lib/categoryRates';
import { usePricingSettings } from '../../../hooks/usePricingSettings';

function fmtBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

type Rate = {
  mlFeePercent: number;
  taxCbsPercent: number;
  taxIbsPercent: number;
  taxIsPercent: number;
  marginPercent: number;
};

function toISODate(value: string) {
  if (!value) return '';
  return `${value}T00:00:00`;
}

export default function TaxesManager() {
  const { settings } = usePricingSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [sales, setSales] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const p = await listProducts({ includeInactive: true });
      setProducts(p);
    })();
  }, []);

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const startISO = toISODate(startDate);
      const endISO = `${endDate}T23:59:59`;
      const rows = await listSalesInRange(startISO, endISO);
      setSales(rows);
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao carregar vendas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  const rates = useMemo(() => readCategoryRates(), []);

  function resolveRate(category?: string | null, channel?: string | null): Rate {
    const cat = (category || '').trim().toLowerCase();
    const ch = (channel || '').trim().toLowerCase();
    const exact = rates.find((r) => r.category.toLowerCase() === cat && (r.channel || '').toLowerCase() === ch);
    if (exact) return exact;
    const byCat = rates.find((r) => r.category.toLowerCase() === cat && !r.channel);
    if (byCat) return byCat;
    return {
      mlFeePercent: Number(settings.mlFeePercent ?? 0),
      taxCbsPercent: Number(settings.taxCbsPercent ?? 0),
      taxIbsPercent: Number(settings.taxIbsPercent ?? 0),
      taxIsPercent: Number(settings.taxIsPercent ?? 0),
      marginPercent: Number(settings.defaultMarginPercent ?? 0)
    };
  }

  const totals = useMemo(() => {
    let gross = 0;
    let mlFee = 0;
    let cbs = 0;
    let ibs = 0;
    let is = 0;

    const byCategory: Record<string, { gross: number; cbs: number; ibs: number; is: number; mlFee: number }> = {};

    for (const s of sales) {
      const qty = Number(s.quantity ?? 0);
      const price = Number(s.sale_price ?? 0);
      const lineGross = qty * price;

      const product = productMap.get(s.product_id);
      const category = product?.category || 'Sem categoria';
      const rate = resolveRate(category, s.channel);

      const mlRateFromSale = s.ml_fee_rate != null ? Number(s.ml_fee_rate) * 100 : rate.mlFeePercent;

      const mlValue = lineGross * (mlRateFromSale / 100);
      const cbsValue = lineGross * (rate.taxCbsPercent / 100);
      const ibsValue = lineGross * (rate.taxIbsPercent / 100);
      const isValue = lineGross * (rate.taxIsPercent / 100);

      gross += lineGross;
      mlFee += mlValue;
      cbs += cbsValue;
      ibs += ibsValue;
      is += isValue;

      if (!byCategory[category]) {
        byCategory[category] = { gross: 0, cbs: 0, ibs: 0, is: 0, mlFee: 0 };
      }
      byCategory[category].gross += lineGross;
      byCategory[category].mlFee += mlValue;
      byCategory[category].cbs += cbsValue;
      byCategory[category].ibs += ibsValue;
      byCategory[category].is += isValue;
    }

    return { gross, mlFee, cbs, ibs, is, byCategory };
  }, [sales, productMap, settings, rates]);

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div>
            <div className="label mb-1">Data inicial</div>
            <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <div className="label mb-1">Data final</div>
            <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-gray-500">Totais do periodo</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="badge badge-neutral">Bruto: {fmtBRL(totals.gross)}</span>
              <span className="badge badge-warning">ML: {fmtBRL(totals.mlFee)}</span>
              <span className="badge badge-info">CBS: {fmtBRL(totals.cbs)}</span>
              <span className="badge badge-info">IBS: {fmtBRL(totals.ibs)}</span>
              <span className="badge badge-info">IS: {fmtBRL(totals.is)}</span>
            </div>
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full" type="button" onClick={refresh} disabled={loading}>
              {loading ? 'Atualizando...' : 'Recalcular'}
            </button>
          </div>
        </div>
        {err ? <div className="mt-2 text-xs text-red-600">{err}</div> : null}
      </div>

      <div className="card p-4">
        <div className="text-sm font-semibold">Impostos por categoria</div>
        <div className="table-scroll mt-3">
          <table className="table-base w-full text-left">
            <thead>
              <tr>
                <th>Categoria</th>
                <th className="text-right">Bruto</th>
                <th className="text-right">ML</th>
                <th className="text-right">CBS</th>
                <th className="text-right">IBS</th>
                <th className="text-right">IS</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(totals.byCategory).map(([cat, row]) => (
                <tr key={cat}>
                  <td>{cat}</td>
                  <td className="text-right">{fmtBRL(row.gross)}</td>
                  <td className="text-right">{fmtBRL(row.mlFee)}</td>
                  <td className="text-right">{fmtBRL(row.cbs)}</td>
                  <td className="text-right">{fmtBRL(row.ibs)}</td>
                  <td className="text-right">{fmtBRL(row.is)}</td>
                </tr>
              ))}
              {!sales.length ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-gray-500">
                    Nenhuma venda no periodo.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Taxas aplicadas conforme cadastro em Taxas por categoria; fallback para taxas globais do Precificador.
        </div>
      </div>
    </div>
  );
}
