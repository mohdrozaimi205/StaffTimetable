// Jenis data utama aplikasi

export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export interface Shift {
  id: string; // 'morning' | 'afternoon'
  name: string;
  start: string; // "06:30"
  end: string; // "15:00"
}

/** mode 'shift' = satu ruangan bagi setiap shift; 'day' = satu ruangan sepanjang hari (merge seperti dalam Excel asal) */
export interface Category {
  id: string;
  name: string;
  mode: 'shift' | 'day';
  rows: number;
}

export interface Settings {
  orgName: string;
  title: string;
  shifts: Shift[];
  categories: Category[];
  defaultQuota: number;
  duplicateScope: 'week' | 'day';
  currentWeekId: string | null;
  updatedAt: number;
}

export interface Staff {
  id: string;
  name: string;
  active: boolean;
  inPool: boolean;
  deleted: boolean;
  categoryIds: string[];
  quota: number | null; // null = guna kuota default
  createdAt: number;
  updatedAt: number;
}

export interface Week {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  notes: string;
  dayNotes: string[]; // 7 catatan harian
  createdAt: number;
  updatedAt: number;
}

/** kunci ruangan: `${day}|${shiftId atau 'day'}|${categoryId}|${row}` */
export type SlotKey = string;
export type Assignments = Record<SlotKey, string>; // slotKey -> staffId

export interface AppData {
  settings: Settings;
  staff: Record<string, Staff>;
  weeks: Record<string, Week>;
  assigns: Record<string, Assignments>; // weekId -> assignments
}

export interface SlotInfo {
  day: number;
  shiftId: string; // atau 'day'
  categoryId: string;
  row: number;
}
