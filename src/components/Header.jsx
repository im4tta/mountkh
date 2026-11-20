import { useEffect, useRef, useState } from 'react';
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
  const [mobileSearch, setMobileSearch] = useState(false);
  const viewOptions = [
    ['list', t('listView'), <List className="h-4 w-4" />],
    ['map', t('mapView'), <MapIcon className="h-4 w-4" />],
    ['terrain', t('terrainView') || '3D', <MountainGlyph name="mountain" className="h-4 w-4" />],
  ];

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
    <>
    <header className="relative z-40 shrink-0 border-b border-[var(--rule)] bg-[color-mix(in_srgb,var(--paper)_95%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] items-center gap-1 px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:gap-3 sm:px-6 sm:py-2.5">
        <button onClick={onMenu} className="icon-btn lg:hidden" aria-label={t('menu')}>
          <Menu className="h-5 w-5" />
        </button>

        <button
          onClick={onHome}
          className="group flex min-w-0 shrink-0 items-center gap-2 rounded-sm text-left focus-visible:outline-offset-4"
          title={t('home')}
          aria-label={t('home')}
        >
          <MountainGlyph className="h-7 w-7 text-[var(--forest)] transition-transform group-hover:-translate-y-0.5" />
          <div className="leading-none">
            <div className="serif text-[19px] font-bold tracking-tight">Mount<span className="text-[var(--rust)]">KH</span></div>
            <div className="mt-1 hidden text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)] sm:block">ភ្នំកម្ពុជា · Field guide</div>
          </div>
        </button>

        <div className={`${mobileSearch ? 'absolute inset-x-2 top-1/2 z-10 -translate-y-1/2 sm:relative sm:inset-auto sm:top-auto sm:translate-y-0' : 'relative hidden sm:block'} ml-auto w-full sm:max-w-sm`}>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            onBlur={() => { if (!search) setMobileSearch(false); }}
            enterKeyHint="search"
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            className="field field-search h-11 text-[16px] sm:h-10 sm:text-[12px] [&::-webkit-search-cancel-button]:hidden"
          />
          {search || mobileSearch ? (
            <button onMouseDown={(e) => e.preventDefault()} onClick={() => { if (search) { onSearch(''); searchRef.current?.focus(); } else setMobileSearch(false); }} className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded text-[var(--muted)] hover:text-[var(--ink)]" aria-label={t('clearSearch')}>
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute hidden sm:block right-2.5 top-1/2 -translate-y-1/2 rounded border border-[var(--rule)] px-1.5 py-0.5 text-[9px] text-[var(--muted)]">/</kbd>
          )}
        </div>

        <nav className="ml-auto flex shrink-0 items-center gap-0.5 sm:ml-0">
          <button onClick={() => { setMobileSearch(true); setTimeout(() => searchRef.current?.focus(), 0); }} className="icon-btn sm:hidden" aria-label={t('searchPlaceholder')} data-active={search ? 'true' : undefined}><Search className="h-5 w-5" /></button>
          <button onClick={onShuffle} className="icon-btn hidden md:inline-flex" title={t('random')} aria-label={t('random')}><Shuffle className="h-4 w-4" /></button>
          <div className="hidden items-center rounded-sm border border-[var(--rule)] p-0.5 md:flex" role="group" aria-label={t('viewLabel') || 'View'}>
            {viewOptions.map(([key, label, icon]) => (
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
          <button onClick={onToggleLang} className="icon-btn w-10 text-[11px] font-extrabold uppercase" aria-label={t('langLabel')}>{lang === 'km' ? 'EN' : 'KM'}</button>
          <button onClick={onToggleTheme} className="icon-btn" aria-label="Toggle theme">{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
          <button onClick={onMenu} className="icon-btn hidden lg:inline-flex" aria-label={t('menu')}><Menu className="h-4 w-4" /></button>
        </nav>
      </div>

      <div className="border-t border-[var(--rule)]">
        <div className="mx-auto flex max-w-[1400px] items-end gap-3 pl-4 pr-2 sm:px-6">
          <nav className="no-scrollbar flex min-w-0 flex-1 items-end gap-5 sm:gap-4 overflow-x-auto" aria-label={t('filter')}>
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => onTabChange(tab.key)}
                  className={`shrink-0 border-b-2 py-3 text-[13px] sm:py-2 sm:text-[11px] font-semibold uppercase tracking-wide transition-colors ${active
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
            <select value={sort} onChange={(e) => onSortChange(e.target.value)} aria-label={t('sortLabel')} className="hidden h-7 max-w-40 border-b sm:block border-[var(--rule)] bg-transparent pr-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] focus:outline-none">
              <option value="elev-desc">{t('sortElevDesc')}</option>
              <option value="name">{t('sortName')}</option>
              <option value="elev-asc">{t('sortElevAsc')}</option>
            </select>
            <button
              onClick={onToggleFilters}
              className={`flex min-h-10 min-w-10 items-center justify-center gap-1.5 border-b-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${filtersOpen || filterCount ? 'border-[var(--forest)] text-[var(--forest)]' : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'}`}
              aria-expanded={filtersOpen}
            >
              <SlidersHorizontal className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">{t('filters')}</span>
              {filterCount > 0 && <span className="text-[9px]">({filterCount})</span>}
            </button>
          </div>
        </div>
      </div>
    </header>
    <nav className="fixed inset-x-0 bottom-0 z-[900] flex border-t border-[var(--rule)] bg-[color-mix(in_srgb,var(--card)_96%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label={t('viewLabel') || 'View'}>
      {viewOptions.map(([key, label, icon]) => (
        <button
          key={key}
          onClick={() => onViewChange(key)}
          aria-pressed={view === key}
          className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${view === key ? 'text-[var(--forest)]' : 'text-[var(--muted)]'}`}
        >
          <span className={`grid h-7 w-12 place-items-center rounded-full ${view === key ? 'bg-[var(--forest-soft)]' : ''}`}>{icon}</span>
          {label}
        </button>
      ))}
      <button onClick={onShuffle} className="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-[var(--muted)]">
        <span className="grid h-7 w-12 place-items-center"><Shuffle className="h-4 w-4" /></span>
        {t('random')}
      </button>
    </nav>
    </>
  );
}
