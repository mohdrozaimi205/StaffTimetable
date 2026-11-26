import React, { useMemo } from 'react';
import { useStore } from '../lib/store';
import { DAYS } from '../lib/types';
import { allSlots, dayDate, duplicateList, fmtRange, incompleteShifts, poolRows, slotKey, visibleAssignments } from '../lib/logic';
import { Button, Card, Icon } from '../components/ui';

export default function HomePage({ go }: { go: (tab: number, sheet?: string) => void }) {
  const data = useStore((s) => s.data);
  const wk = data.settings.currentWeekId;
  const week = wk ? data.weeks[wk] : null;
  const a = (wk && data.assigns[wk]) || {};

  const stats = useMemo(() => {
    const active = Object.values(data.staff).filter((s) => !s.deleted && s.active).length;
    const assigned = visibleAssignments(data.settings, a).length;
    const pool = poolRows(data, wk);
    const remaining = pool.reduce((n, r) => n + Math.max(0, r.remaining), 0);
    const dups = duplicateList(data.settings, a);
    const inc = incompleteShifts(data.settings, a);
    return { active, assigned, remaining, dups, inc };
  }, [data, a, wk]);

  const summary = useMemo(
    () =>
      DAYS.map((_, day) => {
        const slots = allSlots(data.settings).filter((s) => s.day === day);
        const filled = slots.filter((s) => a[slotKey(s)]).length;
        const leaderCat = data.settings.categories.find((c) => /leader/i.test(c.name));
        const leaders = slots
          .filter((s) => s.categoryId === leaderCat?.id && a[slotKey(s)])
          .map((s) => data.staff[a[slotKey(s)]]?.name)
          .filter(Boolean);
        return { day, filled, total: slots.length, leaders };
      }),
    [data, a]
  );

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Selamat pagi' : hour < 15 ? 'Selamat tengah hari' : hour < 19 ? 'Selamat petang' : 'Selamat malam';
  const todayIdx = week ? Math.floor((Date.now() - new Date(week.startDate + 'T00:00').getTime()) / 86400000) : -1;

  return (
    <div className="page-in">
      <Card className="p-5 mb-4 bg-gradient-to-br from-sky to-sky-600 !border-transparent text-offwhite overflow-hidden relative">
        <div className="absolute -right-8 -bottom-12 w-44 h-44 rounded-full bg-white/10" />
        <div className="absolute right-16 -top-10 w-24 h-24 rounded-full bg-white/10" />
        <div className="relative">
          <div className="text-sm opacity-90">{greet} 👋</div>
          <div className="text-xs uppercase tracking-wider opacity-80 mt-3">Current Week</div>
          <div className="text-2xl font-bold tracking-tight">{week ? fmtRange(week) : '—'}</div>
          <div className="text-sm opacity-90 mt-0.5">{data.settings.orgName}</div>
          <Button className="mt-4 !bg-offwhite !text-sky-700" onClick={() => go(1)}>
            <Icon.table className="w-4 h-4" /> Buka jadual semasa
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <Stat icon={<Icon.users />} label="Total Active Staff" value={stats.active} onClick={() => go(2)} />
        <Stat icon={<Icon.table />} label="Total Assigned Shifts" value={stats.assigned} onClick={() => go(1)} />
        <Stat icon={<Icon.pool />} label="Remaining Weekly Assignments" value={stats.remaining} onClick={() => go(3)} />
        <Stat icon={<Icon.warn />} label="Duplicate Name Warnings" value={stats.dups.length} tone={stats.dups.length ? 'warn' : undefined} onClick={() => go(1, 'dups')} />
        <Stat icon={<Icon.clock />} label="Incomplete Shifts" value={stats.inc.length} tone={stats.inc.length ? 'warn' : undefined} onClick={() => go(1)} />
        <Stat icon={<Icon.calendar />} label="Minggu dalam History" value={Object.keys(data.weeks).length} onClick={() => go(1, 'history')} />
      </div>

      <div className="flex items-center justify-between mb-2 ml-1">
        <div className="font-bold text-[17px]">Ringkasan mingguan</div>
        <button className="text-sm font-semibold text-sky" onClick={() => go(1)}>
          Lihat semua
        </button>
      </div>
      <Card className="divide-y divide-cream-200">
        {summary.map((s) => {
          const pct = s.total ? (s.filled / s.total) * 100 : 0;
          return (
            <button key={s.day} onClick={() => go(1)} className="press w-full flex items-center gap-3 px-4 py-3 text-left">
              <div className={`w-12 h-12 rounded-2xl grid place-items-center shrink-0 ${s.day === todayIdx ? 'bg-sky text-offwhite' : 'bg-cream-100'}`}>
                <div className="text-center leading-tight">
                  <div className="text-[10px] font-semibold opacity-80">{DAYS[s.day].slice(0, 3)}</div>
                  <div className="font-bold">{week ? dayDate(week, s.day).split(' ')[0] : ''}</div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold truncate">{s.leaders.length ? `Leader: ${s.leaders.join(', ')}` : 'Leader belum ditetapkan'}</span>
                  <span className="text-ink-3 tabular-nums shrink-0 ml-2">
                    {s.filled}/{s.total}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-cream-200 mt-2 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-sky'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            </button>
          );
        })}
      </Card>
    </div>
  );
}

function Stat({ icon, label, value, onClick, tone }: { icon: React.ReactNode; label: string; value: number; onClick?: () => void; tone?: 'warn' }) {
  return (
    <Card className="p-4" onClick={onClick}>
      <div className={`w-10 h-10 rounded-2xl grid place-items-center mb-3 ${tone === 'warn' ? 'bg-amber-100 text-amber-600' : 'bg-sky-50 text-sky'}`}>{icon}</div>
      <div className="text-3xl font-bold tabular-nums tracking-tight">{value}</div>
      <div className="text-[12px] text-ink-3 font-medium leading-tight mt-0.5">{label}</div>
    </Card>
  );
}
