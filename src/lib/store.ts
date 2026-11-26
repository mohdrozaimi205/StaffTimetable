// Store utama + penyelarasan Supabase (cache tempatan + baris gilir luar talian)
import { createClient, SupabaseClient, User, RealtimeChannel } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import { AppData, Assignments, Settings, Staff, Week } from './types';
import { defaultSettings, emptyData } from './logic';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

/** Alamat kembali selepas log masuk Google dalam APK (didaftarkan dalam AndroidManifest) */
export const NATIVE_REDIRECT = 'com.mohdrozaimi.stafftimetable://login-callback';

export type SyncStatus = 'local' | 'signedout' | 'connecting' | 'syncing' | 'synced' | 'offline' | 'error';

type Op =
  | { t: 'settings' }
  | { t: 'staff'; id: string }
  | { t: 'week'; id: string; del?: boolean }
  | { t: 'assign'; weekId: string; key: string };

interface State {
  data: AppData;
  status: SyncStatus;
  error: string | null;
  user: User | null;
  lastSync: number | null;
  ready: boolean;
}

const K_DATA = 'stt.data.v1';
const K_QUEUE = 'stt.queue.v1';
const K_FULL = 'stt.fullpush.v1';
const K_SB = 'stt.supabase.v1';

function load<T>(k: string, fb: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fb;
  } catch {
    return fb;
  }
}
function save(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {
    console.warn('Gagal simpan cache', e);
  }
}

function sanitize(d: AppData): AppData {
  const base = emptyData();
  const settings = { ...defaultSettings(), ...(d?.settings ?? {}) } as Settings;
  return { ...base, ...d, settings, staff: d?.staff ?? {}, weeks: d?.weeks ?? {}, assigns: d?.assigns ?? {} };
}

// ---------------- state ----------------
let state: State = {
  data: sanitize(load<AppData>(K_DATA, emptyData())),
  status: 'local',
  error: null,
  user: null,
  lastSync: null,
  ready: false
};
let queue: Record<string, Op> = load(K_QUEUE, {});
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}
function set(p: Partial<State>) {
  state = { ...state, ...p };
  emit();
}
function setData(fn: (d: AppData) => AppData) {
  state = { ...state, data: fn(state.data) };
  save(K_DATA, state.data);
  emit();
}

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => sel(state)
  );
}
export const getState = () => state;

// ---------------- Supabase ----------------
let sb: SupabaseClient | null = null;
let channel: RealtimeChannel | null = null;

export function getSbConfig(): { url: string; key: string } {
  const c = load<{ url: string; key: string } | null>(K_SB, null);
  return { url: c?.url || SUPABASE_URL, key: c?.key || SUPABASE_ANON_KEY };
}
export function isConfigured() {
  const c = getSbConfig();
  return !!(c.url && c.key);
}

function opKey(o: Op): string {
  switch (o.t) {
    case 'settings':
      return 'settings';
    case 'staff':
      return 'staff:' + o.id;
    case 'week':
      return 'week:' + o.id;
    case 'assign':
      return `assign:${o.weekId}:${o.key}`;
  }
}
function enqueue(o: Op) {
  const k = opKey(o);
  delete queue[k]; // kekalkan susunan terbaru
  queue[k] = o;
  save(K_QUEUE, queue);
  if (sb && state.user) void flushSoon();
}

let flushTimer: ReturnType<typeof setTimeout> | null = null;
function flushSoon() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => void flush(), 250);
}

let flushing = false;
async function flush(): Promise<boolean> {
  if (!sb || !state.user) return false;
  if (flushing) {
    flushSoon();
    return false;
  }
  flushing = true;
  const owner = state.user.id;
  try {
    if (Object.keys(queue).length) set({ status: 'syncing' });
    for (const [k, o] of Object.entries(queue)) {
      const d = state.data;
      let err: { message: string } | null = null;
      if (o.t === 'settings') {
        ({ error: err } = await sb.from('tt_settings').upsert({ owner, data: d.settings, updated_at: new Date().toISOString() }));
      } else if (o.t === 'staff') {
        const s = d.staff[o.id];
        if (s) ({ error: err } = await sb.from('tt_staff').upsert({ owner, id: o.id, data: s, updated_at: new Date().toISOString() }));
      } else if (o.t === 'week') {
        if (o.del) {
          ({ error: err } = await sb.from('tt_assign').delete().eq('owner', owner).eq('week_id', o.id));
          if (!err) ({ error: err } = await sb.from('tt_weeks').delete().eq('owner', owner).eq('id', o.id));
        } else {
          const w = d.weeks[o.id];
          if (w) ({ error: err } = await sb.from('tt_weeks').upsert({ owner, id: o.id, data: w, updated_at: new Date().toISOString() }));
        }
      } else if (o.t === 'assign') {
        const v = d.assigns[o.weekId]?.[o.key];
        if (v)
          ({ error: err } = await sb
            .from('tt_assign')
            .upsert({ owner, week_id: o.weekId, slot_key: o.key, staff_id: v, updated_at: new Date().toISOString() }));
        else ({ error: err } = await sb.from('tt_assign').delete().eq('owner', owner).eq('week_id', o.weekId).eq('slot_key', o.key));
      }
      if (err) throw new Error(err.message);
      if (queue[k] === o) {
        delete queue[k];
        save(K_QUEUE, queue);
      }
    }
    set({ status: 'synced', error: null, lastSync: Date.now() });
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    set({ status: offline || /fetch|network/i.test(msg) ? 'offline' : 'error', error: msg });
    return false;
  } finally {
    flushing = false;
  }
}

async function selectAll(table: string) {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb!.from(table).select('*').range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function pull(): Promise<void> {
  if (!sb || !state.user) return;
  const [st, staff, weeks, assigns] = await Promise.all([
    selectAll('tt_settings'),
    selectAll('tt_staff'),
    selectAll('tt_weeks'),
    selectAll('tt_assign')
  ]);
  const remoteEmpty = !st.length && !staff.length && !weeks.length;
  if (remoteEmpty || localStorage.getItem(K_FULL)) {
    await fullPush();
    return;
  }
  const d: AppData = emptyData();
  if (st[0]) d.settings = { ...defaultSettings(), ...st[0].data };
  staff.forEach((r) => (d.staff[r.id] = r.data));
  weeks.forEach((r) => (d.weeks[r.id] = r.data));
  assigns.forEach((r) => ((d.assigns[r.week_id] ??= {})[r.slot_key] = r.staff_id));
  setData(() => sanitize(d));
}

async function fullPush() {
  if (!sb || !state.user) return;
  const owner = state.user.id;
  const d = state.data;
  const now = new Date().toISOString();
  const chk = (r: { error: { message: string } | null }) => {
    if (r.error) throw new Error(r.error.message);
  };
  chk(await sb.from('tt_assign').delete().eq('owner', owner));
  chk(await sb.from('tt_weeks').delete().eq('owner', owner));
  chk(await sb.from('tt_staff').delete().eq('owner', owner));
  chk(await sb.from('tt_settings').upsert({ owner, data: d.settings, updated_at: now }));
  const staffRows = Object.values(d.staff).map((s) => ({ owner, id: s.id, data: s, updated_at: now }));
  const weekRows = Object.values(d.weeks).map((w) => ({ owner, id: w.id, data: w, updated_at: now }));
  const asRows = Object.entries(d.assigns).flatMap(([week_id, a]) =>
    d.weeks[week_id] ? Object.entries(a).filter(([, v]) => v).map(([slot_key, staff_id]) => ({ owner, week_id, slot_key, staff_id, updated_at: now })) : []
  );
  for (let i = 0; i < staffRows.length; i += 500) chk(await sb.from('tt_staff').insert(staffRows.slice(i, i + 500)));
  for (let i = 0; i < weekRows.length; i += 500) chk(await sb.from('tt_weeks').insert(weekRows.slice(i, i + 500)));
  for (let i = 0; i < asRows.length; i += 500) chk(await sb.from('tt_assign').insert(asRows.slice(i, i + 500)));
  localStorage.removeItem(K_FULL);
  queue = {};
  save(K_QUEUE, queue);
}

/** Selaraskan sekarang: hantar perubahan tertangguh, kemudian tarik data terkini */
export async function syncNow(): Promise<void> {
  if (!sb || !state.user) return;
  set({ status: 'syncing' });
  try {
    const ok = await flush();
    if (!ok && Object.keys(queue).length) return;
    await pull();
    set({ status: 'synced', error: null, lastSync: Date.now() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    set({ status: /fetch|network/i.test(msg) || !navigator.onLine ? 'offline' : 'error', error: msg });
  }
}

function applyRemote(table: string, ev: string, row: any, old: any) {
  if (Object.keys(queue).length) return; // perubahan tempatan belum dihantar — tarik semula selepas flush
  setData((d) => {
    const n: AppData = { ...d, staff: { ...d.staff }, weeks: { ...d.weeks }, assigns: { ...d.assigns } };
    if (table === 'tt_settings' && row) n.settings = { ...defaultSettings(), ...row.data };
    if (table === 'tt_staff') {
      if (ev === 'DELETE') delete n.staff[old.id];
      else n.staff[row.id] = row.data;
    }
    if (table === 'tt_weeks') {
      if (ev === 'DELETE') delete n.weeks[old.id];
      else n.weeks[row.id] = row.data;
    }
    if (table === 'tt_assign') {
      const wk = ev === 'DELETE' ? old.week_id : row.week_id;
      const a = { ...(n.assigns[wk] ?? {}) };
      if (ev === 'DELETE') delete a[old.slot_key];
      else a[row.slot_key] = row.staff_id;
      n.assigns[wk] = a;
    }
    return n;
  });
  set({ lastSync: Date.now() });
}

function subscribe() {
  if (!sb || !state.user) return;
  channel?.unsubscribe();
  channel = sb.channel('tt-sync');
  for (const table of ['tt_settings', 'tt_staff', 'tt_weeks', 'tt_assign'])
    channel.on('postgres_changes' as any, { event: '*', schema: 'public', table, filter: `owner=eq.${state.user.id}` }, (p: any) =>
      applyRemote(table, p.eventType, p.new, p.old)
    );
  channel.subscribe();
}

async function onSignedIn(user: User) {
  set({ user, status: 'syncing' });
  await syncNow();
  subscribe();
}

export async function initStore() {
  if (!isConfigured()) {
    set({ status: 'local', ready: true });
    return;
  }
  const c = getSbConfig();
  try {
    sb = createClient(c.url, c.key, { auth: { persistSession: true, autoRefreshToken: true, flowType: 'pkce', detectSessionInUrl: true } });
    listenNativeLogin();
    set({ status: 'connecting' });
    const { data } = await sb.auth.getSession();
    sb.auth.onAuthStateChange((ev, session) => {
      if (ev === 'SIGNED_OUT') {
        channel?.unsubscribe();
        set({ user: null, status: 'signedout' });
      }
      if (ev === 'SIGNED_IN' && session?.user && session.user.id !== state.user?.id) void onSignedIn(session.user);
    });
    if (data.session?.user) await onSignedIn(data.session.user);
    else set({ status: 'signedout' });
  } catch (e) {
    set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
  }
  set({ ready: true });
}

export async function setSbConfig(url: string, key: string) {
  save(K_SB, { url: url.trim(), key: key.trim() });
  channel?.unsubscribe();
  sb = null;
  set({ user: null });
  await initStore();
}

export async function signIn(email: string, password: string, create = false) {
  if (!sb) throw new Error('Database belum disambungkan. Isi URL & anon key dahulu.');
  const r = create ? await sb.auth.signUp({ email, password }) : await sb.auth.signInWithPassword({ email, password });
  if (r.error) throw new Error(r.error.message);
  if (create && !r.data.session) return 'confirm';
  return 'ok';
}
/** Log masuk dengan Google (Web: redirect; APK: pelayar sistem + kembali melalui deep link) */
export async function signInWithGoogle() {
  if (!sb) throw new Error('Database belum disambungkan.');
  if (Capacitor.isNativePlatform()) {
    const { data, error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: NATIVE_REDIRECT, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } }
    });
    if (error) throw new Error(error.message);
    await Browser.open({ url: data.url, windowName: '_self' });
  } else {
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, queryParams: { prompt: 'select_account' } } });
    if (error) throw new Error(error.message);
  }
}

let nativeListening = false;
async function handleNativeUrl(url: string | undefined) {
  if (!url || !url.startsWith(NATIVE_REDIRECT) || !sb) return;
  try {
    await Browser.close();
  } catch {
    /* pelayar mungkin sudah ditutup */
  }
  const u = new URL(url.replace('#', '?'));
  const err = u.searchParams.get('error_description') || u.searchParams.get('error');
  if (err) {
    set({ status: 'error', error: `Log masuk Google gagal: ${err}` });
    return;
  }
  const code = u.searchParams.get('code');
  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) set({ status: 'error', error: `Log masuk Google gagal: ${error.message}` });
  }
}
function listenNativeLogin() {
  if (!Capacitor.isNativePlatform() || nativeListening) return;
  nativeListening = true;
  void CapApp.addListener('appUrlOpen', ({ url }) => void handleNativeUrl(url));
  void CapApp.getLaunchUrl().then((r) => handleNativeUrl(r?.url));
}

export async function signOut() {
  await sb?.auth.signOut();
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void syncNow());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.user) void syncNow();
  });
}

// ---------------- Operasi data ----------------
export const actions = {
  saveSettings(p: Partial<Settings>) {
    setData((d) => ({ ...d, settings: { ...d.settings, ...p, updatedAt: Date.now() } }));
    enqueue({ t: 'settings' });
  },
  upsertStaff(s: Staff) {
    setData((d) => ({ ...d, staff: { ...d.staff, [s.id]: { ...s, updatedAt: Date.now() } } }));
    enqueue({ t: 'staff', id: s.id });
  },
  upsertWeek(w: Week) {
    setData((d) => ({ ...d, weeks: { ...d.weeks, [w.id]: { ...w, updatedAt: Date.now() } } }));
    enqueue({ t: 'week', id: w.id });
  },
  deleteWeek(id: string) {
    setData((d) => {
      const weeks = { ...d.weeks };
      const assigns = { ...d.assigns };
      delete weeks[id];
      delete assigns[id];
      const settings = d.settings.currentWeekId === id ? { ...d.settings, currentWeekId: null } : d.settings;
      return { ...d, weeks, assigns, settings };
    });
    for (const k of Object.keys(queue)) if (k.startsWith(`assign:${id}:`)) delete queue[k];
    enqueue({ t: 'week', id, del: true });
    if (getState().data.settings.currentWeekId === null) enqueue({ t: 'settings' });
  },
  setAssign(weekId: string, key: string, staffId: string | null) {
    setData((d) => {
      const a: Assignments = { ...(d.assigns[weekId] ?? {}) };
      if (staffId) a[key] = staffId;
      else delete a[key];
      return { ...d, assigns: { ...d.assigns, [weekId]: a } };
    });
    enqueue({ t: 'assign', weekId, key });
  },
  setAssignMany(weekId: string, entries: Assignments, replace = false) {
    const before = getState().data.assigns[weekId] ?? {};
    setData((d) => ({ ...d, assigns: { ...d.assigns, [weekId]: replace ? { ...entries } : { ...(d.assigns[weekId] ?? {}), ...entries } } }));
    const keys = new Set([...Object.keys(entries), ...(replace ? Object.keys(before) : [])]);
    keys.forEach((key) => enqueue({ t: 'assign', weekId, key }));
  },
  /** Ganti semua data (Restore). Database awan akan ditulis semula sepenuhnya. */
  async replaceAll(d: AppData) {
    setData(() => sanitize(d));
    queue = {};
    save(K_QUEUE, queue);
    localStorage.setItem(K_FULL, '1');
    if (sb && state.user) {
      set({ status: 'syncing' });
      try {
        await fullPush();
        set({ status: 'synced', lastSync: Date.now(), error: null });
      } catch (e) {
        set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
      }
    }
  },
  pendingCount: () => Object.keys(queue).length
};
