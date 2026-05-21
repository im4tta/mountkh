import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { I18N } from './lib/i18n';
import { useLocalStorage } from './hooks/useLocalStorage';
import { normalizeName, getMountainNames, findNameMatch, haversine } from './lib/utils';
import Header from './components/Header';
import ListView from './components/ListView';
import MapView from './components/MapView';
import DetailPanel from './components/DetailPanel';
import Sidebar from './components/Sidebar';
import StatsBar from './components/StatsBar';
import Toast from './components/Toast';
import Splash from './components/Splash';

function useTheme() {
  const [theme, setTheme] = useLocalStorage('mountkh_theme', '');
  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (t) => {
      if (t === 'dark' || (!t && systemDark.matches)) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };
    apply(theme);
    const listener = (e) => { if (!theme) apply(e.matches ? 'dark' : 'light'); };
    systemDark.addEventListener('change', listener);
    return () => systemDark.removeEventListener('change', listener);
  }, [theme]);
  const toggle = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  return [theme || 'light', toggle];
}

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [lang, setLang] = useLocalStorage('mountkh_lang', 'km');
  const [favorites, setFavorites] = useLocalStorage('mountkh_favs', []);
  const [gmapsKey, setGmapsKey] = useLocalStorage('mountkh_gmaps_key', '');
  const [gmapsReady, setGmapsReady] = useState(false);

  const [mountainsRaw, setMountainsRaw] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [fcode, setFcode] = useState('');
  const [country, setCountry] = useState('');
  const [province, setProvince] = useState('');
  const [sort, setSort] = useState('name');
  const [favFilter, setFavFilter] = useState(false);

  const [view, setView] = useState('list');
  const [layout, setLayout] = useLocalStorage('mountkh_layout', 'grid');
  const [provider, setProvider] = useState('osm');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailMountain, setDetailMountain] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [toast, setToast] = useState('');

  const t = useCallback((key) => {
    return I18N[lang]?.[key] ?? key;
  }, [lang]);

  // Load data
  useEffect(() => {
    let cancelled = false;
    fetch('/mountains-kh.json')
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const processed = data.map(m => ({
          ...m,
          _name: m.name || m.ascii || '',
          elev: m.elev || null,
          dem: m.dem || null,
        }));
        setMountainsRaw(processed);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load data:', err);
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Filtered mountains
  const filtered = useMemo(() => {
    let res = [...mountainsRaw];
    const q = search.trim().toLowerCase();
    if (q) {
      res = res.filter(m =>
        m._name.toLowerCase().includes(q) ||
        (m.ascii && m.ascii.toLowerCase().includes(q)) ||
        (m.alt && m.alt.toLowerCase().includes(q))
      );
    }
    if (fcode) res = res.filter(m => m.fcode === fcode);
    if (country) res = res.filter(m => m.country === country);
    if (province) res = res.filter(m => m.province === province);
    if (activeTab === 'mountain') res = res.filter(m => m.fcode === 'MT');
    else if (activeTab === 'hill') res = res.filter(m => m.fcode === 'HLL');
    else if (activeTab === 'peak') res = res.filter(m => m.fcode === 'PK');
    else if (activeTab === 'favorites') res = res.filter(m => favorites.includes(String(m.id)));
    else if (activeTab === 'elevation') res = res.filter(m => (m.elev || m.dem) > 0);
    if (favFilter) res = res.filter(m => favorites.includes(String(m.id)));

    if (sort === 'name') res.sort((a, b) => a._name.localeCompare(b._name));
    else if (sort === 'elev-desc') res.sort((a, b) => (b.elev || 0) - (a.elev || 0));
    else if (sort === 'elev-asc') res.sort((a, b) => (a.elev || 99999) - (b.elev || 99999));

    return res;
  }, [mountainsRaw, search, fcode, country, province, activeTab, favorites, favFilter, sort]);

  const provinces = useMemo(() => {
    return [...new Set(mountainsRaw.map(m => m.province).filter(Boolean))].sort();
  }, [mountainsRaw]);

  const highest = useMemo(() => {
    return mountainsRaw.reduce((max, m) => Math.max(max, m.elev || 0), 0);
  }, [mountainsRaw]);

  const withElevCount = useMemo(() => {
    return mountainsRaw.filter(m => (m.elev || m.dem) > 0).length;
  }, [mountainsRaw]);

  const isFav = useCallback((id) => favorites.includes(String(id)), [favorites]);

  const toggleFav = useCallback((id) => {
    setFavorites(prev => {
      const s = String(id);
      if (prev.includes(s)) return prev.filter(x => x !== s);
      return [...prev, s];
    });
  }, [setFavorites]);

  const showDetail = useCallback((m) => {
    setDetailMountain(m);
    setDetailOpen(true);
  }, []);

  const hideDetail = useCallback(() => {
    setDetailOpen(false);
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        hideDetail();
        setSidebarOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [hideDetail]);

  // Google Maps init callback
  const handleGmapsInit = useCallback(() => {
    setGmapsReady(true);
  }, []);

  // PWA service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // Language HTML attribute
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <div className="h-full flex flex-col bg-[var(--bg)]">
      {loading && <Splash visible={loading} />}

      <Header
        search={search}
        onSearch={setSearch}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        fcode={fcode}
        onFcodeChange={setFcode}
        country={country}
        onCountryChange={setCountry}
        province={province}
        onProvinceChange={setProvince}
        sort={sort}
        onSortChange={setSort}
        favFilter={favFilter}
        onFavFilterChange={setFavFilter}
        view={view}
        onToggleView={() => setView(v => v === 'list' ? 'map' : 'list')}
        layout={layout}
        onToggleLayout={() => setLayout(l => l === 'grid' ? 'list' : 'grid')}
        theme={theme}
        onToggleTheme={toggleTheme}
        lang={lang}
        onToggleLang={() => setLang(l => l === 'km' ? 'en' : 'km')}
        onMenu={() => setSidebarOpen(true)}
        provider={provider}
        onProviderChange={setProvider}
        provinces={provinces}
        t={t}
      />

      <StatsBar
        total={mountainsRaw.length}
        showing={filtered.length}
        hasSearch={search.trim()}
        provider={provider}
        gmapsReady={gmapsReady}
        t={t}
      />

      <main className="flex-1 overflow-hidden relative">
        {view === 'list' ? (
          <ListView
            mountains={filtered}
            favorites={favorites}
            onToggleFav={toggleFav}
            onSelect={showDetail}
            lang={lang}
            layout={layout}
          />
        ) : (
          <MapView
            mountains={filtered}
            provider={provider}
            gmapsReady={gmapsReady}
            gmapsKey={gmapsKey}
            onInitGmaps={handleGmapsInit}
            onSelect={showDetail}
            theme={theme}
          />
        )}
      </main>

      <DetailPanel
        mountain={detailMountain}
        open={detailOpen}
        onClose={hideDetail}
        isFav={isFav(detailMountain?.id)}
        onToggleFav={toggleFav}
        t={t}
        lang={lang}
        theme={theme}
      />

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        total={mountainsRaw.length}
        highest={highest}
        withElev={withElevCount}
        t={t}
        lang={lang}
        gmapsKey={gmapsKey}
        onSaveKey={(key) => { setGmapsKey(key); showToast(t('gmapsKeyToast')); }}
      />

      <Toast message={toast} onHide={() => setToast('')} />
    </div>
  );
}
