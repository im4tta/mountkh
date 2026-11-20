import { Search, Sparkles, Flame, Map as MapIcon } from 'lucide-react';
import Register from './Register';
import MountainGlyph from './MountainGlyph';
import { elevationOf } from '../lib/utils';

const CHIPS = [
  ['all', '✨ ', 'tabAll'],
  ['mountain', '⛰ ', 'tabMountain'],
  ['high', '🔥 ', 'tabHigh'],
  ['favorites', '♥ ', 'tabFavorites'],
];

function Stats({ total, highest, withElev, t }) {
  return (
    <div className="mx-auto grid max-w-[1400px] grid-cols-3 gap-2 px-4 pb-6 sm:gap-3 sm:px-8">
      {[
        { icon: MountainGlyph, value: total.toLocaleString(), label: t('statTotal'), tone: 'forest' },
        { icon: Flame, value: `${highest.toLocaleString()} m`, label: t('statHighest'), tone: 'coral' },
        { icon: MapIcon, value: withElev.toLocaleString(), label: t('statWithElev'), tone: 'sky' },
      ].map(({ icon: Icon, value, label, tone }) => (
        <div key={label} className="explorer-stat">
          <span className={`explorer-stat-icon ${tone}`}><Icon className="h-5 w-5" /></span>
          <div className="min-w-0"><div className="truncate text-lg font-black leading-none sm:text-2xl">{value}</div><div className="mt-1 text-[9px] font-extrabold uppercase tracking-wider text-[var(--muted)]">{label}</div></div>
        </div>
      ))}
    </div>
  );
}

function Featured({ items, t, onSelect }) {
  return (
    <section className="mx-auto max-w-[1400px] px-4 pb-8 sm:px-8">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[var(--rust)]" />
        <h2 className="text-xl font-black">{t('featuredTitle')}</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((m, i) => (
          <button key={m.id} onClick={() => onSelect(m)} className="explorer-card">
            <span className="absolute right-3 top-3 text-2xl">{['🏔️', '⛰️', '🔥', '✨'][i]}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--rust)]">0{i + 1}</span>
            <div className="mt-5 truncate text-sm font-extrabold">{m._name}</div>
            <div className="truncate text-[10px] text-[var(--muted)]">{m.province}</div>
            <div className="mt-3 text-xl font-black text-[var(--forest)]">{elevationOf(m)?.toLocaleString() ?? '—'} <span className="text-[10px]">m</span></div>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function ExplorerHome({
  mountains, featured, total, highest, withElev, favorites,
  search, onSearch, activeTab, onTabChange,
  onToggleFav, onSelect, lang, t, onClear, onExploreMap,
}) {
  return (
    <div className="skin-explorer scroll-area h-full overflow-y-auto bg-[var(--paper)]">
      <div className="mx-auto grid max-w-[1400px] gap-8 px-4 pb-6 pt-6 sm:px-8 sm:pt-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
        <div>
          <span className="explorer-tag">✦ ស្វាគមន៍ · Welcome to the highlands</span>
          <h1 className="mt-5 text-[clamp(40px,11vw,82px)] font-black leading-[0.96] tracking-tight">
            Find your<br /><span className="text-[var(--forest)]">next</span> <span className="text-[var(--rust)]">summit.</span>
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed sm:text-sm text-[var(--muted)]">
            1,605 mountains, hills and hidden peaks are waiting. Search by name, follow the ridges, and save the ones you love. Your next adventure starts right here.
          </p>
          <div className="explorer-search mt-6">
            <Search className="h-4 w-4 text-[var(--muted)]" />
            <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={t('searchPlaceholder')} aria-label={t('searchPlaceholder')} type="search" enterKeyHint="search" className="min-w-0 flex-1 bg-transparent text-[16px] sm:text-[13px] outline-none placeholder:text-[var(--muted)]" />
            <button onClick={onExploreMap} className="explorer-search-btn" aria-label={t('exploreMap')}><MapIcon className="h-4 w-4 sm:hidden" /><span className="hidden sm:inline">{t('exploreMap')} ↗</span></button>
          </div>
          <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {CHIPS.map(([key, emoji, label]) => (
              <button key={key} onClick={() => onTabChange(key)} className={`explorer-chip shrink-0 ${activeTab === key ? 'on' : ''}`}>{emoji}{t(label)}</button>
            ))}
          </div>
        </div>

        <div className="explorer-scene hidden sm:block" aria-hidden="true">
          <div className="scene-blob" />
          <div className="scene-sun" />
          <div className="scene-cloud" />
          <div className="scene-mountain" />
          <div className="scene-mountain scene-mountain-two" />
          <div className="scene-card">Phnum Aôral<small>1,813 m · the highest!</small></div>
        </div>
      </div>

      <Stats total={total} highest={highest} withElev={withElev} t={t} />
      <Featured items={featured} t={t} onSelect={onSelect} />

      <div className="mx-auto flex h-[min(640px,80dvh)] max-w-[980px] flex-col px-4 pb-24 md:pb-10 sm:px-8">
        <Register
          mountains={mountains} favorites={favorites} onToggleFav={onToggleFav}
          onSelect={onSelect} lang={lang} t={t} onClear={onClear} skin="explorer"
        />
      </div>
    </div>
  );
}
