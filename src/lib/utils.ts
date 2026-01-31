import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function exportToCSV(data: any[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(obj => Object.values(obj).map(v => {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return `"${s}"`;
  }).join(','));
  const csvKey = [headers, ...rows].join('\n');
  const blob = new Blob([csvKey], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToPDF(title: string, headers: string[], body: any[][]) {
  const doc = new jsPDF();
  doc.text(title, 14, 20);
  autoTable(doc, {
    startY: 25,
    head: [headers],
    body: body,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [22, 163, 74] } // Green-ish
  });
  doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}