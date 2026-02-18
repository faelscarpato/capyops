import { useEffect, useMemo, useRef, useState } from 'react';
import type { Expense, PackingKit, PackingKitItem, Product, Supply } from '../lib/types';
import type { Chart as ChartType } from 'chart.js';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { AlertTriangle, Boxes, ChartNoAxesCombined, DollarSign, RefreshCw } from 'lucide-react';
import {
  listAllPackingKitItems,
  listExpensesInRange,
  listPackingKits,
  listProducts,
  listSalesInRange,
  listSalesSince,
  listSupplies
} from '../lib/db';
import SectionHeader from '../app/v3/components/SectionHeader';
import Card from '../app/v3/components/Card';
import StatCard from '../app/v3/components/StatCard';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function fmtBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtInt(value: number) {
  return value.toLocaleString('pt-BR');
}

function toISODateRange(start: string, end: string) {
  const startISO = new Date(`${start}T00:00:00`).toISOString();
  const endISO = new Date(`${end}T23:59:59`).toISOString();
  return { startISO, endISO };
}

function dateDiffInDays(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const diff = Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
  return Math.max(0, diff);
}

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function toISOWeek(date: Date) {
  const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((temp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: temp.getUTCFullYear(), week: weekNo };
}

function buildSeries(start: Date, end: Date, granularity: 'day' | 'week' | 'month' | 'year') {
  const series: Array<{ key: string; label: string }> = [];
  if (granularity === 'day') {
    const cursor = new Date(start);
    const limit = new Date(end);
    while (cursor <= limit) {
      const key = cursor.toISOString().slice(0, 10);
      series.push({ key, label: cursor.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) });
      cursor.setDate(cursor.getDate() + 1);
    }
    return series;
  }
  if (granularity === 'week') {
    const cursor = new Date(start);
    cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
    const limit = new Date(end);
    while (cursor <= limit) {
      const { year, week } = toISOWeek(cursor);
      const key = `${year}-W${String(week).padStart(2, '0')}`;
      series.push({ key, label: `W${String(week).padStart(2, '0')} ${year}` });
      cursor.setDate(cursor.getDate() + 7);
    }
    return series;
  }
  if (granularity === 'month') {
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const limit = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cursor <= limit) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      series.push({ key, label: `${monthLabels[cursor.getMonth()]} ${cursor.getFullYear()}` });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return series;
  }
  const cursor = new Date(start.getFullYear(), 0, 1);
  const limit = new Date(end.getFullYear(), 0, 1);
  while (cursor <= limit) {
    const key = String(cursor.getFullYear());
    series.push({ key, label: key });
    cursor.setFullYear(cursor.getFullYear() + 1);
  }
  return series;
}

function bucketKey(date: Date, granularity: 'day' | 'week' | 'month' | 'year') {
  if (granularity === 'day') return date.toISOString().slice(0, 10);
  if (granularity === 'week') {
    const { year, week } = toISOWeek(date);
    return `${year}-W${String(week).padStart(2, '0')}`;
  }
  if (granularity === 'month') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  return String(date.getFullYear());
}

function chartToDataUrl(ref: React.MutableRefObject<ChartType | null>) {
  const chart = ref.current as any;
  if (!chart) return null;
  if (typeof chart.toBase64Image === 'function') return chart.toBase64Image();
  if (chart.chart && typeof chart.chart.toBase64Image === 'function') return chart.chart.toBase64Image();
  return null;
}

function dataUrlToUint8Array(dataUrl: string) {
  const base64 = dataUrl.split(',')[1] ?? '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function buildDocxTable(headers: string[], rows: Array<Array<string | number>>, docx: any) {
  const { Table, TableCell, TableRow, Paragraph, TextRun } = docx;
  return new Table({
    width: { size: 100, type: 'pct' },
    rows: [
      new TableRow({
        children: headers.map((header) =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })] })]
          })
        )
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map((cell) =>
              new TableCell({
                children: [new Paragraph(String(cell ?? ''))]
              })
            )
          })
      )
    ]
  });
}

export default function ReportsPage() {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), 0, 1);
  const defaultEnd = new Date(now.getFullYear(), 11, 31);
  const [startDate, setStartDate] = useState(defaultStart.toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(defaultEnd.toISOString().slice(0, 10));
  const [salesGranularity, setSalesGranularity] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [expenseGranularity, setExpenseGranularity] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [salesRows, setSalesRows] = useState<any[]>([]);
  const [expenseRows, setExpenseRows] = useState<Expense[]>([]);
  const [prevSalesRows, setPrevSalesRows] = useState<any[]>([]);
  const [prevExpenseRows, setPrevExpenseRows] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [kits, setKits] = useState<PackingKit[]>([]);
  const [kitItems, setKitItems] = useState<PackingKitItem[]>([]);
  const [sales30d, setSales30d] = useState<Array<{ product_id: string; quantity: number; sold_at: string }>>([]);
  const salesChartRef = useRef<ChartType | null>(null);
  const netChartRef = useRef<ChartType | null>(null);
  const expenseChartRef = useRef<ChartType | null>(null);
  const regionChartRef = useRef<ChartType | null>(null);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const { startISO, endISO } = toISODateRange(startDate, endDate);
      const span = dateDiffInDays(startDate, endDate) + 1;
      const prevStart = shiftDate(startDate, -span);
      const prevEnd = shiftDate(endDate, -span);
      const { startISO: prevStartISO, endISO: prevEndISO } = toISODateRange(prevStart, prevEnd);
      const sinceISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [sales, expenses, prevSales, prevExpenses, p, s, k, kItems, salesRecent] = await Promise.all([
        listSalesInRange(startISO, endISO),
        listExpensesInRange(startISO, endISO),
        listSalesInRange(prevStartISO, prevEndISO),
        listExpensesInRange(prevStartISO, prevEndISO),
        listProducts(),
        listSupplies(),
        listPackingKits(),
        listAllPackingKitItems(),
        listSalesSince(sinceISO)
      ]);
      setSalesRows(sales);
      setExpenseRows(expenses);
      setPrevSalesRows(prevSales);
      setPrevExpenseRows(prevExpenses);
      setProducts(p);
      setSupplies(s);
      setKits(k);
      setKitItems(kItems);
      setSales30d(salesRecent);
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao carregar relatorios.');
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

  const inventoryRows = useMemo(() => {
    return products
      .map((p) => ({
        ...p,
        status: (p.stock ?? 0) <= (p.min_stock ?? 0) ? 'CRITICO' : 'OK'
      }))
      .sort((a, b) => (a.status === 'CRITICO' ? -1 : 1));
  }, [products]);

  const suppliesRows = useMemo(() => {
    return supplies.map((s) => ({
      ...s,
      total_value: Number(s.cost_per_unit ?? 0) * Number(s.stock_qty ?? 0)
    }));
  }, [supplies]);

  const predictiveRows = useMemo(() => {
    const totals = new Map<string, number>();
    for (const sale of sales30d) {
      totals.set(sale.product_id, (totals.get(sale.product_id) ?? 0) + Number(sale.quantity ?? 0));
    }
    return products.map((p) => {
      const total30d = totals.get(p.id) ?? 0;
      const avgDaily = total30d / 30;
      const daysRemaining = avgDaily > 0 ? Number(p.stock ?? 0) / avgDaily : Infinity;
      const status = avgDaily > 0 && daysRemaining < 7 ? 'REPOR' : 'OK';
      return { product: p, total30d, avgDaily, daysRemaining, status };
    });
  }, [products, sales30d]);

  const kitCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of kitItems) {
      map.set(item.kit_id, (map.get(item.kit_id) ?? 0) + 1);
    }
    return map;
  }, [kitItems]);

  const expenseSeries = useMemo(() => {
    const series = buildSeries(new Date(startDate), new Date(endDate), expenseGranularity);
    const map = new Map<string, number>();
    for (const bucket of series) {
      map.set(bucket.key, 0);
    }
    for (const exp of expenseRows) {
      const key = bucketKey(new Date(exp.paid_at), expenseGranularity);
      map.set(key, (map.get(key) ?? 0) + Number(exp.amount ?? 0));
    }
    return series.map((bucket) => ({
      label: bucket.label,
      total: map.get(bucket.key) ?? 0
    }));
  }, [expenseRows, expenseGranularity, startDate, endDate]);

  const salesSeries = useMemo(() => {
    const series = buildSeries(new Date(startDate), new Date(endDate), salesGranularity);
    const map = new Map<string, { gross: number; net: number; count: number }>();
    for (const bucket of series) {
      map.set(bucket.key, { gross: 0, net: 0, count: 0 });
    }
    for (const sale of salesRows) {
      const key = bucketKey(new Date(sale.sold_at), salesGranularity);
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
    return series.map((bucket) => {
      const data = map.get(bucket.key)!;
      return { label: bucket.label, gross: data.gross, net: data.net, count: data.count };
    });
  }, [salesRows, salesGranularity, startDate, endDate]);

  const salesByRegion = useMemo(() => {
    const map = new Map<string, number>();
    for (const sale of salesRows) {
      const region = sale.region ?? 'Nao informado';
      const qty = Number(sale.quantity ?? 0);
      const salePrice = Number(sale.sale_price ?? 0);
      map.set(region, (map.get(region) ?? 0) + qty * salePrice);
    }
    return Array.from(map.entries())
      .map(([label, total]) => ({ label, total }))
      .sort((a, b) => b.total - a.total);
  }, [salesRows]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { qty: number; revenue: number }>();
    for (const sale of salesRows) {
      const qty = Number(sale.quantity ?? 0);
      const revenue = qty * Number(sale.sale_price ?? 0);
      const prev = map.get(sale.product_id) ?? { qty: 0, revenue: 0 };
      map.set(sale.product_id, {
        qty: prev.qty + qty,
        revenue: prev.revenue + revenue
      });
    }

    const rows = Array.from(map.entries())
      .map(([id, data]) => ({
        id,
        qty: data.qty,
        revenue: data.revenue,
        label: productMap.get(id)?.name ?? 'Produto'
      }))
      .sort((a, b) => {
        if (b.qty !== a.qty) return b.qty - a.qty;
        return b.revenue - a.revenue;
      });

    const top = rows.slice(0, 5);
    const topIds = new Set(top.map((row) => row.id));
    const bottom = [...rows]
      .filter((row) => !topIds.has(row.id))
      .sort((a, b) => {
        if (a.qty !== b.qty) return a.qty - b.qty;
        return a.revenue - b.revenue;
      })
      .slice(0, 5);

    return { top, bottom };
  }, [salesRows, productMap]);

  const filteredInventoryRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return inventoryRows;
    return inventoryRows.filter((p) =>
      `${p.name} ${p.variant ?? ''} ${p.sku ?? ''}`.toLowerCase().includes(term)
    );
  }, [inventoryRows, search]);

  const filteredSuppliesRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return suppliesRows;
    return suppliesRows.filter((s) => `${s.name} ${s.supplier_name ?? ''}`.toLowerCase().includes(term));
  }, [suppliesRows, search]);

  const filteredPredictiveRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return predictiveRows;
    return predictiveRows.filter((row) =>
      `${row.product.name} ${row.product.variant ?? ''}`.toLowerCase().includes(term)
    );
  }, [predictiveRows, search]);

  const filteredKits = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return kits;
    return kits.filter((kit) => `${kit.name} ${kit.notes ?? ''}`.toLowerCase().includes(term));
  }, [kits, search]);

  const filteredTopProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return topProducts.top;
    return topProducts.top.filter((row) => row.label.toLowerCase().includes(term));
  }, [topProducts.top, search]);

  const filteredBottomProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return topProducts.bottom;
    return topProducts.bottom.filter((row) => row.label.toLowerCase().includes(term));
  }, [topProducts.bottom, search]);

  const expenseChart = useMemo(() => {
    return {
      labels: expenseSeries.map((r) => r.label),
      datasets: [
        {
          label: 'Despesas',
          data: expenseSeries.map((r) => r.total),
          backgroundColor: 'rgba(239, 68, 68, 0.6)'
        }
      ]
    };
  }, [expenseSeries]);

  const salesChart = useMemo(() => {
    return {
      labels: salesSeries.map((r) => r.label),
      datasets: [
        {
          label: 'Receita bruta',
          data: salesSeries.map((r) => r.gross),
          borderColor: '#22d3ee',
          backgroundColor: 'rgba(34, 211, 238, 0.25)',
          tension: 0.3
        }
      ]
    };
  }, [salesSeries]);

  const netChart = useMemo(() => {
    return {
      labels: salesSeries.map((r) => r.label),
      datasets: [
        {
          label: 'Lucro estimado',
          data: salesSeries.map((r) => r.net),
          backgroundColor: salesSeries.map((r) =>
            r.net < 0 ? 'rgba(239, 68, 68, 0.6)' : 'rgba(16, 185, 129, 0.6)'
          )
        }
      ]
    };
  }, [salesSeries]);

  const regionChart = useMemo(() => {
    return {
      labels: salesByRegion.map((r) => r.label),
      datasets: [
        {
          label: 'Receita por regiao',
          data: salesByRegion.map((r) => r.total),
          backgroundColor: 'rgba(59, 130, 246, 0.6)'
        }
      ]
    };
  }, [salesByRegion]);

  function exportCSV() {
    const header = 'Periodo,ReceitaBruta,LucroEstimado,Vendas';
    const body = salesSeries.map((r) => `${r.label},${r.gross.toFixed(2)},${r.net.toFixed(2)},${r.count}`);
    const csv = [header, ...body].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-${startDate}-a-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function exportReportsPdf() {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 14;
    const contentWidth = doc.internal.pageSize.getWidth() - marginX * 2;
    let y = 16;

    doc.setFontSize(16);
    doc.text('Relatorios', marginX, y);
    y += 6;
    doc.setFontSize(10);
    doc.text(`Periodo: ${startDate} ate ${endDate}`, marginX, y);
    y += 6;

    const addChart = (title: string, dataUrl: string | null) => {
      if (!dataUrl) return;
      if (y + 70 > pageHeight) {
        doc.addPage();
        y = 16;
      }
      doc.setFontSize(12);
      doc.text(title, marginX, y);
      y += 4;
      doc.addImage(dataUrl, 'PNG', marginX, y, contentWidth, 60, undefined, 'FAST');
      y += 66;
    };

    addChart('Vendas realizadas', chartToDataUrl(salesChartRef));
    addChart('Lucro estimado', chartToDataUrl(netChartRef));
    addChart('Despesas por periodo', chartToDataUrl(expenseChartRef));
    addChart('Vendas por regiao', chartToDataUrl(regionChartRef));

    const addTable = (title: string, head: string[], body: Array<Array<string | number>>) => {
      if (y + 20 > pageHeight) {
        doc.addPage();
        y = 16;
      }
      doc.setFontSize(12);
      doc.text(title, marginX, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [head],
        body,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [230, 235, 245], textColor: 20 },
        alternateRowStyles: { fillColor: [248, 248, 248] },
        margin: { left: marginX, right: marginX }
      });
      y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : y + 10;
    };

    addTable(
      'Resumo de vendas',
      ['Periodo', 'Receita', 'Lucro', 'Vendas'],
      salesSeries.map((r) => [r.label, fmtBRL(r.gross), fmtBRL(r.net), r.count])
    );

    addTable(
      'Despesas',
      ['Periodo', 'Total'],
      expenseSeries.map((r) => [r.label, fmtBRL(r.total)])
    );

    addTable(
      'Produtos em estoque',
      ['Produto', 'Qtd', 'Min', 'Status'],
      inventoryRows.map((p) => [
        `${p.name} ${p.size_cm ? `${p.size_cm}cm` : ''} • ${p.variant}`,
        p.stock,
        p.min_stock,
        p.status
      ])
    );

    addTable(
      'Insumos',
      ['Insumo', 'Fornecedor', 'Valor'],
      suppliesRows.map((s) => [s.name, s.supplier_name ?? '-', fmtBRL(s.total_value)])
    );

    addTable(
      'Estoque preditivo (30 dias)',
      ['Produto', 'Vendas 30d', 'Media/dia', 'Dias restantes', 'Status'],
      predictiveRows.map((row) => [
        row.product.name,
        row.total30d.toFixed(1),
        row.avgDaily.toFixed(2),
        Number.isFinite(row.daysRemaining) ? row.daysRemaining.toFixed(1) : '-',
        row.status
      ])
    );

    addTable(
      'Kits cadastrados',
      ['Kit', 'Itens', 'Notas'],
      kits.map((kit) => [kit.name, kitCounts.get(kit.id) ?? 0, kit.notes ?? '-'])
    );

    addTable(
      'Top produtos vendidos',
      ['Produto', 'Qtd', 'Receita'],
      topProducts.top.map((row) => [row.label, row.qty, fmtBRL(row.revenue)])
    );

    addTable(
      'Menor giro (exclui Top)',
      ['Produto', 'Qtd', 'Receita'],
      topProducts.bottom.map((row) => [row.label, row.qty, fmtBRL(row.revenue)])
    );

    doc.save(`relatorios-${startDate}-a-${endDate}.pdf`);
  }

  async function exportReportsDocx() {
    const [docx, { saveAs }] = await Promise.all([
      import('docx'),
      import('file-saver')
    ]);
    const { Document, ImageRun, Packer, Paragraph, TextRun } = docx;
    const salesChartImg = chartToDataUrl(salesChartRef);
    const netChartImg = chartToDataUrl(netChartRef);
    const expenseChartImg = chartToDataUrl(expenseChartRef);
    const regionChartImg = chartToDataUrl(regionChartRef);

    const children: any[] = [
      new Paragraph({ children: [new TextRun({ text: 'Relatorios', bold: true, size: 28 })] }),
      new Paragraph(`Periodo: ${startDate} ate ${endDate}`),
      new Paragraph('')
    ];

    const chartBlocks = [
      { title: 'Vendas realizadas', img: salesChartImg },
      { title: 'Lucro estimado', img: netChartImg },
      { title: 'Despesas por periodo', img: expenseChartImg },
      { title: 'Vendas por regiao', img: regionChartImg }
    ];

    for (const block of chartBlocks) {
      if (!block.img) continue;
      children.push(new Paragraph({ children: [new TextRun({ text: block.title, bold: true })] }));
      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: dataUrlToUint8Array(block.img),
              transformation: { width: 600, height: 220 },
              type: 'png'
            })
          ]
        })
      );
      children.push(new Paragraph(''));
    }

    children.push(
      new Paragraph({ children: [new TextRun({ text: 'Resumo de vendas', bold: true })] }),
      buildDocxTable(
        ['Periodo', 'Receita', 'Lucro', 'Vendas'],
        salesSeries.map((r) => [r.label, fmtBRL(r.gross), fmtBRL(r.net), r.count]),
        docx
      ),
      new Paragraph('')
    );

    children.push(
      new Paragraph({ children: [new TextRun({ text: 'Despesas', bold: true })] }),
      buildDocxTable(
        ['Periodo', 'Total'],
        expenseSeries.map((r) => [r.label, fmtBRL(r.total)]),
        docx
      ),
      new Paragraph('')
    );

    children.push(
      new Paragraph({ children: [new TextRun({ text: 'Produtos em estoque', bold: true })] }),
      buildDocxTable(
        ['Produto', 'Qtd', 'Min', 'Status'],
        inventoryRows.map((p) => [
          `${p.name} ${p.size_cm ? `${p.size_cm}cm` : ''} • ${p.variant}`,
          p.stock,
          p.min_stock,
          p.status
        ]),
        docx
      ),
      new Paragraph('')
    );

    children.push(
      new Paragraph({ children: [new TextRun({ text: 'Insumos', bold: true })] }),
      buildDocxTable(
        ['Insumo', 'Fornecedor', 'Valor'],
        suppliesRows.map((s) => [s.name, s.supplier_name ?? '-', fmtBRL(s.total_value)]),
        docx
      ),
      new Paragraph('')
    );

    children.push(
      new Paragraph({ children: [new TextRun({ text: 'Estoque preditivo (30 dias)', bold: true })] }),
      buildDocxTable(
        ['Produto', 'Vendas 30d', 'Media/dia', 'Dias restantes', 'Status'],
        predictiveRows.map((row) => [
          row.product.name,
          row.total30d.toFixed(1),
          row.avgDaily.toFixed(2),
          Number.isFinite(row.daysRemaining) ? row.daysRemaining.toFixed(1) : '-',
          row.status
        ]),
        docx
      ),
      new Paragraph('')
    );

    children.push(
      new Paragraph({ children: [new TextRun({ text: 'Kits cadastrados', bold: true })] }),
      buildDocxTable(
        ['Kit', 'Itens', 'Notas'],
        kits.map((kit) => [kit.name, kitCounts.get(kit.id) ?? 0, kit.notes ?? '-']),
        docx
      ),
      new Paragraph('')
    );

    children.push(
      new Paragraph({ children: [new TextRun({ text: 'Top produtos vendidos', bold: true })] }),
      buildDocxTable(['Produto', 'Qtd', 'Receita'], topProducts.top.map((row) => [row.label, row.qty, fmtBRL(row.revenue)]), docx),
      new Paragraph('')
    );

    children.push(
      new Paragraph({ children: [new TextRun({ text: 'Menor giro (exclui Top)', bold: true })] }),
      buildDocxTable(['Produto', 'Qtd', 'Receita'], topProducts.bottom.map((row) => [row.label, row.qty, fmtBRL(row.revenue)]), docx)
    );

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `relatorios-${startDate}-a-${endDate}.docx`);
  }

  function exportReportsTxt() {
    const padRow = (cols: string[], widths: number[]) =>
      cols
        .map((col, i) => {
          const value = String(col ?? '');
          const width = widths[i] ?? 12;
          return value.length > width ? value.slice(0, width - 1) + '…' : value.padEnd(width);
        })
        .join(' | ');

    const sections: string[] = [];
    sections.push(`RELATORIOS (${startDate} ate ${endDate})`);
    sections.push('');

    sections.push('RESUMO DE VENDAS');
    sections.push(padRow(['Periodo', 'Receita', 'Lucro', 'Vendas'], [14, 14, 14, 8]));
    sections.push(...salesSeries.map((r) => padRow([r.label, fmtBRL(r.gross), fmtBRL(r.net), String(r.count)], [14, 14, 14, 8])));
    sections.push('');

    sections.push('DESPESAS');
    sections.push(padRow(['Periodo', 'Total'], [14, 14]));
    sections.push(...expenseSeries.map((r) => padRow([r.label, fmtBRL(r.total)], [14, 14])));
    sections.push('');

    sections.push('PRODUTOS EM ESTOQUE');
    sections.push(padRow(['Produto', 'Qtd', 'Min', 'Status'], [28, 6, 6, 10]));
    sections.push(
      ...inventoryRows.map((p) =>
        padRow(
          [`${p.name} ${p.size_cm ? `${p.size_cm}cm` : ''}`.trim(), String(p.stock), String(p.min_stock), p.status],
          [28, 6, 6, 10]
        )
      )
    );
    sections.push('');

    sections.push('INSUMOS');
    sections.push(padRow(['Insumo', 'Fornecedor', 'Valor'], [20, 16, 12]));
    sections.push(...suppliesRows.map((s) => padRow([s.name, s.supplier_name ?? '-', fmtBRL(s.total_value)], [20, 16, 12])));
    sections.push('');

    sections.push('ESTOQUE PREDITIVO (30 DIAS)');
    sections.push(padRow(['Produto', 'Vendas', 'Media', 'Dias', 'Status'], [20, 8, 8, 8, 8]));
    sections.push(
      ...predictiveRows.map((row) =>
        padRow(
          [row.product.name, row.total30d.toFixed(1), row.avgDaily.toFixed(2), Number.isFinite(row.daysRemaining) ? row.daysRemaining.toFixed(1) : '-', row.status],
          [20, 8, 8, 8, 8]
        )
      )
    );
    sections.push('');

    sections.push('KITS CADASTRADOS');
    sections.push(padRow(['Kit', 'Itens', 'Notas'], [20, 6, 20]));
    sections.push(...kits.map((kit) => padRow([kit.name, String(kitCounts.get(kit.id) ?? 0), kit.notes ?? '-'], [20, 6, 20])));
    sections.push('');

    sections.push('TOP PRODUTOS VENDIDOS');
    sections.push(padRow(['Produto', 'Qtd', 'Receita'], [20, 6, 12]));
    sections.push(...topProducts.top.map((row) => padRow([row.label, String(row.qty), fmtBRL(row.revenue)], [20, 6, 12])));
    sections.push('');

    sections.push('MENOR GIRO (EXCLUI TOP)');
    sections.push(padRow(['Produto', 'Qtd', 'Receita'], [20, 6, 12]));
    sections.push(...topProducts.bottom.map((row) => padRow([row.label, String(row.qty), fmtBRL(row.revenue)], [20, 6, 12])));

    const blob = new Blob([sections.join('\n')], { type: 'text/plain;charset=utf-8;' });
    import('file-saver').then(({ saveAs }) => saveAs(blob, `relatorios-${startDate}-a-${endDate}.txt`));
  }

  const reportSummary = useMemo(() => {
    const gross = salesSeries.reduce((acc, row) => acc + row.gross, 0);
    const net = salesSeries.reduce((acc, row) => acc + row.net, 0);
    const orders = salesSeries.reduce((acc, row) => acc + row.count, 0);
    const expenses = expenseSeries.reduce((acc, row) => acc + row.total, 0);
    const netAfterExpenses = net - expenses;
    const avgTicket = orders ? gross / orders : 0;
    const marginPct = gross > 0 ? (net / gross) * 100 : 0;
    const criticalInventory = inventoryRows.filter((p) => p.status === 'CRITICO').length;
    const predictiveRisk = predictiveRows.filter((row) => row.status === 'REPOR').length;
    const topRegion = salesByRegion[0]?.label ?? '—';

    return {
      gross,
      net,
      orders,
      expenses,
      netAfterExpenses,
      avgTicket,
      marginPct,
      criticalInventory,
      predictiveRisk,
      topRegion
    };
  }, [salesSeries, expenseSeries, inventoryRows, predictiveRows, salesByRegion]);

  const previousSummary = useMemo(() => {
    let gross = 0;
    let net = 0;
    let orders = 0;
    for (const sale of prevSalesRows) {
      const qty = Number(sale.quantity ?? 0);
      const salePrice = Number(sale.sale_price ?? 0);
      const shipping = Number(sale.shipping_cost ?? 0);
      const feeRate = sale.ml_fee_rate == null ? 0.17 : Number(sale.ml_fee_rate);
      const packaging = sale.packaging_cost == null ? 8 : Number(sale.packaging_cost);
      const extra = Number(sale.extra_cost ?? 0);
      const lineGross = qty * salePrice;
      const fee = lineGross * feeRate;
      gross += lineGross;
      net += lineGross - fee - shipping - packaging - extra;
      orders += 1;
    }
    const expenses = prevExpenseRows.reduce((acc, row) => acc + Number(row.amount ?? 0), 0);
    const marginPct = gross > 0 ? (net / gross) * 100 : 0;
    return { gross, net, orders, expenses, marginPct };
  }, [prevSalesRows, prevExpenseRows]);

  const comparison = useMemo(() => {
    function pct(current: number, previous: number) {
      if (!previous) return current > 0 ? 100 : 0;
      return ((current - previous) / Math.abs(previous)) * 100;
    }
    return {
      grossPct: pct(reportSummary.gross, previousSummary.gross),
      netPct: pct(reportSummary.net, previousSummary.net),
      ordersPct: pct(reportSummary.orders, previousSummary.orders),
      expensesPct: pct(reportSummary.expenses, previousSummary.expenses),
      marginDelta: reportSummary.marginPct - previousSummary.marginPct
    };
  }, [reportSummary, previousSummary]);

  const executiveInsights = useMemo(() => {
    const insights: string[] = [];
    insights.push(`Receita ${comparison.grossPct >= 0 ? 'subiu' : 'caiu'} ${Math.abs(comparison.grossPct).toFixed(1)}% vs período anterior.`);
    insights.push(`Lucro estimado ${comparison.netPct >= 0 ? 'subiu' : 'caiu'} ${Math.abs(comparison.netPct).toFixed(1)}% no comparativo.`);
    insights.push(`Ticket médio atual em ${fmtBRL(reportSummary.avgTicket)} com margem de ${reportSummary.marginPct.toFixed(1)}%.`);
    if (reportSummary.criticalInventory > 0 || reportSummary.predictiveRisk > 0) {
      insights.push(`Atenção operacional: ${reportSummary.criticalInventory} itens críticos e ${reportSummary.predictiveRisk} em risco de reposição.`);
    }
    return insights;
  }, [comparison.grossPct, comparison.netPct, reportSummary.avgTicket, reportSummary.marginPct, reportSummary.criticalInventory, reportSummary.predictiveRisk]);

  const anomalies = useMemo(() => {
    const rows: Array<{ id: string; title: string; detail: string; tone: 'danger' | 'warning' | 'ok' }> = [];
    if (comparison.marginDelta <= -5) {
      rows.push({
        id: 'margin-drop',
        title: 'Queda relevante de margem',
        detail: `Margem variou ${comparison.marginDelta.toFixed(1)} p.p. vs período anterior.`,
        tone: 'danger'
      });
    }
    if (comparison.expensesPct >= 20) {
      rows.push({
        id: 'expense-rise',
        title: 'Despesas em aceleração',
        detail: `Despesas subiram ${comparison.expensesPct.toFixed(1)}% no comparativo.`,
        tone: 'warning'
      });
    }
    if (reportSummary.criticalInventory > 0 || reportSummary.predictiveRisk > 0) {
      rows.push({
        id: 'inventory-risk',
        title: 'Risco de ruptura',
        detail: `${reportSummary.criticalInventory} críticos + ${reportSummary.predictiveRisk} itens para reposição.`,
        tone: 'warning'
      });
    }
    if (!rows.length) {
      rows.push({
        id: 'stable',
        title: 'Sem anomalias críticas',
        detail: 'Indicadores dentro da faixa esperada para o período.',
        tone: 'ok'
      });
    }
    return rows;
  }, [comparison.marginDelta, comparison.expensesPct, reportSummary.criticalInventory, reportSummary.predictiveRisk]);

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Relatórios Executivos"
        subtitle="Visão financeira e operacional consolidada com dados reais do SaaS."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
              type="button"
              onClick={exportCSV}
              disabled={!salesSeries.length}
            >
              Exportar CSV
            </button>
            <button
              className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
              type="button"
              onClick={exportReportsTxt}
              disabled={!salesSeries.length}
            >
              Exportar TXT
            </button>
            <button
              className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
              type="button"
              onClick={exportReportsDocx}
              disabled={!salesSeries.length}
            >
              Exportar DOCX
            </button>
            <button
              className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
              type="button"
              onClick={exportReportsPdf}
              disabled={!salesSeries.length}
            >
              Exportar PDF
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--primary-3)]"
              type="button"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {loading ? 'Atualizando...' : 'Aplicar filtro'}
            </button>
          </div>
        }
      />

      {err ? (
        <Card className="border-[var(--danger)]">
          <p className="text-sm font-semibold text-[var(--danger)]">{err}</p>
        </Card>
      ) : null}

      <Card title="Filtros do Relatório" subtitle="Defina período, granularidade e busca global">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Data inicial</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Data final</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Granularidade vendas</label>
            <select className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm" value={salesGranularity} onChange={(e) => setSalesGranularity(e.target.value as any)}>
              <option value="day">Dia</option>
              <option value="week">Semana</option>
              <option value="month">Mes</option>
              <option value="year">Ano</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Granularidade despesas</label>
            <select
              className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              value={expenseGranularity}
              onChange={(e) => setExpenseGranularity(e.target.value as any)}
            >
              <option value="day">Dia</option>
              <option value="week">Semana</option>
              <option value="month">Mes</option>
              <option value="year">Ano</option>
            </select>
          </div>
          <div className="md:col-span-4">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Busca rápida</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto, kit, insumo ou fornecedor..."
              className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-12 gap-4 lg:gap-5">
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard label="Receita bruta" value={fmtBRL(reportSummary.gross)} delta={4.2} progress={Math.min(100, Math.round(reportSummary.marginPct + 40))} icon={<DollarSign className="h-4 w-4" />} />
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard label="Lucro estimado" value={fmtBRL(reportSummary.net)} delta={3.4} progress={Math.min(100, Math.round(reportSummary.marginPct + 30))} icon={<ChartNoAxesCombined className="h-4 w-4" />} />
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard label="Pedidos no período" value={fmtInt(reportSummary.orders)} delta={1.8} progress={Math.min(100, Math.round((reportSummary.orders / 500) * 100))} icon={<Boxes className="h-4 w-4" />} />
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard label="Itens em risco" value={fmtInt(reportSummary.criticalInventory + reportSummary.predictiveRisk)} delta={-2.3} progress={Math.min(100, Math.round(((reportSummary.criticalInventory + reportSummary.predictiveRisk) / 100) * 100))} icon={<AlertTriangle className="h-4 w-4" />} />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 lg:gap-5">
        <div className="col-span-12 xl:col-span-8">
          <Card title="Resumo Executivo" subtitle="Insights automáticos com base no período selecionado">
            <div className="space-y-2">
              {executiveInsights.map((insight) => (
                <div key={insight} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)]">
                  {insight}
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="col-span-12 xl:col-span-4">
          <Card title="Comparativo vs Período Anterior">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                <span>Receita</span>
                <span className={comparison.grossPct >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>{comparison.grossPct >= 0 ? '+' : ''}{comparison.grossPct.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                <span>Lucro</span>
                <span className={comparison.netPct >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>{comparison.netPct >= 0 ? '+' : ''}{comparison.netPct.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                <span>Pedidos</span>
                <span className={comparison.ordersPct >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>{comparison.ordersPct >= 0 ? '+' : ''}{comparison.ordersPct.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                <span>Despesas</span>
                <span className={comparison.expensesPct <= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>{comparison.expensesPct >= 0 ? '+' : ''}{comparison.expensesPct.toFixed(1)}%</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card title="Anomalias e Alertas">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {anomalies.map((row) => (
            <div
              key={row.id}
              className={[
                'rounded-[var(--radius-md)] border px-3 py-2 text-sm',
                row.tone === 'danger'
                  ? 'border-[var(--danger)] bg-[var(--danger)]/5 text-[var(--danger)]'
                  : row.tone === 'warning'
                  ? 'border-[var(--warning)] bg-[var(--warning)]/10 text-[var(--text)]'
                  : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]'
              ].join(' ')}
            >
              <div className="font-semibold">{row.title}</div>
              <div className="mt-1 text-xs">{row.detail}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-12">
        <div className="md:col-span-7">
          <Card title="Evolução de Vendas" subtitle="Receita bruta por período">
            <div className="h-72">
              <Line ref={salesChartRef as any} data={salesChart} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </Card>
        </div>
        <div className="md:col-span-5">
          <Card title="Lucro Estimado" subtitle="Contribuição por período">
            <div className="h-72">
              <Bar ref={netChartRef as any} data={netChart} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-12">
        <div className="md:col-span-6">
          <Card title="Despesas por período">
            <div className="h-72">
              <Bar ref={expenseChartRef as any} data={expenseChart} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </Card>
        </div>
        <div className="md:col-span-6">
          <Card title="Vendas por região" subtitle={`Região líder: ${reportSummary.topRegion}`}>
            <div className="h-72">
              <Bar ref={regionChartRef as any} data={regionChart} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-12">
        <div className="md:col-span-6">
          <Card title="Top produtos vendidos" subtitle="Ranking por quantidade e receita">
            <div className="space-y-2">
              {filteredTopProducts.map((row, index) => (
                <div key={row.id} className="flex items-center justify-between rounded-lg border border-[color:var(--border)] px-3 py-2 text-sm">
                  <span className="truncate pr-3">
                    <span className="mr-2 inline-flex w-6 justify-center rounded bg-[color:var(--surface-2)] text-xs font-semibold">
                      {index + 1}
                    </span>
                    {row.label}
                  </span>
                  <span className="text-right font-semibold">
                    {row.qty} un
                    <span className="ml-2 text-xs font-normal text-[color:var(--muted)]">{fmtBRL(row.revenue)}</span>
                  </span>
                </div>
              ))}
              {!filteredTopProducts.length ? (
                <div className="text-sm text-[color:var(--muted)]">Sem dados de vendas.</div>
              ) : null}
            </div>
          </Card>
        </div>
        <div className="md:col-span-6">
          <Card title="Menor giro" subtitle="Base de baixa saída (sem sobreposição com Top)">
            <div className="space-y-2">
              {filteredBottomProducts.map((row) => (
                <div key={row.id} className="flex items-center justify-between rounded-lg border border-[color:var(--border)] px-3 py-2 text-sm">
                  <span className="truncate pr-3">{row.label}</span>
                  <span className="text-right font-semibold">
                    {row.qty} un
                    <span className="ml-2 text-xs font-normal text-[color:var(--muted)]">{fmtBRL(row.revenue)}</span>
                  </span>
                </div>
              ))}
              {!filteredBottomProducts.length ? (
                <div className="text-sm text-[color:var(--muted)]">
                  Base curta para separar “menor giro” sem sobrepor o top.
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-12">
        <div className="md:col-span-7">
      <Card title="Produtos em estoque" subtitle={`${filteredInventoryRows.length} itens encontrados`}>
        <div className="table-scroll">
          <table className="table-base w-full text-left">
            <thead>
              <tr >
                <th className="px-2 py-2 font-semibold">Produto</th>
                <th className="px-2 py-2 text-center font-semibold">Qtd</th>
                <th className="px-2 py-2 text-center font-semibold">Minimo</th>
                <th className="px-2 py-2 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventoryRows.map((p) => (
                <tr key={p.id}>
                  <td className="px-2 py-3">{p.name} {p.size_cm ? `${p.size_cm}cm` : ''} • {p.variant}</td>
                  <td className="px-2 py-3 text-center">{p.stock}</td>
                  <td className="px-2 py-3 text-center">{p.min_stock}</td>
                  <td className="px-2 py-3 text-center">
                    {p.status === 'CRITICO' ? (
                      <span className="badge badge-danger">
                        Critico
                      </span>
                    ) : (
                      <span className="badge badge-success">
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {!filteredInventoryRows.length ? (
                <tr>
                  <td colSpan={4} className="px-2 py-6 text-center text-sm text-[color:var(--muted)]">
                    Nenhum produto cadastrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
        </div>
        <div className="md:col-span-5">
      <Card title="Resumo operacional">
        <div className="space-y-3 text-sm">
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Resultado líquido após despesas</div>
            <div className="mt-1 text-lg font-bold text-[var(--text)]">{fmtBRL(reportSummary.netAfterExpenses)}</div>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Ticket médio</div>
            <div className="mt-1 text-lg font-bold text-[var(--text)]">{fmtBRL(reportSummary.avgTicket)}</div>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Margem estimada</div>
            <div className="mt-1 text-lg font-bold text-[var(--text)]">{reportSummary.marginPct.toFixed(1)}%</div>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Itens críticos</div>
            <div className="mt-1 text-lg font-bold text-[var(--text)]">{fmtInt(reportSummary.criticalInventory)}</div>
          </div>
        </div>
      </Card>
        </div>
      </div>

      <Card title="Insumos cadastrados" subtitle={`${filteredSuppliesRows.length} insumos`}>
        <div className="table-scroll">
          <table className="table-base w-full text-left">
            <thead>
              <tr >
                <th className="px-2 py-2 font-semibold">Insumo</th>
                <th className="px-2 py-2 font-semibold">Fornecedor</th>
                <th className="px-2 py-2 text-right font-semibold">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliesRows.map((s) => (
                <tr key={s.id}>
                  <td className="px-2 py-3">{s.name}</td>
                  <td className="px-2 py-3">{s.supplier_name ?? '—'}</td>
                  <td className="px-2 py-3 text-right">{fmtBRL(s.total_value)}</td>
                </tr>
              ))}
              {!filteredSuppliesRows.length ? (
                <tr>
                  <td colSpan={3} className="px-2 py-6 text-center text-sm text-[color:var(--muted)]">
                    Nenhum insumo cadastrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Estoque preditivo (30 dias)" subtitle={`${filteredPredictiveRows.length} produtos no monitoramento`}>
        <div className="table-scroll">
          <table className="table-base w-full text-left">
            <thead>
              <tr >
                <th className="px-2 py-2 font-semibold">Produto</th>
                <th className="px-2 py-2 text-right font-semibold">Vendas 30d</th>
                <th className="px-2 py-2 text-right font-semibold">Media/dia</th>
                <th className="px-2 py-2 text-right font-semibold">Dias restantes</th>
                <th className="px-2 py-2 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPredictiveRows.map((row) => (
                <tr key={row.product.id}>
                  <td className="px-2 py-3">{row.product.name} {row.product.size_cm ? `${row.product.size_cm}cm` : ''}</td>
                  <td className="px-2 py-3 text-right">{row.total30d.toFixed(1)}</td>
                  <td className="px-2 py-3 text-right">{row.avgDaily.toFixed(2)}</td>
                  <td className="px-2 py-3 text-right">
                    {Number.isFinite(row.daysRemaining) ? row.daysRemaining.toFixed(1) : '—'}
                  </td>
                  <td className="px-2 py-3 text-center">
                    {row.status === 'REPOR' ? (
                      <span className="badge badge-danger">
                        Repor
                      </span>
                    ) : (
                      <span className="badge badge-success">
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {!filteredPredictiveRows.length ? (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-sm text-[color:var(--muted)]">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Kits cadastrados" subtitle={`${filteredKits.length} kits`}>
        <div className="table-scroll">
          <table className="table-base w-full text-left">
            <thead>
              <tr >
                <th className="px-2 py-2 font-semibold">Kit</th>
                <th className="px-2 py-2 text-center font-semibold">Itens</th>
                <th className="px-2 py-2 font-semibold">Notas</th>
              </tr>
            </thead>
            <tbody>
              {filteredKits.map((kit) => (
                <tr key={kit.id}>
                  <td className="px-2 py-3">{kit.name}</td>
                  <td className="px-2 py-3 text-center">{kitCounts.get(kit.id) ?? 0}</td>
                  <td className="px-2 py-3">{kit.notes ?? '—'}</td>
                </tr>
              ))}
              {!filteredKits.length ? (
                <tr>
                  <td colSpan={3} className="px-2 py-6 text-center text-sm text-[color:var(--muted)]">
                    Nenhum kit cadastrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}





