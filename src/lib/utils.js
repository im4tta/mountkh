export const FCODE_META = {
  MT: { cls: 'mt', icon: 'Mountain', label: 'Mountain', labelKm: 'ភ្នំ' },
  HLL: { cls: 'hll', icon: 'Triangle', label: 'Hill', labelKm: 'ភ្នំតូច' },
  PK: { cls: 'pk', icon: 'MountainSnow', label: 'Peak', labelKm: 'កំពូល' },
  MTS: { cls: 'mts', icon: 'Mountain', label: 'Range', labelKm: 'ជួរភ្នំ' },
  RDGE: { cls: 'rdge', icon: 'Gem', label: 'Ridge', labelKm: 'ខ្លោង' },
  PASS: { cls: 'pass', icon: 'Flag', label: 'Pass', labelKm: 'ចំណាត់ថ្នាក់' },
  PLAT: { cls: 'plat', icon: 'Square', label: 'Plateau', labelKm: 'វាលខ្ពស់' },
  ISL: { cls: 'isl', icon: 'TreePalm', label: 'Island', labelKm: 'កោះ' },
  ISLS: { cls: 'isl', icon: 'TreePalm', label: 'Islets', labelKm: 'កោះតូចៗ' },
  ISLX: { cls: 'isl', icon: 'TreePalm', label: 'Island', labelKm: 'កោះ' },
  HLLS: { cls: 'hll', icon: 'Triangle', label: 'Hills', labelKm: 'ភ្នំតូចៗ' },
  SLP: { cls: 'hll', icon: 'Triangle', label: 'Slope', labelKm: 'ចង្អើត' },
  SPUR: { cls: 'rdge', icon: 'Gem', label: 'Spur', labelKm: 'ម្ជុលភ្នំ' },
  RK: { cls: 'hll', icon: 'Mountain', label: 'Rock', labelKm: 'ថ្ម' },
  PT: { cls: 'hll', icon: 'MapPin', label: 'Point', labelKm: 'ចំណុច' },
};

export const COUNTRY_META = {
  KH: { cls: 'kh', label: 'Cambodia', labelKm: 'កម្ពុជា', short: 'KH', flag: '🇰🇭' },
  TH: { cls: 'th', label: 'Thailand', labelKm: 'ថៃ', short: 'TH', flag: '🇹🇭' },
  LA: { cls: 'la', label: 'Laos', labelKm: 'ឡាវ', short: 'LA', flag: '🇱🇦' },
  'KH,TH': { cls: 'multi', label: 'Cambodia–Thailand border', labelKm: 'ព្រំដែនកម្ពុជា–ថៃ', short: 'KH/TH', flag: '🇰🇭🇹🇭' },
  'KH,LA,TH': { cls: 'multi', label: 'Triple border', labelKm: 'ព្រំដែនបី', short: 'KH/LA/TH', flag: '🇰🇭🇱🇦🇹🇭' },
};

export const COUNTRY_OPTIONS = ['KH', 'TH', 'LA', 'KH,TH', 'KH,LA,TH'];

export const MAX_ELEVATION = 1813;

export function elevationOf(m) {
  if (m?.elev != null && m.elev > 0) return m.elev;
  if (m?.dem != null && m.dem > 0) return m.dem;
  return null;
}

export function formatElevation(m) {
  const e = elevationOf(m);
  return e == null ? '—' : `${e.toLocaleString()} m`;
}

export function elevationTone(e) {
  if (!e || e <= 0) return { key: 'none', label: 'Unknown', color: 'var(--muted)' };
  if (e >= 1000) return { key: 'high', label: 'High', color: 'var(--elev-high)' };
  if (e >= 300) return { key: 'mid', label: 'Mid', color: 'var(--elev-mid)' };
  return { key: 'low', label: 'Low', color: 'var(--elev-low)' };
}

export function elevationPercent(e) {
  if (!e || e <= 0) return 0;
  return Math.min((e / MAX_ELEVATION) * 100, 100);
}

export function elevColor(e) {
  const tone = elevationTone(e);
  return tone.color.startsWith('var(') ? getComputedStyle(document.documentElement).getPropertyValue(tone.color.slice(4, -1)).trim() || '#0f766e' : tone.color;
}

export function normalizeName(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getMountainNames(m) {
  const names = new Set([m._name, m.ascii, m.name].filter(Boolean));
  if (m.alt) m.alt.split(',').forEach((a) => { const t = a.trim(); if (t) names.add(t); });
  return Array.from(names);
}

export function formatDistance(m) {
  if (m == null || !Number.isFinite(m)) return '';
  if (m < 1000) return `${Math.round(m)} m`;
  return m < 100000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m / 1000)} km`;
}

export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNameMatch(mountainNames, geoNames) {
  const mtnNorm = mountainNames.map(normalizeName);
  for (const geo of geoNames) {
    const geoNorm = normalizeName(geo);
    if (!geoNorm) continue;
    for (let i = 0; i < mtnNorm.length; i++) {
      const mtn = mtnNorm[i];
      if (!mtn) continue;
      if (geoNorm === mtn || geoNorm.includes(mtn) || mtn.includes(geoNorm)) {
        return { matched: true, geoName: geo, mountainName: mountainNames[i] };
      }
      const geoTokens = new Set(geoNorm.split(' '));
      const mtnTokens = mtn.split(' ');
      if (mtnTokens.length >= 2) {
        const common = mtnTokens.filter((t) => geoTokens.has(t));
        if (common.length >= 2) return { matched: true, geoName: geo, mountainName: mountainNames[i] };
      }
    }
  }
  return { matched: false, geoName: geoNames[0] || null };
}

function legacyCopy(text) {
  const el = document.createElement('textarea');
  el.value = text;
  el.setAttribute('readonly', '');
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.select();
  el.setSelectionRange(0, text.length);
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  document.body.removeChild(el);
  return ok;
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Persisted permission denial / insecure context — use legacy path.
    }
  }
  return legacyCopy(text);
}
