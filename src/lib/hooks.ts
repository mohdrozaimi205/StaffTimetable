import { useEffect } from 'react';
import { actions, getState, useStore } from './store';
import { mondayOf, newWeek, sortedWeeks } from './logic';

/** Pastikan sentiasa ada "minggu semasa" */
export function useEnsureCurrentWeek() {
  const ready = useStore((s) => s.ready);
  const status = useStore((s) => s.status);
  const cur = useStore((s) => s.data.settings.currentWeekId);
  const exists = useStore((s) => (cur ? !!s.data.weeks[cur] : false));
  useEffect(() => {
    if (!ready || status === 'syncing' || status === 'connecting') return;
    if (cur && exists) return;
    const d = getState().data;
    const latest = sortedWeeks(d)[0];
    if (latest) actions.saveSettings({ currentWeekId: latest.id });
    else {
      const w = newWeek(mondayOf(new Date()));
      actions.upsertWeek(w);
      actions.saveSettings({ currentWeekId: w.id });
    }
  }, [ready, status, cur, exists]);
}

export function useData() {
  return useStore((s) => s.data);
}
