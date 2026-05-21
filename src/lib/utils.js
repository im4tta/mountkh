export const FCODE_META = {
  MT: { cls: 'mt', icon: 'Mountain', label: 'Mountain', labelKm: 'ភ្នំ' },
  HLL: { cls: 'hll', icon: 'Triangle', label: 'Hill', labelKm: 'ភ្នំតូច' },
  PK: { cls: 'pk', icon: 'MountainSnow', label: 'Peak', labelKm: 'កំពូល' },
  MTS: { cls: 'mts', icon: 'Mountain', label: 'Range', labelKm: 'ជួរភ្នំ' },
  RDGE: { cls: 'rdge', icon: 'Gem', label: 'Ridge', labelKm: 'ខ្លោង' },
  PASS: { cls: 'pass', icon: 'Flag', label: 'Pass', labelKm: 'ចំណាត់ថ្នាក់' },
  PLAT: { cls: 'plat', icon: 'Square', label: 'Plateau', labelKm: 'ខែ្វលើ' },
  ISL: { cls: 'isl', icon: 'Palmtree', label: 'Island', labelKm: 'កោះ' },
  ISLS: { cls: 'isl', icon: 'Palmtree', label: 'Islands', labelKm: 'កោះ' },
  ISLX: { cls: 'isl', icon: 'Palmtree', label: 'Island', labelKm: 'កោះ' },
  HLLS: { cls: 'hll', icon: 'Triangle', label: 'Hills', labelKm: 'ភ្នំតូច' },
  SLP: { cls: 'hll', icon: 'Triangle', label: 'Slope', labelKm: 'ចង្អើត' },
  SPUR: { cls: 'rdge', icon: 'Gem', label: 'Spur', labelKm: 'Spur' },
  RK: { cls: 'hll', icon: 'Mountain', label: 'Rock', labelKm: 'ថ្ម' },
  PT: { cls: 'hll', icon: 'MapPin', label: 'Point', labelKm: 'ចំណុច' },
};

export const COUNTRY_META = {
  KH: { cls: 'kh', label: '🇰🇭 Cambodia', labelKm: '🇰🇭 កម្ពុជា', short: 'KH' },
  TH: { cls: 'th', label: '🇹🇭 Thailand', labelKm: '🇹🇭 ថៃ', short: 'TH' },
  LA: { cls: 'la', label: '🇱🇦 Laos', labelKm: '🇱🇦 ឡាវ', short: 'LA' },
  'KH,TH': { cls: 'multi', label: '🇰🇭+🇹🇭 Border', labelKm: '🇰🇭+🇹🇭 ព្រំដែន', short: 'KH/TH' },
  'KH,LA,TH': { cls: 'multi', label: '🇰🇭+🇱🇦+🇹🇭 Triple', labelKm: '🇰🇭+🇱🇦+🇹🇭 ព្រំដែនបី', short: 'KH/LA/TH' },
};

export function elevClass(e) {
  if (!e) return 'low-elev';
  if (e >= 1000) return 'high-elev';
  if (e >= 300) return 'med-elev';
  return 'low-elev';
}

export function elevColor(e) {
  const cls = elevClass(e);
  if (cls === 'high-elev') return '#e11d48';
  if (cls === 'med-elev') return '#f59e0b';
  return '#3b82f6';
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
  if (m.alt) m.alt.split(',').forEach(a => { const t = a.trim(); if (t) names.add(t); });
  return Array.from(names);
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
  const mtnNorm = mountainNames.map(n => normalizeName(n));
  for (const geo of geoNames) {
    const geoNorm = normalizeName(geo);
    if (!geoNorm) continue;
    for (const mtn of mtnNorm) {
      if (!mtn) continue;
      if (geoNorm === mtn || geoNorm.includes(mtn) || mtn.includes(geoNorm)) {
        return { matched: true, geoName: geo, mountainName: mountainNames[mtnNorm.indexOf(mtn)] };
      }
      const geoTokens = new Set(geoNorm.split(' '));
      const mtnTokens = mtn.split(' ');
      if (mtnTokens.length >= 2) {
        const common = mtnTokens.filter(t => geoTokens.has(t));
        if (common.length >= 2) {
          return { matched: true, geoName: geo, mountainName: mountainNames[mtnNorm.indexOf(mtn)] };
        }
      }
    }
  }
  return { matched: false, geoName: geoNames[0] || null };
}
