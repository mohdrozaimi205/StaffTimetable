import React, { useState } from 'react';
import { actions, getState, useStore } from '../lib/store';
import { addDays, fmtRange, makeStaff, newWeek, normalizeName, poolRows } from '../lib/logic';
import { Button, Card, confirmDialog, Counter, Empty, Icon, IconBtn, Input, Sheet, toast } from '../components/ui';

export default function PoolPage() {
  const data = useStore((s) => s.data);
  const wk = data.settings.currentWeekId;
  const week = wk ? data.weeks[wk] : null;
  const rows = poolRows(data, wk);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const totalQuota = rows.reduce((n, r) => n + r.quota, 0);
  const totalUsed = rows.reduce((n, r) => n + r.used, 0);
  const totalRem = rows.reduce((n, r) => n + Math.max(0, r.remaining), 0);
  const pct = totalQuota ? Math.min(100, (totalUsed / totalQuota) * 100) : 0;

  const setQuota = (id: string, q: number) => {
    const s = getState().data.staff[id];
    actions.upsertStaff({ ...s, quota: Math.max(0, Math.min(99, q)) });
  };

  const add = () => {
    const n = normalizeName(name);
    if (!n) return;
    const ex = Object.values(data.staff).find((s) => s.name === n);
    if (ex && !ex.deleted && ex.inPool) return toast(`${n} sudah ada dalam pool`, 'info');
    if (ex) actions.upsertStaff({ ...ex, deleted: false, inPool: true, active: true });
    else actions.upsertStaff(makeStaff(n));
    toast(`${n} ditambah ke pool`);
    setName('');
    setAdding(false);
  };

  const remove = async (id: string) => {
    const s = data.staff[id];
    const ok = await confirmDialog({
      title: `Buang ${s.name} daripada pool?`,
      body: 'Nama kekal dalam senarai staf dan jadual. Hanya tidak dipaparkan dalam Weekly Staff Pool.',
      ok: 'Buang',
      danger: true
    });
    if (ok) {
      actions.upsertStaff({ ...s, inPool: false });
      toast(`${s.name} dibuang daripada pool`);
    }
  };

  const reset = async () => {
    if (!week) return;
    const start = addDays(week.endDate, 1);
    const ok = await confirmDialog({
      tone: 'warn',
      title: 'RESET WEEKLY POOL?',
      body: (
        <div className="space-y-2">
          <div>
            Minggu baharu akan dimulakan bermula <b>{start.split('-').reverse().join('/')}</b> dan semua baki kuota kembali penuh.
          </div>
          <div className="rounded-xl bg-sky-50 text-sky-700 px-3 py-2 text-[13px] font-medium">Jadual {fmtRange(week)} TIDAK dipadam — boleh dilihat dalam History.</div>
        </div>
      ),
      ok: 'Reset & mula minggu baharu'
    });
    if (!ok) return;
    let target = Object.values(data.weeks).find((w) => w.startDate === start);
    if (!target) {
      target = newWeek(start);
      actions.upsertWeek(target);
    }
    actions.saveSettings({ currentWeekId: target.id });
    toast(`Weekly Pool direset • ${fmtRange(target)}`);
  };

  return (
    <div className="page-in">
      <Card className="p-5 mb-4 overflow-hidden relative">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-sky/10" />
        <div className="text-xs font-semibold text-ink-3 uppercase tracking-wider">Jumlah baki tugasan</div>
        <div className="flex items-end gap-2 mt-1">
          <div className="text-5xl font-bold tabular-nums tracking-tight">{totalRem}</div>
          <div className="text-ink-3 mb-1.5">/ {totalQuota}</div>
        </div>
        <div className="text-sm text-ink-3 mt-0.5">{week ? fmtRange(week) : '—'}</div>
        <div className="h-2.5 rounded-full bg-cream-200 mt-4 overflow-hidden">
          <div className="h-full rounded-full bg-sky transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-ink-3 mt-1.5">
          <span>{totalUsed} telah dimasukkan</span>
          <span>{rows.length} staf dalam pool</span>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Button kind="soft" onClick={() => setAdding(true)}>
            <Icon.plus className="w-4 h-4" /> Add nama
          </Button>
          <Button kind="ghost" onClick={reset}>
            <Icon.refresh className="w-4 h-4" /> RESET WEEKLY POOL
          </Button>
        </div>
      </Card>

      <div className="flex items-center gap-3 text-xs text-ink-3 mb-2 ml-1">
        <Legend c="bg-emerald-400" l="Baki banyak" />
        <Legend c="bg-amber-400" l="Semakin sedikit" />
        <Legend c="bg-red-500" l="Kuota habis" />
      </div>

      {rows.length === 0 ? (
        <Card>
          <Empty icon={<Icon.pool className="w-6 h-6" />} title="Pool kosong" text="Tambah nama staf untuk memantau baki kuota mingguan." action={<Button onClick={() => setAdding(true)}>Add nama</Button>} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {rows.map((r) => (
            <Card key={r.staff.id} className="p-3 flex items-center gap-3">
              <Counter value={r.remaining} level={r.level} />
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{r.staff.name}</div>
                <div className="text-xs text-ink-3">
                  {r.used} / {r.quota} tugasan
                  {r.remaining < 0 && <span className="text-red-600 font-semibold"> • melebihi kuota</span>}
                  {!r.staff.active && <span> • tidak aktif</span>}
                </div>
              </div>
              <div className="flex items-center bg-cream-100 rounded-full p-0.5">
                <button className="press w-8 h-8 rounded-full font-bold" aria-label="Kurang kuota" onClick={() => setQuota(r.staff.id, r.quota - 1)}>
                  −
                </button>
                <span className="text-xs font-bold w-5 text-center tabular-nums" title="Kuota mingguan">
                  {r.quota}
                </span>
                <button className="press w-8 h-8 rounded-full font-bold" aria-label="Tambah kuota" onClick={() => setQuota(r.staff.id, r.quota + 1)}>
                  +
                </button>
              </div>
              <IconBtn label="Buang daripada pool" className="w-8 h-8 !bg-transparent text-ink-3 hover:!text-red-600" onClick={() => remove(r.staff.id)}>
                <Icon.x className="w-4 h-4" />
              </IconBtn>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add nama ke pool" footer={<Button className="w-full" onClick={add} disabled={!name.trim()}>Tambah</Button>}>
        <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Nama staf" />
        <p className="text-xs text-ink-3 mt-2">Kuota default: {data.settings.defaultQuota} tugasan seminggu (boleh diubah dalam Settings).</p>
      </Sheet>
    </div>
  );
}

function Legend({ c, l }: { c: string; l: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-full ${c}`} />
      {l}
    </span>
  );
}
