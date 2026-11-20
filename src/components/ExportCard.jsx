import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import QRCode from 'qrcode';
import { FCODE_META, COUNTRY_META, elevationOf } from '../lib/utils';
import { renderShareCard } from '../lib/exportPng';
import MountainGlyph from './MountainGlyph';

export default function ExportCard({ mountain, shareUrl, t, lang, onClose, onToast }) {
  const [blob, setBlob] = useState(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!mountain) return;
    let cancelled = false;
    let url = '';
    setBlob(null); setPreview(''); setError(false);
    (async () => {
      try {
        const meta = FCODE_META[mountain.fcode] || FCODE_META.PT;
        const country = COUNTRY_META[mountain.country] || COUNTRY_META.KH;
        const qrDataUrl = await QRCode.toDataURL(shareUrl, {
          width: 264, margin: 1, errorCorrectionLevel: 'M',
          color: { dark: '#1d2a23', light: '#fbf8f1' },
        });
        const out = await renderShareCard({
          mountain,
          elev: elevationOf(mountain),
          countryLabel: lang === 'km' ? country.labelKm : country.label,
          typeLabel: lang === 'km' ? meta.labelKm : meta.label,
          flag: country.flag,
          qrDataUrl,
          shareUrl,
          scale: 3,
        });
        if (cancelled) return;
        url = URL.createObjectURL(out);
        setBlob(out);
        setPreview(url);
      } catch (err) {
        console.error('PNG render failed', err);
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [mountain, shareUrl, lang]);

  if (!mountain) return null;

  const fileName = `mountkh-${mountain.id}.png`;

  const handleDownload = async () => {
    if (!blob) return;
    setBusy(true);
    try {
      const file = new File([blob], fileName, { type: 'image/png' });
      // On phones the share sheet is the way to "Save Image" to Photos.
      const touch = window.matchMedia?.('(pointer: coarse)').matches;
      if (touch && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: mountain._name });
          onToast(t('pngSaved') || 'PNG saved');
          return;
        } catch (err) {
          if (err?.name === 'AbortError') return;
        }
      }
      const link = document.createElement('a');
      link.href = preview;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      onToast(t('pngSaved') || 'PNG saved');
    } catch (err) {
      console.error('PNG export failed', err);
      onToast(t('pngFailed') || 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-[#1d2a23]/70 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-full w-full max-w-[640px] flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex w-full items-center justify-between text-white">
          <span className="text-xs font-bold uppercase tracking-[0.18em]">{t('exportPng') || 'Export PNG'}</span>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-white" aria-label={t('close')}><MountainGlyph name="close" className="h-5 w-5" /></button>
        </div>

        <div className="grid min-h-0 w-full flex-1 place-items-center overflow-hidden">
          {preview ? (
            <img src={preview} alt={mountain._name} className="max-h-full w-auto max-w-full rounded-sm object-contain shadow-2xl" />
          ) : (
            <div className="grid aspect-[640/616] w-full place-items-center rounded-sm bg-[#fbf8f1] text-xs font-semibold text-[#768077]">
              {error ? (t('pngFailed') || 'Export failed') : <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> {t('exporting') || 'Rendering…'}</span>}
            </div>
          )}
        </div>

        <div className="flex w-full flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-3">
          <button onClick={handleDownload} disabled={busy || !blob} className="btn btn-solid w-full px-6 disabled:opacity-60 sm:w-auto">
            {busy || !blob ? <Loader2 className="h-4 w-4 animate-spin" /> : <MountainGlyph name="download" className="h-4 w-4" />}
            {t('downloadPng') || 'Download PNG'}
          </button>
          <span className="flex items-center gap-1.5 text-[11px] text-white/70">
            <MountainGlyph name="qrcode" className="h-3.5 w-3.5" />
            {t('pngHint') || 'Includes the map layer + QR code'}
          </span>
        </div>
      </div>
    </div>
  );
}
