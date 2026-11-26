import React, { useEffect, useState } from 'react';
import { actions, getSbConfig, getState, setSbConfig, signIn, signInWithGoogle, signOut, syncNow, useStore } from '../lib/store';
import { APP_VERSION } from '../lib/config';
import { backupBlob, importStaffText, parseBackup, saveFile, shareFile, staffCsv } from '../lib/export';
import { CategoryEditor, ShiftEditor } from '../components/layout';
import { Button, Card, confirmDialog, Field, Icon, Input, pickFile, Spinner, toast } from '../components/ui';
import { Capacitor } from '@capacitor/core';

export default function SettingsPage() {
  const s = useStore((x) => x.data.settings);
  const [org, setOrg] = useState(s.orgName);
  const [title, setTitle] = useState(s.title);
  useEffect(() => {
    setOrg(s.orgName);
    setTitle(s.title);
  }, [s.orgName, s.title]);

  return (
    <div className="page-in space-y-5 max-w-2xl mx-auto">
      <Section title="Organisasi">
        <Card className="p-4 space-y-3">
          <Field label="Nama organisasi">
            <Input value={org} onChange={(e) => setOrg(e.target.value)} onBlur={() => org !== s.orgName && actions.saveSettings({ orgName: org.trim() || 'Nama Organisasi' })} />
          </Field>
          <Field label="Tajuk jadual" hint="Dipaparkan pada PDF, Excel dan cetakan">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => title !== s.title && actions.saveSettings({ title: title.trim() || 'Staff Schedule' })} />
          </Field>
        </Card>
      </Section>

      <Section title="Waktu Shift" sub="Default: Morning 6.30 AM – 3.00 PM • Afternoon 2.30 PM – 11.00 PM">
        <ShiftEditor />
        <button
          className="text-sm font-semibold text-sky mt-2 ml-1"
          onClick={() =>
            actions.saveSettings({
              shifts: s.shifts.map((x) =>
                x.id === 'morning' ? { ...x, start: '06:30', end: '15:00' } : x.id === 'afternoon' ? { ...x, start: '14:30', end: '23:00' } : x
              )
            })
          }
        >
          Pulihkan waktu default
        </button>
      </Section>

      <Section title="Kategori Tugasan" sub="'Sepanjang hari' = satu ruangan untuk kedua-dua shift (seperti Leader & Off Duty dalam Excel asal)">
        <CategoryEditor />
      </Section>

      <Section title="Kuota & Amaran">
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">Kuota mingguan default</div>
              <div className="text-xs text-ink-3">Untuk staf tanpa kuota khas</div>
            </div>
            <div className="flex items-center bg-cream-100 rounded-full p-1">
              <button className="press w-9 h-9 rounded-full bg-white font-bold" onClick={() => actions.saveSettings({ defaultQuota: Math.max(0, s.defaultQuota - 1) })}>
                −
              </button>
              <span className="w-10 text-center font-bold text-lg tabular-nums">{s.defaultQuota}</span>
              <button className="press w-9 h-9 rounded-full bg-white font-bold" onClick={() => actions.saveSettings({ defaultQuota: Math.min(99, s.defaultQuota + 1) })}>
                +
              </button>
            </div>
          </div>
          <div className="text-xs text-ink-3">Amaran nama bertindih hanya keluar jika nama yang sama dimasukkan lebih daripada sekali pada hari yang sama. Anda masih boleh pilih CONTINUE ANYWAY.</div>
        </Card>
      </Section>

      <DatabaseSection />
      <DataSection />

      <Section title="Tentang">
        <Card className="p-4 flex items-center gap-3">
          <img src="./icon-192.png" alt="" className="w-12 h-12 rounded-2xl" />
          <div className="flex-1">
            <div className="font-bold">Staff Timetable</div>
            <div className="text-xs text-ink-3">
              Versi {APP_VERSION} • {Capacitor.isNativePlatform() ? 'Android APK' : 'Web App'}
            </div>
          </div>
          {!Capacitor.isNativePlatform() && (
            <Button
              kind="soft"
              className="h-9 text-sm"
              onClick={async () => {
                const r = await navigator.serviceWorker?.getRegistration();
                await r?.update();
                toast(r?.waiting ? 'Versi baharu sedia — tutup & buka semula app' : 'Anda menggunakan versi terkini');
              }}
            >
              Semak versi
            </Button>
          )}
        </Card>
      </Section>
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="ml-1 mb-2">
        <div className="text-xs font-bold uppercase tracking-wider text-ink-3">{title}</div>
        {sub && <div className="text-xs text-ink-3 mt-0.5">{sub}</div>}
      </div>
      {children}
    </section>
  );
}

const STATUS: Record<string, { t: string; c: string }> = {
  local: { t: 'Belum disambung ke database', c: 'bg-cream-300' },
  signedout: { t: 'Belum log masuk', c: 'bg-amber-400' },
  connecting: { t: 'Menyambung…', c: 'bg-sky' },
  syncing: { t: 'Menyelaras…', c: 'bg-sky' },
  synced: { t: 'Diselaraskan', c: 'bg-emerald-500' },
  offline: { t: 'Luar talian — perubahan akan dihantar kemudian', c: 'bg-amber-400' },
  error: { t: 'Ralat penyelarasan', c: 'bg-red-500' }
};

function DatabaseSection() {
  const status = useStore((x) => x.status);
  const user = useStore((x) => x.user);
  const err = useStore((x) => x.error);
  const last = useStore((x) => x.lastSync);
  const cfg = getSbConfig();
  const [url, setUrl] = useState(cfg.url);
  const [key, setKey] = useState(cfg.key);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [showCfg, setShowCfg] = useState(!cfg.url);

  const connect = async () => {
    if (!/^https:\/\/.+/.test(url.trim()) || !key.trim()) return toast('Isi Project URL (https://…) dan anon key', 'err');
    setBusy(true);
    await setSbConfig(url, key);
    setBusy(false);
    setShowCfg(false);
    toast('Sambungan disimpan');
  };
  const login = async (create: boolean) => {
    if (!email || pw.length < 6) return toast('Isi e-mel dan kata laluan (min. 6 aksara)', 'err');
    setBusy(true);
    try {
      const r = await signIn(email.trim(), pw, create);
      toast(r === 'confirm' ? 'Akaun dicipta. Semak e-mel untuk pengesahan, kemudian log masuk.' : 'Berjaya log masuk');
      setPw('');
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally {
      setBusy(false);
    }
  };

  const st = STATUS[status];
  return (
    <Section title="Database & Penyelarasan" sub="Supabase — data yang sama untuk Web App dan Android APK">
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${st.c} ${status === 'syncing' || status === 'connecting' ? 'animate-pulse' : ''}`} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold">{st.t}</div>
            <div className="text-xs text-ink-3 truncate">
              {user ? user.email : 'Data disimpan sementara dalam peranti ini sahaja'}
              {last ? ` • terakhir ${new Date(last).toLocaleTimeString()}` : ''}
              {actions.pendingCount() ? ` • ${actions.pendingCount()} perubahan menunggu` : ''}
            </div>
            {err && status === 'error' && <div className="text-xs text-red-600 mt-1">{err}</div>}
          </div>
          {user && (
            <Button kind="soft" className="h-9 text-sm" onClick={() => syncNow().then(() => toast('Selesai diselaraskan'))}>
              {status === 'syncing' ? <Spinner className="w-4 h-4" /> : <Icon.refresh className="w-4 h-4" />} Sync
            </Button>
          )}
        </div>

        {showCfg ? (
          <div className="space-y-3 rounded-2xl bg-cream-100 p-3">
            <Field label="Supabase Project URL">
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxxx.supabase.co" autoCapitalize="off" />
            </Field>
            <Field label="Supabase anon public key">
              <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="eyJhbGciOi…" autoCapitalize="off" />
            </Field>
            <Button className="w-full" onClick={connect} disabled={busy}>
              {busy ? <Spinner className="w-4 h-4" /> : <Icon.cloud className="w-4 h-4" />} Simpan sambungan
            </Button>
          </div>
        ) : (
          <button className="text-sm font-semibold text-sky" onClick={() => setShowCfg(true)}>
            Tukar tetapan sambungan
          </button>
        )}

        {status !== 'local' && !user && !showCfg && (
          <div className="space-y-3">
            <button
              onClick={async () => {
                setBusy(true);
                try {
                  await signInWithGoogle();
                } catch (e) {
                  toast((e as Error).message, 'err');
                  setBusy(false);
                }
                setTimeout(() => setBusy(false), 4000);
              }}
              disabled={busy}
              className="press w-full h-12 rounded-full bg-white border border-cream-300 shadow-soft flex items-center justify-center gap-3 font-semibold text-[15px] disabled:opacity-50"
            >
              <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden>
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
              </svg>
              Teruskan dengan Google
            </button>
            <div className="flex items-center gap-3 text-xs text-ink-3">
              <span className="flex-1 h-px bg-cream-300" />
              atau guna e-mel
              <span className="flex-1 h-px bg-cream-300" />
            </div>
            <Field label="E-mel">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoCapitalize="off" />
            </Field>
            <Field label="Kata laluan">
              <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login(false)} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Button kind="ghost" onClick={() => login(true)} disabled={busy}>
                Daftar akaun
              </Button>
              <Button onClick={() => login(false)} disabled={busy}>
                {busy && <Spinner className="w-4 h-4" />} Log masuk
              </Button>
            </div>
            <p className="text-xs text-ink-3">Gunakan akaun yang sama (contohnya akaun Google yang sama) di Web App dan APK supaya data diselaraskan.</p>
          </div>
        )}
        {user && (
          <Button
            kind="ghost"
            className="w-full"
            onClick={async () => {
              if (await confirmDialog({ title: 'Log keluar?', body: 'Data dalam peranti ini kekal. Penyelarasan akan berhenti sehingga anda log masuk semula.', ok: 'Log keluar' }))
                await signOut();
            }}
          >
            Log keluar
          </Button>
        )}
      </Card>
    </Section>
  );
}

function DataSection() {
  const [busy, setBusy] = useState<string | null>(null);
  const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');

  const backup = async (share: boolean) => {
    setBusy('b');
    try {
      const b = backupBlob(getState().data);
      const n = `StaffTimetable_Backup_${stamp()}.json`;
      toast(share ? await shareFile(b, n, 'Backup Staff Timetable') : await saveFile(b, n));
    } catch (e) {
      toast((e as Error).message, 'err');
    }
    setBusy(null);
  };
  const restore = async () => {
    const f = await pickFile('.json,application/json');
    if (!f) return;
    try {
      const d = parseBackup(await f.text());
      const ok = await confirmDialog({
        tone: 'warn',
        title: 'Restore database?',
        body: `Semua data semasa (termasuk dalam database awan) akan digantikan dengan backup: ${Object.keys(d.staff).length} staf, ${Object.keys(d.weeks).length} minggu.`,
        ok: 'Restore',
        danger: true
      });
      if (!ok) return;
      setBusy('r');
      await actions.replaceAll(d);
      toast('Data berjaya dipulihkan');
    } catch (e) {
      toast(`Restore gagal: ${(e as Error).message}`, 'err');
    }
    setBusy(null);
  };
  const exportStaff = async () => toast(await saveFile(staffCsv(getState().data), `StaffList_${stamp()}.csv`));
  const importStaff = async () => {
    const f = await pickFile('.csv,.txt,text/csv,text/plain');
    if (!f) return;
    try {
      const list = importStaffText(getState().data, await f.text());
      if (!list.length) return toast('Tiada nama dijumpai dalam fail', 'err');
      const ok = await confirmDialog({
        title: `Import ${list.length} staf?`,
        body: <div className="max-h-40 overflow-y-auto text-[13px]">{list.map((s) => s.name).join(', ')}</div>,
        ok: 'Import'
      });
      if (!ok) return;
      list.forEach((s) => actions.upsertStaff(s));
      toast(`${list.length} staf diimport`);
    } catch (e) {
      toast((e as Error).message, 'err');
    }
  };

  return (
    <Section title="Data" sub="Backup penuh (.json) dan senarai staf (.csv — boleh dibuka di Excel)">
      <Card className="p-2 divide-y divide-cream-200">
        <DataRow icon={<Icon.download />} t="Backup database" s="Simpan salinan penuh semua data" onClick={() => backup(false)} busy={busy === 'b'} />
        <DataRow icon={<Icon.share />} t="Kongsi backup" s="Hantar ke Drive, WhatsApp, e-mel" onClick={() => backup(true)} />
        <DataRow icon={<Icon.upload />} t="Restore database" s="Pulihkan daripada fail backup .json" onClick={restore} busy={busy === 'r'} />
        <DataRow icon={<Icon.xls />} t="Export data staf" s="Senarai staf sebagai CSV" onClick={exportStaff} />
        <DataRow icon={<Icon.users />} t="Import data staf" s="CSV atau .txt (satu nama setiap baris)" onClick={importStaff} />
      </Card>
    </Section>
  );
}

function DataRow({ icon, t, s, onClick, busy }: { icon: React.ReactNode; t: string; s: string; onClick: () => void; busy?: boolean }) {
  return (
    <button onClick={onClick} className="press w-full flex items-center gap-3 p-3 text-left rounded-2xl">
      <span className="w-10 h-10 rounded-xl bg-sky-50 text-sky grid place-items-center">{busy ? <Spinner className="w-4 h-4" /> : icon}</span>
      <span className="flex-1">
        <span className="block font-semibold text-[15px]">{t}</span>
        <span className="block text-xs text-ink-3">{s}</span>
      </span>
      <Icon.chevR className="w-4 h-4 text-ink-3" />
    </button>
  );
}
