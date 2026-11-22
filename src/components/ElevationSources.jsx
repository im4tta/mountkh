import { useEffect, useRef, useState } from 'react';
import { Layers, Loader2, RotateCcw, ChevronDown } from 'lucide-react';
import { fetchElevationSources } from '../lib/elevation';

// Compare the listed elevation with independent DEM sources. Network calls only
// happen after an explicit tap, so opening a mountain never sends coordinates anywhere.
export default function ElevationSources({ mountain, listed, t }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ status: 'idle', data: null });
  const ctrl = useRef(null);

  useEffect(() => {
    ctrl.current?.abort();
    setOpen(false);
    setState({ status: 'idle', data: null });
    return () => ctrl.current?.abort();
  }, [mountain?.id]);

  const load = async () => {
    if (!mountain) return;
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setState({ status: 'loading', data: null });
    try {
      const data = await fetchElevationSources(mountain.lat, mountain.lon, c.signal);
      if (c.signal.aborted) return;
      setState({ status: data.count ? 'ready' : 'error', data });
    } catch (err) {
      if (err?.name !== 'AbortError') setState({ status: 'error', data: null });
    }
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && state.status === 'idle') load();
  };

  const { data, status } = state;
  const fineVals = data ? data.items.filter((i) => i.fine && i.value != null).map((i) => i.value) : [];
  const axisVals = [...fineVals, listed].filter((v) => v != null);
  const lo0 = axisVals.length ? Math.min(...axisVals) : 0;
  const hi0 = axisVals.length ? Math.max(...axisVals) : 1;
  const pad = Math.max(6, (hi0 - lo0) * 0.2);
  const lo = lo0 - pad, hi = hi0 + pad;
  const pos = (v) => `${Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100))}%`;
  const diff = data?.best != null && listed ? data.best - listed : null;
  const missing = data ? data.items.some((i) => i.fine && i.value == null) : false;

  return (
    <section className="mt-6 rounded-lg border border-[var(--rule)] bg-[var(--paper-2)]/60">
      <button
        onClick={toggle}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center gap-2.5 px-3.5 text-left"
      >
        <Layers className="h-4 w-4 shrink-0 text-[var(--forest)]" />
        <span className="flex-1 text-[12px] font-semibold">{t('elevCompareBtn')}</span>
        <ChevronDown className={`h-4 w-4 text-[var(--muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-[var(--rule)] px-3.5 pb-4 pt-3">
          {status === 'loading' && (
            <div className="space-y-2.5" aria-busy="true">
              {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-7 rounded" />)}
              <p className="flex items-center gap-1.5 pt-1 text-[11px] text-[var(--muted)]"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('elevLoading')}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <p className="text-[12px] text-[var(--muted)]">{t('elevFail')}</p>
              <button onClick={load} className="btn mt-3"><RotateCcw className="h-3.5 w-3.5" /> {t('elevRetry')}</button>
            </div>
          )}

          {status === 'ready' && data && (
            <>
              <div className="mb-3 flex items-end justify-between gap-3 border-b border-[var(--rule)] pb-3">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">{t('elevBest')}</div>
                  <div className="serif text-3xl font-bold leading-none text-[var(--forest)]">{data.best?.toLocaleString()} <span className="text-base italic text-[var(--muted)]">m</span></div>
                </div>
                <div className="text-right text-[10px] leading-snug text-[var(--muted)]">
                  <div>{data.count > 1 && data.min !== data.max ? `${data.min?.toLocaleString()}–${data.max?.toLocaleString()} m · ` : ''}{data.count} {t('elevSources')}</div>
                  {diff != null && <div className={Math.abs(diff) > 40 ? 'font-semibold text-[var(--rust)]' : ''}>{t('elevVsListed')} {diff > 0 ? '+' : ''}{diff} m</div>}
                </div>
              </div>

              <ul className="space-y-3">
                {data.items.map((item) => (
                  <li key={item.id} className={item.fine ? '' : 'opacity-60'}>
                    <div className="flex items-baseline justify-between gap-2 text-[11px]">
                      <span className="min-w-0 truncate font-medium">{item.label}</span>
                      <span className="shrink-0 font-mono tabular-nums">
                        {item.value != null ? `${item.value.toLocaleString()} m` : '—'}
                        {item.fine && item.value != null && data.best != null && item.value !== data.best && (
                          <span className="ml-1.5 text-[9px] text-[var(--muted)]">{item.value > data.best ? '+' : ''}{item.value - data.best}</span>
                        )}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="relative h-1.5 flex-1 rounded-full bg-[var(--rule)]">
                        {listed != null && <span className="absolute top-1/2 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded bg-[var(--rust)]" style={{ left: pos(listed) }} aria-hidden="true" />}
                        {item.fine && item.value != null && <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--card)] bg-[var(--forest)] shadow" style={{ left: pos(item.value) }} aria-hidden="true" />}
                      </div>
                      <span className="w-14 shrink-0 text-right text-[9px] uppercase tracking-wide text-[var(--muted)]">{item.res}</span>
                    </div>
                    {!item.fine && <p className="mt-0.5 text-[9px] text-[var(--muted)]">{t('elevCoarse')}</p>}
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 flex items-center gap-3 text-[9px] text-[var(--muted)]">
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[var(--forest)]" />{t('elevLegendSource')}</span>
                <span className="flex items-center gap-1"><span className="h-3 w-0.5 rounded bg-[var(--rust)]" />{t('elevLegendListed')}</span>
              </p>
              {missing && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-[var(--ochre-soft)] px-3 py-2 text-[11px] text-[var(--ink-soft)]">
                  <span>{t('elevPartial')}</span>
                  <button onClick={load} className="flex min-h-9 shrink-0 items-center gap-1 font-semibold text-[var(--forest)]"><RotateCcw className="h-3.5 w-3.5" />{t('elevRetry')}</button>
                </div>
              )}
              <p className="mt-3 text-[10px] leading-relaxed text-[var(--muted)]">{t('elevNote')}</p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
