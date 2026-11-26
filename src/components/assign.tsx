// Pemilih nama staf untuk satu ruangan + aliran amaran pertindihan/kuota
import React, { useMemo, useState } from 'react';
import { actions, getState, useStore } from '../lib/store';
import { conflictsFor, countByStaff, makeStaff, normalizeName, parseKey, quotaOf, remainingLevel, slotLabel } from '../lib/logic';
import { Button, confirmDialog, Counter, Icon, Input, Sheet, toast } from './ui';

/** Tetapkan staf ke ruangan dengan semakan pertindihan & kuota. Pulangkan true jika dimasukkan. */
export async function assignWithCheck(weekId: string, key: string, staffId: string): Promise<boolean> {
  const d = getState().data;
  const a = d.assigns[weekId] ?? {};
  if (a[key] === staffId) return true;
  const st = d.staff[staffId];
  const conflicts = conflictsFor(d.settings, a, staffId, key);
  const counts = countByStaff(d.settings, a);
  const usedOther = (counts[staffId] ?? 0) - (a[key] === staffId ? 1 : 0);
  const quota = quotaOf(st, d.settings);
  const over = usedOther + 1 > quota;

  if (conflicts.length || over) {
    const ok = await confirmDialog({
      tone: 'warn',
      title: conflicts.length ? 'STAFF NAME ALREADY ASSIGNED!' : 'KUOTA MINGGUAN TELAH HABIS',
      body: (
        <div className="space-y-3">
          <div>
            <span className="text-ink-3">Name: </span>
            <b className="text-ink">{st.name}</b>
          </div>
          {conflicts.length > 0 && (
            <div>
              <div className="text-ink-3 text-[13px] font-semibold">Existing Assignment{conflicts.length > 1 ? `s (${conflicts.length})` : ''}:</div>
              <ul className="mt-1 max-h-40 overflow-y-auto space-y-1">
                {conflicts.map((k) => (
                  <li key={k} className="rounded-xl bg-cream-100 px-3 py-1.5 text-[13px] font-medium text-ink">
                    {slotLabel(d.settings, k)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <div className="text-ink-3 text-[13px] font-semibold">New Assignment:</div>
            <div className="mt-1 rounded-xl bg-sky-50 px-3 py-1.5 text-[13px] font-semibold text-sky-700">{slotLabel(d.settings, key)}</div>
          </div>
          {conflicts.length > 0 && <div className="text-[13px]">Message: "Nama staf ini sudah mempunyai tugasan dalam jadual."</div>}
          {over && (
            <div className="rounded-xl bg-red-50 text-red-600 px-3 py-2 text-[13px] font-medium">
              Kuota mingguan {st.name} ialah {quota}. Tugasan ini menjadikan jumlahnya {usedOther + 1}.
            </div>
          )}
        </div>
      ),
      cancel: 'CANCEL',
      ok: 'CONTINUE ANYWAY'
    });
    if (!ok) return false;
  }
  actions.setAssign(weekId, key, staffId);
  return true;
}

export function SlotPicker({ weekId, slot, onClose }: { weekId: string; slot: string | null; onClose: () => void }) {
  const [q, setQ] = useState('');
  const d = useStore((s) => s.data);
  const a = d.assigns[weekId] ?? {};
  const cur = slot ? a[slot] : undefined;
  const info = slot ? parseKey(slot) : null;
  const counts = useMemo(() => countByStaff(d.settings, a), [d.settings, a]);

  const list = useMemo(() => {
    const n = q.trim().toUpperCase();
    return Object.values(d.staff)
      .filter((s) => !s.deleted && s.active && (!n || s.name.includes(n)))
      .sort((x, y) => {
        const cx = info && x.categoryIds.includes(info.categoryId) ? 0 : 1;
        const cy = info && y.categoryIds.includes(info.categoryId) ? 0 : 1;
        return cx - cy || x.name.localeCompare(y.name);
      });
  }, [d.staff, q, info]);

  const exact = Object.values(d.staff).some((s) => !s.deleted && s.name === normalizeName(q));

  const pick = async (id: string) => {
    if (!slot) return;
    const ok = await assignWithCheck(weekId, slot, id);
    if (ok) {
      setQ('');
      onClose();
    }
  };
  const addNew = async () => {
    const name = normalizeName(q);
    if (!name) return;
    const st = makeStaff(name);
    actions.upsertStaff(st);
    toast(`${name} ditambah ke senarai staf`);
    await pick(st.id);
  };

  return (
    <Sheet
      open={!!slot}
      onClose={() => {
        setQ('');
        onClose();
      }}
      title={slot ? slotLabel(d.settings, slot) : ''}
      footer={
        cur ? (
          <Button
            kind="danger"
            className="w-full"
            onClick={() => {
              actions.setAssign(weekId, slot!, null);
              toast('Nama dipadam daripada ruangan');
              onClose();
            }}
          >
            <Icon.trash className="w-4 h-4" /> Kosongkan ruangan ({d.staff[cur]?.name})
          </Button>
        ) : undefined
      }
    >
      <div className="relative mb-3 sticky top-0 bg-cream pt-1 pb-2 z-10">
        <Icon.search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
        <Input autoFocus placeholder="Cari nama staf…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
      </div>
      {q.trim() && !exact && (
        <button onClick={addNew} className="press w-full flex items-center gap-3 rounded-2xl bg-sky-50 text-sky-700 px-4 py-3 mb-2 font-semibold text-left">
          <Icon.plus className="w-5 h-5" /> Tambah "{normalizeName(q)}" sebagai staf baharu
        </button>
      )}
      {list.length === 0 && !q && (
        <div className="text-center text-sm text-ink-3 py-8">Belum ada staf aktif. Taip nama di atas untuk tambah staf baharu.</div>
      )}
      <div className="space-y-1.5">
        {list.map((s) => {
          const quota = quotaOf(s, d.settings);
          const rem = quota - (counts[s.id] ?? 0);
          const match = info && s.categoryIds.includes(info.categoryId);
          return (
            <button
              key={s.id}
              onClick={() => pick(s.id)}
              className={`press w-full flex items-center gap-3 rounded-2xl px-4 py-2.5 text-left ${cur === s.id ? 'bg-sky text-offwhite' : 'bg-cream-50 hover:bg-white'}`}
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{s.name}</div>
                <div className={`text-xs ${cur === s.id ? 'text-offwhite/80' : 'text-ink-3'}`}>
                  {match ? 'Sesuai kategori ini • ' : ''}
                  {counts[s.id] ?? 0} tugasan minggu ini
                </div>
              </div>
              {cur === s.id ? <Icon.check className="w-5 h-5" /> : <Counter size="sm" value={rem} level={remainingLevel(rem, quota)} />}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
