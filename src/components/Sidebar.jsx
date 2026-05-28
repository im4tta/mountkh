import { X, Mountain, Heart, Map, Info, Users, Smartphone, Download } from 'lucide-react';
import { FCODE_META, COUNTRY_META } from '../lib/utils';
import { useState, useEffect } from 'react';

export default function Sidebar({ open, onClose, total, highest, withElev, t, lang, gmapsKey, onSaveKey }) {
  const [inputKey, setInputKey] = useState(gmapsKey || '');
  const [keyStatus, setKeyStatus] = useState('');
  const [installVisible, setInstallVisible] = useState(false);

  useEffect(() => {
    setInputKey(gmapsKey || '');
  }, [gmapsKey]);

  useEffect(() => {
    let deferredPrompt;
    const handler = (e) => {
      e.preventDefault();
      deferredPrompt = e;
      setInstallVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleSaveKey = () => {
    const key = inputKey.trim();
    if (!key) {
      setKeyStatus(t('gmapsKeyStatusEmpty'));
      return;
    }
    onSaveKey(key);
    setKeyStatus(t('gmapsKeyStatusSaved'));
  };

  const handleInstall = async () => {
    // deferredPrompt would need to be stored in a ref/state outside; simplified here
  };

  const isKh = lang === 'km';

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[1000] bg-black/40" onClick={onClose} />
      )}
      <aside className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] z-[1001] bg-[var(--bg-elevated)] border-r border-[var(--border)] shadow-2xl transform transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Mountain className="w-5 h-5 text-[var(--accent)]" />
            MountKH
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--border)] text-[var(--text-secondary)]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100%-3.5rem)] space-y-6 text-sm">
          <p className="text-[var(--text-secondary)]">Discover <strong className="text-[var(--text)]">{total}</strong> mountain features across Cambodia & border regions.</p>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-[var(--border)] p-2.5 text-center bg-[var(--bg)]">
              <div className="text-lg font-bold text-[var(--accent)]">{highest}</div>
              <div className="text-[10px] text-[var(--text-secondary)] leading-tight">{t('statHighest')}</div>
            </div>
            <div className="rounded-xl border border-[var(--border)] p-2.5 text-center bg-[var(--bg)]">
              <div className="text-lg font-bold text-[var(--accent)]">{total}</div>
              <div className="text-[10px] text-[var(--text-secondary)] leading-tight">{t('statTotal')}</div>
            </div>
            <div className="rounded-xl border border-[var(--border)] p-2.5 text-center bg-[var(--bg)]">
              <div className="text-lg font-bold text-[var(--accent)]">{withElev}</div>
              <div className="text-[10px] text-[var(--text-secondary)] leading-tight">{t('statWithElev')}</div>
            </div>
          </div>

          <hr className="border-[var(--border)]" />

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Mountain className="w-4 h-4" /> {t('sidebarLegend')}</h3>
            <ul className="space-y-1.5">
              {Object.entries(FCODE_META).map(([k, v]) => (
                <li key={k} className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--bg)] border border-[var(--border)]">{k}</span>
                  <span className="text-[var(--text-secondary)]">{isKh ? v.labelKm : v.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <hr className="border-[var(--border)]" />

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Heart className="w-4 h-4" /> {t('sidebarBadges')}</h3>
            <ul className="space-y-1.5">
              {Object.entries(COUNTRY_META).map(([k, v]) => (
                <li key={k} className="flex items-center gap-2">
                  <span className="inline-block px-1.5 py-0.5 rounded text-xs bg-[var(--bg)] border border-[var(--border)]">{v.short}</span>
                  <span className="text-[var(--text-secondary)]">{isKh ? v.labelKm : v.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <hr className="border-[var(--border)]" />

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Map className="w-4 h-4" /> {t('sidebarMaps')}</h3>
            <p className="text-[var(--text-secondary)] mb-2">Toggle between <strong>OpenStreetMap</strong> (no API key) and <strong>Google Maps</strong> (requires key).</p>
            <div className="space-y-2">
              <p className="text-xs text-[var(--text-secondary)]">{t('gmapsKeyLabel')}</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="AIza…"
                  className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
                <button onClick={handleSaveKey} className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-medium hover:opacity-90">
                  {t('gmapsKeySave')}
                </button>
              </div>
              {keyStatus && <p className="text-xs text-[var(--text-secondary)]">{keyStatus}</p>}
            </div>
          </div>

          <hr className="border-[var(--border)]" />

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Info className="w-4 h-4" /> {t('sidebarData')}</h3>
            <p className="text-[var(--text-secondary)]">{t('dataWarning')}</p>
          </div>

          <hr className="border-[var(--border)]" />

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Users className="w-4 h-4" /> {t('sidebarContribute')}</h3>
            <p className="text-[var(--text-secondary)]">{t('contributeText')}</p>
          </div>

          <hr className="border-[var(--border)]" />

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Smartphone className="w-4 h-4" /> {t('sidebarApp')}</h3>
            <p className="text-[var(--text-secondary)] mb-2">{t('installPrompt')}</p>
            {installVisible && (
              <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm hover:bg-[var(--border)]">
                <Download className="w-4 h-4" /> {t('install')}
              </button>
            )}
          </div>

          <p className="text-xs text-[var(--text-secondary)] pt-2">Data: <a href="https://www.geonames.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--accent)]">GeoNames</a> (CC BY 4.0)</p>
        </div>
      </aside>
    </>
  );
}
