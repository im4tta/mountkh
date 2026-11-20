import { useCallback, useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Compass, Layers3, RotateCcw, Mountain as MountainIcon } from 'lucide-react';
import { elevationOf, elevationTone } from '../lib/utils';
import { mountainMarkerSvg } from '../lib/iconmcp';

maplibregl.setWorkerUrl(maplibreWorkerUrl);

const DEM_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const SATELLITE_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const TOPO_TILES = [
  'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
];

const TERRAIN_STYLE = {
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: [SATELLITE_TILES],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Imagery &copy; Esri',
    },
    topo: {
      type: 'raster',
      tiles: TOPO_TILES,
      tileSize: 256,
      maxzoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    },
    dem: {
      type: 'raster-dem',
      tiles: [DEM_TILES],
      tileSize: 256,
      encoding: 'terrarium',
      maxzoom: 14,
      attribution: 'Terrain &copy; Mapzen / AWS Terrarium',
    },
    hillshadeDem: {
      type: 'raster-dem',
      tiles: [DEM_TILES],
      tileSize: 256,
      encoding: 'terrarium',
      maxzoom: 14,
    },
  },
  layers: [
    { id: 'satellite', type: 'raster', source: 'satellite', layout: { visibility: 'visible' } },
    { id: 'topo', type: 'raster', source: 'topo', layout: { visibility: 'none' } },
    {
      id: 'hillshade',
      type: 'hillshade',
      source: 'hillshadeDem',
      layout: { visibility: 'none' },
      paint: {
        'hillshade-exaggeration': 0.4,
        'hillshade-shadow-color': '#3a2f22',
        'hillshade-highlight-color': '#fff6e5',
      },
    },
  ],
};

function cssColor(variable, fallback) {
  const name = variable.startsWith('var(') ? variable.slice(4, -1) : variable;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export default function TerrainView({ mountains, onSelect, theme, focusTarget, onSummit, t }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const dataRef = useRef(mountains);
  const selectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);
  const [styleReady, setStyleReady] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [base, setBase] = useState('satellite');

  dataRef.current = mountains;
  selectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!document.createElement('canvas').getContext('webgl2')) {
      setUnsupported(true);
      return;
    }
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: TERRAIN_STYLE,
      center: [103.65, 12.45],
      zoom: 8.1,
      pitch: 62,
      bearing: -18,
      maxPitch: 85,
      maxZoom: 16,
      attributionControl: false,
      antialias: true,
    });
    mapRef.current = map;

    map.on('error', (event) => console.warn('Terrain map error:', event.error));
    let initialized = false;
    const addPeaks = () => {
      if (!map.getStyle() || map.getSource('peaks')) return;
      setStyleReady(true);
      try {
        if (!map.getTerrain()) map.setTerrain({ source: 'dem', exaggeration: 1.6 });
        map.addSource('peaks', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
        map.addLayer({
          id: 'peaks-circles',
          type: 'circle',
          source: 'peaks',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 3, 10, 6.5, 14, 10],
            'circle-color': ['match', ['get', 'tone'], 'high', '#c2410c', 'mid', '#d99a1c', 'low', '#0ea5a4', '#2f5d4e'],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1.6,
            'circle-opacity': 0.92,
          },
        });
        map.on('click', 'peaks-circles', (event) => {
          const id = event.features?.[0]?.properties?.id;
          const mountain = dataRef.current.find((m) => String(m.id) === String(id));
          if (mountain) selectRef.current(mountain);
        });
        map.on('mouseenter', 'peaks-circles', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'peaks-circles', () => { map.getCanvas().style.cursor = ''; });
      } catch {
        // Style not ready yet — retry on the next style/load event.
      }
    };
    const initialize = () => {
      if (initialized) return;
      initialized = true;
      setReady(true);
      addPeaks();
    };
    map.on('load', initialize);
    map.on('load', addPeaks);
    map.once('style.load', addPeaks);
    const initTimer = setTimeout(initialize, 1200);
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true }), 'bottom-right');
    map.addControl(new maplibregl.TerrainControl({ source: 'dem', exaggeration: 1.6 }), 'bottom-right');

    return () => {
      clearTimeout(initTimer);
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  // Update peak markers + GeoJSON data when the filtered set changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const points = mountains.slice(0, 600);
    const source = map.getSource('peaks');
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: points.map((m) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [m.lon, m.lat] },
          properties: { id: String(m.id), tone: elevationTone(elevationOf(m)).key },
        })),
      });
    }

    const tops = mountains.slice().sort((a, b) => (elevationOf(b) || 0) - (elevationOf(a) || 0)).slice(0, 14);
    tops.forEach((m) => {
      const color = cssColor(elevationTone(elevationOf(m)).color, '#c2410c');
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'terrain-marker';
      el.setAttribute('aria-label', m._name);
      const pin = document.createElement('span');
      pin.className = 'terrain-marker-pin';
      pin.innerHTML = mountainMarkerSvg(color, { size: 24 });
      const label = document.createElement('span');
      label.className = 'terrain-marker-label';
      const name = document.createElement('strong');
      name.textContent = m._name;
      const elev = document.createElement('small');
      elev.textContent = elevationOf(m) ? `${elevationOf(m).toLocaleString()} m` : '';
      label.append(name, elev);
      el.append(pin, label);
      el.addEventListener('click', (event) => { event.stopPropagation(); onSelect(m); });
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([m.lon, m.lat]).addTo(map);
      markersRef.current.push(marker);
    });
  }, [mountains, ready, onSelect]);

  // Base layer switching. Re-applied whenever the style becomes available.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;
    const apply = () => {
      const isSat = base === 'satellite';
      ['satellite', 'topo', 'hillshade'].forEach((id) => {
        if (!map.getLayer(id)) return;
        const visible = id === (isSat ? 'satellite' : 'topo');
        map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
      });
    };
    apply();
    map.once('styledata', apply);
    return () => map.off('styledata', apply);
  }, [base, styleReady]);

  // Fly to a feature selected elsewhere in the app.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !focusTarget) return;
    map.flyTo({ center: [focusTarget.lon, focusTarget.lat], zoom: 12, pitch: 68, duration: 1400, essential: true });
  }, [focusTarget, ready]);

  const resetView = useCallback(() => {
    mapRef.current?.flyTo({ center: [103.65, 12.45], zoom: 8.1, pitch: 62, bearing: -18, duration: 1200 });
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--paper)]">
      <div ref={containerRef} className="h-full w-full" />

      {!ready && !unsupported && (
        <div className="map-panel absolute inset-0 z-10 grid place-items-center">
          <div className="text-center">
            <MountainIcon className="mx-auto h-8 w-8 animate-pulse text-[var(--forest)]" />
            <p className="mt-3 text-xs font-semibold text-[var(--muted)]">Loading 3D terrain…</p>
          </div>
        </div>
      )}
      {unsupported && (
        <div className="map-panel absolute inset-0 z-10 grid place-items-center p-6">
          <div className="max-w-sm text-center">
            <MountainIcon className="mx-auto h-10 w-10 text-[var(--rust)]" />
            <h2 className="serif mt-4 text-xl font-bold">3D terrain needs WebGL 2</h2>
            <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">Your browser does not support WebGL 2. Use the 2D map view or a recent version of Chrome, Edge, Firefox or Safari.</p>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 z-[500] p-3 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="map-panel pointer-events-auto max-w-[calc(100%-3.5rem)] px-3 py-2.5 sm:max-w-[300px] sm:px-4 sm:py-3">
            <div className="eyebrow flex items-center gap-1.5"><Compass className="h-3 w-3" /> 3D terrain · Cambodia</div>
            <h2 className="serif mt-1 text-lg font-bold leading-tight">Explore the highlands</h2>
            <p className="mt-1 hidden text-[10px] leading-relaxed text-[var(--muted)] sm:block">Real elevation from DEM tiles. Drag to orbit · scroll to zoom · right-drag to tilt.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {['satellite', 'topo'].map((key) => (
                <button key={key} onClick={() => setBase(key)} className={`min-h-9 rounded-sm border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${base === key ? 'border-[var(--forest)] bg-[var(--forest)] text-white' : 'border-[var(--rule)] text-[var(--muted)]'}`}>
                  {key === 'satellite' ? 'Satellite' : 'Topographic'}
                </button>
              ))}
              <button onClick={resetView} className="grid h-9 w-9 place-items-center rounded-sm border border-[var(--rule)] text-[var(--muted)] hover:text-[var(--ink)]" title="Reset view" aria-label="Reset view"><RotateCcw className="h-3.5 w-3.5" /></button>
              <button
                onClick={() => onSummit?.(focusTarget || mountains[0])}
                disabled={!mountains.length}
                className="min-h-9 rounded-sm border border-[var(--rust)] bg-[var(--rust)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white disabled:opacity-40"
              >
                {t('standOnSummit')}
              </button>
            </div>
          </div>

          <div className="map-panel pointer-events-auto hidden px-3 py-2 text-[9px] uppercase tracking-[0.12em] text-[var(--muted)] sm:block">
            DEM: Mapzen Terrarium · Imagery: {base === 'satellite' ? 'Esri' : 'OSM'}
          </div>
        </div>

        <div className="map-panel pointer-events-auto absolute bottom-5 left-3 hidden px-3 py-2.5 sm:left-5 sm:block">
          <div className="eyebrow mb-2 flex items-center gap-1.5"><Layers3 className="h-3 w-3" /> {t('mapLegend')}</div>
          {[['1000 m+', 'var(--elev-high)'], ['300–1000 m', 'var(--elev-mid)'], ['0–300 m', 'var(--elev-low)']].map(([label, color]) => (
            <div key={label} className="flex items-center gap-2 text-[11px] text-[var(--ink-soft)]">
              <span className="h-2.5 w-2.5 rounded-full border border-[var(--card)]" style={{ background: color }} />{label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
