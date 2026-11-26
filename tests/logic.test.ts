import { describe, it, expect } from 'vitest';
import { emptyData, makeStaff, newWeek, slotKey, conflictsFor, countByStaff, poolRows, duplicateList, slotLabel, remainingLevel, incompleteShifts, allSlots, shiftTime, addDays, mondayOf } from '../src/lib/logic';
import { importStaffText } from '../src/lib/export';
import { buildGrid } from '../src/lib/grid';

function setup() {
  const d = emptyData();
  const w = newWeek('2026-10-05');
  d.weeks[w.id] = w;
  d.settings.currentWeekId = w.id;
  const roz = makeStaff('Rozaimi');
  const siti = makeStaff('siti ');
  d.staff[roz.id] = roz;
  d.staff[siti.id] = siti;
  d.assigns[w.id] = {};
  return { d, w, roz, siti };
}

describe('waktu shift default', () => {
  it('Morning 6.30 AM – 3.00 PM, Afternoon 2.30 PM – 11.00 PM', () => {
    const d = emptyData();
    expect(shiftTime(d.settings.shifts[0])).toBe('6.30 AM – 3.00 PM');
    expect(shiftTime(d.settings.shifts[1])).toBe('2.30 PM – 11.00 PM');
  });
  it('kategori asal dikekalkan', () => {
    expect(emptyData().settings.categories.map((c) => c.name)).toEqual(['Leader', 'Cashier', 'Forecourt', 'Off Duty']);
  });
  it('jadual permulaan kosong & tiada staf contoh', () => {
    const d = emptyData();
    expect(Object.keys(d.staff)).toHaveLength(0);
    expect(Object.keys(d.assigns)).toHaveLength(0);
  });
});

describe('pengesanan nama bertindih', () => {
  it('kesan ROZAIMI Monday Morning Leader -> Tuesday Morning Leader', () => {
    const { d, w, roz } = setup();
    d.settings.categories[0].mode = 'shift';
    const mon = slotKey({ day: 0, shiftId: 'morning', categoryId: 'leader', row: 0 });
    const tue = slotKey({ day: 1, shiftId: 'morning', categoryId: 'leader', row: 0 });
    d.assigns[w.id][mon] = roz.id;
    const c = conflictsFor(d.settings, d.assigns[w.id], roz.id, tue);
    expect(c).toEqual([mon]);
    expect(slotLabel(d.settings, c[0])).toBe('Monday – Morning – Leader');
    expect(slotLabel(d.settings, tue)).toBe('Tuesday – Morning – Leader');
  });
  it('paparkan semua lokasi bila ada banyak tugasan', () => {
    const { d, w, roz } = setup();
    const keys = [0, 2, 4].map((day) => slotKey({ day, shiftId: 'morning', categoryId: 'cashier', row: 0 }));
    keys.forEach((k) => (d.assigns[w.id][k] = roz.id));
    const n = slotKey({ day: 5, shiftId: 'afternoon', categoryId: 'cashier', row: 1 });
    expect(conflictsFor(d.settings, d.assigns[w.id], roz.id, n)).toEqual(keys);
    expect(duplicateList(d.settings, d.assigns[w.id])).toEqual([{ staffId: roz.id, keys }]);
  });
  it('skop hari: hanya hari yang sama', () => {
    const { d, w, roz } = setup();
    d.settings.duplicateScope = 'day';
    d.assigns[w.id][slotKey({ day: 0, shiftId: 'morning', categoryId: 'cashier', row: 0 })] = roz.id;
    expect(conflictsFor(d.settings, d.assigns[w.id], roz.id, slotKey({ day: 1, shiftId: 'morning', categoryId: 'cashier', row: 0 }))).toEqual([]);
    expect(conflictsFor(d.settings, d.assigns[w.id], roz.id, slotKey({ day: 0, shiftId: 'afternoon', categoryId: 'cashier', row: 0 }))).toHaveLength(1);
  });
});

describe('weekly pool', () => {
  it('7 -> 6 -> 5 -> 0, tambah semula bila dipadam, tukar nama kemas kini kedua-dua', () => {
    const { d, w, roz, siti } = setup();
    const rem = (id: string) => poolRows(d, w.id).find((r) => r.staff.id === id)!.remaining;
    expect(rem(roz.id)).toBe(7);
    const slots = allSlots(d.settings).map(slotKey);
    d.assigns[w.id][slots[0]] = roz.id;
    expect(rem(roz.id)).toBe(6);
    d.assigns[w.id][slots[1]] = roz.id;
    expect(rem(roz.id)).toBe(5);
    for (let i = 2; i < 7; i++) d.assigns[w.id][slots[i]] = roz.id;
    expect(rem(roz.id)).toBe(0);
    expect(poolRows(d, w.id).find((r) => r.staff.id === roz.id)!.level).toBe('red');
    delete d.assigns[w.id][slots[6]];
    expect(rem(roz.id)).toBe(1);
    d.assigns[w.id][slots[5]] = siti.id; // tukar nama
    expect(rem(roz.id)).toBe(2);
    expect(rem(siti.id)).toBe(6);
    d.assigns[w.id][slots[6]] = roz.id;
    d.assigns[w.id][slots[7]] = roz.id;
    d.assigns[w.id][slots[8]] = roz.id;
    expect(rem(roz.id)).toBe(-1); // melebihi kuota dibenarkan
  });
  it('nama berdaftar tanpa tugasan tidak dikira', () => {
    const { d, w } = setup();
    expect(Object.keys(countByStaff(d.settings, d.assigns[w.id]))).toHaveLength(0);
  });
  it('ruangan tersembunyi tidak dikira', () => {
    const { d, w, roz } = setup();
    d.assigns[w.id][slotKey({ day: 0, shiftId: 'morning', categoryId: 'cashier', row: 9 })] = roz.id;
    expect(countByStaff(d.settings, d.assigns[w.id])[roz.id]).toBeUndefined();
  });
  it('warna indikator', () => {
    expect(remainingLevel(7, 7)).toBe('green');
    expect(remainingLevel(3, 7)).toBe('green');
    expect(remainingLevel(2, 7)).toBe('yellow');
    expect(remainingLevel(0, 7)).toBe('red');
  });
});

describe('lain-lain', () => {
  it('tarikh minggu & incomplete', () => {
    expect(mondayOf(new Date(2026, 10, 26))).toBe('2026-11-23');
    expect(addDays('2026-10-05', 6)).toBe('2026-10-11');
    const { d, w } = setup();
    expect(incompleteShifts(d.settings, d.assigns[w.id]).length).toBe(7 * 3); // leader(day) + morning + afternoon
  });
  it('import staf CSV', () => {
    const { d } = setup();
    const r = importStaffText(d, 'Name,Active,In Pool,Weekly Quota,Categories\n"Nabila",Yes,Yes,6,Cashier\nrozaimi,,,,\n');
    expect(r.map((s) => s.name)).toEqual(['NABILA', 'ROZAIMI']);
    expect(r[0].quota).toBe(6);
    expect(r[0].categoryIds).toEqual(['cashier']);
    expect(r[1].id).toBe(Object.values(d.staff).find((s) => s.name === 'ROZAIMI')!.id);
  });
  it('grid export ada 14 lajur + label', () => {
    const { d, w, roz } = setup();
    d.assigns[w.id][slotKey({ day: 0, shiftId: 'day', categoryId: 'leader', row: 0 })] = roz.id;
    const g = buildGrid(d, w.id);
    expect(g.head[1]).toHaveLength(15);
    expect(g.body[0][1]).toMatchObject({ text: 'ROZAIMI', colSpan: 2 });
    expect(g.body).toHaveLength(1 + 3 + 2 + 2);
  });
});
