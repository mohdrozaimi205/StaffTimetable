// Export PDF, Excel, Print, Share, Backup/Restore
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { AppData } from './types';
import { buildGrid, GCell, gridHtml } from './grid';
import { makeStaff, normalizeName } from './logic';

const isNative = () => Capacitor.isNativePlatform();

interface PrinterPlugin {
  print(o: { html: string; name: string }): Promise<void>;
}
const Printer = registerPlugin<PrinterPlugin>('Printer');

function safeName(s: string) {
  return s.replace(/[^\w\-. ]+/g, '').replace(/\s+/g, '_');
}
export function fileBase(data: AppData, weekId: string) {
  const w = data.weeks[weekId];
  return safeName(`Timetable_${w.startDate}_to_${w.endDate}`);
}

function blobToBase64(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(b);
  });
}

/** Simpan fail (muat turun di web; simpan ke Documents di Android). Kembalikan mesej untuk pengguna. */
export async function saveFile(blob: Blob, name: string): Promise<string> {
  if (isNative()) {
    const data = await blobToBase64(blob);
    try {
      await Filesystem.writeFile({ path: `StaffTimetable/${name}`, data, directory: Directory.Documents, recursive: true });
      return `Disimpan: Documents/StaffTimetable/${name}`;
    } catch {
      await shareFile(blob, name);
      return 'Pilih lokasi untuk simpan fail';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return `Dimuat turun: ${name}`;
}

/** Kongsi fail ke WhatsApp, Telegram, e-mel, dll. */
export async function shareFile(blob: Blob, name: string, title = 'Staff Timetable'): Promise<string> {
  if (isNative()) {
    const data = await blobToBase64(blob);
    const r = await Filesystem.writeFile({ path: name, data, directory: Directory.Cache });
    await Share.share({ title, files: [r.uri], dialogTitle: 'Kongsi jadual' });
    return 'Dikongsi';
  }
  const file = new File([blob], name, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title });
      return 'Dikongsi';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'Dibatalkan';
    }
  }
  await saveFile(blob, name);
  return 'Pelayar ini tidak menyokong kongsi fail — fail telah dimuat turun, sila lampirkan secara manual.';
}

// ---------------- PDF ----------------
const SKY: [number, number, number] = [90, 174, 224];
const SKY_D: [number, number, number] = [63, 150, 204];
const SKY_L: [number, number, number] = [217, 238, 250];
const CREAM: [number, number, number] = [246, 240, 226];
const CREAM_L: [number, number, number] = [255, 252, 245];
const OFF: [number, number, number] = [255, 251, 242];

export async function makePdf(data: AppData, weekId: string): Promise<Blob> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const g = buildGrid(data, weekId);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 8;

  doc.setFillColor(...SKY);
  doc.roundedRect(M, M, W - M * 2, 16, 3, 3, 'F');
  doc.setTextColor(...OFF);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(g.title, M + 5, M + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(g.org, M + 5, M + 12.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(g.range, W - M - 5, M + 9.5, { align: 'right' });

  const totalRows = g.head.length + g.body.length;
  const fs = totalRows > 16 ? 6.5 : totalRows > 12 ? 7.5 : 8.5;
  const conv = (c: GCell) => {
    const styles: Record<string, unknown> = {};
    if (c.kind === 'day') Object.assign(styles, { fillColor: SKY, textColor: OFF, fontStyle: 'bold' });
    if (c.kind === 'corner') Object.assign(styles, { fillColor: SKY_D, textColor: OFF, fontStyle: 'bold' });
    if (c.kind === 'shift') Object.assign(styles, { fillColor: SKY_L, textColor: 20, fontStyle: 'bold' });
    if (c.kind === 'time') Object.assign(styles, { fillColor: SKY_L, textColor: 40, fontSize: fs - 1.5 });
    if (c.kind === 'cat' || c.kind === 'notelabel') Object.assign(styles, { fillColor: CREAM, fontStyle: 'bold', halign: 'left' });
    if (c.kind === 'name') Object.assign(styles, { fontStyle: 'bold', fillColor: [255, 255, 255] });
    if (c.kind === 'empty') Object.assign(styles, { fillColor: CREAM_L });
    if (c.kind === 'note') Object.assign(styles, { fontStyle: 'italic', fontSize: fs - 1, halign: 'left' });
    return { content: c.text, colSpan: c.colSpan, rowSpan: c.rowSpan, styles };
  };
  autoTable(doc, {
    startY: M + 20,
    margin: { left: M, right: M },
    head: g.head.map((r) => r.map(conv)),
    body: g.body.map((r) => r.map(conv)),
    theme: 'grid',
    styles: { fontSize: fs, halign: 'center', valign: 'middle', cellPadding: 1.4, minCellHeight: totalRows > 14 ? 0 : 9, lineColor: [205, 222, 232], lineWidth: 0.2, textColor: 20, overflow: 'linebreak' },
    columnStyles: { 0: { cellWidth: 20 } },
    headStyles: { lineColor: [205, 222, 232], lineWidth: 0.2 }
  });
  let y = (doc as any).lastAutoTable.finalY + 5;
  doc.setTextColor(60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(g.shiftsLabel, M, y);
  y += 4;
  if (g.notes.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.text('Catatan:', M, y);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(g.notes, W - M * 2 - 16);
    doc.text(lines, M + 14, y);
    y += lines.length * 3.4 + 2;
  }
  if (g.pool.length) {
    autoTable(doc, {
      startY: y + 1,
      margin: { left: M, right: M },
      head: [[{ content: 'WEEKLY STAFF POOL', colSpan: 4, styles: { fillColor: SKY, textColor: OFF, halign: 'left' } }], ['Name', 'Quota', 'Assigned', 'Remaining']],
      body: g.pool.map((p) => [p.name, String(p.quota), String(p.used), String(p.remaining)]),
      theme: 'grid',
      tableWidth: 110,
      styles: { fontSize: 7, cellPadding: 1, lineColor: [205, 222, 232], lineWidth: 0.2, halign: 'center' },
      headStyles: { fillColor: SKY_L, textColor: 20 },
      columnStyles: { 0: { halign: 'left' } },
      didParseCell: (h: any) => {
        if (h.section === 'body' && h.column.index === 3) {
          const v = Number(h.cell.raw);
          h.cell.styles.textColor = v <= 0 ? [192, 57, 43] : v <= 2 ? [176, 122, 0] : [30, 132, 73];
          h.cell.styles.fontStyle = 'bold';
        }
      }
    });
  }
  return doc.output('blob');
}

// ---------------- Excel ----------------
export async function makeXlsx(data: AppData, weekId: string): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default;
  const g = buildGrid(data, weekId);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Staff Timetable';
  const ws = wb.addWorksheet('Timetable', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1, margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } }
  });
  const nCols = 1 + g.head[1].length - 1; // label + semua shift
  const fill = (hex: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF' + hex } });
  const border = { style: 'thin' as const, color: { argb: 'FFB9D3E3' } };
  const allB = { top: border, left: border, bottom: border, right: border };

  ws.getColumn(1).width = 14;
  for (let c = 2; c <= nCols; c++) ws.getColumn(c).width = 13;

  ws.mergeCells(1, 1, 1, nCols);
  const t = ws.getCell(1, 1);
  t.value = `${g.org}     •     ${g.title}     •     ${g.range}`;
  t.font = { bold: true, size: 13, color: { argb: 'FFFFFBF2' } };
  t.fill = fill('5AAEE0');
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 26;

  // Penempatan sel dengan span (sama seperti HTML)
  const place = (rows: GCell[][], startRow: number) => {
    const occupied = new Set<string>();
    rows.forEach((r, ri) => {
      let col = 1;
      const rowN = startRow + ri;
      for (const c of r) {
        while (occupied.has(`${rowN}:${col}`)) col++;
        const cs = c.colSpan ?? 1;
        const rs = c.rowSpan ?? 1;
        if (cs > 1 || rs > 1) ws.mergeCells(rowN, col, rowN + rs - 1, col + cs - 1);
        for (let i = 0; i < rs; i++) for (let j = 0; j < cs; j++) occupied.add(`${rowN + i}:${col + j}`);
        const cell = ws.getCell(rowN, col);
        cell.value = c.text;
        cell.alignment = { horizontal: c.kind === 'cat' || c.kind === 'notelabel' || c.kind === 'note' ? 'left' : 'center', vertical: 'middle', wrapText: true };
        cell.border = allB;
        if (c.kind === 'day') Object.assign(cell, { fill: fill('5AAEE0'), font: { bold: true, color: { argb: 'FFFFFBF2' } } });
        if (c.kind === 'corner') Object.assign(cell, { fill: fill('3F96CC'), font: { bold: true, color: { argb: 'FFFFFBF2' } } });
        if (c.kind === 'shift') Object.assign(cell, { fill: fill('D9EEFA'), font: { bold: true } });
        if (c.kind === 'time') Object.assign(cell, { fill: fill('D9EEFA'), font: { size: 9 } });
        if (c.kind === 'cat' || c.kind === 'notelabel') Object.assign(cell, { fill: fill('F6F0E2'), font: { bold: true } });
        if (c.kind === 'name') cell.font = { bold: true };
        if (c.kind === 'empty') cell.fill = fill('FFFCF5');
        if (c.kind === 'note') cell.font = { italic: true, size: 9 };
        // pastikan sel dalam merge juga ada border
        for (let i = 0; i < rs; i++) for (let j = 0; j < cs; j++) ws.getCell(rowN + i, col + j).border = allB;
        col += cs;
      }
    });
  };
  place(g.head, 2);
  ws.getRow(2).height = 30;
  const bodyStart = 2 + g.head.length;
  place(g.body, bodyStart);
  for (let r = bodyStart; r < bodyStart + g.body.length; r++) ws.getRow(r).height = 20;

  let r = bodyStart + g.body.length + 1;
  ws.getCell(r, 1).value = g.shiftsLabel;
  ws.getCell(r, 1).font = { size: 9, color: { argb: 'FF555555' } };
  r++;
  if (g.notes.trim()) {
    ws.mergeCells(r, 2, r, nCols);
    ws.getCell(r, 1).value = 'Catatan';
    ws.getCell(r, 1).font = { bold: true };
    ws.getCell(r, 2).value = g.notes;
    ws.getCell(r, 2).alignment = { wrapText: true, vertical: 'top' };
    ws.getRow(r).height = Math.min(120, 16 * (g.notes.split('\n').length + 1));
    r++;
  }
  if (g.pool.length) {
    r++;
    ws.mergeCells(r, 1, r, 4);
    const h = ws.getCell(r, 1);
    h.value = 'WEEKLY STAFF POOL';
    h.font = { bold: true, color: { argb: 'FFFFFBF2' } };
    h.fill = fill('5AAEE0');
    r++;
    ['Name', 'Quota', 'Assigned', 'Remaining'].forEach((v, i) => {
      const c = ws.getCell(r, i + 1);
      c.value = v;
      c.font = { bold: true };
      c.fill = fill('D9EEFA');
      c.border = allB;
      c.alignment = { horizontal: 'center' };
    });
    r++;
    for (const p of g.pool) {
      const vals = [p.name, p.quota, p.used, p.remaining];
      vals.forEach((v, i) => {
        const c = ws.getCell(r, i + 1);
        c.value = v;
        c.border = allB;
        c.alignment = { horizontal: i === 0 ? 'left' : 'center' };
      });
      const rc = ws.getCell(r, 4);
      rc.font = { bold: true, color: { argb: p.remaining <= 0 ? 'FFC0392B' : p.remaining <= 2 ? 'FFB07A00' : 'FF1E8449' } };
      r++;
    }
  }
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 + g.head.length }];
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ---------------- Print ----------------
export async function printTimetable(data: AppData, weekId: string): Promise<void> {
  const html = gridHtml(buildGrid(data, weekId));
  if (isNative()) {
    await Printer.print({ html, name: fileBase(data, weekId) });
    return;
  }
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(iframe);
  const d = iframe.contentDocument!;
  d.open();
  d.write(html);
  d.close();
  await new Promise((r) => setTimeout(r, 250));
  iframe.contentWindow!.focus();
  iframe.contentWindow!.print();
  setTimeout(() => iframe.remove(), 60000);
}

// ---------------- Backup / Restore ----------------
export function backupBlob(data: AppData): Blob {
  return new Blob([JSON.stringify({ app: 'staff-timetable', version: 1, exportedAt: new Date().toISOString(), data }, null, 2)], {
    type: 'application/json'
  });
}
export function parseBackup(text: string): AppData {
  const j = JSON.parse(text);
  const d = j?.app === 'staff-timetable' ? j.data : j;
  if (!d || typeof d !== 'object' || !d.settings || !d.staff || !d.weeks || !d.assigns) throw new Error('Fail backup tidak sah.');
  return d as AppData;
}

// ---------------- Export / Import senarai staf ----------------
export function staffCsv(data: AppData): Blob {
  const cats = (ids: string[]) => ids.map((id) => data.settings.categories.find((c) => c.id === id)?.name ?? '').filter(Boolean).join('; ');
  const rows = [['Name', 'Active', 'In Pool', 'Weekly Quota', 'Categories']];
  Object.values(data.staff)
    .filter((s) => !s.deleted)
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((s) => rows.push([s.name, s.active ? 'Yes' : 'No', s.inPool ? 'Yes' : 'No', s.quota === null ? '' : String(s.quota), cats(s.categoryIds)]));
  const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\r\n');
  return new Blob(['﻿' + csv], { type: 'text/csv' });
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',' || ch === ';' || ch === '\t') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** Import nama staf dari CSV / teks (satu nama setiap baris). Nama sedia ada dikemas kini, bukan digandakan. */
export function importStaffText(data: AppData, text: string) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const first = parseCsvLine(lines[0]).map((s) => s.toLowerCase());
  const hasHeader = first[0] === 'name' || first[0] === 'nama';
  const byName = new Map(Object.values(data.staff).filter((s) => !s.deleted).map((s) => [s.name, s]));
  const result = [];
  for (const line of hasHeader ? lines.slice(1) : lines) {
    const [name, active, inPool, quota, cats] = parseCsvLine(line);
    if (!name) continue;
    const n = normalizeName(name);
    const yes = (v?: string, d = true) => (v ? /^(y|yes|ya|1|true)$/i.test(v) : d);
    const categoryIds = (cats ?? '')
      .split(/[;|]/)
      .map((c) => data.settings.categories.find((x) => x.name.toLowerCase() === c.trim().toLowerCase())?.id)
      .filter(Boolean) as string[];
    const q = quota && !isNaN(Number(quota)) ? Number(quota) : null;
    const ex = byName.get(n);
    const s = ex
      ? { ...ex, active: yes(active, ex.active), inPool: yes(inPool, ex.inPool), quota: quota ? q : ex.quota, categoryIds: categoryIds.length ? categoryIds : ex.categoryIds }
      : makeStaff(n, { active: yes(active), inPool: yes(inPool), quota: q, categoryIds });
    byName.set(n, s);
    result.push(s);
  }
  return result;
}
