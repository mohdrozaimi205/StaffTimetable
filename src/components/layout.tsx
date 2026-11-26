// Penyunting kategori tugasan & waktu shift (digunakan di Timetable dan Settings)
import React, { useState } from 'react';
import { actions, getState, useStore } from '../lib/store';
import { Category } from '../lib/types';
import { shiftTime, uid } from '../lib/logic';
import { Button, confirmDialog, Icon, IconBtn, Input, Segmented, toast } from './ui';

function assignmentsInCategory(catId: string, minRow = 0): number {
  const d = getState().data;
  let n = 0;
  for (const a of Object.values(d.assigns))
    for (const k of Object.keys(a)) {
      const [, , c, r] = k.split('|');
      if (c === catId && Number(r) >= minRow) n++;
    }
  return n;
}

export async function changeRows(catId: string, delta: number) {
  const s = getState().data.settings;
  const cats = s.categories.map((c) => ({ ...c }));
  const c = cats.find((x) => x.id === catId);
  if (!c) return;
  const next = c.rows + delta;
  if (next < 1) return toast('Kategori mesti ada sekurang-kurangnya 1 ruangan', 'info');
  if (next > 12) return toast('Maksimum 12 ruangan', 'info');
  if (delta < 0) {
    const n = assignmentsInCategory(catId, next);
    if (n > 0) {
      const ok = await confirmDialog({
        tone: 'warn',
        title: 'Padam ruangan tugasan?',
        body: `Ruangan terakhir ${c.name} mempunyai ${n} nama dalam jadual. Nama tersebut akan disembunyikan (rekod tidak dipadam dan akan muncul semula jika ruangan ditambah).`,
        ok: 'Padam ruangan',
        danger: true
      });
      if (!ok) return;
    }
  }
  c.rows = next;
  actions.saveSettings({ categories: cats });
}

export function ShiftEditor() {
  const shifts = useStore((s) => s.data.settings.shifts);
  const upd = (i: number, p: Partial<(typeof shifts)[0]>) => {
    const n = shifts.map((s, j) => (j === i ? { ...s, ...p } : s));
    actions.saveSettings({ shifts: n });
  };
  return (
    <div className="space-y-3">
      {shifts.map((s, i) => (
        <div key={s.id} className="rounded-2xl bg-white border border-cream-200 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Icon.clock className="w-4 h-4 text-sky" />
            <input
              value={s.name}
              onChange={(e) => upd(i, { name: e.target.value })}
              className="font-semibold bg-transparent outline-none flex-1"
              aria-label="Nama shift"
            />
            <span className="text-xs text-ink-3">{shiftTime(s)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-ink-3">
              Mula
              <Input type="time" value={s.start} onChange={(e) => e.target.value && upd(i, { start: e.target.value })} />
            </label>
            <label className="text-xs text-ink-3">
              Tamat
              <Input type="time" value={s.end} onChange={(e) => e.target.value && upd(i, { end: e.target.value })} />
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CategoryEditor() {
  const cats = useStore((s) => s.data.settings.categories);
  const [name, setName] = useState('');
  const save = (c: Category[]) => actions.saveSettings({ categories: c });
  const upd = (i: number, p: Partial<Category>) => save(cats.map((c, j) => (j === i ? { ...c, ...p } : c)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= cats.length) return;
    const n = [...cats];
    [n[i], n[j]] = [n[j], n[i]];
    save(n);
  };
  const del = async (i: number) => {
    const c = cats[i];
    const n = assignmentsInCategory(c.id);
    const ok = await confirmDialog({
      tone: 'warn',
      title: `Padam kategori ${c.name}?`,
      body: n ? `${n} tugasan menggunakan kategori ini. Rekod tugasan tidak dipadam, tetapi tidak akan dipaparkan lagi.` : 'Kategori ini akan dibuang daripada jadual.',
      ok: 'Padam',
      danger: true
    });
    if (ok) save(cats.filter((_, j) => j !== i));
  };
  const add = () => {
    const n = name.trim();
    if (!n) return;
    if (cats.some((c) => c.name.toLowerCase() === n.toLowerCase())) return toast('Kategori sudah wujud', 'err');
    save([...cats, { id: uid(), name: n, mode: 'shift', rows: 1 }]);
    setName('');
    toast(`Kategori ${n} ditambah`);
  };
  return (
    <div className="space-y-2.5">
      {cats.map((c, i) => (
        <div key={c.id} className="rounded-2xl bg-white border border-cream-200 p-3">
          <div className="flex items-center gap-1.5">
            <input value={c.name} onChange={(e) => upd(i, { name: e.target.value })} className="font-semibold bg-transparent outline-none flex-1 min-w-0" aria-label="Nama kategori" />
            <IconBtn label="Naik" className="w-8 h-8" onClick={() => move(i, -1)}>
              <Icon.up className="w-4 h-4" />
            </IconBtn>
            <IconBtn label="Turun" className="w-8 h-8" onClick={() => move(i, 1)}>
              <Icon.down className="w-4 h-4" />
            </IconBtn>
            <IconBtn label="Padam kategori" className="w-8 h-8 !bg-red-50 !text-red-600" onClick={() => del(i)}>
              <Icon.trash className="w-4 h-4" />
            </IconBtn>
          </div>
          <div className="flex items-center gap-3 mt-2.5">
            <div className="flex-1">
              <Segmented
                value={c.mode}
                onChange={(v) => upd(i, { mode: v })}
                options={[
                  { v: 'shift', l: 'Ikut shift' },
                  { v: 'day', l: 'Sepanjang hari' }
                ]}
              />
            </div>
            <div className="flex items-center gap-1 bg-cream-100 rounded-full p-1">
              <button className="press w-8 h-8 rounded-full bg-white font-bold" aria-label="Kurang ruangan" onClick={() => changeRows(c.id, -1)}>
                −
              </button>
              <span className="w-7 text-center font-bold tabular-nums" title="Bilangan ruangan">
                {c.rows}
              </span>
              <button className="press w-8 h-8 rounded-full bg-white font-bold" aria-label="Tambah ruangan" onClick={() => changeRows(c.id, 1)}>
                +
              </button>
            </div>
          </div>
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <Input placeholder="Nama kategori baharu" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Button onClick={add} disabled={!name.trim()}>
          <Icon.plus className="w-4 h-4" /> Tambah
        </Button>
      </div>
    </div>
  );
}
