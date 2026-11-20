import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { FCODE_META, COUNTRY_META, elevationOf } from '../lib/utils';
import { mountainMarkerSvg } from '../lib/iconmcp';
import MountainGlyph from './MountainGlyph';

const PIN = '#b4542e';

function buildPin() {
  return L.divIcon({
    className: 'bg-transparent border-0',
    html: mountainMarkerSvg(PIN, { size: 34, selected: true }),
    iconSize: [34, 40],
    iconAnchor: [17, 38],
  });
}

export default function ExportCard({ mountain, shareUrl, t, lang, onClose, onToast }) {
  const cardRef = useRef(null);
  const mapRef = useRef(null);
  const [qr, setQr] = useState('');
  const [tilesReady, setTilesReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const meta = FCODE_META[mountain?.fcode] || FCODE_META.PT;
  const country = COUNTRY_META[mountain?.country] || COUNTRY_META.KH;
  const elev = elevationOf(mountain);

  useEffect(() => {
    if (!shareUrl) return;
    QRCode.toDataURL(shareUrl, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#1d2a23', light: '#fbf8f1' },
    }).then(setQr).catch(() => setQr(''));
  }, [shareUrl]);

  useEffect(() => {
    if (!mountain) return;
    const id = setTimeout(() => {
      mapRef.current?.invalidateSize();
      setTilesReady(true);
    }, 500);
    return () => clearTimeout(id);
  }, [mountain]);

  if (!mountain) return null;

  const handleDownload = async () => {
    setBusy(true);
    try {
      await document.fonts.ready;
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        allowTaint: false,
        scale: 2,
        backgroundColor: '#fbf8f1',
        logging: false,
        windowWidth: 900,
        onclone: (doc) => {
          // html2canvas 1.4 cannot parse color-mix(); replace those declarations
          // with plain colours in the cloned document before rendering.
          const override = doc.createElement('style');
          override.textContent = `
            .leaflet-control-attribution { background: #fbf8f1 !important; color: #768077 !important; }
            .leaflet-container { background: #e8eef0 !important; }
            .leaflet-control-attribution a { color: #2f5d4e !important; }
          `;
          doc.head.appendChild(override);
          doc.querySelectorAll('*').forEach((el) => {
            ['color', 'backgroundColor', 'borderColor', 'background', 'outlineColor', 'boxShadow', 'textDecorationColor'].forEach((prop) => {
              const value = el.style[prop];
              if (value && value.includes('color-mix')) el.style[prop] = '#fbf8f1';
            });
          });
        },
      });
      await new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (!blob) return resolve();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `mountkh-${mountain.id}.png`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          resolve();
        }, 'image/png');
      });
      onToast(t('pngSaved') || 'PNG saved');
    } catch (err) {
      console.error('PNG export failed', err);
      onToast(t('pngFailed') || 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-[#1d2a23]/65 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-full flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex w-full max-w-[640px] items-center justify-between text-white">
          <span className="text-xs font-bold uppercase tracking-[0.18em]">{t('exportPng') || 'Export PNG'}</span>
          <button onClick={onClose} className="rounded-full p-1.5 text-white/80 hover:bg-white/10 hover:text-white" aria-label={t('close')}><MountainGlyph name="close" className="h-5 w-5" /></button>
        </div>

        <div ref={cardRef} className="export-card" style={{
          width: 640, background: '#fbf8f1', color: '#1d2a23', border: '1px solid #d9d2c4',
          fontFamily: '"Noto Sans Khmer", ui-sans-serif, system-ui, sans-serif', overflow: 'hidden',
        }}>
          <div style={{ background: '#1d2a23', color: '#f4efe4', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ font: '700 22px Georgia, "Noto Serif Khmer", serif' }}>Mount<span style={{ color: '#e6926a' }}>KH</span></div>
            <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.8 }}>Field note · {mountain.id}</div>
          </div>

          <div style={{ padding: '24px 28px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#b4542e' }}>{country.flag} {lang === 'km' ? country.labelKm : country.label} / {lang === 'km' ? meta.labelKm : meta.label}</div>
            <div style={{ font: '700 38px/1.05 Georgia, "Noto Serif Khmer", serif', margin: '10px 0 6px' }}>{mountain._name}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ font: '700 44px Georgia, "Noto Serif Khmer", serif', color: '#b4542e' }}>{elev ? elev.toLocaleString() : '—'}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#768077' }}>{elev ? 'metres' : ''}</span>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11, color: '#4c5d52' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><MountainGlyph name="pin" className="h-3 w-3" /> {mountain.province || '—'}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><MountainGlyph name="mountain" className="h-3 w-3" /> {mountain.lat.toFixed(4)}, {mountain.lon.toFixed(4)}</span>
            </div>
          </div>

          <div style={{ margin: '0 28px', border: '1px solid #d9d2c4', height: 250, position: 'relative', overflow: 'hidden' }}>
            <MapContainer
              ref={mapRef}
              center={[mountain.lat, mountain.lon]}
              zoom={11}
              zoomControl={false}
              scrollWheelZoom={false}
              dragging={false}
              doubleClickZoom={false}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                attribution='&copy; Google'
                crossOrigin
                eventHandlers={{ load: () => setTilesReady(true) }}
              />
              <Marker position={[mountain.lat, mountain.lon]} icon={buildPin()} />
            </MapContainer>
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'rgba(29,42,35,.85)', color: '#f4efe4', fontSize: 10, letterSpacing: '0.1em', padding: '6px 10px', display: 'flex', justifyContent: 'space-between' }}>
              <span>{mountain._name}</span><span>MAP · {tilesReady ? 'LOADED' : 'LOADING'}</span>
            </div>
          </div>

          <div style={{ padding: '18px 28px 24px', display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ width: 96, height: 96, flex: 'none', border: '1px solid #d9d2c4', background: '#fbf8f1', display: 'grid', placeItems: 'center' }}>
              {qr ? <img src={qr} alt="QR code" width="88" height="88" crossOrigin="anonymous" /> : <Loader2 size={20} className="animate-spin" />}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>Scan to explore this peak</div>
              <div style={{ fontSize: 11, color: '#768077', marginTop: 4, wordBreak: 'break-all' }}>{shareUrl}</div>
              <div style={{ fontSize: 10, color: '#b4542e', fontWeight: 700, marginTop: 8, letterSpacing: '0.08em' }}>MOUNTKH · ភ្នំកម្ពុជា</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleDownload} disabled={busy || !qr} className="btn btn-solid px-6 disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MountainGlyph name="download" className="h-4 w-4" />}
            {busy ? (t('exporting') || 'Rendering…') : (t('downloadPng') || 'Download PNG')}
          </button>
          <span className="flex items-center gap-1.5 text-[10px] text-white/70">
            <MountainGlyph name="qrcode" className="h-3.5 w-3.5" />
            {t('pngHint') || 'Includes the map layer + QR code'}
          </span>
        </div>
      </div>
    </div>
  );
}
