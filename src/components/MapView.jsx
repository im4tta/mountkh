import { useEffect, useRef, useState, useCallback } from 'react';
import { Layers3, Compass } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { elevationOf, elevationTone, FCODE_META } from '../lib/utils';
import { mountainMarkerSvg } from '../lib/iconmcp';

const MAX_MARKERS = 600;

const TILES = {
  google: {
    url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: 'Map data &copy; <a href="https://www.google.com/maps">Google</a>',
    maxZoom: 20,
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18,
  },
};

function cssColor(variable, fallback) {
  const name = variable.startsWith('var(') ? variable.slice(4, -1) : variable;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function FlyController({ focusTarget }) {
  const map = useMap();
  useEffect(() => { if (focusTarget) map.flyTo([focusTarget.lat, focusTarget.lon], 12, { duration: 1 }); }, [focusTarget, map]);
  return null;
}

function FitBounds({ items, focusTarget }) {
  const map = useMap();
  useEffect(() => {
    if (focusTarget || !items.length) return;
    const group = L.featureGroup(items.map((i) => L.circleMarker([i.lat, i.lon])));
    map.fitBounds(group.getBounds().pad(0.08), { maxZoom: 9 });
  }, [items, map, focusTarget]);
  return null;
}

function markerIcon(m, selected) {
  const color = cssColor(elevationTone(elevationOf(m)).color, '#2f5d4e');
  return L.divIcon({
    className: 'bg-transparent border-0',
    html: `<div class="${selected ? 'marker-selected' : ''}">${mountainMarkerSvg(color, { size: selected ? 38 : 28, selected })}</div>`,
    iconSize: selected ? [38, 44] : [28, 34],
    iconAnchor: selected ? [19, 42] : [14, 32],
    popupAnchor: [0, -30],
  });
}

function Legend({ t }) {
  const tones = [
    ['1000 m+', 'var(--elev-high)'],
    ['300–1000 m', 'var(--elev-mid)'],
    ['0–300 m', 'var(--elev-low)'],
  ];
  return (
    <div className="map-panel pointer-events-auto hidden p-3.5 sm:block">
      <div className="eyebrow mb-2.5 flex items-center gap-1.5"><Layers3 className="h-3 w-3" /> {t('mapLegend')}</div>
      <div className="space-y-1.5">
        {tones.map(([label, color]) => (
          <div key={label} className="flex items-center gap-2 text-[11px] text-[var(--ink-soft)]">
            <span className="h-2.5 w-2.5 rounded-full border border-[var(--card)]" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>
      <div className="mt-2.5 border-t border-[var(--rule)] pt-2 text-[10px] text-[var(--muted)]">
        {FCODE_META.MT.label} · {FCODE_META.HLL.label} · {FCODE_META.PK.label}
      </div>
    </div>
  );
}

export default function MapView({ mountains, provider, onProviderChange, onSelect, theme, focusTarget, t }) {
  const mapRef = useRef(null);
  const [ready, setReady] = useState(false);
  const items = mountains.slice(0, MAX_MARKERS);
  const tile = TILES[provider] || TILES.google;

  useEffect(() => {
    const id = setTimeout(() => {
      setReady(true);
      mapRef.current?.invalidateSize();
    }, 180);
    return () => clearTimeout(id);
  }, [provider]);

  const handleProvider = useCallback((next) => onProviderChange(next), [onProviderChange]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapContainer
        ref={mapRef}
        center={[12.5, 104.5]}
        zoom={7}
        zoomControl={false}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          key={`${provider}-${theme}`}
          url={tile.url}
          subdomains={tile.subdomains}
          attribution={tile.attribution}
          maxZoom={tile.maxZoom}
        />
        {ready && items.map((m) => (
          <Marker
            key={m.id}
            position={[m.lat, m.lon]}
            icon={markerIcon(m, focusTarget?.id === m.id)}
            eventHandlers={{ click: () => onSelect(m) }}
          >
            <Popup>
              <div className="min-w-32">
                <div className="serif text-sm font-bold text-[var(--ink)]">{m._name}</div>
                <div className="mt-1 text-[11px] text-[var(--muted)]">
                  <span className="font-bold text-[var(--rust)]">{elevationOf(m) ? `${elevationOf(m).toLocaleString()} m` : '—'}</span>
                  {' · '}{m.province || '—'}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
        <FlyController focusTarget={focusTarget} />
        <FitBounds items={items} focusTarget={focusTarget} />
      </MapContainer>

      <div className="pointer-events-none absolute inset-0 z-[500] p-3 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="map-panel pointer-events-auto flex items-center gap-3 px-3.5 py-2.5">
            <MountainPin className="h-7 w-7 text-[var(--forest)]" />
            <div className="leading-tight">
              <div className="serif text-[15px] font-bold text-[var(--ink)]">{items.length.toLocaleString()} {t('shownOnMap')}</div>
              <div className="text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">{mountains.length > MAX_MARKERS ? `${MAX_MARKERS}+ shown` : t('explore')}</div>
            </div>
          </div>

          <div className="map-panel pointer-events-auto flex items-center p-1">
            {['google', 'osm'].map((key) => (
              <button key={key} onClick={() => handleProvider(key)} className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${provider === key ? 'bg-[var(--forest)] text-white' : 'text-[var(--muted)] hover:text-[var(--ink)]'}`}>
                {key === 'google' ? t('googleMaps') : t('osm')}
              </button>
            ))}
          </div>
        </div>

        <div className="absolute bottom-5 left-3 sm:left-5"><Legend t={t} /></div>

        {!mountains.length && (
          <div className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="map-panel max-w-xs px-6 py-8 text-center">
              <Compass className="mx-auto h-8 w-8 text-[var(--forest)]" />
              <p className="serif mt-3 text-lg font-bold">{t('noResultsTitle')}</p>
              <p className="mt-1 text-[11px] text-[var(--muted)]">{t('noResultsBody')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MountainPin({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 38" fill="none" aria-hidden="true">
      <path d="M12 37 6 21h12z" fill="currentColor" />
      <path d="M1 19h22l-7.9-14.6a2.3 2.3 0 0 0-4.2 0L1 19z" fill="currentColor" />
      <path d="m6.5 10 2 2.5 2.5-2.5 2 3 2.5-2" stroke="var(--card)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
