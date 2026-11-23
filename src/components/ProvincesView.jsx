import { useMemo, useState } from 'react';
import { provinceLabel, formatNumber } from '../lib/provinces';
import { elevationOf } from '../lib/utils';

// Convex hull (monotone chain) of [x, y] points.
function hull(points) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (const p of [...pts].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop(); lower.pop();
  return lower.concat(upper);
}

const median = (arr) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

// Province "silhouette" drawn from the real coordinates of its peaks: a soft hull with a dot per peak.
function buildShape(items) {
  const lat0 = items.reduce((n, m) => n + m.lat, 0) / items.length;
  const k = Math.cos((lat0 * Math.PI) / 180);
  let pts = items.map((m) => [m.lon * k, -m.lat]);
  if (pts.length >= 12) {
    const mx = median(pts.map((p) => p[0])), my = median(pts.map((p) => p[1]));
    const d = pts.map((p) => Math.hypot(p[0] - mx, p[1] - my));
    const limit = Math.max(median(d) * 3.2, 0.05);
    pts = pts.filter((_, i) => d[i] <= limit);
  }
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY, 0.02);
  const scale = 76 / span;
  const ox = 50 - ((minX + maxX) / 2) * scale;
  const oy = 50 - ((minY + maxY) / 2) * scale;
  const fit = (p) => [p[0] * scale + ox, p[1] * scale + oy];
  const poly = hull(pts).map(fit);
  const dots = pts.length > 70 ? pts.filter((_, i) => i % Math.ceil(pts.length / 70) === 0).map(fit) : pts.map(fit);
  return { poly, dots };
}

function toneColor(maxElev) {
  if (maxElev >= 1000) return 'var(--elev-high)';
  if (maxElev >= 300) return 'var(--elev-mid)';
  return 'var(--elev-low)';
}

function Shape({ shape, color }) {
  const { poly, dots } = shape;
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      {poly.length >= 3 && (
        <polygon points={poly.map((p) => p.join(',')).join(' ')} fill={color} fillOpacity="0.42" stroke={color} strokeOpacity="0.5" strokeWidth="5" strokeLinejoin="round" />
      )}
      {dots.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={poly.length >= 3 ? 1.5 : 3.2} fill={color} />)}
    </svg>
  );
}

export default function ProvincesView({ mountains, lang, t, activeProvince, onPick }) {
  const [sort, setSort] = useState('peaks');

  const provinces = useMemo(() => {
    const map = new Map();
    for (const m of mountains) {
      if (!m.province || !Number.isFinite(m.lat) || !Number.isFinite(m.lon)) continue;
      if (!map.has(m.province)) map.set(m.province, []);
      map.get(m.province).push(m);
    }
    return [...map.entries()].map(([name, items]) => ({
      name,
      count: items.length,
      max: Math.max(0, ...items.map((m) => elevationOf(m) || 0)),
      shape: buildShape(items),
    }));
  }, [mountains]);

  const sorted = useMemo(() => {
    const list = [...provinces];
    if (sort === 'peaks') list.sort((a, b) => b.count - a.count);
    else if (sort === 'highest') list.sort((a, b) => b.max - a.max);
    else list.sort((a, b) => provinceLabel(a.name, lang).localeCompare(provinceLabel(b.name, lang)));
    return list;
  }, [provinces, sort, lang]);

  return (
    <div className="scroll-area h-full overflow-y-auto px-4 pb-6 pt-5 sm:px-8">
      <div className="mx-auto max-w-[1100px]">
        <div className="text-center">
          <h2 className="serif text-2xl font-bold">{t('provincesTitle')}</h2>
          <p className="mt-1 text-[12px] text-[var(--muted)]">{t('provincesSub')}</p>
        </div>

        <div className="mt-4 flex justify-center">
          <div className="segmented" role="group" aria-label={t('sortLabel')}>
            {[['peaks', t('provSortPeaks')], ['highest', t('provSortHighest')], ['name', t('provSortName')]].map(([key, label]) => (
              <button key={key} onClick={() => setSort(key)} aria-pressed={sort === key}>{label}</button>
            ))}
          </div>
        </div>

        <ul className="mt-6 grid grid-cols-3 gap-x-1 gap-y-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {sorted.map((p) => {
            const active = activeProvince === p.name;
            return (
              <li key={p.name}>
                <button
                  onClick={() => onPick(p.name)}
                  className={`province-tile w-full ${active ? 'bg-[var(--forest-soft)]' : ''}`}
                  aria-label={`${provinceLabel(p.name, lang)}, ${p.count} ${t('provPeaks')}`}
                >
                  <span className="block aspect-square w-[88%] max-w-[120px]"><Shape shape={p.shape} color={toneColor(p.max)} /></span>
                  <span className="line-clamp-2 min-h-[2.4em] w-full px-0.5 text-[13px] font-bold leading-tight">{provinceLabel(p.name, lang)}</span>
                  <span className="text-[12px] font-semibold tabular-nums text-[var(--muted)]">
                    {sort === 'highest' ? `${formatNumber(p.max, lang)} m` : formatNumber(p.count, lang)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
