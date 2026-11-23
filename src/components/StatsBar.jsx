import { X, MapPin } from 'lucide-react';
import { provinceLabel } from '../lib/provinces';

export default function StatsBar({ total, showing, search, provider, province, onClearProvince, lang, t }) {
  return (
    <div className="relative z-20 flex shrink-0 items-center justify-between gap-3 border-b border-[var(--rule)] bg-[var(--card)] px-4 py-1.5 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 text-[11px] text-[var(--muted)]">
        <span className="serif text-[13px] font-bold text-[var(--ink)]">{showing.toLocaleString()}</span>
        <span className="shrink-0">{t('results')}</span>
        {province ? (
          <button onClick={onClearProvince} className="flex min-h-8 min-w-0 items-center gap-1 rounded-full bg-[var(--forest-soft)] pl-2.5 pr-2 text-[11px] font-bold text-[var(--forest)]" aria-label={`${t('clearFilters')}: ${provinceLabel(province, lang)}`}>
            <MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{provinceLabel(province, lang)}</span><X className="h-3 w-3 shrink-0" />
          </button>
        ) : (showing !== total && <span className="truncate">· {total.toLocaleString()} {t('statsFeatures')}</span>)}
        {search && <span className="hidden truncate italic sm:inline">“{search}”</span>}
      </div>
      <div className="hidden shrink-0 items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] sm:flex">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--forest)]" />
        <span className="text-[var(--muted)]">{provider === 'google' ? t('googleMaps') : t('osm')}</span>
      </div>
    </div>
  );
}
