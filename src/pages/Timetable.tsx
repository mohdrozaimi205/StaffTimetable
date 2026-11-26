import React, { useEffect, useMemo, useState } from 'react';
import { actions, getState, useStore } from '../lib/store';
import { AppData, DAYS, DAYS_SHORT } from '../lib/types';
import {
  addDays,
  allSlots,
  dayDate,
  duplicateList,
  fmtDate,
  fmtRange,
  newWeek,
  shiftTime,
  slotKey,
  slotLabel,
  sortedWeeks
} from '../lib/logic';
import { SlotPicker } from '../components/assign';
import { CategoryEditor, changeRows, ShiftEditor } from '../components/layout';
import { Button, Card, confirmDialog, Empty, Icon, IconBtn, Input, Segmented, Sheet, Spinner, TextArea, toast } from '../components/ui';
import { fileBase, makePdf, makeXlsx, printTimetable, saveFile, shareFile } from '../lib/export';

type SheetName = null | 'more' | 'dates' | 'history' | 'notes' | 'layout' | 'dups' | 'share' | 'newweek';

export default function TimetablePage({ openSheet, onSheetOpened }: { openSheet?: string | null; onSheetOpened?: () => void }) {
  const data = useStore((s) => s.data);
  const currentId = data.settings.currentWeekId;
  const [viewId, setViewId] = useState<string | null>(currentId);
  const [slot, setSlot] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetName>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [mode, setMode] = useState<'day' | 'week'>(() => (typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'week' : 'day'));
  const [day, setDay] = useState(() => (new Date().getDay() + 6) % 7);

  useEffect(() => {
    if (!viewId || !data.weeks[viewId]) setViewId(currentId);
  }, [currentId, viewId, data.weeks]);
  useEffect(() => {
    if (openSheet) {
      setSheet(openSheet as SheetName);
      onSheetOpened?.();
    }
  }, [openSheet, onSheetOpened]);

  const week = viewId ? data.weeks[viewId] : null;
  const weeks = useMemo(() => sortedWeeks(data), [data]);
  const a = (viewId && data.assigns[viewId]) || {};
  const dups = useMemo(() => duplicateList(data.settings, a), [data.settings, a]);
  const dupIds = useMemo(() => new Set(dups.map((d) => d.staffId)), [dups]);

  if (!week || !viewId)
    return (
      <div className="pt-16 grid place-items-center text-ink-3">
        <Spinner />
      </div>
    );

  const idx = weeks.findIndex((w) => w.id === viewId);
  const older = weeks[idx + 1];
  const newer = weeks[idx - 1];
  const isCurrent = viewId === currentId;

  const run = async (label: string, fn: () => Promise<string | void>) => {
    setBusy(label);
    try {
      const m = await fn();
      if (m) toast(m);
    } catch (e) {
      console.error(e);
      toast(`Gagal: ${(e as Error).message}`, 'err');
    } finally {
      setBusy(null);
    }
  };
  const exportPdf = () => run('pdf', async () => saveFile(await makePdf(getState().data, viewId), fileBase(data, viewId) + '.pdf'));
  const exportXlsx = () => run('xlsx', async () => saveFile(await makeXlsx(getState().data, viewId), fileBase(data, viewId) + '.xlsx'));
  const doPrint = () => run('print', async () => printTimetable(getState().data, viewId));
  const sharePdf = () => run('spdf', async () => shareFile(await makePdf(getState().data, viewId), fileBase(data, viewId) + '.pdf'));
  const shareXlsx = () => run('sxlsx', async () => shareFile(await makeXlsx(getState().data, viewId), fileBase(data, viewId) + '.xlsx'));

  const duplicatePrev = async () => {
    const prev = weeks[idx + 1];
    if (!prev) return toast('Tiada jadual minggu sebelumnya', 'info');
    const src = data.assigns[prev.id] ?? {};
    if (!Object.keys(src).length) return toast('Jadual minggu sebelumnya kosong', 'info');
    if (Object.keys(a).length) {
      const ok = await confirmDialog({
        tone: 'warn',
        title: 'Ganti jadual minggu ini?',
        body: `Jadual ${fmtRange(week)} akan digantikan dengan salinan ${fmtRange(prev)}.`,
        ok: 'Ganti',
        danger: true
      });
      if (!ok) return;
    }
    actions.setAssignMany(viewId, src, true);
    toast(`Disalin daripada ${fmtRange(prev)}`);
    setSheet(null);
  };

  const copyToNext = async () => {
    const start = addDays(week.endDate, 1);
    let target = Object.values(data.weeks).find((w) => w.startDate === start);
    if (target && Object.keys(data.assigns[target.id] ?? {}).length) {
      const ok = await confirmDialog({
        tone: 'warn',
        title: 'Minggu seterusnya sudah ada jadual',
        body: `Jadual ${fmtRange(target)} akan digantikan dengan salinan minggu ini.`,
        ok: 'Ganti',
        danger: true
      });
      if (!ok) return;
    }
    if (!target) {
      target = newWeek(start);
      actions.upsertWeek(target);
    }
    actions.setAssignMany(target.id, a, true);
    setViewId(target.id);
    setSheet(null);
    toast(`Jadual disalin ke ${fmtRange(target)}`);
  };

  const makeCurrent = () => {
    actions.saveSettings({ currentWeekId: viewId });
    toast('Ditetapkan sebagai minggu semasa');
  };

  return (
    <div className="page-in">
      {/* Kepala minggu */}
      <Card className="p-3 sm:p-4 mb-3">
        <div className="flex items-center gap-2">
          <IconBtn label="Minggu sebelum" disabled={!older} onClick={() => older && setViewId(older.id)} className="disabled:opacity-30">
            <Icon.chevL className="w-5 h-5" />
          </IconBtn>
          <button className="flex-1 text-center press rounded-2xl py-1" onClick={() => setSheet('dates')}>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              {isCurrent ? 'Minggu semasa' : 'Jadual terdahulu'} <span className="text-sky">• edit tarikh</span>
            </div>
            <div className="font-bold text-[15px] sm:text-[17px]">{fmtRange(week)}</div>
          </button>
          <IconBtn label="Minggu selepas" disabled={!newer} onClick={() => newer && setViewId(newer.id)} className="disabled:opacity-30">
            <Icon.chevR className="w-5 h-5" />
          </IconBtn>
        </div>
        {!isCurrent && (
          <div className="mt-2 flex justify-center">
            <Button kind="soft" className="h-9 text-sm" onClick={makeCurrent}>
              Jadikan minggu semasa
            </Button>
          </div>
        )}
      </Card>

      {/* Bar tindakan */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-3 -mx-1 px-1 no-print">
        <Chip icon={busy === 'pdf' ? <Spinner className="w-4 h-4" /> : <Icon.pdf className="w-4 h-4" />} label="PDF" onClick={exportPdf} />
        <Chip icon={busy === 'xlsx' ? <Spinner className="w-4 h-4" /> : <Icon.xls className="w-4 h-4" />} label="Excel" onClick={exportXlsx} />
        <Chip icon={busy === 'print' ? <Spinner className="w-4 h-4" /> : <Icon.print className="w-4 h-4" />} label="Print" onClick={doPrint} />
        <Chip icon={<Icon.share className="w-4 h-4" />} label="Share" onClick={() => setSheet('share')} />
        <Chip
          icon={<Icon.warn className="w-4 h-4" />}
          label={`Bertindih${dups.length ? ` (${dups.length})` : ''}`}
          onClick={() => setSheet('dups')}
          tone={dups.length ? 'warn' : undefined}
        />
        <Chip icon={<Icon.note className="w-4 h-4" />} label="Catatan" onClick={() => setSheet('notes')} />
        <Chip icon={<Icon.more className="w-4 h-4" />} label="Lagi" onClick={() => setSheet('more')} />
      </div>

      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="w-56">
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { v: 'day', l: 'Harian' },
              { v: 'week', l: 'Mingguan' }
            ]}
          />
        </div>
        <div className="text-xs text-ink-3 text-right hidden sm:block">
          {data.settings.shifts.map((s) => (
            <div key={s.id}>
              {s.name}: {shiftTime(s)}
            </div>
          ))}
        </div>
      </div>

      {mode === 'day' ? (
        <DayView data={data} weekId={viewId} day={day} setDay={setDay} onSlot={setSlot} dupIds={dupIds} />
      ) : (
        <WeekGrid data={data} weekId={viewId} onSlot={setSlot} dupIds={dupIds} />
      )}

      {week.notes.trim() && (
        <Card className="p-4 mt-3" onClick={() => setSheet('notes')}>
          <div className="text-xs font-semibold text-ink-3 mb-1">CATATAN</div>
          <div className="text-sm whitespace-pre-wrap">{week.notes}</div>
        </Card>
      )}

      <SlotPicker weekId={viewId} slot={slot} onClose={() => setSlot(null)} />

      {/* Lagi */}
      <Sheet open={sheet === 'more'} onClose={() => setSheet(null)} title="Pengurusan Jadual">
        <div className="grid grid-cols-1 gap-2">
          <MenuItem icon={<Icon.copy />} title="Duplicate jadual minggu sebelumnya" sub="Salin nama dari minggu lepas ke minggu ini" onClick={duplicatePrev} />
          <MenuItem icon={<Icon.chevR />} title="Copy jadual ke minggu seterusnya" sub="Cipta/isi minggu berikutnya dengan jadual ini" onClick={copyToNext} />
          <MenuItem icon={<Icon.plus />} title="Minggu baharu" sub="Pilih tarikh mula untuk mana-mana minggu" onClick={() => setSheet('newweek')} />
          <MenuItem icon={<Icon.calendar />} title="Edit tarikh minggu" sub="Week start date & week end date" onClick={() => setSheet('dates')} />
          <MenuItem icon={<Icon.history />} title="History" sub="Lihat & buka jadual terdahulu" onClick={() => setSheet('history')} />
          <MenuItem icon={<Icon.layers />} title="Kategori, ruangan & waktu shift" sub="Tambah kategori, tambah/padam ruangan, edit masa" onClick={() => setSheet('layout')} />
          <MenuItem
            icon={<Icon.trash />}
            title="Kosongkan semua nama minggu ini"
            sub="Rekod minggu lain tidak terjejas"
            danger
            onClick={async () => {
              if (!Object.keys(a).length) return toast('Jadual sudah kosong', 'info');
              const ok = await confirmDialog({ tone: 'warn', title: 'Kosongkan jadual minggu ini?', body: fmtRange(week), ok: 'Kosongkan', danger: true });
              if (ok) {
                actions.setAssignMany(viewId, {}, true);
                setSheet(null);
                toast('Jadual dikosongkan');
              }
            }}
          />
        </div>
      </Sheet>

      <Sheet open={sheet === 'share'} onClose={() => setSheet(null)} title="Share jadual">
        <p className="text-sm text-ink-3 mb-3">Kongsi melalui WhatsApp, Telegram, e-mel atau aplikasi lain.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button kind="soft" onClick={sharePdf} disabled={!!busy}>
            {busy === 'spdf' ? <Spinner className="w-4 h-4" /> : <Icon.pdf className="w-4 h-4" />} PDF
          </Button>
          <Button kind="soft" onClick={shareXlsx} disabled={!!busy}>
            {busy === 'sxlsx' ? <Spinner className="w-4 h-4" /> : <Icon.xls className="w-4 h-4" />} Excel
          </Button>
        </div>
      </Sheet>

      <DatesSheet open={sheet === 'dates'} onClose={() => setSheet(null)} weekId={viewId} />
      <NewWeekSheet
        open={sheet === 'newweek'}
        onClose={() => setSheet(null)}
        onCreated={(id) => {
          setViewId(id);
          setSheet(null);
        }}
        fromId={viewId}
      />
      <NotesSheet open={sheet === 'notes'} onClose={() => setSheet(null)} weekId={viewId} />

      <Sheet open={sheet === 'history'} onClose={() => setSheet(null)} title="History jadual">
        <div className="space-y-2">
          {weeks.map((w) => {
            const n = Object.keys(data.assigns[w.id] ?? {}).length;
            return (
              <div key={w.id} className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 ${w.id === viewId ? 'bg-sky-50 ring-1 ring-sky/40' : 'bg-cream-50'}`}>
                <button
                  className="flex-1 text-left press"
                  onClick={() => {
                    setViewId(w.id);
                    setSheet(null);
                  }}
                >
                  <div className="font-semibold text-[15px]">{fmtRange(w)}</div>
                  <div className="text-xs text-ink-3">
                    {n} tugasan {w.id === currentId && <span className="text-sky font-semibold">• Minggu semasa</span>}
                  </div>
                </button>
                <IconBtn
                  label="Padam minggu"
                  className="!bg-red-50 !text-red-600 w-9 h-9"
                  onClick={async () => {
                    if (weeks.length <= 1) return toast('Mesti ada sekurang-kurangnya satu minggu', 'info');
                    const ok = await confirmDialog({
                      tone: 'warn',
                      title: 'Padam jadual minggu ini?',
                      body: `${fmtRange(w)} • ${n} tugasan akan dipadam secara kekal.`,
                      ok: 'Padam',
                      danger: true
                    });
                    if (ok) {
                      actions.deleteWeek(w.id);
                      toast('Minggu dipadam');
                    }
                  }}
                >
                  <Icon.trash className="w-4 h-4" />
                </IconBtn>
              </div>
            );
          })}
        </div>
      </Sheet>

      <Sheet open={sheet === 'layout'} onClose={() => setSheet(null)} title="Kategori & Waktu Shift">
        <div className="text-xs font-semibold text-ink-3 mb-2 ml-1">WAKTU SHIFT</div>
        <ShiftEditor />
        <div className="text-xs font-semibold text-ink-3 mt-5 mb-2 ml-1">KATEGORI TUGASAN & BILANGAN RUANGAN</div>
        <CategoryEditor />
      </Sheet>

      <Sheet open={sheet === 'dups'} onClose={() => setSheet(null)} title="Senarai nama bertindih">
        <p className="text-xs text-ink-3 mb-3">
          Skop semakan: {data.settings.duplicateScope === 'week' ? 'sepanjang minggu' : 'hari yang sama'} (boleh ditukar di Settings).
        </p>
        {dups.length === 0 ? (
          <Empty icon={<Icon.check />} title="Tiada nama bertindih" text="Setiap staf hanya mempunyai satu tugasan." />
        ) : (
          <div className="space-y-2.5">
            {dups.map((d) => (
              <div key={d.staffId} className="rounded-2xl bg-cream-50 border border-cream-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold">{data.staff[d.staffId]?.name ?? '(dipadam)'}</div>
                  <span className="text-xs font-bold rounded-full bg-amber-100 text-amber-700 px-2.5 py-1">{d.keys.length} tugasan</span>
                </div>
                <ul className="mt-2 space-y-1">
                  {d.keys.map((k) => (
                    <li key={k}>
                      <button
                        className="press w-full text-left text-[13px] rounded-xl bg-white px-3 py-1.5 hover:bg-sky-50"
                        onClick={() => {
                          setSheet(null);
                          setSlot(k);
                        }}
                      >
                        {slotLabel(data.settings, k)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </div>
  );
}

function Chip({ icon, label, onClick, tone }: { icon: React.ReactNode; label: string; onClick: () => void; tone?: 'warn' }) {
  return (
    <button
      onClick={onClick}
      className={`press shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-semibold shadow-soft border ${
        tone === 'warn' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-cream-50 text-ink border-cream-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MenuItem({ icon, title, sub, onClick, danger }: { icon: React.ReactNode; title: string; sub?: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`press flex items-center gap-3 rounded-2xl p-3 text-left ${danger ? 'bg-red-50 text-red-600' : 'bg-cream-50 hover:bg-white'}`}>
      <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${danger ? 'bg-red-100' : 'bg-sky-50 text-sky'}`}>{icon}</span>
      <span className="min-w-0">
        <span className="block font-semibold text-[15px]">{title}</span>
        {sub && <span className={`block text-xs ${danger ? 'text-red-500' : 'text-ink-3'}`}>{sub}</span>}
      </span>
    </button>
  );
}

function SlotBtn({ name, deleted, dup, onClick, compact }: { name?: string; deleted?: boolean; dup?: boolean; onClick: () => void; compact?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`press relative w-full rounded-xl border text-center font-semibold transition ${compact ? 'min-h-[38px] px-1 text-[12px]' : 'min-h-[46px] px-2 text-[14px]'} ${
        name
          ? `bg-white border-cream-200 text-ink shadow-[0_1px_0_rgba(0,0,0,.03)] slot-pop ${deleted ? 'line-through text-ink-3' : ''}`
          : 'bg-transparent border-dashed border-cream-300 text-ink-3/60 hover:border-sky hover:text-sky'
      }`}
    >
      {name ?? <Icon.plus className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} mx-auto`} />}
      {dup && name && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" title="Nama bertindih" />}
    </button>
  );
}

function DayView({
  data,
  weekId,
  day,
  setDay,
  onSlot,
  dupIds
}: {
  data: AppData;
  weekId: string;
  day: number;
  setDay: (d: number) => void;
  onSlot: (k: string) => void;
  dupIds: Set<string>;
}) {
  const week = data.weeks[weekId];
  const a = data.assigns[weekId] ?? {};
  const { shifts, categories } = data.settings;
  const filled = (d: number) => {
    const s = allSlots(data.settings).filter((x) => x.day === d);
    return [s.filter((x) => a[slotKey(x)]).length, s.length];
  };
  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 mb-3">
        {DAYS_SHORT.map((d, i) => {
          const [f, t] = filled(i);
          return (
            <button
              key={d}
              onClick={() => setDay(i)}
              className={`press rounded-2xl py-2 text-center transition-colors ${i === day ? 'bg-sky text-offwhite shadow-soft' : 'bg-cream-50 text-ink border border-cream-200'}`}
            >
              <div className="text-[11px] font-semibold opacity-80">{d}</div>
              <div className="text-[15px] font-bold leading-tight">{dayDate(week, i).split(' ')[0]}</div>
              <div className={`mx-auto mt-1 h-1 w-6 rounded-full ${i === day ? 'bg-offwhite/40' : 'bg-cream-200'}`}>
                <div className={`h-1 rounded-full ${i === day ? 'bg-offwhite' : 'bg-sky'}`} style={{ width: `${t ? (f / t) * 100 : 0}%` }} />
              </div>
            </button>
          );
        })}
      </div>
      <Card className="overflow-hidden">
        <div className="bg-sky text-offwhite px-4 py-3 flex items-center justify-between">
          <div className="font-bold text-[17px]">{DAYS[day]}</div>
          <div className="text-sm opacity-90">{dayDate(week, day)}</div>
        </div>
        <div className="grid grid-cols-[88px_1fr_1fr] sm:grid-cols-[120px_1fr_1fr] gap-2 px-3 pt-3 text-center">
          <div />
          {shifts.map((s) => (
            <div key={s.id} className="rounded-xl bg-sky-50 py-1.5">
              <div className="text-[13px] font-bold text-sky-700">{s.name}</div>
              <div className="text-[11px] text-ink-3">{shiftTime(s)}</div>
            </div>
          ))}
        </div>
        <div className="p-3 space-y-3">
          {categories.map((c) => (
            <div key={c.id} className="grid grid-cols-[88px_1fr_1fr] sm:grid-cols-[120px_1fr_1fr] gap-2 items-start">
              <div className="pt-2.5">
                <div className="font-bold text-[13px] sm:text-[14px] leading-tight">{c.name}</div>
                <div className="flex gap-1 mt-1.5">
                  <button className="press w-6 h-6 rounded-full bg-cream-100 text-xs font-bold" aria-label={`Kurang ruangan ${c.name}`} onClick={() => changeRows(c.id, -1)}>
                    −
                  </button>
                  <button className="press w-6 h-6 rounded-full bg-cream-100 text-xs font-bold" aria-label={`Tambah ruangan ${c.name}`} onClick={() => changeRows(c.id, 1)}>
                    +
                  </button>
                </div>
              </div>
              {c.mode === 'day' ? (
                <div className="col-span-2 space-y-1.5">
                  {Array.from({ length: c.rows }, (_, row) => {
                    const k = slotKey({ day, shiftId: 'day', categoryId: c.id, row });
                    const st = data.staff[a[k]];
                    return <SlotBtn key={k} name={st?.name} deleted={st?.deleted} dup={st && dupIds.has(st.id)} onClick={() => onSlot(k)} />;
                  })}
                </div>
              ) : (
                shifts.map((s) => (
                  <div key={s.id} className="space-y-1.5">
                    {Array.from({ length: c.rows }, (_, row) => {
                      const k = slotKey({ day, shiftId: s.id, categoryId: c.id, row });
                      const st = data.staff[a[k]];
                      return <SlotBtn key={k} name={st?.name} deleted={st?.deleted} dup={st && dupIds.has(st.id)} onClick={() => onSlot(k)} />;
                    })}
                  </div>
                ))
              )}
            </div>
          ))}
          {week.dayNotes?.[day]?.trim() && (
            <div className="rounded-2xl bg-cream-100 px-3 py-2 text-sm">
              <span className="font-semibold">Catatan: </span>
              {week.dayNotes[day]}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function WeekGrid({ data, weekId, onSlot, dupIds }: { data: AppData; weekId: string; onSlot: (k: string) => void; dupIds: Set<string> }) {
  const week = data.weeks[weekId];
  const a = data.assigns[weekId] ?? {};
  const { shifts, categories } = data.settings;
  const nS = shifts.length;
  const cols = `104px repeat(${7 * nS}, minmax(62px, 1fr))`;
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[1020px] p-2">
          <div className="grid gap-1" style={{ gridTemplateColumns: cols }}>
            <div className="rounded-xl bg-sky-700 text-offwhite text-xs font-bold grid place-items-center">Day</div>
            {DAYS.map((d, i) => (
              <div key={d} className="rounded-xl bg-sky text-offwhite text-center py-1.5" style={{ gridColumn: `span ${nS}` }}>
                <div className="font-bold text-[13px]">{d}</div>
                <div className="text-[11px] opacity-85">{dayDate(week, i)}</div>
              </div>
            ))}
            <div className="rounded-xl bg-sky-100 text-[11px] font-bold grid place-items-center">Shift / Time</div>
            {DAYS.flatMap((_, i) =>
              shifts.map((s) => (
                <div key={`${i}${s.id}`} className="rounded-xl bg-sky-50 text-center py-1">
                  <div className="text-[12px] font-bold text-sky-700">{s.name}</div>
                  <div className="text-[10px] text-ink-3 leading-tight">{shiftTime(s)}</div>
                </div>
              ))
            )}
            {categories.map((c) =>
              Array.from({ length: c.rows }, (_, row) => (
                <React.Fragment key={`${c.id}${row}`}>
                  {row === 0 ? (
                    <div className="rounded-xl bg-cream-100 px-2 py-2 font-bold text-[13px] flex flex-col justify-center" style={{ gridRow: `span ${c.rows}` }}>
                      {c.name}
                      <span className="flex gap-1 mt-1">
                        <button className="press w-5 h-5 rounded-full bg-white text-[11px] font-bold" aria-label={`Kurang ruangan ${c.name}`} onClick={() => changeRows(c.id, -1)}>
                          −
                        </button>
                        <button className="press w-5 h-5 rounded-full bg-white text-[11px] font-bold" aria-label={`Tambah ruangan ${c.name}`} onClick={() => changeRows(c.id, 1)}>
                          +
                        </button>
                      </span>
                    </div>
                  ) : null}
                  {DAYS.map((_, day) =>
                    c.mode === 'day' ? (
                      (() => {
                        const k = slotKey({ day, shiftId: 'day', categoryId: c.id, row });
                        const st = data.staff[a[k]];
                        return (
                          <div key={k} style={{ gridColumn: `span ${nS}` }}>
                            <SlotBtn compact name={st?.name} deleted={st?.deleted} dup={st && dupIds.has(st.id)} onClick={() => onSlot(k)} />
                          </div>
                        );
                      })()
                    ) : (
                      shifts.map((s) => {
                        const k = slotKey({ day, shiftId: s.id, categoryId: c.id, row });
                        const st = data.staff[a[k]];
                        return <SlotBtn key={k} compact name={st?.name} deleted={st?.deleted} dup={st && dupIds.has(st.id)} onClick={() => onSlot(k)} />;
                      })
                    )
                  )}
                </React.Fragment>
              ))
            )}
            {week.dayNotes?.some((n) => n.trim()) && (
              <>
                <div className="rounded-xl bg-cream-100 px-2 py-2 font-bold text-[13px]">Notes</div>
                {week.dayNotes.map((n, i) => (
                  <div key={i} className="text-[11px] italic text-ink-2 px-1.5 py-1 rounded-xl bg-cream-50" style={{ gridColumn: `span ${nS}` }}>
                    {n}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function DatesSheet({ open, onClose, weekId }: { open: boolean; onClose: () => void; weekId: string }) {
  const w = useStore((s) => s.data.weeks[weekId]);
  const [start, setStart] = useState(w?.startDate ?? '');
  const [end, setEnd] = useState(w?.endDate ?? '');
  useEffect(() => {
    if (open && w) {
      setStart(w.startDate);
      setEnd(w.endDate);
    }
  }, [open, w]);
  const save = () => {
    if (!start || !end) return toast('Sila isi kedua-dua tarikh', 'err');
    if (end < start) return toast('Tarikh tamat mesti selepas tarikh mula', 'err');
    actions.upsertWeek({ ...w, startDate: start, endDate: end });
    toast('Tarikh minggu dikemas kini');
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Edit tarikh minggu" footer={<Button className="w-full" onClick={save}>Simpan</Button>}>
      <div className="space-y-3">
        <label className="block">
          <div className="text-[13px] font-semibold text-ink-3 mb-1.5 ml-1">WEEK START DATE</div>
          <Input
            type="date"
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              if (e.target.value) setEnd(addDays(e.target.value, 6));
            }}
          />
        </label>
        <label className="block">
          <div className="text-[13px] font-semibold text-ink-3 mb-1.5 ml-1">WEEK END DATE</div>
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <p className="text-xs text-ink-3">Tarikh tamat diisi automatik 6 hari selepas tarikh mula, tetapi boleh diubah.</p>
      </div>
    </Sheet>
  );
}

function NewWeekSheet({ open, onClose, onCreated, fromId }: { open: boolean; onClose: () => void; onCreated: (id: string) => void; fromId: string }) {
  const data = useStore((s) => s.data);
  const latest = sortedWeeks(data)[0];
  const [start, setStart] = useState('');
  const [copy, setCopy] = useState<'empty' | 'copy'>('empty');
  const [cur, setCur] = useState(true);
  useEffect(() => {
    if (open) setStart(latest ? addDays(latest.endDate, 1) : '');
  }, [open, latest]);
  const create = () => {
    if (!start) return toast('Pilih tarikh mula', 'err');
    const ex = Object.values(data.weeks).find((w) => w.startDate === start);
    if (ex) {
      toast(`Minggu ${fmtDate(start)} sudah wujud — dibuka`, 'info');
      if (cur) actions.saveSettings({ currentWeekId: ex.id });
      return onCreated(ex.id);
    }
    const w = newWeek(start);
    actions.upsertWeek(w);
    if (copy === 'copy') actions.setAssignMany(w.id, data.assigns[fromId] ?? {}, true);
    if (cur) actions.saveSettings({ currentWeekId: w.id });
    toast(`Minggu ${fmtRange(w)} dicipta`);
    onCreated(w.id);
  };
  return (
    <Sheet open={open} onClose={onClose} title="Minggu baharu" footer={<Button className="w-full" onClick={create}>Cipta minggu</Button>}>
      <div className="space-y-4">
        <label className="block">
          <div className="text-[13px] font-semibold text-ink-3 mb-1.5 ml-1">WEEK START DATE</div>
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          {start && <div className="text-xs text-ink-3 mt-1 ml-1">Tamat: {fmtDate(addDays(start, 6))}</div>}
        </label>
        <Segmented
          value={copy}
          onChange={setCopy}
          options={[
            { v: 'empty', l: 'Jadual kosong' },
            { v: 'copy', l: 'Salin jadual dipapar' }
          ]}
        />
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={cur} onChange={(e) => setCur(e.target.checked)} className="w-5 h-5 accent-sky-500" />
          Jadikan minggu semasa (Weekly Pool dikira daripada minggu ini)
        </label>
      </div>
    </Sheet>
  );
}

function NotesSheet({ open, onClose, weekId }: { open: boolean; onClose: () => void; weekId: string }) {
  const w = useStore((s) => s.data.weeks[weekId]);
  const [notes, setNotes] = useState('');
  const [dn, setDn] = useState<string[]>([]);
  useEffect(() => {
    if (open && w) {
      setNotes(w.notes);
      setDn(w.dayNotes?.length === 7 ? [...w.dayNotes] : ['', '', '', '', '', '', '']);
    }
  }, [open, w]);
  const save = () => {
    actions.upsertWeek({ ...w, notes, dayNotes: dn });
    toast('Catatan disimpan');
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Catatan" footer={<Button className="w-full" onClick={save}>Simpan catatan</Button>}>
      <div className="space-y-3">
        <div>
          <div className="text-[13px] font-semibold text-ink-3 mb-1.5 ml-1">CATATAN MINGGU INI</div>
          <TextArea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contoh: Mesyuarat staf hari Rabu 3 PM" />
        </div>
        <div className="text-[13px] font-semibold text-ink-3 ml-1">CATATAN HARIAN</div>
        {DAYS.map((d, i) => (
          <label key={d} className="flex items-center gap-2">
            <span className="w-12 text-sm font-semibold">{DAYS_SHORT[i]}</span>
            <Input value={dn[i] ?? ''} onChange={(e) => setDn(dn.map((x, j) => (j === i ? e.target.value : x)))} placeholder="—" />
          </label>
        ))}
      </div>
    </Sheet>
  );
}
