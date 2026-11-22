// Multi-source elevation lookup.
//
// Browser-friendly sources only: free, keyless, CORS-enabled.
//  - Terrarium tiles (AWS Open Data): the same 30 m-class DEM blend the 3D views use.
//    Built from SRTM and other sources; read byte-exact with our own PNG decoder.
//  - Open-Meteo Elevation API: Copernicus GLO-90 (ESA).
//  - OpenTopoData public API: SRTM 30 m (NASA), ASTER 30 m (NASA/METI), ETOPO1 (NOAA).
//
// Sources that cannot run in a static web app (raw GeoTIFF downloads without CORS,
// Google Earth Engine's GEM-15, regional lidar for other countries) are documented in
// ELEVATION_CATALOG so the app can credit and link them honestly.
import { decodePng, canDecodePng } from './pngDecode';

const TILE = 256;
const ZOOM = 12;
const TIMEOUT_MS = 9000;
const CACHE_PREFIX = 'mountkh_elev_v1_';
const CACHE_TTL = 30 * 24 * 3600 * 1000; // elevation data is static

export const ELEVATION_CATALOG = [
  { id: 'srtm', name: 'SRTM', org: 'NASA', res: '30 m', status: 'used', url: 'https://earthexplorer.usgs.gov/', note: 'Near-global radar DEM, 2000' },
  { id: 'cop', name: 'Copernicus DEM GLO-30', org: 'ESA', res: '30 m', status: 'used', url: 'https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM', note: 'Global surface model, queried at 90 m' },
  { id: 'gem', name: 'GEM-15', org: 'Google', res: '15 m', status: 'experimental', url: 'https://developers.google.com/earth-engine/datasets/catalog/projects_climate-and-sustainability_assets_gem-15_v1', note: 'Experimental, Earth Engine only' },
  { id: 'etopo', name: 'ETOPO', org: 'NOAA', res: '~1.8 km', status: 'used', url: 'https://www.ncei.noaa.gov/products/etopo-global-relief-model', note: 'Global relief incl. ocean floor' },
  { id: 'otopo', name: 'OpenTopography', org: 'Community', res: 'varies', status: 'link', url: 'https://opentopography.org/', note: 'Portal for open lidar and DEM downloads' },
  { id: '3dep', name: 'USGS 3DEP', org: 'United States', res: '1 m', status: 'regional', url: 'https://www.usgs.gov/3d-elevation-program', note: 'Lidar, US only' },
  { id: 'hrdem', name: 'Canada HRDEM', org: 'NRCan', res: '1 m', status: 'regional', url: 'https://open.canada.ca/data/en/dataset/957782bf-847c-4644-a757-e383c0057995', note: 'Lidar, Canada only' },
  { id: 'ea', name: 'England LIDAR', org: 'Environment Agency', res: '1 m', status: 'regional', url: 'https://environment.data.gov.uk/survey', note: 'National LIDAR Programme' },
  { id: 'scot', name: 'Scotland lidar', org: 'Scottish public sector', res: '~1 m', status: 'regional', url: 'https://remotesensingdata.gov.scot/', note: 'Phased releases to 2027' },
  { id: 'cnr', name: 'Italy 5 m DTM', org: 'CNR', res: '5 m', status: 'regional', url: 'https://zenodo.org/records/24009736', note: 'Seamless national terrain model' },
  { id: 'ahn', name: 'Netherlands AHN', org: 'AHN', res: '0.5 m', status: 'regional', url: 'https://www.ahn.nl/', note: 'National lidar and point clouds' },
];

// What the live comparison queries, in display order.
export const LIVE_SOURCES = [
  { id: 'terrarium', label: 'Terrarium · SRTM blend', res: '~38 m', fine: true },
  { id: 'srtm30m', label: 'SRTM 30 m · NASA', res: '30 m', fine: true },
  { id: 'aster30m', label: 'ASTER 30 m · NASA/METI', res: '30 m', fine: true },
  { id: 'cop90', label: 'Copernicus GLO-90 · ESA', res: '90 m', fine: true },
  { id: 'etopo1', label: 'ETOPO1 · NOAA', res: '~1.8 km', fine: false },
];

function withTimeout(ms, signal) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener('abort', onAbort);
  return { signal: ctrl.signal, done: () => { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); } };
}

async function getJson(url, signal) {
  const t = withTimeout(TIMEOUT_MS, signal);
  try {
    const res = await fetch(url, { signal: t.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally { t.done(); }
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Terrarium tile sample with bilinear interpolation. */
export async function terrariumElevation(lat, lon, signal) {
  if (!canDecodePng) throw new Error('PNG decoding unsupported');
  const n = 2 ** ZOOM;
  const latRad = (lat * Math.PI) / 180;
  const xf = ((lon + 180) / 360) * n;
  const yf = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const tx = Math.floor(xf), ty = Math.floor(yf);
  const t = withTimeout(TIMEOUT_MS, signal);
  let png;
  try {
    const res = await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${ZOOM}/${tx}/${ty}.png`, { signal: t.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    png = await decodePng(await res.arrayBuffer());
  } finally { t.done(); }
  const px = Math.min(TILE - 1.001, Math.max(0, (xf - tx) * TILE - 0.5));
  const py = Math.min(TILE - 1.001, Math.max(0, (yf - ty) * TILE - 0.5));
  const x0 = Math.floor(px), y0 = Math.floor(py), fx = px - x0, fy = py - y0;
  const h = (x, y) => {
    const i = (y * TILE + x) * 4;
    return png.data[i] * 256 + png.data[i + 1] + png.data[i + 2] / 256 - 32768;
  };
  return (h(x0, y0) * (1 - fx) + h(x0 + 1, y0) * fx) * (1 - fy) + (h(x0, y0 + 1) * (1 - fx) + h(x0 + 1, y0 + 1) * fx) * fy;
}

async function copernicus90(lat, lon, signal) {
  const data = await getJson(`https://api.open-meteo.com/v1/elevation?latitude=${lat.toFixed(5)}&longitude=${lon.toFixed(5)}`, signal);
  return num(Array.isArray(data.elevation) ? data.elevation[0] : data.elevation);
}

async function openTopoData(lat, lon, signal) {
  const data = await getJson(`https://api.opentopodata.org/v1/srtm30m,aster30m,etopo1?locations=${lat.toFixed(5)},${lon.toFixed(5)}`, signal);
  const out = {};
  for (const r of data.results || []) out[r.dataset] = num(r.elevation);
  return out;
}

export function summarize(items) {
  const fine = items.filter((i) => i.fine && i.value != null).map((i) => i.value).sort((a, b) => a - b);
  if (!fine.length) return { best: null, min: null, max: null, count: 0 };
  const mid = Math.floor(fine.length / 2);
  const best = fine.length % 2 ? fine[mid] : (fine[mid - 1] + fine[mid]) / 2;
  return { best: Math.round(best), min: Math.round(fine[0]), max: Math.round(fine[fine.length - 1]), count: fine.length };
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Date.now() - parsed.at < CACHE_TTL ? parsed.items : null;
  } catch { return null; }
}
function writeCache(key, items) {
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ at: Date.now(), items })); } catch { /* storage full or blocked */ }
}

/**
 * Query every live source in parallel. Failures only mark that source unavailable.
 * Returns { items: [{id,label,res,fine,value|null}], best, min, max, count, cached }.
 */
export async function fetchElevationSources(lat, lon, signal) {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  let items = readCache(key);
  const cached = !!items;
  if (!items) {
    const [terr, cop, topo] = await Promise.allSettled([
      terrariumElevation(lat, lon, signal),
      copernicus90(lat, lon, signal),
      openTopoData(lat, lon, signal),
    ]);
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const topoV = topo.status === 'fulfilled' ? topo.value : {};
    const values = {
      terrarium: terr.status === 'fulfilled' ? num(terr.value) : null,
      cop90: cop.status === 'fulfilled' ? cop.value : null,
      srtm30m: topoV.srtm30m ?? null,
      aster30m: topoV.aster30m ?? null,
      etopo1: topoV.etopo1 ?? null,
    };
    items = LIVE_SOURCES.map((s) => ({ ...s, value: values[s.id] == null ? null : Math.round(values[s.id]) }));
    if (items.some((i) => i.value != null)) writeCache(key, items);
  }
  return { items, ...summarize(items), cached };
}
