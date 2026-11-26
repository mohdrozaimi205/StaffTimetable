import React, { ReactNode, useEffect, useState } from 'react';

// ---------------- Ikon minimalis ----------------
const P = (d: ReactNode) => (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={p.className ?? 'w-5 h-5'}>
    {d}
  </svg>
);
export const Icon = {
  home: P(<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /><path d="M10 20v-6h4v6" /></>),
  table: P(<><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M3 9h18M9 9v12M15 9v12M8 2v4M16 2v4" /></>),
  users: P(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /><circle cx="17" cy="9" r="2.6" /><path d="M17.5 14.6c2.2.4 3.6 2 4 4.4" /></>),
  pool: P(<><circle cx="12" cy="12" r="9" /><path d="M12 12V3a9 9 0 0 1 9 9z" /></>),
  gear: P(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>),
  plus: P(<path d="M12 5v14M5 12h14" />),
  x: P(<path d="M6 6l12 12M18 6 6 18" />),
  search: P(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
  edit: P(<><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></>),
  trash: P(<><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>),
  warn: P(<><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17h.01" /></>),
  check: P(<path d="m5 12 4.5 4.5L19 7" />),
  chevL: P(<path d="m15 5-7 7 7 7" />),
  chevR: P(<path d="m9 5 7 7-7 7" />),
  chevD: P(<path d="m5 9 7 7 7-7" />),
  up: P(<path d="m6 15 6-6 6 6" />),
  down: P(<path d="m6 9 6 6 6-6" />),
  pdf: P(<><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6" /><path d="M9 14h6M9 17h4" /></>),
  xls: P(<><rect x="4" y="3" width="16" height="18" rx="3" /><path d="m9 8 6 8M15 8l-6 8" /></>),
  print: P(<><path d="M7 9V3h10v6" /><rect x="3" y="9" width="18" height="8" rx="2.5" /><path d="M7 14h10v7H7z" /></>),
  share: P(<><path d="M12 3v12M7 8l5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></>),
  copy: P(<><rect x="8" y="8" width="13" height="13" rx="3" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>),
  history: P(<><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>),
  calendar: P(<><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
  note: P(<><path d="M5 3h10l4 4v14H5z" /><path d="M9 11h6M9 15h4" /></>),
  cloud: P(<path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 18z" />),
  refresh: P(<><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" /><path d="M4 3v5h5M4 13a8 8 0 0 0 14.3 4.9L20 16" /><path d="M20 21v-5h-5" /></>),
  more: P(<><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></>),
  upload: P(<><path d="M12 15V3M7 8l5-5 5 5" /><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></>),
  download: P(<><path d="M12 3v12M7 10l5 5 5-5" /><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></>),
  clock: P(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  layers: P(<><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></>)
};

// ---------------- Asas ----------------
export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`bg-cream-50 rounded-3xl shadow-soft border border-cream-200/70 ${onClick ? 'press cursor-pointer' : ''} ${className}`}>
      {children}
    </div>
  );
}

type BtnKind = 'primary' | 'ghost' | 'soft' | 'danger';
export function Button({
  children,
  kind = 'primary',
  className = '',
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: BtnKind }) {
  const k = {
    primary: 'bg-sky text-offwhite shadow-soft hover:bg-sky-600',
    soft: 'bg-sky-50 text-sky-700 hover:bg-sky-100',
    ghost: 'bg-cream-100 text-ink hover:bg-cream-200',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100'
  }[kind];
  return (
    <button {...p} className={`press inline-flex items-center justify-center gap-2 rounded-full px-4 h-11 text-[15px] font-semibold transition disabled:opacity-40 ${k} ${className}`}>
      {children}
    </button>
  );
}

export function IconBtn({ children, label, className = '', ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button aria-label={label} title={label} {...p} className={`press w-10 h-10 rounded-full grid place-items-center bg-cream-100 hover:bg-cream-200 text-ink ${className}`}>
      {children}
    </button>
  );
}

export function Input(p: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...p}
      className={`w-full h-11 px-4 rounded-2xl bg-white border border-cream-200 focus:border-sky focus:ring-4 focus:ring-sky/15 outline-none text-[15px] transition ${p.className ?? ''}`}
    />
  );
}
export function TextArea(p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...p}
      className={`w-full px-4 py-3 rounded-2xl bg-white border border-cream-200 focus:border-sky focus:ring-4 focus:ring-sky/15 outline-none text-[15px] transition ${p.className ?? ''}`}
    />
  );
}
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <div className="text-[13px] font-semibold text-ink-3 mb-1.5 ml-1">{label}</div>
      {children}
      {hint && <div className="text-xs text-ink-3 mt-1 ml-1">{hint}</div>}
    </label>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!on);
      }}
      className={`relative w-[50px] h-[30px] rounded-full transition-colors ${on ? 'bg-sky' : 'bg-cream-300'}`}
    >
      <span className={`absolute top-[3px] left-[3px] w-6 h-6 rounded-full bg-white shadow transition-transform duration-300 ${on ? 'translate-x-5' : ''}`} />
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  const i = Math.max(0, options.findIndex((o) => o.v === value));
  return (
    <div className="relative grid bg-cream-200/70 rounded-full p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      <span
        className="absolute top-1 bottom-1 rounded-full bg-sky shadow-soft transition-transform duration-300 ease-ios"
        style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${i * 100}%)`, left: 4 }}
      />
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} className={`relative z-10 h-9 text-[13px] font-semibold rounded-full transition-colors ${o.v === value ? 'text-offwhite' : 'text-ink-2'}`}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

export function Counter({ value, level, size = 'md' }: { value: number; level: 'green' | 'yellow' | 'red'; size?: 'sm' | 'md' }) {
  const c = { green: 'bg-emerald-100 text-emerald-700 ring-emerald-200', yellow: 'bg-amber-100 text-amber-700 ring-amber-200', red: 'bg-red-100 text-red-600 ring-red-200' }[level];
  return (
    <span className={`inline-grid place-items-center rounded-full ring-1 font-bold tabular-nums ${c} ${size === 'sm' ? 'min-w-7 h-7 px-2 text-xs' : 'min-w-11 h-11 px-3 text-base'}`}>
      {value}
    </span>
  );
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="text-center py-12 px-6">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-50 text-sky grid place-items-center mb-3">{icon}</div>
      <div className="font-semibold">{title}</div>
      {text && <div className="text-sm text-ink-3 mt-1">{text}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ---------------- Bottom sheet ----------------
export function Sheet({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const [show, setShow] = useState(open);
  const [anim, setAnim] = useState(false);
  useEffect(() => {
    if (open) {
      setShow(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnim(true)));
    } else {
      setAnim(false);
      const t = setTimeout(() => setShow(false), 300);
      return () => clearTimeout(t);
    }
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center no-print">
      <div onClick={onClose} className={`absolute inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 ${anim ? 'opacity-100' : 'opacity-0'}`} />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} max-h-[88vh] flex flex-col bg-cream rounded-t-[28px] sm:rounded-[28px] shadow-lift transition-all duration-300 ease-ios ${anim ? 'translate-y-0 opacity-100 sm:scale-100' : 'translate-y-full sm:translate-y-4 opacity-0 sm:scale-95'}`}
      >
        <div className="sm:hidden w-10 h-1.5 rounded-full bg-cream-300 mx-auto mt-2.5" />
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <div className="text-[17px] font-bold">{title}</div>
          <IconBtn label="Tutup" onClick={onClose}>
            <Icon.x className="w-4 h-4" />
          </IconBtn>
        </div>
        <div className="overflow-y-auto px-5 pb-4 flex-1">{children}</div>
        {footer && <div className="px-5 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-cream-200">{footer}</div>}
      </div>
    </div>
  );
}

// ---------------- Dialog pengesahan (imperatif) ----------------
interface DlgReq {
  title: ReactNode;
  body?: ReactNode;
  ok?: string;
  cancel?: string;
  danger?: boolean;
  tone?: 'warn' | 'info';
  resolve: (v: boolean) => void;
}
let pushDlg: ((d: DlgReq) => void) | null = null;
export function confirmDialog(o: Omit<DlgReq, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => (pushDlg ? pushDlg({ ...o, resolve }) : resolve(window.confirm(String(o.title)))));
}

export function DialogHost() {
  const [d, setD] = useState<DlgReq | null>(null);
  const [anim, setAnim] = useState(false);
  useEffect(() => {
    pushDlg = (x) => {
      setD(x);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnim(true)));
    };
    return () => {
      pushDlg = null;
    };
  }, []);
  if (!d) return null;
  const close = (v: boolean) => {
    setAnim(false);
    setTimeout(() => {
      d.resolve(v);
      setD(null);
    }, 200);
  };
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-5 no-print">
      <div className={`absolute inset-0 bg-black/35 backdrop-blur-sm transition-opacity ${anim ? 'opacity-100' : 'opacity-0'}`} onClick={() => close(false)} />
      <div role="alertdialog" aria-modal="true" className={`relative w-full max-w-sm bg-cream-50 rounded-[26px] shadow-lift p-5 transition-all duration-200 ease-ios ${anim ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
        {d.tone === 'warn' && (
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 grid place-items-center mb-3">
            <Icon.warn className="w-6 h-6" />
          </div>
        )}
        <div className="text-[17px] font-bold leading-snug">{d.title}</div>
        {d.body && <div className="text-[14px] text-ink-2 mt-2">{d.body}</div>}
        <div className="grid grid-cols-2 gap-2 mt-5">
          <Button kind="ghost" className="!px-3 !text-[14px]" onClick={() => close(false)}>
            {d.cancel ?? 'Cancel'}
          </Button>
          <Button kind={d.danger ? 'danger' : 'primary'} className="!px-3 !text-[14px] whitespace-nowrap" onClick={() => close(true)} autoFocus>
            {d.ok ?? 'OK'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Toast ----------------
let pushToast: ((m: string, t: 'ok' | 'err' | 'info') => void) | null = null;
export function toast(m: string, t: 'ok' | 'err' | 'info' = 'ok') {
  pushToast?.(m, t);
}
export function ToastHost() {
  const [items, setItems] = useState<{ id: number; m: string; t: string }[]>([]);
  useEffect(() => {
    pushToast = (m, t) => {
      const id = Date.now() + Math.random();
      setItems((x) => [...x, { id, m, t }]);
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3600);
    };
    return () => {
      pushToast = null;
    };
  }, []);
  return (
    <div className="fixed top-[calc(0.75rem+env(safe-area-inset-top))] inset-x-0 z-[80] flex flex-col items-center gap-2 pointer-events-none no-print px-4">
      {items.map((i) => (
        <div
          key={i.id}
          className={`toast-in pointer-events-auto max-w-md rounded-2xl px-4 py-3 text-sm font-medium shadow-lift backdrop-blur-xl ${
            i.t === 'err' ? 'bg-red-600/95 text-white' : i.t === 'info' ? 'bg-ink/90 text-offwhite' : 'bg-sky-700/95 text-offwhite'
          }`}
        >
          {i.m}
        </div>
      ))}
    </div>
  );
}

export function Spinner({ className = 'w-5 h-5' }: { className?: string }) {
  return <span className={`inline-block rounded-full border-2 border-current border-r-transparent animate-spin ${className}`} />;
}

/** Pilih fail dari peranti */
export function pickFile(accept: string): Promise<File | null> {
  return new Promise((res) => {
    const i = document.createElement('input');
    i.type = 'file';
    i.accept = accept;
    i.onchange = () => res(i.files?.[0] ?? null);
    i.click();
  });
}
