import { X, ArrowUp, ArrowDown, Navigation, Eye } from 'lucide-react';
import { FCODE_META } from '../lib/utils';
import { provinceLabel, formatNumber } from '../lib/provinces';

const fmtDist = (d) => (d >= 1000 ? `${(d / 1000).toFixed(1)} km` : `${Math.round(d)} m`);

function Stat({ label, children }) {
  return (
    <div className="min-w-0 rounded-lg bg-white/5 px-2.5 py-1.5">
      <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/50">{label}</div>
      <div className="mt-0.5 truncate text-[13px] font-bold tabular-nums">{children}</div>
    </div>
  );
}

/** Info for the peak you are pointing at. `compact` is the per-eye VR version. */
export default function SummitTargetCard({ info, compact, onStand, onDetails, onClose, t, lang }) {
  if (!info) return null;
  const { m } = info;
  const meta = FCODE_META[m.fcode] || FCODE_META.PT;
  const above = info.rel != null && info.rel >= 0;

  if (compact) {
    return (
      <div className="w-[88%] rounded-xl border border-white/20 bg-black/55 px-3 py-2 text-center">
        <div className="serif truncate text-sm font-bold">{m._name}</div>
        <div className="mt-0.5 text-[11px] font-semibold tabular-nums text-white/80">
          {info.elev != null ? `${info.elev.toLocaleString()} m` : '—'} · {fmtDist(info.dist)} · {info.dir} {Math.round(info.bearing)}°
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto w-full max-w-[440px] rounded-2xl border border-white/15 bg-black/55 p-3.5 backdrop-blur-md animate-pop-in" role="status" aria-live="polite">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#ff9d76]">
            {lang === 'km' ? meta.labelKm : meta.label}{m.province ? ` · ${provinceLabel(m.province, lang)}` : ''}
          </div>
          <h3 className="serif mt-0.5 truncate text-xl font-bold leading-tight">{m._name}</h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10" aria-label={t('close')}><X className="h-4 w-4" /></button>
        )}
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        <Stat label={t('elevation')}>{info.elev != null ? `${formatNumber(info.elev, lang)} m` : '—'}</Stat>
        <Stat label={t('vrDistance')}>{fmtDist(info.dist)}</Stat>
        <Stat label={t('vrBearing')}><span className="inline-flex items-center gap-1"><Navigation className="h-3 w-3" style={{ transform: `rotate(${info.bearing - 45}deg)` }} />{info.dir} {Math.round(info.bearing)}°</span></Stat>
      </div>

      {info.rel != null && (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-white/80">
          {above ? <ArrowUp className="h-3.5 w-3.5 text-[#ff9d76]" /> : <ArrowDown className="h-3.5 w-3.5 text-[#70c5dd]" />}
          <span className="font-bold tabular-nums">{formatNumber(Math.abs(Math.round(info.rel)), lang)} m</span>
          <span>{above ? t('vrAbove') : t('vrBelow')}</span>
          <span className="text-white/50">· {info.vAngle >= 0 ? '+' : ''}{info.vAngle.toFixed(1)}°</span>
        </p>
      )}
      {info.hidden && <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/55"><Eye className="h-3.5 w-3.5" />{t('vrHidden')}</p>}

      {(onStand || onDetails) && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {onDetails && <button onClick={onDetails} className="min-h-11 rounded-xl border border-white/20 text-[13px] font-bold">{t('vrDetails')}</button>}
          {onStand && <button onClick={onStand} className="min-h-11 rounded-xl bg-[#7ea6ff] text-[13px] font-bold text-[#0a1230]">{t('vrStand')}</button>}
        </div>
      )}
    </div>
  );
}
