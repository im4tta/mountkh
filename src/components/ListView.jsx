import { Heart, Mountain, Triangle, Gem, Flag, Square, TreePalm, MapPin } from 'lucide-react';
import { FCODE_META, COUNTRY_META, elevClass } from '../lib/utils';

const ICON_MAP = {
  Mountain, Triangle, Gem, Flag, Square, TreePalm, MapPin
};

const khmerFlag = '🇰🇭';
const thaiFlag = '🇹🇭';
const laosFlag = '🇱🇦';

export default function ListView({ mountains, favorites, onToggleFav, onSelect, lang, layout }) {
  if (!mountains.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)]">
        <MapPin className="w-10 h-10 mb-3 opacity-30" />
        <p>No features found</p>
      </div>
    );
  }

  const isGrid = layout === 'grid';

  return (
    <div className={`overflow-y-auto h-full p-3 ${isGrid ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3' : 'space-y-2'}`}>
      {mountains.map((m) => {
        const meta = FCODE_META[m.fcode] || FCODE_META.PT;
        const cm = COUNTRY_META[m.country] || COUNTRY_META.KH;
        const elev = m.elev ? `${m.elev}m` : m.dem ? `${m.dem}m` : '—';
        const fav = favorites.includes(String(m.id));
        const countryLabel = m.country === 'KH' ? khmerFlag : m.country === 'TH' ? thaiFlag : m.country === 'LA' ? laosFlag : '🎯';
        const elevNum = m.elev || m.dem || 0;
        const elevPct = elevNum > 0 ? Math.min((elevNum / 1813) * 100, 100).toFixed(1) : 0;
        const Icon = ICON_MAP[meta.icon] || MapPin;
        const isKh = lang === 'km';

        if (isGrid) {
          return (
            <div
              key={m.id}
              onClick={() => onSelect(m)}
              className="group relative flex flex-col p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--accent)]/40 cursor-pointer transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                  <Icon className="w-4 h-4 text-[var(--text-secondary)]" />
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleFav(m.id); }}
                  className={`p-1.5 rounded-full transition-colors ${fav ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] opacity-40 hover:opacity-100'}`}
                  aria-label={fav ? 'Remove favorite' : 'Add favorite'}
                >
                  <Heart className={`w-4 h-4 ${fav ? 'fill-current' : ''}`} />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate mb-0.5">{m._name}</div>
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] mb-2">
                  <span className="inline-flex items-center px-1 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)]">{isKh ? meta.labelKm : meta.label}</span>
                  <span className="opacity-60">{countryLabel}</span>
                </div>
                {m.province && (
                  <div className="text-[10px] text-[var(--text-secondary)] truncate mb-1.5">{m.province}</div>
                )}
                <div className="flex items-center gap-2 mt-auto">
                  <span className="text-xs font-medium">{elev}</span>
                  {elevNum > 0 && (
                    <div className="card-elev-bar">
                      <div className="card-elev-fill" style={{ width: `${elevPct}%` }} />
                    </div>
                  )}
                </div>
              </div>
              <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-xl ${elevClass(m.elev) === 'high-elev' ? 'bg-[var(--accent)]' : elevClass(m.elev) === 'med-elev' ? 'bg-[var(--warn)]' : 'bg-[var(--info)]'}`} />
            </div>
          );
        }

        return (
          <div
            key={m.id}
            onClick={() => onSelect(m)}
            className="group relative flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--accent)]/40 cursor-pointer transition-all"
          >
            <div className={`w-1 self-stretch rounded-full ${elevClass(m.elev) === 'high-elev' ? 'bg-[var(--accent)]' : elevClass(m.elev) === 'med-elev' ? 'bg-[var(--warn)]' : 'bg-[var(--info)]'}`} />
            <div className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--bg)] border border-[var(--border)]">
              <Icon className="w-5 h-5 text-[var(--text-secondary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-semibold text-sm truncate">{m._name}</span>
                <span className="shrink-0 text-xs opacity-60">{countryLabel}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)]">{isKh ? meta.labelKm : meta.label}</span>
                {m.province && <span className="truncate">{m.province}</span>}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs font-medium w-10 text-right">{elev}</span>
                {elevNum > 0 && (
                  <div className="card-elev-bar">
                    <div className="card-elev-fill" style={{ width: `${elevPct}%` }} />
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFav(m.id); }}
              className={`shrink-0 p-2 rounded-full transition-colors ${fav ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] opacity-40 hover:opacity-100'}`}
              aria-label={fav ? 'Remove favorite' : 'Add favorite'}
            >
              <Heart className={`w-5 h-5 ${fav ? 'fill-current' : ''}`} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
