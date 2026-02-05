import { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { readCompanySettings } from '../lib/companySettings';
import type { PurchaseQuote, PurchaseQuoteItem } from '../lib/types';
import {
  listAllPurchaseQuoteItems,
  listPurchaseQuotes,
  listPurchaseQuoteItems
} from '../lib/db';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import { ExternalLink } from 'lucide-react';

function fmtBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function sanitizeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function getLogoData(settings: ReturnType<typeof readCompanySettings>) {
  if (settings.logo_data_url && settings.logo_data_url.startsWith('data:image/')) {
    const match = settings.logo_data_url.match(/^data:image\/(png|jpeg|jpg);/i);
    const type = match?.[1]?.toLowerCase() === 'png' ? 'PNG' : 'JPEG';
    return { src: settings.logo_data_url, type };
  }
  return null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<PurchaseQuote[]>([]);
  const [items, setItems] = useState<PurchaseQuoteItem[]>([]);
  const [allItems, setAllItems] = useState<PurchaseQuoteItem[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function refreshQuotes() {
    setLoading(true);
    setErr(null);
    try {
      const data = await listPurchaseQuotes();
      setQuotes(data);
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao carregar orcamentos.');
    } finally {
      setLoading(false);
    }
  }

  async function refreshAllItems() {
    try {
      const data = await listAllPurchaseQuoteItems();
      setAllItems(data);
    } catch {
      setAllItems([]);
    }
  }

  async function refreshItems(quoteId: string) {
    try {
      const data = await listPurchaseQuoteItems(quoteId);
      setItems(data);
    } catch {
      setItems([]);
    }
  }

  useEffect(() => {
    refreshQuotes();
    refreshAllItems();
  }, []);

  useEffect(() => {
    if (!selectedQuoteId) {
      setItems([]);
      return;
    }
    refreshItems(selectedQuoteId);
  }, [selectedQuoteId]);

  const totals = useMemo(() => {
    const totalMap = new Map<string, number>();
    const countMap = new Map<string, number>();
    for (const item of allItems) {
      const total = Number(item.qty ?? 0) * Number(item.unit_cost ?? 0);
      totalMap.set(item.quote_id, (totalMap.get(item.quote_id) ?? 0) + total);
      countMap.set(item.quote_id, (countMap.get(item.quote_id) ?? 0) + 1);
    }
    return { totalMap, countMap };
  }, [allItems]);

  const selectedQuote = useMemo(
    () => quotes.find((q) => q.id === selectedQuoteId) ?? null,
    [quotes, selectedQuoteId]
  );

  const selectedTotal = useMemo(() => {
    return items.reduce((sum, it) => sum + Number(it.qty ?? 0) * Number(it.unit_cost ?? 0), 0);
  }, [items]);

  const companySettings = readCompanySettings();

  function exportQuotePdf() {
    if (!selectedQuote) return;
    const settings = readCompanySettings();
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 14;
    const contentWidth = pageWidth - marginX * 2;
    let y = 16;

    const logo = getLogoData(settings);
    if (logo) {
      doc.addImage(logo.src, logo.type, marginX, y, 26, 26, undefined, 'FAST');
    }

    doc.setFontSize(16);
    doc.text('Orçamento', marginX + (logo ? 30 : 0), y + 6);
    y += logo ? 20 : 12;

    doc.setFontSize(10);
    const leftLines: string[] = [];
    if (settings.store_name) leftLines.push(settings.store_name);
    if (settings.legal_name) leftLines.push(settings.legal_name);
    if (settings.cnpj || settings.cpf) leftLines.push(`Documento: ${settings.cnpj || settings.cpf}`);
    if (settings.email || settings.phone) {
      leftLines.push(`Contato: ${[settings.email, settings.phone].filter(Boolean).join(' • ')}`);
    }
    if (settings.address) {
      leftLines.push(...doc.splitTextToSize(settings.address, contentWidth * 0.6));
    }
    doc.text(leftLines.length ? leftLines : ['Dados da loja'], marginX, y);

    doc.setFillColor(245, 245, 245);
    doc.rect(marginX + contentWidth * 0.62, y - 2, contentWidth * 0.38, 22, 'F');
    doc.text(`Fornecedor: ${selectedQuote.supplier_name}`, marginX + contentWidth * 0.62 + 2, y + 4);
    if (selectedQuote.title) {
      doc.text(`Titulo: ${selectedQuote.title}`, marginX + contentWidth * 0.62 + 2, y + 10);
    }
    doc.text(
      `Data: ${new Date(selectedQuote.created_at).toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })}`,
      marginX + contentWidth * 0.62 + 2,
      y + 16
    );
    y += 28;

    autoTable(doc, {
      startY: y,
      theme: 'grid',
      head: [['Item', 'Un', 'Qtd', 'Vl. Unit.', 'Total']],
      body: items.map((it) => [
        it.description || 'Item',
        it.unit ?? 'un',
        String(it.qty ?? 0),
        fmtBRL(it.unit_cost ?? 0),
        fmtBRL(Number(it.qty ?? 0) * Number(it.unit_cost ?? 0))
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [230, 235, 245], textColor: 20 },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      columnStyles: {
        1: { halign: 'right', cellWidth: 12 },
        2: { halign: 'right', cellWidth: 14 },
        3: { halign: 'right', cellWidth: 28 },
        4: { halign: 'right', cellWidth: 28 }
      },
      margin: { left: marginX, right: marginX }
    });

    const tableEnd = (doc as any).lastAutoTable?.finalY ?? y;
    doc.setFontSize(11);
    doc.setFillColor(230, 235, 245);
    doc.rect(marginX + contentWidth - 60, tableEnd + 4, 60, 10, 'F');
    doc.text(`Total: ${fmtBRL(selectedTotal)}`, marginX + contentWidth - 2, tableEnd + 11, { align: 'right' });

    if (selectedQuote.notes) {
      const noteY = tableEnd + 20;
      doc.setFontSize(10);
      const notesLines = doc.splitTextToSize(`Notas: ${selectedQuote.notes}`, contentWidth);
      doc.text(notesLines, marginX, noteY);
    }

    const safeName = sanitizeFileName(selectedQuote.supplier_name);
    doc.save(`orçamento-${safeName || 'fornecedor'}.pdf`);
  }

  return (
    <div className="space-y-6">
      <div className="no-print">
        <PageHeader
          title="Orcamentos"
          subtitle="Monte um pedido para fornecedor e gere PDF."
          actions={
            <div className="flex flex-wrap gap-2">
              <button className="btn-ghost" onClick={refreshQuotes} disabled={loading}>
                {loading ? 'Atualizando...' : 'Atualizar'}
              </button>
              <button
                className="btn-primary flex items-center gap-2"
                onClick={() => window.location.href = '/app/catalogo?catalogTab=produtos&regTab=erp&sub=cotacoes'}
              >
                <ExternalLink size={16} /> Gerenciar (Cadastros)
              </button>
              <button className="btn-primary" onClick={exportQuotePdf} disabled={!selectedQuoteId}>
                Exportar PDF (texto)
              </button>
            </div>
          }
        />
      </div>

      {err ? (
        <div className="alert alert-error no-print">
          {err}
        </div>
      ) : null}

      <div className="no-print">
        <SectionCard title="Orcamentos cadastrados">
          <div className="table-scroll">
            <table className="table-base w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-2 py-2 font-semibold">Fornecedor</th>
                  <th className="px-2 py-2 font-semibold">Titulo</th>
                  <th className="px-2 py-2 text-center font-semibold">Itens</th>
                  <th className="px-2 py-2 text-right font-semibold">Total</th>
                  <th className="px-2 py-2 text-center font-semibold">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-900">
                    <td className="px-2 py-3">
                      <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">{q.supplier_name}</div>
                    </td>
                    <td className="px-2 py-3">{q.title ?? '—'}</td>
                    <td className="px-2 py-3 text-center">{totals.countMap.get(q.id) ?? 0}</td>
                    <td className="px-2 py-3 text-right">{fmtBRL(totals.totalMap.get(q.id) ?? 0)}</td>
                    <td className="px-2 py-3 text-center">
                      <button
                        className={`btn-ghost ${selectedQuoteId === q.id ? 'font-semibold' : ''}`}
                        onClick={() => setSelectedQuoteId(q.id)}
                      >
                        Visualizar
                      </button>
                    </td>
                  </tr>
                ))}
                {!quotes.length && !loading ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-6">
                      <div className="text-center text-sm text-gray-500 dark:text-slate-400">
                        Nenhum orcamento cadastrado.
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      {selectedQuote ? (
        <>
          <div className="no-print">
            <SectionCard
              title={`Itens do orcamento (${selectedQuote.supplier_name})`}
            >

              <div className="table-scroll mt-6">
                <table className="table-base w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-slate-800 dark:text-slate-400">
                      <th className="px-2 py-2 font-semibold">Item</th>
                      <th className="px-2 py-2 text-center font-semibold">Un</th>
                      <th className="px-2 py-2 text-right font-semibold">Qtd</th>
                      <th className="px-2 py-2 text-right font-semibold">Unitario</th>
                      <th className="px-2 py-2 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-900">
                        <td className="px-2 py-3">{it.description}</td>
                        <td className="px-2 py-3 text-center">{it.unit}</td>
                        <td className="px-2 py-3 text-right">
                          <span className="print-only">{it.qty}</span>
                        </td>
                        <td className="px-2 py-3 text-right">
                          <span className="print-only">{fmtBRL(it.unit_cost)}</span>
                        </td>
                        <td className="px-2 py-3 text-right">{fmtBRL(Number(it.qty) * Number(it.unit_cost))}</td>
                      </tr>
                    ))}
                    {!items.length ? (
                      <tr>
                        <td colSpan={6} className="px-2 py-6">
                          <div className="text-center text-sm text-gray-500 dark:text-slate-400">Nenhum item.</div>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 text-right text-sm font-semibold text-gray-800 dark:text-slate-200">
                Total do orcamento: {fmtBRL(selectedTotal)}
              </div>
            </SectionCard>
          </div>

          <div className="print-only">
            <div className="border-b border-gray-200 pb-4">
              {companySettings.logo_data_url || companySettings.logo_url ? (
                <img
                  src={companySettings.logo_data_url || companySettings.logo_url}
                  alt="Logo"
                  className="mb-3 h-12 w-auto object-contain"
                />
              ) : null}
              <div className="text-lg font-semibold">{companySettings.store_name || 'CapyOps'}</div>
              {companySettings.legal_name ? <div className="text-sm">{companySettings.legal_name}</div> : null}
              {companySettings.cnpj || companySettings.cpf ? (
                <div className="text-sm">Documento: {companySettings.cnpj || companySettings.cpf}</div>
              ) : null}
              {companySettings.email || companySettings.phone ? (
                <div className="text-sm">
                  {companySettings.email} {companySettings.phone ? `• ${companySettings.phone}` : ''}
                </div>
              ) : null}
              {companySettings.address ? <div className="text-sm">{companySettings.address}</div> : null}
            </div>

            <div className="mt-4 flex items-start justify-between">
              <div>
                <div className="text-xl font-semibold">Orcamento</div>
                <div className="text-sm">Fornecedor: {selectedQuote.supplier_name}</div>
                {selectedQuote.title ? <div className="text-sm">Titulo: {selectedQuote.title}</div> : null}
              </div>
              <div className="text-sm">
                Data:{' '}
                {new Date(selectedQuote.created_at).toLocaleDateString('pt-BR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                })}
              </div>
            </div>

            <table className="table-base mt-4 w-full text-left">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="text-center">Un</th>
                  <th className="text-right">Qtd</th>
                  <th className="text-right">Unitario</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, index) => (
                  <tr key={it.id} className={index % 2 === 1 ? 'bg-gray-50' : ''}>
                    <td>{it.description}</td>
                    <td className="text-center">{it.unit}</td>
                    <td className="text-right">{it.qty}</td>
                    <td className="text-right">{fmtBRL(it.unit_cost)}</td>
                    <td className="text-right">{fmtBRL(Number(it.qty) * Number(it.unit_cost))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex justify-end">
              <div className="card px-4 py-2 text-sm font-semibold">
                Total: {fmtBRL(selectedTotal)}
              </div>
            </div>

            {selectedQuote.notes ? (
              <div className="mt-4 text-sm">Notas: {selectedQuote.notes}</div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}



