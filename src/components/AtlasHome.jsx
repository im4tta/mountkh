import { useMemo } from 'react';
import { Search, ArrowUpRight } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import Register from './Register';
import MountainGlyph from './MountainGlyph';
import { elevationOf } from '../lib/utils';
import { mountainMarkerSvg } from '../lib/iconmcp';

const TABS = [
  ['all', 'tabAll'], ['mountain', 'tabMountain'], ['hill', 'tabHill'],
  ['peak', 'tabPeak'], ['high', 'tabHigh'], ['favorites', 'tabFavorites'],
];

function AtlasMapPane({ mountains, featured, onSelect, theme }) {
  const pins = useMemo(() => mountains.slice(0, 240), [mountains]);
  return (
    <div className="atlas-map relative h-full w-full overflow-hidden bg-[#e7e0cf]">
      <MapContainer center={[12.5, 104.5]} zoom={7} zoomControl={false} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          attribution='&copy; <a href="https://www.google.com/maps">Google</a>'
          maxZoom={20}
        />
        {pins.map((m) => {
          const color = elevationOf(m) >= 1000 ? '#2c5f4c' : '#b0552f';
          const icon = L.divIcon({
            className: 'bg-transparent border-0',
            html: mountainMarkerSvg(color, { size: 22 }),
            iconSize: [22, 28],
            iconAnchor: [11, 26],
          });
          return <Marker key={m.id} position={[m.lat, m.lon]} icon={icon} eventHandlers={{ click: () => onSelect(m) }} />;
        })}
      </MapContainer>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-6 top-6 border border-[var(--ink)] bg-[rgba(244,239,227,.92)] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em]">
          Cardamom Highlands · 12°N
        </div>
        {featured.slice(0, 3).map((m, i) => (
          <div key={m.id} className="absolute border border-[var(--rule)] bg-[rgba(244,239,227,.9)] px-2 py-1 font-serif text-[11px] italic"
            style={{ left: `${26 + i * 17}%`, top: `${22 + i * 13}%` }}>
            {m.ascii || m._name}
          </div>
        ))}
        <div className="absolute bottom-6 left-6 grid h-14 w-14 place-items-center rounded-full border border-[var(--ink)] bg-[rgba(244,239,227,.9)] font-serif text-xs">N ↑</div>
        <div className="absolute bottom-7 right-6 border-t-2 border-[var(--ink)] pt-1 font-serif text-[11px] text-[var(--ink)]">0 ——— 50 km</div>
      </div>
    </div>
  );
}

export default function AtlasHome({
  mountains, featured, favorites, search, onSearch, activeTab, onTabChange,
  onToggleFav, onSelect, lang, t, onClear,
}) {
  return (
    <div className="skin-atlas grid h-full grid-cols-1 lg:grid-cols-[minmax(390px,42%)_1fr]">
      <div className="flex min-h-0 flex-col border-r border-[var(--rule)] bg-[var(--paper)]">
        <div className="shrink-0 border-b border-[var(--rule)] px-5 pb-5 pt-7 sm:px-8">
          <p className="eyebrow">The atlas · ភ្នំកម្ពុជា</p>
          <h1 className="serif mt-4 text-[clamp(38px,4.6vw,64px)] font-semibold leading-[0.98] tracking-tight">
            Every peak<br />has a <em className="text-[var(--forest)]">name.</em>
          </h1>
          <p className="mt-4 max-w-[440px] text-[12px] leading-relaxed text-[var(--ink-soft)]">
            Browse the complete register of Cambodia's named mountains, hills and passes. Search by local spelling, filter by province, and follow the ridges across the border.
          </p>
          <div className="mt-5 flex items-center border-b border-[var(--ink)] pb-2">
            <Search className="mr-2 h-4 w-4 text-[var(--muted)]" />
            <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search 1,605 features…" aria-label={t('searchPlaceholder')}
              className="min-w-0 flex-1 border-0 bg-transparent text-[13px] outline-none placeholder:text-[var(--muted)]" />
            <button onClick={() => onSearch('')} className="text-[10px] text-[var(--muted)]" aria-label={t('clearSearch')}>↵</button>
          </div>
          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
            {TABS.map(([key, label]) => (
              <button key={key} onClick={() => onTabChange(key)}
                className={`shrink-0 border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide ${activeTab === key
                  ? 'border-[var(--forest)] bg-[var(--forest)] text-white'
                  : 'border-[var(--rule)] text-[var(--muted)] hover:text-[var(--ink)]'}`}>
                {t(label)}
              </button>
            ))}
          </div>
        </div>
        <Register
          mountains={mountains} favorites={favorites} onToggleFav={onToggleFav}
          onSelect={onSelect} lang={lang} t={t} onClear={onClear} skin="atlas"
        />
      </div>
      <div className="relative hidden h-full lg:block">
        <AtlasMapPane mountains={mountains} featured={featured} onSelect={onSelect} theme="light" />
        <div className="pointer-events-none absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2 border border-[var(--rule)] bg-[rgba(244,239,227,.94)] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em]">
          <MountainGlyph className="h-4 w-4 text-[var(--forest)]" /> {mountains.length.toLocaleString()} {t('results')} <ArrowUpRight className="h-3 w-3" />
        </div>
      </div>
    </div>
  );
}
