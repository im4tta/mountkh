import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Compass, Loader2, RotateCcw, X, Play, Pause, Mountain } from 'lucide-react';
import { elevationOf } from '../lib/utils';

const ZOOM = 12;
const GRID = 4;
const TILE = 256;
const SIZE = GRID * TILE;
const SEGMENTS = 320;
const EXAGGERATION = 1.35;
const EYE_HEIGHT = 4;

const DEM_URL = (z, x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
const SAT_URL = (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;

function tileX(lon, z) { return Math.floor((lon + 180) / 360 * 2 ** z); }
function tileY(lat, z) { return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * 2 ** z); }
function lonFromTile(x, z) { return x / 2 ** z * 360 - 180; }
function latFromTile(y, z) { return Math.atan(Math.sinh(Math.PI * (1 - 2 * y / 2 ** z))) * 180 / Math.PI; }

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

function decodeTerrarium(data) {
  return data[0] * 256 + data[1] + data[2] / 256 - 32768;
}

function sampleHeight(heights, px, py) {
  const x = Math.max(0, Math.min(SIZE - 1, Math.round(px)));
  const y = Math.max(0, Math.min(SIZE - 1, Math.round(py)));
  return heights[y * SIZE + x];
}

function headingLabel(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

export default function SummitView({ mountain, onClose, t }) {
  const mountRef = useRef(null);
  const stateRef = useRef({ yaw: 0, pitch: -3, fov: 74, auto: false });
  const [status, setStatus] = useState('loading');
  const [auto, setAuto] = useState(false);
  const headingRef = useRef(null);
  const compassRef = useRef(null);
  const [peakElev, setPeakElev] = useState(null);

  useEffect(() => {
    if (!mountain || !mountRef.current) return;
    let disposed = false;
    let frame = 0;
    let renderer;

    const start = async () => {
      try {
        setStatus('loading');
        const z = ZOOM;
        const cx = tileX(mountain.lon, z);
        const cy = tileY(mountain.lat, z);
        const startX = cx - GRID / 2;
        const startY = cy - GRID / 2;

        const demCanvas = document.createElement('canvas');
        demCanvas.width = demCanvas.height = SIZE;
        const demCtx = demCanvas.getContext('2d', { willReadFrequently: true });
        const satCanvas = document.createElement('canvas');
        satCanvas.width = satCanvas.height = SIZE;
        const satCtx = satCanvas.getContext('2d');

        const jobs = [];
        for (let row = 0; row < GRID; row++) {
          for (let col = 0; col < GRID; col++) {
            const x = Math.round(startX + col);
            const y = Math.round(startY + row);
            jobs.push(Promise.all([loadImage(DEM_URL(z, x, y)), loadImage(SAT_URL(z, x, y))]).then(([dem, sat]) => {
              demCtx.drawImage(dem, col * TILE, row * TILE, TILE, TILE);
              satCtx.drawImage(sat, col * TILE, row * TILE, TILE, TILE);
            }));
          }
        }
        await Promise.all(jobs);
        if (disposed) return;

        const demData = demCtx.getImageData(0, 0, SIZE, SIZE).data;
        const heights = new Float32Array(SIZE * SIZE);
        for (let i = 0; i < heights.length; i++) heights[i] = decodeTerrarium(demData.subarray(i * 4, i * 4 + 4));

        const gridCenterLon = lonFromTile(startX + GRID / 2, z);
        const gridCenterLat = latFromTile(startY + GRID / 2, z);
        const mPerPixel = 156543.03392 * Math.cos(mountain.lat * Math.PI / 180) / 2 ** z;
        const worldWidth = SIZE * mPerPixel;
        const peakX = ((mountain.lon - gridCenterLon) * 111320 * Math.cos(mountain.lat * Math.PI / 180));
        const peakZ = -((mountain.lat - gridCenterLat) * 110540);

        const px = Math.max(0, Math.min(SIZE - 1, SIZE / 2 + peakX / mPerPixel));
        const py = Math.max(0, Math.min(SIZE - 1, SIZE / 2 - peakZ / mPerPixel));
        const demElev = sampleHeight(heights, px, py);
        const elev = Math.max(elevationOf(mountain) || 0, demElev || 0);
        setPeakElev(Math.round(elev));

        const geometry = new THREE.PlaneGeometry(worldWidth, worldWidth, SEGMENTS, SEGMENTS);
        geometry.rotateX(-Math.PI / 2);
        const position = geometry.attributes.position;
        for (let i = 0; i < position.count; i++) {
          const x = position.getX(i);
          const z = position.getZ(i);
          const h = sampleHeight(heights, SIZE / 2 + x / mPerPixel, SIZE / 2 - z / mPerPixel);
          position.setY(i, h * EXAGGERATION);
        }
        geometry.computeVertexNormals();

        const texture = new THREE.CanvasTexture(satCanvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0, side: THREE.DoubleSide });
        const terrain = new THREE.Mesh(geometry, material);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x9fc4d8);
        scene.fog = new THREE.Fog(0x9fc4d8, worldWidth * 0.35, worldWidth * 1.1);
        scene.add(terrain);
        scene.add(new THREE.HemisphereLight(0xdceaff, 0x4d3f2e, 1.25));
        const sun = new THREE.DirectionalLight(0xfff3dd, 1.5);
        sun.position.set(worldWidth * 0.6, worldWidth * 0.8, worldWidth * 0.4);
        scene.add(sun);

        const camera = new THREE.PerspectiveCamera(stateRef.current.fov, 1, 1, worldWidth * 4);
        camera.rotation.order = 'YXZ';
        camera.position.set(peakX, elev * EXAGGERATION + EYE_HEIGHT, peakZ);

        renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;cursor:grab';
        mountRef.current.appendChild(renderer.domElement);

        const resize = () => {
          if (!mountRef.current) return;
          const w = mountRef.current.clientWidth;
          const h = mountRef.current.clientHeight;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };
        resize();
        window.addEventListener('resize', resize);

        let dragging = false;
        let lastX = 0, lastY = 0;
        const down = (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; renderer.domElement.style.cursor = 'grabbing'; };
        const move = (e) => {
          if (!dragging) return;
          const dx = e.clientX - lastX;
          const dy = e.clientY - lastY;
          lastX = e.clientX; lastY = e.clientY;
          stateRef.current.yaw -= dx * 0.22;
          stateRef.current.pitch = Math.max(-70, Math.min(45, stateRef.current.pitch - dy * 0.16));
        };
        const up = () => { dragging = false; renderer.domElement.style.cursor = 'grab'; };
        const wheel = (e) => {
          e.preventDefault();
          stateRef.current.fov = Math.max(35, Math.min(95, stateRef.current.fov + e.deltaY * 0.02));
          camera.fov = stateRef.current.fov;
          camera.updateProjectionMatrix();
        };
        renderer.domElement.addEventListener('pointerdown', down);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        renderer.domElement.addEventListener('wheel', wheel, { passive: false });

        let last = performance.now();
        const loop = (now) => {
          if (disposed) return;
          const dt = Math.min((now - last) / 1000, 0.1);
          last = now;
          if (stateRef.current.auto) stateRef.current.yaw += dt * 8;
          camera.rotation.y = stateRef.current.yaw * Math.PI / 180;
          camera.rotation.x = -stateRef.current.pitch * Math.PI / 180;
          renderer.render(scene, camera);
          const h = Math.round(((stateRef.current.yaw % 360) + 360) % 360);
          if (headingRef.current) headingRef.current.textContent = `${headingLabel(h)} · ${h}°`;
          if (compassRef.current) compassRef.current.style.transform = `rotate(${-h}deg)`;
          frame = requestAnimationFrame(loop);
        };
        frame = requestAnimationFrame(loop);
        setStatus('ready');

        return () => {
          window.removeEventListener('resize', resize);
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          renderer.domElement.removeEventListener('pointerdown', down);
          renderer.domElement.removeEventListener('wheel', wheel);
          cancelAnimationFrame(frame);
          geometry.dispose();
          material.dispose();
          texture.dispose();
          renderer.dispose();
          if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
        };
      } catch (err) {
        console.error('Summit view failed', err);
        if (!disposed) setStatus('error');
      }
    };

    const cleanupPromise = start();
    return () => { disposed = true; cleanupPromise.then((fn) => fn && fn()); };
  }, [mountain]);

  const toggleAuto = () => {
    stateRef.current.auto = !stateRef.current.auto;
    setAuto(stateRef.current.auto);
  };
  const reset = () => {
    stateRef.current.yaw = 0;
    stateRef.current.pitch = -3;
    stateRef.current.fov = 74;
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-[#0d1512] text-white">
      <div ref={mountRef} className="absolute inset-0" />

      {status === 'loading' && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-[#0d1512]">
          <div className="text-center">
            <Loader2 className="mx-auto h-9 w-9 animate-spin text-[var(--forest)]" />
            <p className="mt-4 text-sm font-semibold">Building summit view…</p>
            <p className="mt-1 text-[11px] text-white/60">Loading real elevation and satellite tiles</p>
          </div>
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-[#0d1512] p-6">
          <div className="max-w-sm text-center">
            <Mountain className="mx-auto h-10 w-10 text-[var(--rust)]" />
            <h2 className="serif mt-4 text-xl font-bold">Could not build the summit view</h2>
            <p className="mt-2 text-xs text-white/60">Terrain or imagery tiles could not be loaded. Check your connection and try again.</p>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="pointer-events-auto max-w-[300px] border border-white/15 bg-black/45 px-4 py-3 backdrop-blur-md">
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--forest)]">Summit view · 360°</div>
            <h2 className="serif mt-1 text-lg font-bold leading-tight">{mountain?._name}</h2>
            <p className="mt-1 text-[11px] text-white/65">{peakElev ? `${peakElev.toLocaleString()} m` : '—'} · Drag to look around · Scroll to zoom</p>
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            <button onClick={toggleAuto} className="grid h-9 w-9 place-items-center border border-white/15 bg-black/45 hover:bg-white/10" title="Auto rotate" aria-label="Auto rotate">
              {auto ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button onClick={reset} className="grid h-9 w-9 place-items-center border border-white/15 bg-black/45 hover:bg-white/10" title="Reset view" aria-label="Reset view"><RotateCcw className="h-4 w-4" /></button>
            <button onClick={onClose} className="grid h-9 w-9 place-items-center border border-white/15 bg-black/45 hover:bg-white/10" title="Close" aria-label="Close"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="pointer-events-auto absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 border border-white/15 bg-black/45 px-4 py-2 backdrop-blur-md">
          <Compass ref={compassRef} className="h-5 w-5 text-[var(--rust)]" />
          <span ref={headingRef} className="serif text-sm font-bold tracking-wider">N · 0°</span>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-1/2 flex justify-center">
          <span className="h-5 w-5 rounded-full border border-white/50 opacity-60" />
        </div>
      </div>
    </div>
  );
}
