import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Expense, Settings, Kassensturz } from '../types';
import { CATEGORIES } from '../constants';
import { calculateBalance, totalExpenses } from '../calculations';

function fmt(amount: number): string {
  return amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' EUR';
}

function fmtDate(iso: string, long = false): string {
  return new Date(iso).toLocaleDateString('de-DE', long
    ? { day: 'numeric', month: 'long', year: 'numeric' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function generateKassensturzPDF(
  kassensturz: Kassensturz,
  expenses: Expense[],
  settings: Settings,
  prevCreatedAt: string | null,
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PAGE_W = 210;
  const MARGIN = 18;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  // ── Header bar ──────────────────────────────────────────────
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 0, PAGE_W, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Kassensturz', MARGIN, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const periodStart = prevCreatedAt ? fmtDate(prevCreatedAt) : 'Beginn';
  const periodEnd   = fmtDate(kassensturz.createdAt);
  doc.text(`${settings.person1Name} & ${settings.person2Name}   |   Zeitraum: ${periodStart} – ${periodEnd}`, MARGIN, 21);

  // ── Expense table ───────────────────────────────────────────
  doc.setTextColor(0, 0, 0);

  const realExpenses = expenses.filter(e => e.categoryId !== 'ausgleich');

  const body = realExpenses.map(e => {
    const cat      = CATEGORIES.find(c => c.id === e.categoryId)!;
    const paidBy   = e.paidBy === 'person1' ? settings.person1Name : settings.person2Name;
    const p1Share  = fmt(e.amount * e.splitRatio);
    const p2Share  = fmt(e.amount * (1 - e.splitRatio));
    const dateStr  = new Date(e.date + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    return [dateStr, e.description, cat.label, paidBy, fmt(e.amount), p1Share, p2Share];
  });

  const tableResult = autoTable(doc, {
    head: [[
      'Datum', 'Beschreibung', 'Kategorie', 'Bezahlt von',
      'Betrag', settings.person1Name, settings.person2Name,
    ]],
    body,
    startY: 34,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 8.5, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 }, overflow: 'linebreak' },
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    columnStyles: {
      0: { cellWidth: 14 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 26 },
      3: { cellWidth: 26 },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' },
    },
  });

  // ── Summary ─────────────────────────────────────────────────
  const summaryY = (tableResult as unknown as { finalY: number }).finalY + 10;

  const total   = totalExpenses(realExpenses);
  const p1Paid  = realExpenses.filter(e => e.paidBy === 'person1').reduce((s, e) => s + e.amount, 0);
  const p2Paid  = realExpenses.filter(e => e.paidBy === 'person2').reduce((s, e) => s + e.amount, 0);
  const p1Share = realExpenses.reduce((s, e) => s + e.amount * e.splitRatio, 0);
  const p2Share = realExpenses.reduce((s, e) => s + e.amount * (1 - e.splitRatio), 0);
  const balance = calculateBalance(realExpenses);

  // Summary box
  doc.setDrawColor(229, 231, 235);
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(MARGIN, summaryY, CONTENT_W, 44, 3, 3, 'FD');

  const col1 = MARGIN + 4;
  const col2 = MARGIN + CONTENT_W / 2 + 4;
  let y = summaryY + 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 65, 81);
  doc.text('Zusammenfassung', col1, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);

  doc.text(`Gesamtausgaben: ${fmt(total)}`, col1, y);
  doc.text(`${settings.person1Name}: bezahlt ${fmt(p1Paid)}, Anteil ${fmt(p1Share)}`, col2, y);
  y += 6;
  doc.text(`Eintraege: ${realExpenses.length}`, col1, y);
  doc.text(`${settings.person2Name}: bezahlt ${fmt(p2Paid)}, Anteil ${fmt(p2Share)}`, col2, y);
  y += 8;

  if (balance.amount >= 0.01) {
    const debtor   = balance.debtorIsP1 ? settings.person1Name : settings.person2Name;
    const creditor = balance.debtorIsP1 ? settings.person2Name : settings.person1Name;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text(`Ausgleich: ${debtor} zahlt ${creditor} ${fmt(balance.amount)}`, col1, y);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text('Kein Ausgleich notwendig', col1, y);
  }

  // ── Footer ──────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(156, 163, 175);
  doc.text(
    `Erstellt am ${new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    MARGIN,
    290,
  );

  // ── Save ────────────────────────────────────────────────────
  const safeDate = fmtDate(kassensturz.createdAt).replace(/\./g, '-');
  doc.save(`Kassensturz_${safeDate}.pdf`);
}
