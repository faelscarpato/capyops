import { useEffect, useMemo, useRef, useState } from 'react';
import type { Expense, PackingKit, PackingKitItem, Product, Supply } from '../lib/types';
import type { Chart as ChartType } from 'chart.js';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, ImageRun, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import {
  listAllPackingKitItems,
  listExpensesInRange,
  listPackingKits,
  listProducts,
  listSalesInRange,
  listSalesSince,
  listSupplies
} from '../lib/db';

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

function buildDocxTable(headers: string[], rows: Array<Array<string | number>>) {
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

  const [salesRows, setSalesRows] = useState<any[]>([]);
  const [expenseRows, setExpenseRows] = useState<Expense[]>([]);
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
      const sinceISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [sales, expenses, p, s, k, kItems, salesRecent] = await Promise.all([
        listSalesInRange(startISO, endISO),
        listExpensesInRange(startISO, endISO),
        listProducts(),
        listSupplies(),
        listPackingKits(),
        listAllPackingKitItems(),
        listSalesSince(sinceISO)
      ]);
      setSalesRows(sales);
      setExpenseRows(expenses);
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
    const map = new Map<string, number>();
    for (const sale of salesRows) {
      map.set(sale.product_id, (map.get(sale.product_id) ?? 0) + Number(sale.quantity ?? 0));
    }
    const rows = Array.from(map.entries())
      .map(([id, qty]) => ({
        id,
        qty,
        label: productMap.get(id)?.name ?? 'Produto'
      }))
      .sort((a, b) => b.qty - a.qty);
    return {
      top: rows.slice(0, 5),
      bottom: rows.slice(-5).reverse()
    };
  }, [salesRows, productMap]);

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

  function exportReportsPdf() {
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
      ['Produto', 'Qtd'],
      topProducts.top.map((row) => [row.label, row.qty])
    );

    addTable(
      'Menos vendidos',
      ['Produto', 'Qtd'],
      topProducts.bottom.map((row) => [row.label, row.qty])
    );

    doc.save(`relatorios-${startDate}-a-${endDate}.pdf`);
  }

  async function exportReportsDocx() {
    const salesChartImg = chartToDataUrl(salesChartRef);
    const netChartImg = chartToDataUrl(netChartRef);
    const expenseChartImg = chartToDataUrl(expenseChartRef);
    const regionChartImg = chartToDataUrl(regionChartRef);

    const children: Array<Paragraph | Table> = [
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
        salesSeries.map((r) => [r.label, fmtBRL(r.gross), fmtBRL(r.net), r.count])
      ),
      new Paragraph('')
    );

    children.push(
      new Paragraph({ children: [new TextRun({ text: 'Despesas', bold: true })] }),
      buildDocxTable(
        ['Periodo', 'Total'],
        expenseSeries.map((r) => [r.label, fmtBRL(r.total)])
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
        ])
      ),
      new Paragraph('')
    );

    children.push(
      new Paragraph({ children: [new TextRun({ text: 'Insumos', bold: true })] }),
      buildDocxTable(
        ['Insumo', 'Fornecedor', 'Valor'],
        suppliesRows.map((s) => [s.name, s.supplier_name ?? '-', fmtBRL(s.total_value)])
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
        ])
      ),
      new Paragraph('')
    );

    children.push(
      new Paragraph({ children: [new TextRun({ text: 'Kits cadastrados', bold: true })] }),
      buildDocxTable(
        ['Kit', 'Itens', 'Notas'],
        kits.map((kit) => [kit.name, kitCounts.get(kit.id) ?? 0, kit.notes ?? '-'])
      ),
      new Paragraph('')
    );

    children.push(
      new Paragraph({ children: [new TextRun({ text: 'Top produtos vendidos', bold: true })] }),
      buildDocxTable(['Produto', 'Qtd'], topProducts.top.map((row) => [row.label, row.qty])),
      new Paragraph('')
    );

    children.push(
      new Paragraph({ children: [new TextRun({ text: 'Menos vendidos', bold: true })] }),
      buildDocxTable(['Produto', 'Qtd'], topProducts.bottom.map((row) => [row.label, row.qty]))
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
    sections.push(padRow(['Produto', 'Qtd'], [24, 6]));
    sections.push(...topProducts.top.map((row) => padRow([row.label, String(row.qty)], [24, 6])));
    sections.push('');

    sections.push('MENOS VENDIDOS');
    sections.push(padRow(['Produto', 'Qtd'], [24, 6]));
    sections.push(...topProducts.bottom.map((row) => padRow([row.label, String(row.qty)], [24, 6])));

    const blob = new Blob([sections.join('\n')], { type: 'text/plain;charset=utf-8;' });
    saveAs(blob, `relatorios-${startDate}-a-${endDate}.txt`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatorios"
        subtitle="Dashboard completo de estoque, vendas, despesas e performance."
        actions={
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" type="button" onClick={exportCSV} disabled={!salesSeries.length}>
              Exportar CSV
            </button>
            <button className="btn-ghost" type="button" onClick={exportReportsTxt} disabled={!salesSeries.length}>
              Exportar TXT
            </button>
            <button className="btn-ghost" type="button" onClick={exportReportsDocx} disabled={!salesSeries.length}>
              Exportar DOCX
            </button>
            <button className="btn-ghost" type="button" onClick={exportReportsPdf} disabled={!salesSeries.length}>
              Exportar PDF
            </button>
            <button className="btn-primary" type="button" onClick={refresh} disabled={loading}>
              {loading ? 'Atualizando...' : 'Aplicar filtro'}
            </button>
          </div>
        }
      />

      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-200">
          {err}
        </div>
      ) : null}

      <SectionCard title="Filtro por periodo">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <div className="label mb-1">Data inicial</div>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
          </div>
          <div>
            <div className="label mb-1">Data final</div>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
          </div>
          <div>
            <div className="label mb-1">Granularidade vendas</div>
            <select className="input" value={salesGranularity} onChange={(e) => setSalesGranularity(e.target.value as any)}>
              <option value="day">Dia</option>
              <option value="week">Semana</option>
              <option value="month">Mes</option>
              <option value="year">Ano</option>
            </select>
          </div>
          <div>
            <div className="label mb-1">Granularidade despesas</div>
            <select
              className="input"
              value={expenseGranularity}
              onChange={(e) => setExpenseGranularity(e.target.value as any)}
            >
              <option value="day">Dia</option>
              <option value="week">Semana</option>
              <option value="month">Mes</option>
              <option value="year">Ano</option>
            </select>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-12">
        <div className="md:col-span-7">
          <SectionCard title="Vendas realizadas">
            <div className="h-72">
              <Line ref={salesChartRef as any} data={salesChart} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </SectionCard>
        </div>
        <div className="md:col-span-5">
          <SectionCard title="Lucro estimado">
            <div className="h-72">
              <Bar ref={netChartRef as any} data={netChart} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Despesas por periodo">
        <div className="h-72">
          <Bar ref={expenseChartRef as any} data={expenseChart} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>
      </SectionCard>

      <SectionCard title="Vendas por regiao">
        <div className="h-72">
          <Bar ref={regionChartRef as any} data={regionChart} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-12">
        <div className="md:col-span-6">
          <SectionCard title="Top produtos vendidos">
            <div className="space-y-2">
              {topProducts.top.map((row) => (
                <div key={row.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-800">
                  <span>{row.label}</span>
                  <span className="font-semibold">{row.qty} un</span>
                </div>
              ))}
              {!topProducts.top.length ? (
                <div className="text-sm text-gray-500 dark:text-slate-400">Sem dados de vendas.</div>
              ) : null}
            </div>
          </SectionCard>
        </div>
        <div className="md:col-span-6">
          <SectionCard title="Menos vendidos">
            <div className="space-y-2">
              {topProducts.bottom.map((row) => (
                <div key={row.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-800">
                  <span>{row.label}</span>
                  <span className="font-semibold">{row.qty} un</span>
                </div>
              ))}
              {!topProducts.bottom.length ? (
                <div className="text-sm text-gray-500 dark:text-slate-400">Sem dados de vendas.</div>
              ) : null}
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Produtos em estoque">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-2 py-2 font-semibold">Produto</th>
                <th className="px-2 py-2 text-center font-semibold">Qtd</th>
                <th className="px-2 py-2 text-center font-semibold">Minimo</th>
                <th className="px-2 py-2 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {inventoryRows.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 dark:border-slate-800">
                  <td className="px-2 py-3">{p.name} {p.size_cm ? `${p.size_cm}cm` : ''} • {p.variant}</td>
                  <td className="px-2 py-3 text-center">{p.stock}</td>
                  <td className="px-2 py-3 text-center">{p.min_stock}</td>
                  <td className="px-2 py-3 text-center">
                    {p.status === 'CRITICO' ? (
                      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-200">
                        Critico
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/30 dark:text-emerald-200">
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {!inventoryRows.length ? (
                <tr>
                  <td colSpan={4} className="px-2 py-6 text-center text-sm text-gray-500 dark:text-slate-400">
                    Nenhum produto cadastrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Insumos cadastrados">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-2 py-2 font-semibold">Insumo</th>
                <th className="px-2 py-2 font-semibold">Fornecedor</th>
                <th className="px-2 py-2 text-right font-semibold">Valor</th>
              </tr>
            </thead>
            <tbody>
              {suppliesRows.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 dark:border-slate-800">
                  <td className="px-2 py-3">{s.name}</td>
                  <td className="px-2 py-3">{s.supplier_name ?? '—'}</td>
                  <td className="px-2 py-3 text-right">{fmtBRL(s.total_value)}</td>
                </tr>
              ))}
              {!suppliesRows.length ? (
                <tr>
                  <td colSpan={3} className="px-2 py-6 text-center text-sm text-gray-500 dark:text-slate-400">
                    Nenhum insumo cadastrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Estoque preditivo (30 dias)">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-2 py-2 font-semibold">Produto</th>
                <th className="px-2 py-2 text-right font-semibold">Vendas 30d</th>
                <th className="px-2 py-2 text-right font-semibold">Media/dia</th>
                <th className="px-2 py-2 text-right font-semibold">Dias restantes</th>
                <th className="px-2 py-2 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {predictiveRows.map((row) => (
                <tr key={row.product.id} className="border-b border-gray-100 dark:border-slate-800">
                  <td className="px-2 py-3">{row.product.name} {row.product.size_cm ? `${row.product.size_cm}cm` : ''}</td>
                  <td className="px-2 py-3 text-right">{row.total30d.toFixed(1)}</td>
                  <td className="px-2 py-3 text-right">{row.avgDaily.toFixed(2)}</td>
                  <td className="px-2 py-3 text-right">
                    {Number.isFinite(row.daysRemaining) ? row.daysRemaining.toFixed(1) : '—'}
                  </td>
                  <td className="px-2 py-3 text-center">
                    {row.status === 'REPOR' ? (
                      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-200">
                        Repor
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/30 dark:text-emerald-200">
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {!predictiveRows.length ? (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-sm text-gray-500 dark:text-slate-400">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Kits cadastrados">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-2 py-2 font-semibold">Kit</th>
                <th className="px-2 py-2 text-center font-semibold">Itens</th>
                <th className="px-2 py-2 font-semibold">Notas</th>
              </tr>
            </thead>
            <tbody>
              {kits.map((kit) => (
                <tr key={kit.id} className="border-b border-gray-100 dark:border-slate-800">
                  <td className="px-2 py-3">{kit.name}</td>
                  <td className="px-2 py-3 text-center">{kitCounts.get(kit.id) ?? 0}</td>
                  <td className="px-2 py-3">{kit.notes ?? '—'}</td>
                </tr>
              ))}
              {!kits.length ? (
                <tr>
                  <td colSpan={3} className="px-2 py-6 text-center text-sm text-gray-500 dark:text-slate-400">
                    Nenhum kit cadastrado.
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
