import { useEffect, useRef, useState } from 'react';
import { X, Info, Users, Smartphone, Download, Map as MapIcon, Globe2 } from 'lucide-react';
import { COUNTRY_META } from '../lib/utils';
import MountainGlyph from './MountainGlyph';
import { ELEVATION_CATALOG } from '../lib/elevation';

function Section({ title, children }) {
  return (
    <section className="border-t border-[var(--rule)] pt-5">
      <h3 className="eyebrow mb-3">{title}</h3>
      {children}
    </section>
  );
}

export default function Sidebar({
  open, onClose, total, highest, withElev, favoritesCount,
  t, lang, provider, onProviderChange, homeSkin, onHomeSkin,
}) {
  const [installVisible, setInstallVisible] = useState(false);
  const deferredPrompt = useRef(null);
  const isKh = lang === 'km';

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); deferredPrompt.current = e; setInstallVisible(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    const prompt = deferredPrompt.current;
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice;
    deferredPrompt.current = null;
    setInstallVisible(false);
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-[1000] bg-[#1d2a23]/50 backdrop-blur-[2px] animate-pop-in" onClick={onClose} />}
      <aside className={`fixed inset-y-0 left-0 z-[1001] flex w-[350px] max-w-[88vw] flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] border-r border-[var(--rule)] bg-[var(--card)] shadow-[var(--shadow-lift)] transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--rule)] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <MountainGlyph className="h-6 w-6 text-[var(--forest)]" />
            <div className="serif text-lg font-bold leading-none">Mount<span className="text-[var(--rust)]">KH</span></div>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label={t('close')}><X className="h-4 w-4" /></button>
        </div>

        <div className="scroll-area flex-1 space-y-5 px-5 py-6">
          <div>
            <p className="eyebrow">{t('tagline')}</p>
            <h2 className="serif mt-2 text-2xl font-bold leading-tight">{t('aboutTitle')}</h2>
            <p className="mt-2 text-[12px] leading-relaxed text-[var(--ink-soft)]">{t('aboutBody')}</p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-[var(--rule)] py-5">
            {[
              [total.toLocaleString(), t('statTotal')],
              [highest.toLocaleString(), t('statHighest')],
              [withElev.toLocaleString(), t('statWithElev')],
              [favoritesCount.toLocaleString(), t('favorites')],
            ].map(([value, label]) => (
              <div key={label}>
                <div className="serif text-2xl font-bold leading-none text-[var(--forest)]">{value}</div>
                <div className="mt-1 text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">{label}</div>
              </div>
            ))}
          </div>

          <Section title={t('homeStyle')}>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['atlas', t('homeAtlas'), '🗺'],
                ['explorer', t('homeExplorer'), '⛰'],
              ].map(([key, label, emoji]) => (
                <button key={key} onClick={() => onHomeSkin(key)}
                  className={`rounded-xl border px-2 py-3 text-center transition-colors ${homeSkin === key
                    ? 'border-[var(--forest)] bg-[var(--forest-soft)] text-[var(--ink)]'
                    : 'border-[var(--rule)] text-[var(--muted)] hover:text-[var(--ink)]'}`}>
                  <span className="block text-lg">{emoji}</span>
                  <span className="mt-1 block text-[10px] font-bold">{label}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section title={t('sidebarMaps')}>
            <div className="mb-3 flex gap-4">
              {['google', 'osm'].map((key) => (
                <button key={key} onClick={() => onProviderChange(key)} className={`border-b-2 pb-1 text-[11px] font-semibold uppercase tracking-wide ${provider === key ? 'border-[var(--rust)] text-[var(--ink)]' : 'border-transparent text-[var(--muted)]'}`}>
                  {key === 'google' ? t('googleMaps') : t('osm')}
                </button>
              ))}
            </div>
            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-[var(--muted)]">
              <MapIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--forest)]" />
              {t('tilesNoKey')}
            </p>
          </Section>

          <Section title={t('sidebarBadges')}>
            <div className="space-y-2">
              {Object.entries(COUNTRY_META).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--ink-soft)]">{v.flag} {isKh ? v.labelKm : v.label}</span>
                  <span className="font-mono text-[9px] text-[var(--muted)]">{v.short}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title={t('sidebarData')}>
            <p className="text-[11px] leading-relaxed text-[var(--muted)]">{t('dataWarning')}</p>
            <a href="https://www.geonames.org" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[11px] font-semibold text-[var(--forest)] underline underline-offset-2">{t('geoNames')} ↗</a>
          </Section>

          <Section title={t('sidebarElevData')}>
            <p className="mb-3 text-[11px] leading-relaxed text-[var(--muted)]">{t('elevDataIntro')}</p>
            <ul className="space-y-1">
              {ELEVATION_CATALOG.map((src) => {
                const tone = src.status === 'used' ? 'text-[var(--forest)] bg-[var(--forest-soft)]'
                  : src.status === 'experimental' ? 'text-[var(--ochre)] bg-[var(--ochre-soft)]'
                  : 'text-[var(--muted)] bg-[var(--paper-2)]';
                const label = { used: t('elevStatusUsed'), regional: t('elevStatusRegional'), experimental: t('elevStatusExperimental'), link: t('elevStatusLink') }[src.status];
                return (
                  <li key={src.id}>
                    <a href={src.url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-[var(--paper-2)]">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-semibold text-[var(--ink)]">{src.name} <span className="font-normal text-[var(--muted)]">· {src.org}</span></div>
                        <div className="text-[10px] leading-snug text-[var(--muted)]">{src.res} · {src.note}</div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${tone}`}>{label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section title={t('sidebarContribute')}>
            <p className="text-[11px] leading-relaxed text-[var(--muted)]">{t('contributeText')}</p>
          </Section>

          <Section title={t('sidebarApp')}>
            <p className="text-[11px] leading-relaxed text-[var(--muted)]">{t('installPrompt')}</p>
            {installVisible && <button onClick={handleInstall} className="btn mt-3 w-full"><Download className="h-4 w-4" /> {t('install')}</button>}
          </Section>

          <p className="pt-2 text-center text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">MountKH · v3.0 · CC BY 4.0</p>
        </div>
      </aside>
    </>
  );
}
