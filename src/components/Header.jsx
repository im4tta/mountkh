import { useState, useRef, useEffect } from 'react';
import { Menu, Map as MapIcon, List, Settings, Search, Moon, Sun, Heart, Mountain, ChevronDown } from 'lucide-react';
import { FCODE_META } from '../lib/utils';

const TABS = [
  { key: 'all', label: 'tabAll', icon: null },
  { key: 'mountain', label: 'tabMountain', icon: Mountain },
  { key: 'hill', label: 'tabHill', icon: Mountain },
  { key: 'peak', label: 'tabPeak', icon: Mountain },
  { key: 'favorites', label: 'tabFavorites', icon: Heart },
  { key: 'elevation', label: 'tabElevation', icon: null },
];

export default function Header({
  search, onSearch,
  activeTab, onTabChange,
  fcode, onFcodeChange,
  country, onCountryChange,
  province, onProvinceChange,
  sort, onSortChange,
  favFilter, onFavFilterChange,
  view, onToggleView,
  theme, onToggleTheme,
  lang, onToggleLang,
  onMenu,
  provider, onProviderChange,
  provinces,
  t,
}) {
  const [showFilters, setShowFilters] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <header className="shrink-0 border-b border-[var(--border)] bg-[var(--bg-elevated)]">
      <div className="flex items-center gap-2 px-3 py-2">
        <button onClick={onMenu} className="p-2 rounded-lg hover:bg-[var(--border)] text-[var(--text-secondary)]" aria-label="Menu">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold flex items-center gap-1.5 mr-auto">
          <Mountain className="w-5 h-5 text-[var(--accent)]" />
          MountKH
        </h1>

        <div className="flex items-center rounded-lg border border-[var(--border)] overflow-hidden bg-[var(--bg)]">
          <button
            onClick={() => onProviderChange('osm')}
            className={`px-2.5 py-1 text-xs font-medium ${provider === 'osm' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--border)]'}`}
          >
            OSM
          </button>
          <button
            onClick={() => onProviderChange('gmaps')}
            className={`px-2.5 py-1 text-xs font-medium ${provider === 'gmaps' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--border)]'}`}
          >
            GMaps
          </button>
        </div>

        <button onClick={onToggleLang} className="p-2 rounded-lg hover:bg-[var(--border)] text-[var(--text-secondary)] text-xs font-bold w-9" aria-label="Switch language">
          {lang}
        </button>

        <button onClick={onToggleTheme} className="p-2 rounded-lg hover:bg-[var(--border)] text-[var(--text-secondary)]" aria-label="Toggle theme">
          {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>

        <button onClick={onToggleView} className="p-2 rounded-lg hover:bg-[var(--border)] text-[var(--text-secondary)]" aria-label="Toggle view">
          {view === 'list' ? <MapIcon className="w-5 h-5" /> : <List className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex items-center gap-2 px-3 pb-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`p-2 rounded-lg border ${showFilters ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-light)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--border)]'}`}
          aria-label="Filter"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 gap-2 px-3 pb-2">
          <select
            value={fcode}
            onChange={(e) => onFcodeChange(e.target.value)}
            className="px-2.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="">{t('allTypes')}</option>
            {Object.entries(FCODE_META).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {lang === 'km' ? v.labelKm : v.label}</option>
            ))}
          </select>
          <select
            value={country}
            onChange={(e) => onCountryChange(e.target.value)}
            className="px-2.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="">{t('allCountries')}</option>
            <option value="KH">🇰🇭 Cambodia</option>
            <option value="TH">🇹🇭 Thailand</option>
            <option value="LA">🇱🇦 Laos</option>
            <option value="KH,TH">🇰🇭+🇹🇭 Border</option>
            <option value="KH,LA,TH">🇰🇭+🇱🇦+🇹🇭 Triple</option>
          </select>
          <select
            value={province}
            onChange={(e) => onProvinceChange(e.target.value)}
            className="px-2.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="">{t('allProvinces')}</option>
            {provinces.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            className="px-2.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="name">{t('sortName')}</option>
            <option value="elev-desc">{t('sortElevDesc')}</option>
            <option value="elev-asc">{t('sortElevAsc')}</option>
          </select>
          <label className="col-span-2 flex items-center gap-2 px-2.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={favFilter}
              onChange={(e) => onFavFilterChange(e.target.checked)}
              className="w-4 h-4 accent-[var(--accent)]"
            />
            <Heart className={`w-4 h-4 ${favFilter ? 'text-[var(--accent)] fill-current' : 'text-[var(--text-secondary)]'}`} />
            {t('favorites').replace('♥ ', '')}
          </label>
        </div>
      )}

      <div className="flex items-center gap-1 px-3 pb-2 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${active ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--border)]'}`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {t(tab.label)}
            </button>
          );
        })}
      </div>
    </header>
  );
}
