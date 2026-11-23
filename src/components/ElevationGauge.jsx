import { useEffect, useState } from 'react';
import { MAX_ELEVATION } from '../lib/utils';

// Semicircle gauge: elevation relative to the highest peak in the dataset.
export default function ElevationGauge({ elev, t }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    setShown(false);
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    return () => cancelAnimationFrame(id);
  }, [elev]);

  const pct = elev ? Math.min(100, (elev / MAX_ELEVATION) * 100) : 0;
  const R = 80;
  const theta = Math.PI * (1 - (shown ? pct : 0) / 100);
  const kx = 100 + R * Math.cos(theta);
  const ky = 100 - R * Math.sin(theta);
  const arc = 'M20 100 A80 80 0 0 1 180 100';

  return (
    <div className="glass mt-6 px-4 pb-4 pt-5">
      <div className="relative mx-auto w-full max-w-[300px]">
        <svg viewBox="0 0 200 116" className="block w-full" role="img" aria-label={elev ? `${elev} m` : '—'}>
          <defs>
            <linearGradient id="gaugeGrad" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" style={{ stopColor: 'var(--elev-low)' }} />
              <stop offset="0.55" style={{ stopColor: 'var(--elev-mid)' }} />
              <stop offset="1" style={{ stopColor: 'var(--elev-high)' }} />
            </linearGradient>
          </defs>
          <path d={arc} fill="none" stroke="var(--rule)" strokeWidth="13" strokeLinecap="round" />
          {elev ? (
            <>
              <path d={arc} fill="none" stroke="url(#gaugeGrad)" strokeWidth="13" strokeLinecap="round" pathLength="100"
                strokeDasharray={`${shown ? Math.max(pct, 1.5) : 0} 100`} style={{ transition: 'stroke-dasharray 900ms cubic-bezier(.2,.8,.2,1)' }} />
              <circle cx={kx} cy={ky} r="8" fill="var(--card)" stroke="var(--forest)" strokeWidth="3.5" style={{ transition: 'cx 900ms cubic-bezier(.2,.8,.2,1), cy 900ms cubic-bezier(.2,.8,.2,1)' }} />
            </>
          ) : null}
        </svg>
        <div className="absolute inset-x-0 bottom-[10%] text-center">
          <div className="flex items-baseline justify-center gap-1">
            <span className="serif text-[44px] font-bold leading-none text-[var(--ink)]">{elev ? elev.toLocaleString() : '—'}</span>
            {elev ? <span className="serif text-lg italic text-[var(--muted)]">m</span> : null}
          </div>
          {elev ? <div className="mt-1 text-[10px] text-[var(--muted)]">{Math.round(pct)}% {t('elevOfMax')}</div> : null}
        </div>
      </div>
      <div className="mx-auto mt-1 flex max-w-[300px] justify-between px-1 text-[11px] font-semibold text-[var(--muted)]">
        <span>0 m</span><span>{MAX_ELEVATION.toLocaleString()} m</span>
      </div>
    </div>
  );
}
