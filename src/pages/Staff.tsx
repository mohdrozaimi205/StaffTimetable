import React, { useEffect, useMemo, useState } from 'react';
import { actions, useStore } from '../lib/store';
import { Staff } from '../lib/types';
import { countByStaff, fmtRange, makeStaff, normalizeName, quotaOf, remainingLevel, usageOfStaff } from '../lib/logic';
import { Button, Card, confirmDialog, Counter, Empty, Field, Icon, Input, Segmented, Sheet, toast, Toggle } from '../components/ui';

type Filter = 'all' | 'active' | 'inactive' | 'deleted';

export default function StaffPage({ autoAdd, onAutoAdd }: { autoAdd?: boolean; onAutoAdd?: () => void }) {
  const data = useStore((s) => s.data);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [edit, setEdit] = useState<Staff | null>(null);
  const [isNew, setIsNew] = useState(false);
  const wk = data.settings.currentWeekId;
  const counts = useMemo(() => countByStaff(data.settings, (wk && data.assigns[wk]) || {}), [data, wk]);

  useEffect(() => {
    if (autoAdd) {
      openNew();
      onAutoAdd?.();
    }
  }, [autoAdd]); // eslint-disable-line

  const list = Object.values(data.staff)
    .filter((s) => (filter === 'deleted' ? s.deleted : !s.deleted))
    .filter((s) => (filter === 'active' ? s.active : filter === 'inactive' ? !s.active : true))
    .filter((s) => !q.trim() || s.name.includes(q.trim().toUpperCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  function openNew() {
    setIsNew(true);
    setEdit(makeStaff(''));
  }

  const activeCount = Object.values(data.staff).filter((s) => !s.deleted && s.active).length;

  return (
    <div className="page-in">
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Icon.search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
          <Input placeholder="Cari staf…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={openNew}>
          <Icon.plus className="w-4 h-4" /> <span className="hidden sm:inline">Add New Staff</span>
          <span className="sm:hidden">Tambah</span>
        </Button>
      </div>
      <div className="mb-4">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { v: 'all', l: 'Semua' },
            { v: 'active', l: 'Aktif' },
            { v: 'inactive', l: 'Tak aktif' },
            { v: 'deleted', l: 'Dipadam' }
          ]}
        />
      </div>
      <div className="text-xs text-ink-3 mb-2 ml-1">
        {activeCount} staf aktif • kiraan tugasan untuk minggu semasa {wk && data.weeks[wk] ? `(${fmtRange(data.weeks[wk])})` : ''}
      </div>

      {list.length === 0 ? (
        <Card>
          <Empty
            icon={<Icon.users className="w-6 h-6" />}
            title={filter === 'deleted' ? 'Tiada staf dipadam' : 'Belum ada staf'}
            text={filter === 'deleted' ? undefined : 'Tambah nama staf anda untuk mula mengisi jadual.'}
            action={filter !== 'deleted' ? <Button onClick={openNew}>Add New Staff</Button> : undefined}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((s) => {
            const quota = quotaOf(s, data.settings);
            const used = counts[s.id] ?? 0;
            const rem = quota - used;
            return (
              <Card
                key={s.id}
                className="p-4"
                onClick={() => {
                  setIsNew(false);
                  setEdit(s);
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-2xl grid place-items-center font-bold text-[15px] shrink-0 ${s.active && !s.deleted ? 'bg-sky text-offwhite' : 'bg-cream-200 text-ink-3'}`}>
                    {s.name.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{s.name}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${s.deleted ? 'bg-red-50 text-red-600' : s.active ? 'bg-emerald-50 text-emerald-700' : 'bg-cream-200 text-ink-3'}`}>
                        {s.deleted ? 'Dipadam' : s.active ? 'Aktif' : 'Tidak aktif'}
                      </span>
                      {s.categoryIds.map((id) => {
                        const c = data.settings.categories.find((x) => x.id === id);
                        return c ? (
                          <span key={id} className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-sky-50 text-sky-700">
                            {c.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                  {!s.deleted && <Counter value={rem} level={remainingLevel(rem, quota)} />}
                </div>
                {!s.deleted && (
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <Mini label="Tugasan" value={used} />
                    <Mini label="Kuota" value={quota} />
                    <Mini label="Baki" value={rem} />
                  </div>
                )}
                {s.deleted && (
                  <Button
                    kind="soft"
                    className="w-full mt-3 h-9 text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      actions.upsertStaff({ ...s, deleted: false });
                      toast(`${s.name} dipulihkan`);
                    }}
                  >
                    Pulihkan
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <StaffEditor staff={edit} isNew={isNew} onClose={() => setEdit(null)} />
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-cream-100 py-1.5">
      <div className="font-bold tabular-nums">{value}</div>
      <div className="text-[11px] text-ink-3">{label}</div>
    </div>
  );
}

export function StaffEditor({ staff, isNew, onClose }: { staff: Staff | null; isNew: boolean; onClose: () => void }) {
  const data = useStore((s) => s.data);
  const [f, setF] = useState<Staff | null>(staff);
  const [customQuota, setCustomQuota] = useState(false);
  useEffect(() => {
    setF(staff);
    setCustomQuota(staff?.quota !== null && staff?.quota !== undefined);
  }, [staff]);

  const save = () => {
    if (!f) return;
    const name = normalizeName(f.name);
    if (!name) return toast('Sila masukkan nama staf', 'err');
    const clash = Object.values(data.staff).find((s) => s.id !== f.id && s.name === name);
    if (clash && !clash.deleted) return toast(`Nama ${name} sudah wujud`, 'err');
    if (clash && clash.deleted && isNew) {
      actions.upsertStaff({ ...clash, deleted: false, active: true, inPool: true, categoryIds: f.categoryIds, quota: customQuota ? f.quota : null });
      toast(`${name} dipulihkan daripada senarai dipadam`);
      return onClose();
    }
    const q = customQuota ? Math.max(0, Math.min(99, Number(f.quota ?? data.settings.defaultQuota))) : null;
    actions.upsertStaff({ ...f, name, quota: q });
    toast(isNew ? `${name} ditambah` : 'Perubahan disimpan');
    onClose();
  };

  const remove = async () => {
    if (!f) return;
    const usage = usageOfStaff(data, f.id);
    const total = usage.reduce((n, u) => n + u.count, 0);
    const ok = await confirmDialog({
      tone: 'warn',
      title: `Padam ${f.name}?`,
      body: total ? (
        <div className="space-y-2">
          <div className="rounded-xl bg-amber-50 text-amber-800 px-3 py-2 text-[13px] font-medium">
            Amaran: nama ini masih digunakan dalam jadual ({total} tugasan dalam {usage.length} minggu).
          </div>
          <ul className="text-[13px] space-y-0.5 max-h-32 overflow-y-auto">
            {usage.map((u) => (
              <li key={u.weekId}>
                • {fmtRange(data.weeks[u.weekId])}: {u.count} tugasan
              </li>
            ))}
          </ul>
          <div className="text-[13px]">Rekod tugasan TIDAK akan dipadam. Nama akan dipaparkan sebagai "dipadam" dalam jadual dan boleh dipulihkan.</div>
        </div>
      ) : (
        'Staf akan dibuang daripada senarai. Anda boleh memulihkannya melalui tapisan "Dipadam".'
      ),
      ok: 'Padam',
      danger: true
    });
    if (ok) {
      actions.upsertStaff({ ...f, deleted: true });
      toast(`${f.name} dipadam`);
      onClose();
    }
  };

  if (!f) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;
  const toggleCat = (id: string) => setF({ ...f, categoryIds: f.categoryIds.includes(id) ? f.categoryIds.filter((x) => x !== id) : [...f.categoryIds, id] });

  return (
    <Sheet
      open={!!staff}
      onClose={onClose}
      title={isNew ? 'Add New Staff' : 'Edit Staff'}
      footer={
        <div className="flex gap-2">
          {!isNew && !f.deleted && (
            <Button kind="danger" onClick={remove} aria-label="Padam staf">
              <Icon.trash className="w-4 h-4" />
            </Button>
          )}
          <Button className="flex-1" onClick={save}>
            {isNew ? 'Tambah staf' : 'Simpan'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Nama staf">
          <Input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Contoh: ROZAIMI" onKeyDown={(e) => e.key === 'Enter' && save()} />
        </Field>
        <Row label="Aktif" sub="Staf tidak aktif tidak dipaparkan semasa memilih nama">
          <Toggle on={f.active} onChange={(v) => setF({ ...f, active: v })} label="Aktif" />
        </Row>
        <Row label="Dalam Weekly Staff Pool" sub="Paparkan baki kuota dalam Weekly Pool">
          <Toggle on={f.inPool} onChange={(v) => setF({ ...f, inPool: v })} label="Dalam pool" />
        </Row>
        <div>
          <div className="text-[13px] font-semibold text-ink-3 mb-1.5 ml-1">Kategori kerja</div>
          <div className="flex flex-wrap gap-2">
            {data.settings.categories.map((c) => {
              const on = f.categoryIds.includes(c.id);
              return (
                <button key={c.id} onClick={() => toggleCat(c.id)} className={`press h-9 px-4 rounded-full text-sm font-semibold border ${on ? 'bg-sky text-offwhite border-sky' : 'bg-white border-cream-200'}`}>
                  {on && <Icon.check className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />}
                  {c.name}
                </button>
              );
            })}
          </div>
          <div className="text-xs text-ink-3 mt-1.5 ml-1">Staf dengan kategori sepadan akan dipaparkan dahulu semasa mengisi ruangan.</div>
        </div>
        <Row label="Kuota mingguan" sub={customQuota ? 'Kuota khas untuk staf ini' : `Guna kuota default (${data.settings.defaultQuota})`}>
          <Toggle
            on={customQuota}
            onChange={(v) => {
              setCustomQuota(v);
              setF({ ...f, quota: v ? f.quota ?? data.settings.defaultQuota : null });
            }}
            label="Kuota khas"
          />
        </Row>
        {customQuota && (
          <div className="flex items-center justify-center gap-4">
            <button className="press w-11 h-11 rounded-full bg-cream-100 text-xl font-bold" onClick={() => setF({ ...f, quota: Math.max(0, (f.quota ?? 0) - 1) })}>
              −
            </button>
            <span className="text-3xl font-bold tabular-nums w-14 text-center">{f.quota ?? 0}</span>
            <button className="press w-11 h-11 rounded-full bg-cream-100 text-xl font-bold" onClick={() => setF({ ...f, quota: Math.min(99, (f.quota ?? 0) + 1) })}>
              +
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white border border-cream-200 px-4 py-3">
      <div className="flex-1">
        <div className="font-semibold text-[15px]">{label}</div>
        {sub && <div className="text-xs text-ink-3">{sub}</div>}
      </div>
      {children}
    </div>
  );
}
