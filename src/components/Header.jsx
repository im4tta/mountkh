import { useEffect, useRef } from 'react';
import { Menu, Map as MapIcon, List, Search, Moon, Sun, Shuffle, SlidersHorizontal, X } from 'lucide-react';
import MountainGlyph from './MountainGlyph';

const TABS = [
  { key: 'all', label: 'tabAll' },
  { key: 'mountain', label: 'tabMountain' },
  { key: 'hill', label: 'tabHill' },
  { key: 'peak', label: 'tabPeak' },
  { key: 'high', label: 'tabHigh' },
  { key: 'favorites', label: 'tabFavorites' },
];

export default function Header({
  search, onSearch, activeTab, onTabChange,
  view, onViewChange,
  theme, onToggleTheme, lang, onToggleLang, onMenu, onHome,
  sort, onSortChange, filtersOpen, onToggleFilters,
  filterCount, onClearFilters, onShuffle, t,
}) {
  const searchRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || document.activeElement?.isContentEditable;
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <header className="relative z-40 shrink-0 border-b border-[var(--rule)] bg-[color-mix(in_srgb,var(--paper)_95%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2.5 sm:px-6">
        <button onClick={onMenu} className="icon-btn lg:hidden" aria-label={t('menu')}>
          <Menu className="h-5 w-5" />
        </button>

        <button
          onClick={onHome}
          className="group flex shrink-0 items-center gap-2.5 rounded-sm text-left focus-visible:outline-offset-4"
          title={t('home')}
          aria-label={t('home')}
        >
          <MountainGlyph className="h-7 w-7 text-[var(--forest)] transition-transform group-hover:-translate-y-0.5" />
          <div className="leading-none">
            <div className="serif text-[19px] font-bold tracking-tight">Mount<span className="text-[var(--rust)]">KH</span></div>
            <div className="mt-1 hidden text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)] sm:block">ភ្នំកម្ពុជា · Field guide</div>
          </div>
        </button>

        <div className="relative ml-auto w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            className="field field-search h-10 text-[12px] [&::-webkit-search-cancel-button]:hidden"
          />
          {search ? (
            <button onClick={() => { onSearch(''); searchRef.current?.focus(); }} className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-[var(--muted)] hover:text-[var(--ink)]" aria-label={t('clearSearch')}>
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-[var(--rule)] px-1.5 py-0.5 text-[9px] text-[var(--muted)]">/</kbd>
          )}
        </div>

        <nav className="flex shrink-0 items-center gap-0.5">
          <button onClick={onShuffle} className="icon-btn hidden sm:inline-flex" title={t('random')} aria-label={t('random')}><Shuffle className="h-4 w-4" /></button>
          <button
            onClick={() => onViewChange(view === 'list' ? 'map' : view === 'map' ? 'terrain' : 'list')}
            className="icon-btn sm:hidden"
            title={t('viewLabel')}
            aria-label={t('viewLabel')}
          >
            {view === 'list' ? <MapIcon className="h-4 w-4" /> : view === 'map' ? <MountainGlyph name="mountain" className="h-4 w-4" /> : <List className="h-4 w-4" />}
          </button>

          <div className="hidden items-center rounded-sm border border-[var(--rule)] p-0.5 sm:flex" role="group" aria-label={t('viewLabel') || 'View'}>
            {[
              ['list', t('listView'), <List className="h-3.5 w-3.5" />],
              ['map', t('mapView'), <MapIcon className="h-3.5 w-3.5" />],
              ['terrain', t('terrainView') || '3D', <MountainGlyph name="mountain" className="h-3.5 w-3.5" />],
            ].map(([key, label, icon]) => (
              <button
                key={key}
                onClick={() => onViewChange(key)}
                title={label}
                aria-label={label}
                aria-pressed={view === key}
                className={`grid h-7 w-7 place-items-center rounded-sm transition-colors ${view === key ? 'bg-[var(--forest)] text-white' : 'text-[var(--muted)] hover:text-[var(--ink)]'}`}
              >
                {icon}
              </button>
            ))}
          </div>
          <button onClick={onToggleLang} className="icon-btn w-9 text-[10px] font-extrabold uppercase" aria-label={t('langLabel')}>{lang === 'km' ? 'EN' : 'KM'}</button>
          <button onClick={onToggleTheme} className="icon-btn" aria-label="Toggle theme">{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
          <button onClick={onMenu} className="icon-btn hidden lg:inline-flex" aria-label={t('menu')}><Menu className="h-4 w-4" /></button>
        </nav>
      </div>

      <div className="border-t border-[var(--rule)]">
        <div className="mx-auto flex max-w-[1400px] items-end gap-3 px-4 sm:px-6">
          <nav className="no-scrollbar flex min-w-0 flex-1 items-end gap-4 overflow-x-auto" aria-label={t('filter')}>
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => onTabChange(tab.key)}
                  className={`shrink-0 border-b-2 py-2 text-[11px] font-semibold uppercase tracking-wide transition-colors ${active
                    ? 'border-[var(--rust)] text-[var(--ink)]'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
                  }`}
                  aria-pressed={active}
                >
                  {t(tab.label)}
                </button>
              );
            })}
          </nav>
          <div className="flex shrink-0 items-center gap-2 py-1.5">
            <select value={sort} onChange={(e) => onSortChange(e.target.value)} aria-label={t('sortLabel')} className="h-7 max-w-40 border-b border-[var(--rule)] bg-transparent pr-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] focus:outline-none">
              <option value="elev-desc">{t('sortElevDesc')}</option>
              <option value="name">{t('sortName')}</option>
              <option value="elev-asc">{t('sortElevAsc')}</option>
            </select>
            <button
              onClick={onToggleFilters}
              className={`flex items-center gap-1.5 border-b-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${filtersOpen || filterCount ? 'border-[var(--forest)] text-[var(--forest)]' : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'}`}
              aria-expanded={filtersOpen}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('filters')}</span>
              {filterCount > 0 && <span className="text-[9px]">({filterCount})</span>}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
