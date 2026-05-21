import { useEffect, useRef, useState } from 'react';
import { X, Heart, ExternalLink, MapPin } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { FCODE_META, COUNTRY_META, elevClass, getMountainNames, findNameMatch, haversine } from '../lib/utils';

const khmerFlag = '🇰🇭';
const thaiFlag = '🇹🇭';
const laosFlag = '🇱🇦';

export default function DetailPanel({ mountain, open, onClose, isFav, onToggleFav, t, lang }) {
  const meta = FCODE_META[mountain?.fcode] || FCODE_META.PT;
  const cm = COUNTRY_META[mountain?.country] || COUNTRY_META.KH;
  const elev = mountain?.elev ? `${mountain.elev}m` : mountain?.dem ? `${mountain.dem}m (DEM)` : 'Unknown';
  const altNames = mountain?.alt ? mountain.alt.split(',').filter(Boolean) : [];
  const [verifyStatus, setVerifyStatus] = useState({ text: t('loadingMap'), type: 'loading' });

  const mapRef = useRef(null);

  useEffect(() => {
    if (!open || !mountain) return;
    setVerifyStatus({ text: t('loadingMap'), type: 'loading' });

    const runVerify = async () => {
      try {
        const gmapsReady = typeof window.google !== 'undefined' && window.google.maps && window.google.maps.Geocoder;
        if (gmapsReady) {
          setVerifyStatus({ text: t('checkingGoogle'), type: 'loading' });
          const result = await verifyWithGoogle(mountain);
          if (result.found) {
            setVerifyStatus({ text: `✓ ${result.name} ${t('onGoogleMaps')}`, type: 'success' });
            return;
          }
        }
        setVerifyStatus({ text: t('checkingOsm'), type: 'loading' });
        const osmResult = await verifyWithNominatim(mountain);
        if (osmResult.found) {
          setVerifyStatus({ text: `✓ ${osmResult.name} ${t('onOsm')}`, type: 'success' });
        } else {
          setVerifyStatus({ text: `GeoNames ${t('verified')}`, type: 'success' });
        }
      } catch {
        setVerifyStatus({ text: t('mapError'), type: 'error' });
      }
    };

    const timer = setTimeout(runVerify, 500);
    return () => clearTimeout(timer);
  }, [open, mountain, t]);

  useEffect(() => {
    if (open && mapRef.current) {
      setTimeout(() => mapRef.current?.invalidateSize(), 300);
    }
  }, [open]);

  if (!mountain) return null;

  const countryLabel = mountain.country === 'KH' ? khmerFlag : mountain.country === 'TH' ? thaiFlag : mountain.country === 'LA' ? laosFlag : '🎯';

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] bg-black/30" onClick={onClose} />
      )}
      <div className={`fixed inset-x-0 bottom-0 z-[70] bg-[var(--bg-elevated)] rounded-t-2xl shadow-2xl border-t border-[var(--border)] transform transition-transform duration-300 max-h-[85vh] flex flex-col ${open ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-lg font-bold truncate">{mountain._name}</h2>
            <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${cm.cls === 'kh' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900' : cm.cls === 'th' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900' : cm.cls === 'la' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900'}`}>
              {countryLabel} {cm.short}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--border)] text-[var(--text-secondary)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[var(--border)] p-3 bg-[var(--bg)]">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1">{t('type')}</div>
              <div className="text-sm font-medium">{lang === 'km' ? meta.labelKm : meta.label}</div>
            </div>
            <div className="rounded-xl border border-[var(--border)] p-3 bg-[var(--bg)]">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1">{t('elevation')}</div>
              <div className="text-sm font-medium">{elev}</div>
            </div>
            <div className="rounded-xl border border-[var(--border)] p-3 bg-[var(--bg)]">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1">{t('country')}</div>
              <div className="text-sm font-medium">{lang === 'km' ? cm.labelKm : cm.label}</div>
            </div>
            {mountain.province && (
              <div className="rounded-xl border border-[var(--border)] p-3 bg-[var(--bg)]">
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1">{t('province')}</div>
                <div className="text-sm font-medium">{mountain.province}</div>
              </div>
            )}
            <div className="rounded-xl border border-[var(--border)] p-3 bg-[var(--bg)]">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1">{t('coordinates')}</div>
              <div className="text-sm font-mono">{mountain.lat.toFixed(4)}, {mountain.lon.toFixed(4)}</div>
            </div>
            <div className="rounded-xl border border-[var(--border)] p-3 bg-[var(--bg)]">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1">{t('asciiName')}</div>
              <div className="text-sm font-medium">{mountain.ascii}</div>
            </div>
            <div className="rounded-xl border border-[var(--border)] p-3 bg-[var(--bg)]">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1">{t('geoid')}</div>
              <div className="text-sm font-mono">{mountain.id}</div>
            </div>
            {altNames.length > 0 && (
              <div className="col-span-2 rounded-xl border border-[var(--border)] p-3 bg-[var(--bg)]">
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1">{t('alternateNames')}</div>
                <div className="text-sm">{altNames.join(', ')}</div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onToggleFav(mountain.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${isFav ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--border)]'}`}
            >
              <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
              {isFav ? t('removeFavorite') : t('addFavorite')}
            </button>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mountain._name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-sm font-medium hover:bg-[var(--border)]"
            >
              <ExternalLink className="w-4 h-4" />
              {t('open')} Google Maps
            </a>
          </div>

          <div className="rounded-xl border border-[var(--border)] overflow-hidden">
            <div className="h-56 w-full">
              <MapContainer
                center={[mountain.lat, mountain.lon]}
                zoom={11}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
                whenCreated={(map) => { mapRef.current = map; }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[mountain.lat, mountain.lon]}>
                  <Popup>{mountain._name}</Popup>
                </Marker>
              </MapContainer>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] bg-[var(--bg)]">
              {verifyStatus.type === 'loading' && <div className="pulse-dot" />}
              <span>{verifyStatus.text}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

async function verifyWithNominatim(m) {
  const query = encodeURIComponent(m.ascii || m._name);
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=10&accept-language=en`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'MountKH/2.0' } });
    if (!res.ok) return { found: false };
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return { found: false };
    const mtnNames = getMountainNames(m);
    for (const r of data) {
      const lat = parseFloat(r.lat), lon = parseFloat(r.lon);
      const d = haversine(m.lat, m.lon, lat, lon);
      if (d > 10000) continue;
      const geoNames = [r.display_name, r.name, r.display_name?.split(',')[0]].filter(Boolean);
      const match = findNameMatch(mtnNames, geoNames);
      if (match.matched) return { found: true, name: match.geoName };
      if (d <= 3000) return { found: true, name: geoNames[0] || r.display_name };
    }
    return { found: false };
  } catch {
    return { found: false };
  }
}

async function verifyWithGoogle(m) {
  if (typeof window.google === 'undefined' || !window.google.maps) return { found: false };
  return new Promise((resolve) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat: m.lat, lng: m.lon } }, (results, status) => {
      if (status !== 'OK' || !results || results.length === 0) return resolve({ found: false });
      const mtnNames = getMountainNames(m);
      for (const r of results) {
        const geoNames = [r.formatted_address, ...r.address_components.map(c => c.long_name)].filter(Boolean);
        const match = findNameMatch(mtnNames, geoNames);
        if (match.matched) return resolve({ found: true, name: match.geoName });
      }
      const first = results[0];
      if (first && first.geometry) {
        const d = haversine(m.lat, m.lon, first.geometry.location.lat(), first.geometry.location.lng());
        if (d <= 3000) return resolve({ found: true, name: first.formatted_address });
      }
      resolve({ found: false });
    });
  });
}
