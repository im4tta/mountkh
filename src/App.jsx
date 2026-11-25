import { lazy, Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { I18N } from './lib/i18n';
import { useLocalStorage } from './hooks/useLocalStorage';
import { elevationOf, haversine } from './lib/utils';
import Header from './components/Header';
import FilterPanel from './components/FilterPanel';
import ListView from './components/ListView';
import MapView from './components/MapView';
import ProvincesView from './components/ProvincesView';
import ErrorBoundary from './components/ErrorBoundary';

const TerrainView = lazy(() => import('./components/TerrainView'));
const SummitView = lazy(() => import('./components/SummitView'));
import DetailPanel from './components/DetailPanel';
import Sidebar from './components/Sidebar';
import StatsBar from './components/StatsBar';
import Toast from './components/Toast';
import Splash from './components/Splash';

function useTheme() {
  const [theme, setTheme] = useLocalStorage('mountkh_theme', 'light');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  const toggle = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  return [theme === 'dark' ? 'dark' : 'light', toggle];
}

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [lang, setLang] = useLocalStorage('mountkh_lang', 'km');
  const [favorites, setFavorites] = useLocalStorage('mountkh_favs', []);
  const [mountainsRaw, setMountainsRaw] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [fcode, setFcode] = useState('');
  const [country, setCountry] = useState('');
  const [province, setProvince] = useState('');
  const [elevBand, setElevBand] = useState('');
  const [sort, setSort] = useState('elev-desc');
  const [favFilter, setFavFilter] = useState(false);
  const [myPos, setMyPos] = useState(null); // kept in memory only, never stored or sent anywhere
  const [locating, setLocating] = useState(false);

  const [view, setView] = useState('list');
  const [provider, setProvider] = useState('google');
  const [homeSkin, setHomeSkin] = useLocalStorage('mountkh_home_v2', 'explorer');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailMountain, setDetailMountain] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [mapFocus, setMapFocus] = useState(null);
  const [summitMountain, setSummitMountain] = useState(null);
  const [toast, setToast] = useState('');

  const t = useCallback((key) => I18N[lang]?.[key] ?? I18N.en[key] ?? key, [lang]);

  useEffect(() => {
    let cancelled = false;
    fetch('/mountains-kh.json')
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => {
        if (cancelled) return;
        setMountainsRaw(data.map((m) => ({ ...m, _name: m.name || m.ascii || '' })));
        setLoading(false);
      })
      .catch((err) => { console.error(err); if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const distances = useMemo(() => {
    if (!myPos) return null;
    const out = {};
    for (const m of mountainsRaw) out[m.id] = haversine(myPos.lat, myPos.lon, m.lat, m.lon);
    return out;
  }, [myPos, mountainsRaw]);

  const filtered = useMemo(() => {
    let res = mountainsRaw.slice();
    const q = search.trim().toLowerCase();
    if (q) res = res.filter((m) => m._name.toLowerCase().includes(q) || m.ascii?.toLowerCase().includes(q) || m.alt?.toLowerCase().includes(q));
    if (fcode) res = res.filter((m) => m.fcode === fcode);
    if (country) res = res.filter((m) => m.country === country);
    if (province) res = res.filter((m) => m.province === province);
    if (favFilter) res = res.filter((m) => favorites.includes(String(m.id)));
    if (activeTab === 'mountain') res = res.filter((m) => m.fcode === 'MT');
    else if (activeTab === 'hill') res = res.filter((m) => m.fcode === 'HLL' || m.fcode === 'HLLS');
    else if (activeTab === 'peak') res = res.filter((m) => m.fcode === 'PK');
    else if (activeTab === 'favorites') res = res.filter((m) => favorites.includes(String(m.id)));
    else if (activeTab === 'elevation') res = res.filter((m) => (elevationOf(m) || 0) > 0);
    else if (activeTab === 'high') res = res.filter((m) => (elevationOf(m) || 0) >= 1000);
    if (elevBand === 'low') res = res.filter((m) => { const e = elevationOf(m); return e > 0 && e < 300; });
    else if (elevBand === 'mid') res = res.filter((m) => { const e = elevationOf(m); return e >= 300 && e < 1000; });
    else if (elevBand === 'high') res = res.filter((m) => (elevationOf(m) || 0) >= 1000);

    if (sort === 'elev-desc') res.sort((a, b) => (elevationOf(b) || 0) - (elevationOf(a) || 0));
    else if (sort === 'elev-asc') res.sort((a, b) => (elevationOf(a) ?? Infinity) - (elevationOf(b) ?? Infinity));
    else if (sort === 'near' && distances) res.sort((a, b) => (distances[a.id] ?? Infinity) - (distances[b.id] ?? Infinity));
    else res.sort((a, b) => a._name.localeCompare(b._name));
    return res;
  }, [mountainsRaw, search, fcode, country, province, favFilter, activeTab, elevBand, sort, favorites, distances]);

  const featured = useMemo(
    () => mountainsRaw.slice().sort((a, b) => (elevationOf(b) || 0) - (elevationOf(a) || 0)).slice(0, 4),
    [mountainsRaw]
  );
  const provinces = useMemo(() => [...new Set(mountainsRaw.map((m) => m.province).filter(Boolean))].sort(), [mountainsRaw]);
  const highest = useMemo(() => mountainsRaw.reduce((max, m) => Math.max(max, elevationOf(m) || 0), 0), [mountainsRaw]);
  const withElevCount = useMemo(() => mountainsRaw.filter((m) => (elevationOf(m) || 0) > 0).length, [mountainsRaw]);

  const filterCount = [search.trim(), fcode, country, province, elevBand, favFilter ? 'f' : '', activeTab !== 'all' ? 't' : ''].filter(Boolean).length;
  const showIntro = filterCount === 0 && sort !== 'name' && sort !== 'near';

  const clearFilters = useCallback(() => {
    setSearch(''); setFcode(''); setCountry(''); setProvince(''); setElevBand(''); setFavFilter(false); setActiveTab('all');
  }, []);

  const toggleFav = useCallback((id) => {
    setFavorites((prev) => {
      const key = String(id);
      return prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key];
    });
  }, [setFavorites]);

  const showToast = useCallback((msg) => setToast(msg), []);

  // Sort by distance needs the user's position; ask only when they pick it.
  const changeSort = useCallback((value) => {
    if (value !== 'near' || myPos) { setSort(value); return; }
    if (!navigator.geolocation) { setToast(t('nearFail')); return; }
    setLocating(true);
    setToast(t('nearLocating'));
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocating(false); setMyPos({ lat: pos.coords.latitude, lon: pos.coords.longitude }); setSort('near'); setToast(''); },
      () => { setLocating(false); setToast(t('nearFail')); },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 },
    );
  }, [myPos, t]);
  const toggleNear = useCallback(() => changeSort(sort === 'near' ? 'elev-desc' : 'near'), [changeSort, sort]);

  const goHome = useCallback(() => {
    clearFilters();
    setSort('elev-desc');
    setView('list');
    setDetailOpen(false);
    setDetailMountain(null);
    setSidebarOpen(false);
    setFiltersOpen(false);
    setMapFocus(null);
    try { history.replaceState(null, '', `${location.pathname}${location.search}`); } catch { /* ignore */ }
  }, [clearFilters]);

  const showDetail = useCallback((m) => {
    setDetailMountain(m);
    setDetailOpen(true);
    try { history.replaceState(null, '', `${location.pathname}${location.search}#m/${m.id}`); } catch { /* ignore */ }
  }, []);

  const hideDetail = useCallback(() => {
    setDetailOpen(false);
    try { history.replaceState(null, '', `${location.pathname}${location.search}`); } catch { /* ignore */ }
  }, []);

  const showOnMap = useCallback((m) => {
    setDetailOpen(false);
    setView('map');
    setMapFocus({ lat: m.lat, lon: m.lon, id: m.id, at: Date.now() });
  }, []);

  const showSummit = useCallback((m) => {
    setDetailOpen(false);
    setSummitMountain(m);
  }, []);

  const shuffle = useCallback(() => {
    const pool = filtered.length ? filtered : mountainsRaw;
    if (pool.length) showDetail(pool[Math.floor(Math.random() * pool.length)]);
  }, [filtered, mountainsRaw, showDetail]);

  useEffect(() => {
    if (!mountainsRaw.length) return;
    const openFromHash = () => {
      const match = location.hash.match(/^#m\/(\d+)$/);
      if (!match) return;
      const m = mountainsRaw.find((item) => String(item.id) === match[1]);
      if (m) { setDetailMountain(m); setDetailOpen(true); }
    };
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  }, [mountainsRaw]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') { hideDetail(); setSidebarOpen(false); setFiltersOpen(false); } };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [hideDetail]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    } else {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {});
    }
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  return (
    <div className="app-root flex h-full flex-col">
      {loading && <Splash visible={loading} />}

      <Header
        search={search} onSearch={setSearch}
        activeTab={activeTab} onTabChange={setActiveTab}
        view={view} onViewChange={setView}
        theme={theme} onToggleTheme={toggleTheme}
        lang={lang} onToggleLang={() => setLang((l) => (l === 'km' ? 'en' : 'km'))}
        onMenu={() => setSidebarOpen(true)} onHome={goHome}
        sort={sort} onSortChange={changeSort} nearBusy={locating} onToggleNear={toggleNear}
        filtersOpen={filtersOpen} onToggleFilters={() => setFiltersOpen((v) => !v)}
        filterCount={filterCount} onClearFilters={clearFilters}
        onShuffle={shuffle} t={t}
      />

      <FilterPanel
        open={filtersOpen} t={t} lang={lang}
        fcode={fcode} onFcodeChange={setFcode}
        country={country} onCountryChange={setCountry}
        province={province} onProvinceChange={setProvince} provinces={provinces}
        sort={sort} onSortChange={changeSort}
        elevBand={elevBand} onElevBandChange={setElevBand}
        favFilter={favFilter} onFavFilterChange={setFavFilter}
        onClear={clearFilters} filterCount={filterCount}
      />

      {view !== 'provinces' && (
        <StatsBar
          total={mountainsRaw.length} showing={filtered.length} search={search.trim()} provider={provider}
          province={province} onClearProvince={() => setProvince('')} lang={lang} t={t}
        />
      )}

      <main className="app-main relative min-h-0 flex-1">
        <ErrorBoundary resetKey={`${view}-${provider}`}>
        {view === 'list' ? (
          <ListView
            mountains={filtered} featured={featured} skin={homeSkin}
            total={mountainsRaw.length} highest={highest} withElev={withElevCount}
            favorites={favorites} onToggleFav={toggleFav} onSelect={showDetail}
            search={search} onSearch={setSearch}
            activeTab={activeTab} onTabChange={setActiveTab}
            lang={lang} t={t} onClear={clearFilters}
            onExploreMap={() => setView('map')} showIntro={showIntro} focus={!!province || sort === 'near'} distances={distances}
          />
        ) : view === 'provinces' ? (
          <ProvincesView
            mountains={mountainsRaw} lang={lang} t={t} activeProvince={province}
            onPick={(p) => { setProvince(p); setActiveTab('all'); setView('list'); }}
          />
        ) : view === 'map' ? (
          <MapView
            mountains={filtered} provider={provider} onProviderChange={setProvider}
            onSelect={showDetail} theme={theme} focusTarget={mapFocus} t={t} myPos={myPos}
          />
        ) : (
          <Suspense fallback={<div className="grid h-full place-items-center bg-[var(--paper)]"><div className="text-xs font-semibold text-[var(--muted)]">Loading 3D terrain…</div></div>}>
            <TerrainView
              mountains={filtered} onSelect={showDetail} theme={theme}
              focusTarget={mapFocus} onSummit={showSummit} t={t}
            />
          </Suspense>
        )}
        </ErrorBoundary>
      </main>

      <DetailPanel
        mountain={detailMountain} open={detailOpen} onClose={hideDetail}
        isFav={detailMountain ? favorites.includes(String(detailMountain.id)) : false}
        onToggleFav={toggleFav} t={t} lang={lang} theme={theme}
        onShowOnMap={showOnMap} onShowSummit={showSummit} onToast={showToast}
      />

      <Sidebar
        open={sidebarOpen} onClose={() => setSidebarOpen(false)}
        total={mountainsRaw.length} highest={highest} withElev={withElevCount}
        favoritesCount={favorites.length} t={t} lang={lang}
        homeSkin={homeSkin} onHomeSkin={setHomeSkin}
        provider={provider} onProviderChange={setProvider}
      />

      {summitMountain && (
        <Suspense fallback={<div className="fixed inset-0 z-[1100] grid place-items-center bg-[#0d1512] text-xs text-white">Loading summit view…</div>}>
          <SummitView
            mountain={summitMountain} mountains={mountainsRaw}
            onJump={setSummitMountain} lang={lang}
            onDetails={(m) => { setSummitMountain(null); showDetail(m); }}
            onClose={() => setSummitMountain(null)} t={t}
          />
        </Suspense>
      )}

      <Toast message={toast} onHide={() => setToast('')} />
    </div>
  );
}
