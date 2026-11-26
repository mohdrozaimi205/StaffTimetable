// Model jadual yang dikongsi oleh PDF, Excel dan Print
import { AppData, DAYS } from './types';
import { dayDate, fmtRange, poolRows, shiftTime, slotKey } from './logic';

export interface GCell {
  text: string;
  colSpan?: number;
  rowSpan?: number;
  kind: 'corner' | 'day' | 'shift' | 'time' | 'cat' | 'name' | 'empty' | 'note' | 'notelabel';
}

export interface GridModel {
  title: string;
  org: string;
  range: string;
  head: GCell[][];
  body: GCell[][];
  notes: string;
  pool: { name: string; quota: number; used: number; remaining: number }[];
  shiftsLabel: string;
}

export function buildGrid(data: AppData, weekId: string): GridModel {
  const { settings } = data;
  const week = data.weeks[weekId];
  const a = data.assigns[weekId] ?? {};
  const shifts = settings.shifts;
  const nS = shifts.length;
  const nameOf = (id?: string) => (id ? data.staff[id]?.name ?? '' : '');

  const head: GCell[][] = [
    [{ text: 'Day', kind: 'corner' }, ...DAYS.map((d, i) => ({ text: `${d}\n${dayDate(week, i)}`, colSpan: nS, kind: 'day' as const }))],
    [{ text: 'Shift', kind: 'corner' }, ...DAYS.flatMap(() => shifts.map((s) => ({ text: s.name, kind: 'shift' as const })))],
    [{ text: 'Time', kind: 'corner' }, ...DAYS.flatMap(() => shifts.map((s) => ({ text: shiftTime(s), kind: 'time' as const })))]
  ];

  const body: GCell[][] = [];
  for (const c of settings.categories) {
    for (let row = 0; row < c.rows; row++) {
      const r: GCell[] = [];
      if (row === 0) r.push({ text: c.name, rowSpan: c.rows, kind: 'cat' });
      for (let day = 0; day < 7; day++) {
        if (c.mode === 'day') {
          const n = nameOf(a[slotKey({ day, shiftId: 'day', categoryId: c.id, row })]);
          r.push({ text: n, colSpan: nS, kind: n ? 'name' : 'empty' });
        } else {
          for (const s of shifts) {
            const n = nameOf(a[slotKey({ day, shiftId: s.id, categoryId: c.id, row })]);
            r.push({ text: n, kind: n ? 'name' : 'empty' });
          }
        }
      }
      body.push(r);
    }
  }
  if (week.dayNotes?.some((n) => n.trim())) {
    body.push([{ text: 'Notes', kind: 'notelabel' }, ...week.dayNotes.map((n) => ({ text: n, colSpan: nS, kind: 'note' as const }))]);
  }

  return {
    title: settings.title,
    org: settings.orgName,
    range: fmtRange(week),
    head,
    body,
    notes: week.notes,
    pool: poolRows(data, weekId).map((p) => ({ name: p.staff.name, quota: p.quota, used: p.used, remaining: p.remaining })),
    shiftsLabel: shifts.map((s) => `${s.name}: ${shiftTime(s)}`).join('   •   ')
  };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** HTML lengkap untuk cetakan A4 Landscape */
export function gridHtml(g: GridModel, withPool = true): string {
  const cell = (c: GCell, tag: 'th' | 'td') =>
    `<${tag} class="${c.kind}"${c.colSpan && c.colSpan > 1 ? ` colspan="${c.colSpan}"` : ''}${c.rowSpan && c.rowSpan > 1 ? ` rowspan="${c.rowSpan}"` : ''}>${esc(c.text).replace(/\n/g, '<br>')}</${tag}>`;
  const head = g.head.map((r) => `<tr>${r.map((c) => cell(c, 'th')).join('')}</tr>`).join('');
  const body = g.body.map((r) => `<tr>${r.map((c) => cell(c, c.kind === 'cat' || c.kind === 'notelabel' ? 'th' : 'td')).join('')}</tr>`).join('');
  const pool =
    withPool && g.pool.length
      ? `<div class="pool"><b>WEEKLY STAFF POOL</b> ${g.pool
          .map((p) => `<span class="${p.remaining <= 0 ? 'r' : ''}">${esc(p.name)}: ${p.remaining}/${p.quota}</span>`)
          .join('')}</div>`
      : '';
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(g.title)}</title><style>
@page { size: A4 landscape; margin: 8mm; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #141414; background: #fff; }
.hd { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 6px; }
.hd h1 { font-size: 15px; margin: 0; } .hd .org { font-size: 11px; color: #555; } .hd .rg { font-size: 12px; font-weight: 600; text-align: right; }
table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; border: 1px solid #9DCBEA; border-radius: 8px; overflow: hidden; }
th, td { border-right: 1px solid #D9E6EE; border-bottom: 1px solid #D9E6EE; padding: 6px 3px; font-size: 11px; text-align: center; vertical-align: middle; word-wrap: break-word; }
th.day { background: #5AAEE0; color: #FFFBF2; font-size: 12px; } th.shift, th.time { background: #D9EEFA; color: #141414; }
th.time { font-weight: 500; font-size: 9px; } th.corner { background: #3F96CC; color: #FFFBF2; width: 62px; }
th.cat, th.notelabel { background: #F6F0E2; text-align: left; padding-left: 6px; font-size: 12px; }
td.name { font-weight: 600; } td.empty { background: #FFFCF5; } td.note { font-size: 9px; font-style: italic; text-align: left; }
.notes { margin-top: 6px; font-size: 10px; white-space: pre-wrap; } .meta { margin-top: 4px; font-size: 9px; color: #555; }
.pool { margin-top: 6px; font-size: 9px; display: flex; flex-wrap: wrap; gap: 4px 10px; } .pool .r { color: #C0392B; font-weight: 700; }
</style></head><body>
<div class="hd"><div><h1>${esc(g.title)}</h1><div class="org">${esc(g.org)}</div></div><div class="rg">${esc(g.range)}</div></div>
<table><thead>${head}</thead><tbody>${body}</tbody></table>
<div class="meta">${esc(g.shiftsLabel)}</div>
${g.notes.trim() ? `<div class="notes"><b>Catatan:</b> ${esc(g.notes)}</div>` : ''}
${pool}
</body></html>`;
}
