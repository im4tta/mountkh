/**
 * Icon paths sourced from IconMCP (https://iconmcp.com) — Tabler Icons set, MIT licensed.
 * Bundled locally so the app has no runtime icon dependency.
 */
export const GLYPHS = {
  mountain: {
    viewBox: '0 0 24 24',
    paths: [
      'M3 20h18l-6.921 -14.612a2.3 2.3 0 0 0 -4.158 0l-6.921 14.612z',
      'M7.5 11l2 2.5l2.5 -2.5l2 3l2.5 -2',
    ],
  },
  flag: {
    viewBox: '0 0 24 24',
    paths: ['M5 14h14v-9h-14v16'],
  },
  pin: {
    viewBox: '0 0 24 24',
    paths: [
      'M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0',
      'M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z',
    ],
  },
  compass: {
    viewBox: '0 0 24 24',
    paths: [
      'M8 16l2 -6l6 -2l-2 6l-6 2',
      'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0',
      'M12 3l0 2', 'M12 19l0 2', 'M3 12l2 0', 'M19 12l2 0',
    ],
  },
  download: {
    viewBox: '0 0 24 24',
    paths: ['M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2', 'M7 11l5 5l5 -5', 'M12 4l0 12'],
  },
  share: {
    viewBox: '0 0 24 24',
    paths: [
      'M6 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
      'M18 6m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
      'M18 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
      'M8.7 10.7l6.6 -3.4', 'M8.7 13.3l6.6 3.4',
    ],
  },
  qrcode: {
    viewBox: '0 0 24 24',
    paths: [
      'M4 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z',
      'M7 17l0 .01',
      'M14 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z',
      'M7 7l0 .01',
      'M4 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z',
      'M17 7l0 .01', 'M14 14l3 0', 'M20 14l0 .01', 'M14 14l0 3',
      'M14 20l3 0', 'M17 17l3 0', 'M20 17l0 3',
    ],
  },
  search: { viewBox: '0 0 24 24', paths: ['M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0', 'M21 21l-6 -6'] },
  heart: { viewBox: '0 0 24 24', paths: ['M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572'] },
  close: { viewBox: '0 0 24 24', paths: ['M18 6l-12 12', 'M6 6l12 12'] },
  map: { viewBox: '0 0 24 24', paths: ['M3 7l6 -3l6 3l6 -3v13l-6 3l-6 -3l-6 3v-13', 'M9 4v13', 'M15 7v13'] },
  camera: {
    viewBox: '0 0 24 24',
    paths: [
      'M5 7h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2',
      'M9 13a3 3 0 1 0 6 0a3 3 0 0 0 -6 0',
    ],
  },
};

export function glyphSvg(name, { stroke = 'currentColor', size = 24, strokeWidth = 2, extra = '' } = {}) {
  const glyph = GLYPHS[name] || GLYPHS.mountain;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${glyph.viewBox}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" ${extra}>${glyph.paths.map((d) => `<path d="${d}"/>`).join('')}</svg>`;
}

/** A mountain-shaped Leaflet/Google marker with an elevation colour. */
export function mountainMarkerSvg(color, { size = 30, selected = false, paper = '#fffdf8' } = {}) {
  const glyph = GLYPHS.mountain;
  const halo = selected ? `<circle cx="16" cy="15" r="14.5" fill="${color}" opacity="0.16"/>` : '';
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 6}" viewBox="0 0 32 38">`,
    halo,
    `<path d="M16 36 L10.5 22 L21.5 22 Z" fill="${color}"/>`,
    `<g transform="translate(4,2) scale(1)">`,
    `<path d="${glyph.paths[0]}" transform="translate(0,-1)" fill="${color}" stroke="${paper}" stroke-width="1.1" stroke-linejoin="round"/>`,
    `<path d="${glyph.paths[1]}" transform="translate(0,-1)" fill="none" stroke="${paper}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`,
    `</g>`,
    `</svg>`,
  ].join('');
}

export function markerDataUri(color, selected = false) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(mountainMarkerSvg(color, { selected, paper: '#fffdf8' }))}`;
}
