import React, { useEffect, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useStore } from './lib/store';
import { useEnsureCurrentWeek } from './lib/hooks';
import { DialogHost, Icon, Spinner, ToastHost } from './components/ui';
import HomePage from './pages/Home';
import TimetablePage from './pages/Timetable';
import StaffPage from './pages/Staff';
import PoolPage from './pages/Pool';
import SettingsPage from './pages/Settings';

const TABS = [
  { k: 'home', l: 'Home', t: 'Dashboard', i: Icon.home },
  { k: 'timetable', l: 'Timetable', t: 'Timetable', i: Icon.table },
  { k: 'staff', l: 'Staff', t: 'Staff', i: Icon.users },
  { k: 'pool', l: 'Pool', t: 'Weekly Staff Pool', i: Icon.pool },
  { k: 'settings', l: 'Settings', t: 'Settings', i: Icon.gear }
];

export default function App() {
  const ready = useStore((s) => s.ready);
  const status = useStore((s) => s.status);
  const org = useStore((s) => s.data.settings.orgName);
  const [tab, setTab] = useState(() => {
    const h = Number(sessionStorage.getItem('stt.tab'));
    return h >= 0 && h < 5 ? h : 0;
  });
  const [ttSheet, setTtSheet] = useState<string | null>(null);
  useEnsureCurrentWeek();

  useEffect(() => {
    sessionStorage.setItem('stt.tab', String(tab));
    window.scrollTo({ top: 0 });
  }, [tab]);

  // butang Back Android: kembali ke Home dahulu
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const h = CapApp.addListener('backButton', () => {
      if (tab !== 0) setTab(0);
      else void CapApp.exitApp();
    });
    return () => {
      void h.then((x) => x.remove());
    };
  }, [tab]);

  const go = (t: number, sheet?: string) => {
    setTab(t);
    if (sheet) setTtSheet(sheet);
  };

  const dot = { synced: 'bg-emerald-500', syncing: 'bg-sky animate-pulse', connecting: 'bg-sky animate-pulse', offline: 'bg-amber-400', error: 'bg-red-500', signedout: 'bg-amber-400', local: 'bg-cream-300' }[status];
  const label = { synced: 'Synced', syncing: 'Syncing', connecting: 'Connecting', offline: 'Offline', error: 'Error', signedout: 'Log masuk', local: 'Local' }[status];

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-30 pt-safe bg-cream/80 backdrop-blur-xl no-print">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-3 pb-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-ink-3 truncate">{org}</div>
            <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight leading-tight">{TABS[tab].t}</h1>
          </div>
          <button onClick={() => setTab(4)} className="press shrink-0 inline-flex items-center gap-2 h-9 px-3.5 rounded-full bg-cream-50 border border-cream-200 shadow-soft text-[13px] font-semibold">
            <span className={`w-2 h-2 rounded-full ${dot}`} />
            {label}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-1 pb-nav">
        {!ready ? (
          <div className="pt-24 grid place-items-center text-sky">
            <Spinner className="w-8 h-8" />
            <div className="text-sm text-ink-3 mt-3">Memuatkan data…</div>
          </div>
        ) : (
          <div key={tab}>
            {tab === 0 && <HomePage go={go} />}
            {tab === 1 && <TimetablePage openSheet={ttSheet} onSheetOpened={() => setTtSheet(null)} />}
            {tab === 2 && <StaffPage />}
            {tab === 3 && <PoolPage />}
            {tab === 4 && <SettingsPage />}
          </div>
        )}
      </main>

      <BottomNav tab={tab} setTab={setTab} />
      <DialogHost />
      <ToastHost />
    </div>
  );
}

function BottomNav({ tab, setTab }: { tab: number; setTab: (t: number) => void }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 pb-[calc(0.75rem+env(safe-area-inset-bottom))] px-3 no-print pointer-events-none">
      <div className="pointer-events-auto relative mx-auto max-w-md grid grid-cols-5 p-1.5 rounded-[26px] bg-cream-50/85 backdrop-blur-2xl border border-white/70 shadow-lift">
        <span
          aria-hidden
          className="absolute top-1.5 bottom-1.5 left-1.5 rounded-[20px] bg-sky shadow-soft transition-transform duration-500 ease-ios"
          style={{ width: 'calc((100% - 12px) / 5)', transform: `translateX(${tab * 100}%)` }}
        />
        {TABS.map((t, i) => {
          const I = t.i;
          const on = i === tab;
          return (
            <button
              key={t.k}
              onClick={() => setTab(i)}
              aria-current={on ? 'page' : undefined}
              className={`relative z-10 flex flex-col items-center justify-center gap-0.5 h-[54px] rounded-[20px] transition-colors duration-300 ${on ? 'text-offwhite' : 'text-ink-3'}`}
            >
              <I className={`w-[22px] h-[22px] transition-transform duration-300 ${on ? 'scale-105' : ''}`} />
              <span className="text-[10.5px] font-semibold">{t.l}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
