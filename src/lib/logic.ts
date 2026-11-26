// Logik tulen (tiada UI) — mudah diuji
import { AppData, Assignments, Category, DAYS, Settings, SlotInfo, SlotKey, Staff, Week } from './types';

export const uid = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'leader', name: 'Leader', mode: 'day', rows: 1 },
  { id: 'cashier', name: 'Cashier', mode: 'shift', rows: 3 },
  { id: 'forecourt', name: 'Forecourt', mode: 'shift', rows: 2 },
  { id: 'offduty', name: 'Off Duty', mode: 'day', rows: 2 }
];

export function defaultSettings(): Settings {
  return {
    orgName: 'Nama Organisasi',
    title: 'Staff Schedule / Shift Planning',
    shifts: [
      { id: 'morning', name: 'Morning', start: '06:30', end: '15:00' },
      { id: 'afternoon', name: 'Afternoon', start: '14:30', end: '23:00' }
    ],
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    defaultQuota: 7,
    duplicateScope: 'week',
    currentWeekId: null,
    updatedAt: 0
  };
}

export function emptyData(): AppData {
  return { settings: defaultSettings(), staff: {}, weeks: {}, assigns: {} };
}

// ---------- Tarikh ----------
export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function fromISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(s: string, n: number): string {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
export function mondayOf(d: Date): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const wd = (x.getDay() + 6) % 7; // 0 = Isnin
  x.setDate(x.getDate() - wd);
  return toISO(x);
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fmtDate(s: string): string {
  const d = fromISO(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
export function fmtRange(w: Week): string {
  return `${fmtDate(w.startDate)} – ${fmtDate(w.endDate)}`;
}
export function dayDate(w: Week, day: number): string {
  const d = fromISO(addDays(w.startDate, day));
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function newWeek(startDate: string): Week {
  const now = Date.now();
  return {
    id: uid(),
    startDate,
    endDate: addDays(startDate, 6),
    notes: '',
    dayNotes: ['', '', '', '', '', '', ''],
    createdAt: now,
    updatedAt: now
  };
}

// ---------- Masa ----------
export function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}.${String(m).padStart(2, '0')} ${ap}`;
}
export function shiftTime(s: { start: string; end: string }): string {
  return `${fmtTime(s.start)} – ${fmtTime(s.end)}`;
}

// ---------- Ruangan ----------
export function slotKey(s: SlotInfo): SlotKey {
  return `${s.day}|${s.shiftId}|${s.categoryId}|${s.row}`;
}
export function parseKey(k: SlotKey): SlotInfo {
  const [day, shiftId, categoryId, row] = k.split('|');
  return { day: Number(day), shiftId, categoryId, row: Number(row) };
}

/** Semua ruangan sah bagi susun atur semasa */
export function allSlots(settings: Settings): SlotInfo[] {
  const out: SlotInfo[] = [];
  for (let day = 0; day < 7; day++) {
    for (const c of settings.categories) {
      const shiftIds = c.mode === 'day' ? ['day'] : settings.shifts.map((s) => s.id);
      for (const shiftId of shiftIds) for (let row = 0; row < c.rows; row++) out.push({ day, shiftId, categoryId: c.id, row });
    }
  }
  return out;
}

/** Hanya tugasan yang berada dalam ruangan yang wujud sekarang (ruangan tersembunyi tidak dikira) */
export function visibleAssignments(settings: Settings, a: Assignments): [SlotKey, string][] {
  const valid = new Set(allSlots(settings).map(slotKey));
  return Object.entries(a).filter(([k, v]) => v && valid.has(k));
}

export function slotLabel(settings: Settings, k: SlotKey): string {
  const s = parseKey(k);
  const cat = settings.categories.find((c) => c.id === s.categoryId);
  const shift = s.shiftId === 'day' ? 'Full Day' : settings.shifts.find((x) => x.id === s.shiftId)?.name ?? s.shiftId;
  return `${DAYS[s.day]} – ${shift} – ${cat?.name ?? s.categoryId}`;
}

// ---------- Kuota & pertindihan ----------
export function quotaOf(st: Staff, settings: Settings): number {
  return st.quota ?? settings.defaultQuota;
}

/** Kiraan tugasan sebenar setiap staf dalam satu minggu */
export function countByStaff(settings: Settings, a: Assignments): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [, id] of visibleAssignments(settings, a)) out[id] = (out[id] ?? 0) + 1;
  return out;
}

export function locationsOf(settings: Settings, a: Assignments, staffId: string, exceptKey?: SlotKey): SlotKey[] {
  const order = new Map(allSlots(settings).map((s, i) => [slotKey(s), i]));
  return visibleAssignments(settings, a)
    .filter(([k, id]) => id === staffId && k !== exceptKey)
    .map(([k]) => k)
    .sort((x, y) => (order.get(x) ?? 0) - (order.get(y) ?? 0));
}

/** Tugasan sedia ada yang bertindih dengan ruangan baharu, ikut skop tetapan */
export function conflictsFor(settings: Settings, a: Assignments, staffId: string, newKey: SlotKey): SlotKey[] {
  const locs = locationsOf(settings, a, staffId, newKey);
  if (settings.duplicateScope === 'day') {
    const day = parseKey(newKey).day;
    return locs.filter((k) => parseKey(k).day === day);
  }
  return locs;
}

/** Senarai semua nama bertindih */
export function duplicateList(settings: Settings, a: Assignments): { staffId: string; keys: SlotKey[] }[] {
  const by: Record<string, SlotKey[]> = {};
  for (const [k, id] of visibleAssignments(settings, a)) (by[id] ??= []).push(k);
  const out: { staffId: string; keys: SlotKey[] }[] = [];
  for (const [staffId, keys] of Object.entries(by)) {
    if (settings.duplicateScope === 'day') {
      const days: Record<number, SlotKey[]> = {};
      keys.forEach((k) => (days[parseKey(k).day] ??= []).push(k));
      const d = Object.values(days).filter((x) => x.length > 1).flat();
      if (d.length) out.push({ staffId, keys: locationsOf(settings, a, staffId).filter((k) => d.includes(k)) });
    } else if (keys.length > 1) out.push({ staffId, keys: locationsOf(settings, a, staffId) });
  }
  return out;
}

export type Level = 'green' | 'yellow' | 'red';
export function remainingLevel(remaining: number, quota: number): Level {
  if (remaining <= 0) return 'red';
  if (remaining <= Math.max(1, Math.floor(quota * 0.3))) return 'yellow';
  return 'green';
}

export interface PoolRow {
  staff: Staff;
  quota: number;
  used: number;
  remaining: number;
  level: Level;
}
export function poolRows(data: AppData, weekId: string | null): PoolRow[] {
  const a = weekId ? data.assigns[weekId] ?? {} : {};
  const counts = countByStaff(data.settings, a);
  return Object.values(data.staff)
    .filter((s) => !s.deleted && s.inPool)
    .sort((x, y) => x.name.localeCompare(y.name))
    .map((staff) => {
      const quota = quotaOf(staff, data.settings);
      const used = counts[staff.id] ?? 0;
      const remaining = quota - used;
      return { staff, quota, used, remaining, level: remainingLevel(remaining, quota) };
    });
}

/** Ruangan kosong dikumpul ikut hari + shift */
export function incompleteShifts(settings: Settings, a: Assignments) {
  const groups: Record<string, { day: number; shiftId: string; empty: number; total: number }> = {};
  for (const s of allSlots(settings)) {
    const cat = settings.categories.find((c) => c.id === s.categoryId)!;
    if (/off/i.test(cat.name)) continue; // Off Duty kosong bukan "shift tidak lengkap"
    const g = `${s.day}|${s.shiftId}`;
    groups[g] ??= { day: s.day, shiftId: s.shiftId, empty: 0, total: 0 };
    groups[g].total++;
    if (!a[slotKey(s)]) groups[g].empty++;
  }
  return Object.values(groups).filter((g) => g.empty > 0);
}

export function normalizeName(n: string): string {
  return n.trim().replace(/\s+/g, ' ').toUpperCase();
}

export function makeStaff(name: string, extra: Partial<Staff> = {}): Staff {
  const now = Date.now();
  return {
    id: uid(),
    name: normalizeName(name),
    active: true,
    inPool: true,
    deleted: false,
    categoryIds: [],
    quota: null,
    createdAt: now,
    updatedAt: now,
    ...extra
  };
}

/** Bilangan minggu yang menggunakan staf ini */
export function usageOfStaff(data: AppData, staffId: string): { weekId: string; count: number }[] {
  return Object.entries(data.assigns)
    .map(([weekId, a]) => ({ weekId, count: Object.values(a).filter((v) => v === staffId).length }))
    .filter((x) => x.count > 0 && data.weeks[x.weekId]);
}

export function sortedWeeks(data: AppData): Week[] {
  return Object.values(data.weeks).sort((a, b) => b.startDate.localeCompare(a.startDate));
}
