import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  X, Heart, ExternalLink, Copy, Map as MapIcon,
  Check, Loader2, AlertCircle,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import {
  FCODE_META, COUNTRY_META, elevationOf, elevationPercent,
  getMountainNames, findNameMatch, haversine, copyText,
} from '../lib/utils';
import { mountainMarkerSvg } from '../lib/iconmcp';
import MountainGlyph from './MountainGlyph';
import ElevationSources from './ElevationSources';
const ExportCard = lazy(() => import('./ExportCard'));

const pinIcon = L.divIcon({
  className: 'bg-transparent border-0',
  html: mountainMarkerSvg('#b4542e', { size: 34, selected: true }),
  iconSize: [34, 40],
  iconAnchor: [17, 38],
  popupAnchor: [0, -34],
});

function Fact({ label, value, mono }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--rule)] py-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{label}</dt>
      <dd className={`min-w-0 truncate text-right text-[12px] font-medium text-[var(--ink)] ${mono ? 'font-mono text-[11px]' : ''}`} title={String(value)}>{value}</dd>
    </div>
  );
}

export default function DetailPanel({
  mountain, open, onClose, isFav, onToggleFav,
  t, lang, theme, onShowOnMap, onShowSummit, onToast,
}) {
  const meta = FCODE_META[mountain?.fcode] || FCODE_META.PT;
  const country = COUNTRY_META[mountain?.country] || COUNTRY_META.KH;
  const elev = elevationOf(mountain);
  const altNames = mountain?.alt ? mountain.alt.split(',').filter(Boolean) : [];
  const [verify, setVerify] = useState({ text: t('loadingMap'), state: 'loading' });
  const [exportOpen, setExportOpen] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!open || !mountain) return;
    let cancelled = false;
    setVerify({ text: t('loadingMap'), state: 'loading' });
    const run = async () => {
      try {
        if (typeof window.google?.maps?.Geocoder !== 'undefined') {
          const g = await verifyWithGoogle(mountain);
          if (cancelled) return;
          if (g.found) return setVerify({ text: `✓ ${g.name} · ${t('onGoogleMaps')}`, state: 'success' });
        }
        const osm = await verifyWithNominatim(mountain);
        if (cancelled) return;
        setVerify(osm.found
          ? { text: `✓ ${osm.name} · ${t('onOsm')}`, state: 'success' }
          : { text: `GeoNames · ${t('verified')}`, state: 'success' });
      } catch { if (!cancelled) setVerify({ text: t('mapError'), state: 'error' }); }
    };
    const timer = setTimeout(run, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [open, mountain, t]);

  useEffect(() => {
    if (open && mapRef.current) { const id = setTimeout(() => mapRef.current?.invalidateSize(), 280); return () => clearTimeout(id); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!mountain) return null;

  const coordText = `${mountain.lat.toFixed(5)}, ${mountain.lon.toFixed(5)}`;
  const shareUrl = `${location.origin}${location.pathname}#m/${mountain.id}`;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        try {
          await navigator.share({ title: mountain._name, text: `${mountain._name} · ${elev ? `${elev} m` : ''}`, url: shareUrl });
          onToast(t('linkCopied'));
          return;
        } catch (err) {
          if (err?.name === 'AbortError') return;
        }
      }
      await copyText(shareUrl);
      onToast(t('linkCopied'));
    } catch (err) {
      console.warn('Share fell back to inline link', err);
      onToast(shareUrl);
    }
  };

  const handleCopyCoords = async () => {
    try { await copyText(coordText); onToast(t('copied')); }
    catch { onToast(coordText); }
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-[1000] bg-[#1d2a23]/50 backdrop-blur-[2px] animate-pop-in" onClick={onClose} />}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={mountain._name}
        className={`fixed z-[1001] flex flex-col overflow-hidden border-[var(--rule)] bg-[var(--card)] shadow-[var(--shadow-lift)]
          inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl border-t pb-[env(safe-area-inset-bottom)]
          lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[480px] lg:rounded-none lg:border-l lg:border-t-0
          transition-transform duration-300 ease-out
          ${open ? 'translate-y-0 lg:translate-x-0' : 'pointer-events-none translate-y-full lg:translate-y-0 lg:translate-x-full'}`}
      >
        <div className="relative flex shrink-0 items-center justify-between border-b border-[var(--rule)] px-5 py-3">
          <span className="absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-[var(--rule-strong)] lg:hidden" aria-hidden="true" />
          <span className="eyebrow">Field note · {mountain.id}</span>
          <button onClick={onClose} className="icon-btn" aria-label={t('close')}><X className="h-4 w-4" /></button>
        </div>

        <div className="scroll-area flex-1 overscroll-contain px-5 py-6 sm:px-6 sm:py-7">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            <span>{country.flag}</span>
            <span>{lang === 'km' ? country.labelKm : country.label}</span>
            <span className="text-[var(--rule-strong)]">/</span>
            <span className="text-[var(--rust)]">{lang === 'km' ? meta.labelKm : meta.label}</span>
          </div>

          <h2 className="serif mt-3 text-[clamp(1.9rem,5vw,2.6rem)] font-bold leading-[1.08] tracking-tight text-[var(--ink)]">{mountain._name}</h2>
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[var(--muted)]"><MapIcon className="h-3.5 w-3.5" /> {mountain.province || '—'}</p>

          <div className="mt-7 flex items-end justify-between border-y border-[var(--ink)] py-4">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">{t('elevation')}</div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="serif text-5xl font-bold leading-none text-[var(--rust)]">{elev ? elev.toLocaleString() : '—'}</span>
                <span className="serif text-lg italic text-[var(--muted)]">{elev ? 'm' : ''}</span>
              </div>
            </div>
            <MountainGlyph className="h-16 w-16 text-[var(--forest)] opacity-80" />
          </div>
          <div className="elev-bar mt-3"><div className="elev-fill" style={{ width: `${elevationPercent(elev)}%` }} /></div>

          <ElevationSources mountain={mountain} listed={elev} t={t} />

          <dl className="mt-7">
            <Fact label={t('coordinates')} value={coordText} mono />
            <Fact label={t('province')} value={mountain.province || '—'} />
            <Fact label={t('country')} value={lang === 'km' ? country.labelKm : country.label} />
            <Fact label={t('type')} value={lang === 'km' ? meta.labelKm : meta.label} />
            <Fact label={t('asciiName')} value={mountain.ascii || '—'} />
            <Fact label={t('geoid')} value={mountain.id} mono />
          </dl>

          {altNames.length > 0 && (
            <div className="mt-6">
              <p className="eyebrow mb-2">{t('alternateNames')}</p>
              <div className="flex flex-wrap gap-1.5">
                {altNames.slice(0, 12).map((name) => <span key={name} className="chip">{name}</span>)}
              </div>
            </div>
          )}

          <div className="mt-7 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button onClick={() => onToggleFav(mountain.id)} className={`btn ${isFav ? 'btn-solid' : ''}`}>
              <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} /> {isFav ? t('removeFavorite') : t('addFavorite')}
            </button>
            <button onClick={onShowOnMap} className="btn"><MapIcon className="h-4 w-4" /> {t('mapView')}</button>
            <button onClick={handleCopyCoords} className="btn"><Copy className="h-4 w-4" /> {t('copyCoords')}</button>
            <button onClick={handleShare} className="btn"><MountainGlyph name="share" className="h-4 w-4" /> {t('share')}</button>
            <button onClick={() => setExportOpen(true)} className="btn"><MountainGlyph name="download" className="h-4 w-4" /> {t('exportPng')}</button>
            <button onClick={() => onShowSummit(mountain)} className="btn btn-solid"><MountainGlyph name="mountain" className="h-4 w-4" /> {t('summitView')}</button>
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${mountain.lat},${mountain.lon}`)}`} target="_blank" rel="noopener noreferrer" className="btn">
              <ExternalLink className="h-4 w-4" /> {t('googleMaps')}
            </a>
          </div>

          <div className="mt-7 overflow-hidden border border-[var(--rule)]">
            <div className="h-44 w-full">
              <MapContainer ref={mapRef} center={[mountain.lat, mountain.lon]} zoom={11} zoomControl={false} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                  subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                  attribution='&copy; <a href="https://www.google.com/maps">Google</a>'
                  maxZoom={20}
                />
                <Marker position={[mountain.lat, mountain.lon]} icon={pinIcon}><Popup>{mountain._name}</Popup></Marker>
              </MapContainer>
            </div>
            <div className="flex items-center gap-2 border-t border-[var(--rule)] bg-[var(--paper-2)] px-3 py-2 text-[10px] text-[var(--muted)]">
              {verify.state === 'loading' && <Loader2 className="h-3 w-3 animate-spin text-[var(--forest)]" />}
              {verify.state === 'success' && <Check className="h-3 w-3 text-[var(--forest)]" />}
              {verify.state === 'error' && <AlertCircle className="h-3 w-3 text-[var(--rust)]" />}
              <span className="truncate">{verify.text}</span>
            </div>
          </div>
        </div>
      </aside>
      {exportOpen && (
        <Suspense fallback={<div className="fixed inset-0 z-[1200] grid place-items-center bg-[#1d2a23]/60 text-white"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
          <ExportCard
            mountain={mountain}
            shareUrl={shareUrl}
            t={t}
            lang={lang}
            onClose={() => setExportOpen(false)}
            onToast={onToast}
          />
        </Suspense>
      )}
    </>
  );
}

async function verifyWithNominatim(m) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(m.ascii || m._name)}&format=json&limit=8&accept-language=en`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return { found: false };
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return { found: false };
    const names = getMountainNames(m);
    for (const r of data) {
      const d = haversine(m.lat, m.lon, parseFloat(r.lat), parseFloat(r.lon));
      if (d > 10000) continue;
      const geoNames = [r.display_name, r.name, r.display_name?.split(',')[0]].filter(Boolean);
      if (findNameMatch(names, geoNames).matched) return { found: true, name: geoNames[0] };
      if (d <= 3000) return { found: true, name: geoNames[0] || r.display_name };
    }
    return { found: false };
  } catch { return { found: false }; }
}

async function verifyWithGoogle(m) {
  if (typeof window.google === 'undefined' || !window.google.maps) return { found: false };
  return new Promise((resolve) => {
    new window.google.maps.Geocoder().geocode({ location: { lat: m.lat, lng: m.lon } }, (results, status) => {
      if (status !== 'OK' || !results?.length) return resolve({ found: false });
      const names = getMountainNames(m);
      for (const r of results) {
        const geoNames = [r.formatted_address, ...r.address_components.map((c) => c.long_name)].filter(Boolean);
        if (findNameMatch(names, geoNames).matched) return resolve({ found: true, name: geoNames[0] });
      }
      const first = results[0];
      if (first?.geometry && haversine(m.lat, m.lon, first.geometry.location.lat(), first.geometry.location.lng()) <= 3000) {
        return resolve({ found: true, name: first.formatted_address });
      }
      resolve({ found: false });
    });
  });
}
