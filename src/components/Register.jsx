import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Heart, MapPin, Compass, SearchX, ArrowUp } from 'lucide-react';
import MountainGlyph from './MountainGlyph';
import { FCODE_META, COUNTRY_META, elevationOf, elevationPercent, formatDistance } from '../lib/utils';

const Row = memo(function Row({ mountain: m, index, isFav, onToggleFav, onSelect, lang, t, skin, dist }) {
  const meta = FCODE_META[m.fcode] || FCODE_META.PT;
  const country = COUNTRY_META[m.country] || COUNTRY_META.KH;
  const elev = elevationOf(m);
  const label = lang === 'km' ? meta.labelKm : meta.label;
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(m)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(m); } }}
      className={`feature-row group ${skin === 'explorer' ? 'row-explorer' : 'row-atlas'}`}
    >
      <span className="serif text-xl text-[var(--rule-strong)] transition-colors group-hover:text-[var(--rust)]">
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="serif truncate text-[17px] font-semibold leading-tight text-[var(--ink)]" title={m._name}>{m._name}</h3>
          <MountainGlyph className="h-3.5 w-3.5 shrink-0 text-[var(--forest)] opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-2 text-[11px] text-[var(--muted)]">
          <span className="chip px-1.5 py-0 text-[9px]">{label}</span>
          <span className="shrink-0">{country.flag}</span>
          {m.province && <span className="flex min-w-0 items-center gap-1 truncate"><MapPin className="h-3 w-3 shrink-0" />{m.province}</span>}
          {dist != null && <span className="shrink-0 font-bold tabular-nums text-[var(--rust)]">{formatDistance(dist)}</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 sm:gap-5">
        <div className="hidden w-24 sm:block">
          <div className="serif text-right text-lg font-bold leading-none text-[var(--ink)]">
            {elev ? elev.toLocaleString() : '—'}<span className="ml-1 text-[10px] font-normal text-[var(--muted)]">m</span>
          </div>
          <div className="elev-bar mt-1.5"><div className="elev-fill" style={{ width: `${elevationPercent(elev)}%` }} /></div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFav(m.id); }}
          className={`grid h-8 w-8 place-items-center rounded-full transition-colors ${isFav ? 'text-[var(--rust)]' : 'text-[var(--muted)] opacity-40 hover:opacity-100'}`}
          aria-label={isFav ? t('removeFavorite') : t('addFavorite')}
          aria-pressed={isFav}
        >
          <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
        </button>
      </div>
    </article>
  );
});

function EmptyState({ t, onClear }) {
  return (
    <div className="px-6 py-24 text-center">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-dashed border-[var(--rule-strong)] text-[var(--rust)]"><SearchX className="h-8 w-8" /></div>
      <h2 className="serif mt-6 text-3xl font-bold">{t('noResultsTitle')}</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">{t('noResultsBody')}</p>
      <button onClick={onClear} className="btn mt-6"><Compass className="h-4 w-4" /> {t('clearFilters')}</button>
    </div>
  );
}

export default function Register({
  mountains, favorites, onToggleFav, onSelect, lang, t, onClear,
  skin = 'atlas', scrollRef: externalRef, compact = false, distances = null,
}) {
  const localRef = useRef(null);
  const scrollRef = externalRef || localRef;
  const [scrolled, setScrolled] = useState(false);

  const virtualizer = useVirtualizer({
    count: mountains.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 72,
    overscan: 8,
    getItemKey: (index) => mountains[index]?.id ?? index,
  });

  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [mountains, scrollRef]);

  const onScroll = useCallback((e) => setScrolled(e.currentTarget.scrollTop > 700), []);
  const backToTop = useCallback(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), [scrollRef]);

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scrollRef} onScroll={onScroll} className={`scroll-area h-full ${compact ? '' : ''}`}>
        <div className="mx-auto max-w-[980px] px-5 pb-8 sm:px-8">
          <div className="sticky top-0 z-10 flex items-end justify-between border-b-2 border-[var(--ink)] bg-[color-mix(in_srgb,var(--paper)_94%,transparent)] py-3 backdrop-blur-md">
            <div>
              <p className="eyebrow">{t('registerIndex')}</p>
              <h2 className="serif mt-0.5 text-xl font-bold tracking-tight sm:text-2xl">{t('allFeatures')}</h2>
            </div>
            <span className="serif text-sm italic text-[var(--muted)]">{mountains.length.toLocaleString()} {t('statsFeatures')}</span>
          </div>

          {mountains.length === 0 ? <EmptyState t={t} onClear={onClear} /> : (
            <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const m = mountains[virtualRow.index];
                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    className="absolute left-0 top-0 w-full"
                    style={{ transform: `translateY(${virtualRow.start}px)` }}
                  >
                    <Row
                      mountain={m} index={virtualRow.index}
                      isFav={favorites.includes(String(m.id))}
                      onToggleFav={onToggleFav} onSelect={onSelect}
                      lang={lang} t={t} skin={skin} dist={distances ? distances[m.id] : null}
                    />
                  </div>
                );
              })}
            </div>
          )}
          {mountains.length > 0 && <p className="mt-6 text-center text-[10px] italic text-[var(--muted)]">{t('registerEnd')}</p>}
        </div>
      </div>
      {scrolled && (
        <button onClick={backToTop} className="btn btn-solid absolute bottom-5 right-5 z-30 h-10 w-10 rounded-full p-0 shadow-[var(--shadow-lift)]" aria-label={t('backToTop')}>
          <ArrowUp className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
