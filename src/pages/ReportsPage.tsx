import { useEffect, useMemo, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import { listSalesInRange } from '../lib/db';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function fmtBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function toISODateRange(start: string, end: string) {
  const startISO = new Date(`${start}T00:00:00`).toISOString();
  const endISO = new Date(`${end}T23:59:59`).toISOString();
  return { startISO, endISO };
}

function monthKey(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

function buildMonthSeries(start: Date, end: Date) {
  const months: { key: string; label: string }[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const limit = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= limit) {
    months.push({ key: monthKey(cursor), label: `${monthLabels[cursor.getMonth()]} ${cursor.getFullYear()}` });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

export default function ReportsPage() {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), 0, 1);
  const defaultEnd = new Date(now.getFullYear(), 11, 31);
  const [startDate, setStartDate] = useState(defaultStart.toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(defaultEnd.toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Array<{ key: string; label: string; gross: number; net: number; count: number }>>([]);

  async function refresh() {
    setLoading(true);
    try {
      const { startISO, endISO } = toISODateRange(startDate, endDate);
      const sales = await listSalesInRange(startISO, endISO);
      const monthSeries = buildMonthSeries(new Date(startDate), new Date(endDate));
      const map = new Map<string, { gross: number; net: number; count: number }>();

      for (const month of monthSeries) {
        map.set(month.key, { gross: 0, net: 0, count: 0 });
      }

      for (const sale of sales) {
        const key = monthKey(new Date(sale.sold_at));
        const bucket = map.get(key);
        if (!bucket) continue;

        const qty = Number(sale.quantity ?? 0);
        const salePrice = Number(sale.sale_price ?? 0);
        const shipping = Number(sale.shipping_cost ?? 0);
        const feeRate = sale.ml_fee_rate == null ? 0.17 : Number(sale.ml_fee_rate);
        const packaging = sale.packaging_cost == null ? 8 : Number(sale.packaging_cost);
        const extra = Number(sale.extra_cost ?? 0);

        const lineGross = qty * salePrice;
        const fee = lineGross * feeRate;

        bucket.gross += lineGross;
        bucket.net += lineGross - fee - shipping - packaging - extra;
        bucket.count += 1;
      }

      const nextRows = monthSeries.map((month) => {
        const data = map.get(month.key)!;
        return { key: month.key, label: month.label, gross: data.gross, net: data.net, count: data.count };
      });
      setRows(nextRows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const chartData = useMemo(() => {
    const labels = rows.map((r) => r.label);
    return {
      labels,
      datasets: [
        {
          label: 'Receita bruta',
          data: rows.map((r) => r.gross),
          borderColor: '#22d3ee',
          backgroundColor: 'rgba(34, 211, 238, 0.25)',
          tension: 0.3
        }
      ]
    };
  }, [rows]);

  const netData = useMemo(() => {
    const labels = rows.map((r) => r.label);
    return {
      labels,
      datasets: [
        {
          label: 'Lucro estimado',
          data: rows.map((r) => r.net),
          backgroundColor: rows.map((r) => (r.net < 0 ? 'rgba(239, 68, 68, 0.6)' : 'rgba(16, 185, 129, 0.6)'))
        }
      ]
    };
  }, [rows]);

  const growth = useMemo(() => {
    if (rows.length < 2) return null;
    const first = rows[0]?.gross ?? 0;
    const last = rows[rows.length - 1]?.gross ?? 0;
    if (first === 0) return null;
    return ((last - first) / first) * 100;
  }, [rows]);

  const growthNegative = growth != null && growth < 0;

  function exportCSV() {
    const header = 'Mes,ReceitaBruta,LucroEstimado,Vendas';
    const body = rows.map((r) => `${r.label},${r.gross.toFixed(2)},${r.net.toFixed(2)},${r.count}`);
    const csv = [header, ...body].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-${startDate}-a-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatorios"
        subtitle="Crescimento de vendas e lucro estimado ao longo do periodo."
        actions={
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" type="button" onClick={exportCSV} disabled={!rows.length}>
              Exportar CSV
            </button>
            <button className="btn-primary" type="button" onClick={refresh} disabled={loading}>
              {loading ? 'Atualizando...' : 'Aplicar filtro'}
            </button>
          </div>
        }
      />

      <SectionCard title="Filtro por periodo">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <div className="label mb-1">Data inicial</div>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
          </div>
          <div>
            <div className="label mb-1">Data final</div>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
          </div>
          <div>
            <div className="label mb-1">Crescimento no periodo</div>
            <div
              className={`rounded-lg border px-3 py-2 ${
                growthNegative
                  ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-200'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/30 dark:text-emerald-200'
              }`}
            >
              <div className="text-lg font-semibold">{growth == null ? 'Sem base' : `${growth.toFixed(1)}%`}</div>
              <div className="text-xs">Comparando inicio vs fim</div>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-12">
        <div className="md:col-span-7">
          <SectionCard title="Crescimento de vendas (mensal)">
            <div className="h-80">
              <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </SectionCard>
        </div>
        <div className="md:col-span-5">
          <SectionCard title="Lucro estimado por mes">
            <div className="h-80">
              <Bar data={netData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Resumo financeiro">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Receita total
            </div>
            <div className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
              {fmtBRL(rows.reduce((sum, r) => sum + r.gross, 0))}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Lucro estimado
            </div>
            <div className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
              {fmtBRL(rows.reduce((sum, r) => sum + r.net, 0))}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Total de vendas
            </div>
            <div className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
              {rows.reduce((sum, r) => sum + r.count, 0)}
            </div>
          </div>
        </div>
        <hr className="my-4 border-gray-200 dark:border-slate-800" />
        <div className="text-xs text-gray-500 dark:text-slate-400">
          Observacao: lucro e estimado com taxa media de 17% quando nao informado na venda.
        </div>
      </SectionCard>
    </div>
  );
}
