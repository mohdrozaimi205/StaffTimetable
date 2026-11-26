import { it, expect } from 'vitest';
import { writeFileSync } from 'fs';
import { emptyData, makeStaff, newWeek, allSlots, slotKey } from '../src/lib/logic';
import { buildGrid, gridHtml } from '../src/lib/grid';
it('html cetakan dijana', () => {
  const d = emptyData();
  const w = newWeek('2026-10-05'); d.weeks[w.id] = w; d.assigns[w.id] = {};
  const names = ['ROZAIMI','SITI','NABILA','AFIQAH','SYAMIMI','ATIKAH','AINA','AJMAN','ALIAS','HASHIM'].map((n) => makeStaff(n));
  names.forEach((s) => (d.staff[s.id] = s));
  allSlots(d.settings).forEach((s, i) => (d.assigns[w.id][slotKey(s)] = names[i % names.length].id));
  w.dayNotes[4] = 'To mosque perform the prayer. 12pm to 2.30pm'; w.notes = 'Contoh catatan minggu';
  const html = gridHtml(buildGrid(d, w.id));
  expect(html).toContain('2.30 PM – 11.00 PM');
  expect(html).not.toContain('10.30 PM');
  if (process.env.OUT) writeFileSync(process.env.OUT, html);
});
