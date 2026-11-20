import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as SunCalc from 'suncalc';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Compass, Loader2, RotateCcw, X, Play, Pause, Mountain, Footprints, Waves, Sun } from 'lucide-react';
import { elevationOf, haversine } from '../lib/utils';

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

function sunVector(lat, lon, date = new Date()) {
  const pos = SunCalc.getPosition(date, lat, lon);
  const cosAlt = Math.cos(pos.altitude);
  return new THREE.Vector3(
    -Math.sin(pos.azimuth) * cosAlt,
    Math.sin(pos.altitude),
    Math.cos(pos.azimuth) * cosAlt,
  );
}

function contourSegments(heights, level, mPerPixel, exaggeration) {
  const step = 4;
  const points = [];
  const edge = (ax, ay, bx, by, ha, hb) => {
    if ((ha < level) === (hb < level)) return null;
    const t = (level - ha) / (hb - ha || 1);
    return [ax + (bx - ax) * t, ay + (by - ay) * t];
  };
  const toWorld = ([px, py]) => new THREE.Vector3(
    (px - SIZE / 2) * mPerPixel,
    level * exaggeration + 3,
    -(py - SIZE / 2) * mPerPixel,
  );
  for (let y = 0; y < SIZE - step; y += step) {
    for (let x = 0; x < SIZE - step; x += step) {
      const h00 = heights[y * SIZE + x];
      const h10 = heights[y * SIZE + x + step];
      const h01 = heights[(y + step) * SIZE + x];
      const h11 = heights[(y + step) * SIZE + x + step];
      const crossings = [
        edge(x, y, x + step, y, h00, h10),
        edge(x + step, y, x + step, y + step, h10, h11),
        edge(x + step, y + step, x, y + step, h11, h01),
        edge(x, y + step, x, y, h01, h00),
      ].filter(Boolean);
      for (let i = 0; i + 1 < crossings.length; i += 2) {
        points.push(toWorld(crossings[i]), toWorld(crossings[i + 1]));
      }
    }
  }
  return points;
}

export default function SummitView({ mountain, mountains = [], onJump, onClose, t }) {
  const mountRef = useRef(null);
  const labelsRef = useRef(null);
  const walkRef = useRef(null);
  const jumpRef = useRef(onJump);
  const stateRef = useRef({ yaw: 0, pitch: -3, fov: 74, auto: false });
  const [status, setStatus] = useState('loading');
  const [auto, setAuto] = useState(false);
  const [walking, setWalking] = useState(false);
  const headingRef = useRef(null);
  const compassRef = useRef(null);
  const elevationRef = useRef(null);
  const sunRef = useRef(null);

  jumpRef.current = onJump;
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
        const toLocal = (lat, lon) => ({
          x: (lon - gridCenterLon) * 111320 * Math.cos(lat * Math.PI / 180),
          z: -(lat - gridCenterLat) * 110540,
        });
        const { x: peakX, z: peakZ } = toLocal(mountain.lat, mountain.lon);

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
        const ambient = new THREE.HemisphereLight(0xdceaff, 0x4d3f2e, 1.25);
        scene.add(ambient);

        // Real sun position for the current date/time at the peak.
        const sun = new THREE.DirectionalLight(0xfff3dd, 1.5);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        const shadowExtent = worldWidth * 0.55;
        sun.shadow.camera.left = -shadowExtent;
        sun.shadow.camera.right = shadowExtent;
        sun.shadow.camera.top = shadowExtent;
        sun.shadow.camera.bottom = -shadowExtent;
        sun.shadow.camera.near = 1;
        sun.shadow.camera.far = worldWidth * 3;
        sun.shadow.bias = -0.0004;
        scene.add(sun);
        scene.add(sun.target);
        sun.target.position.set(peakX, 0, peakZ);
        terrain.receiveShadow = true;
        sunRef.current = sun;

        // Real water shader (Three.js Water) at sea level.
        const normals = new THREE.TextureLoader().load('/textures/waternormals.jpg', () => renderer?.setPixelRatio(Math.min(window.devicePixelRatio, 2)));
        normals.wrapS = normals.wrapT = THREE.RepeatWrapping;
        const waterGeo = new THREE.PlaneGeometry(worldWidth, worldWidth);
        waterGeo.rotateX(-Math.PI / 2);
        const water = new Water(waterGeo, {
          textureWidth: 512,
          textureHeight: 512,
          waterNormals: normals,
          sunDirection: sunVector(mountain.lat, mountain.lon),
          sunColor: 0xffe6bd,
          waterColor: 0x1f5e6b,
          distortionScale: 2.4,
          alpha: 0.86,
          fog: true,
        });
        water.position.y = 0;
        scene.add(water);

        // Elevation contour at the elevation of the current spot.
        const levelGroup = new THREE.Group();
        scene.add(levelGroup);
        let levelLine = null;
        let lastLevel = Math.round(elev);
        const setLevelLine = (level) => {
          if (levelLine) {
            levelGroup.remove(levelLine);
            levelLine.geometry.dispose();
            levelLine.material.dispose();
          }
          const pts = contourSegments(heights, level, mPerPixel, EXAGGERATION);
          if (!pts.length) { levelLine = null; return; }
          levelLine = new THREE.LineSegments(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({ color: 0xf2b24c, transparent: true, opacity: 0.9 }),
          );
          levelGroup.add(levelLine);
        };
        setLevelLine(elev);

        const camera = new THREE.PerspectiveCamera(stateRef.current.fov, 1, 1, worldWidth * 4);
        camera.rotation.order = 'YXZ';
        camera.position.set(peakX, elev * EXAGGERATION + EYE_HEIGHT, peakZ);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        // Nearby peaks are projected into the 360° view as clickable labels.
        const labelData = [];
        const nearby = mountains
          .filter((m) => m.id !== mountain.id && Number.isFinite(m.lat) && Number.isFinite(m.lon))
          .map((m) => ({ m, d: haversine(mountain.lat, mountain.lon, m.lat, m.lon) }))
          .filter((item) => item.d <= 30000)
          .sort((a, b) => a.d - b.d)
          .slice(0, 18);
        nearby.forEach(({ m, d }) => {
          const local = toLocal(m.lat, m.lon);
          const ppx = SIZE / 2 + local.x / mPerPixel;
          const ppy = SIZE / 2 - local.z / mPerPixel;
          if (ppx < 0 || ppx >= SIZE || ppy < 0 || ppy >= SIZE) return;
          const h = sampleHeight(heights, ppx, ppy);
          const vec = new THREE.Vector3(local.x, h * EXAGGERATION + 55, local.z);
          const el = document.createElement('button');
          el.type = 'button';
          el.className = 'summit-peak-label';
          const name = document.createElement('strong');
          name.textContent = m._name || m.name || '';
          const meta = document.createElement('small');
          meta.textContent = `${elevationOf(m) ? `${elevationOf(m).toLocaleString()} m` : '—'} · ${(d / 1000).toFixed(1)} km`;
          el.append(name, meta);
          el.addEventListener('click', (event) => { event.stopPropagation(); jumpRef.current?.(m); });
          const projectedInitial = vec.clone().project(camera);
          el.style.transform = `translate(-50%, -50%) translate(${(projectedInitial.x * 0.5 + 0.5) * window.innerWidth}px, ${(-projectedInitial.y * 0.5 + 0.5) * window.innerHeight}px)`;
          labelsRef.current?.appendChild(el);
          labelData.push({ vec, el });
        });

        renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

        const raycaster = new THREE.Raycaster();
        const ndc = new THREE.Vector2();
        const projected = new THREE.Vector3();
        let dragging = false;
        let lastX = 0, lastY = 0, pointerStartX = 0, pointerStartY = 0, moved = 0;
        const down = (e) => {
          dragging = true; moved = 0;
          lastX = pointerStartX = e.clientX; lastY = pointerStartY = e.clientY;
          renderer.domElement.style.cursor = 'grabbing';
        };
        const move = (e) => {
          if (!dragging) return;
          const dx = e.clientX - lastX;
          const dy = e.clientY - lastY;
          lastX = e.clientX; lastY = e.clientY;
          moved += Math.abs(dx) + Math.abs(dy);
          if (walkRef.current) { walkRef.current = null; setWalking(false); }
          stateRef.current.yaw -= dx * 0.22;
          stateRef.current.pitch = Math.max(-80, Math.min(80, stateRef.current.pitch - dy * 0.16));
        };
        const up = (e) => {
          if (!dragging) return;
          dragging = false;
          renderer.domElement.style.cursor = 'grab';
          if (Math.abs(e.clientX - pointerStartX) + Math.abs(e.clientY - pointerStartY) > 8) return;
          const rect = renderer.domElement.getBoundingClientRect();
          ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(ndc, camera);
          const hit = raycaster.intersectObject(terrain, false)[0];
          if (!hit) return;
          const from = camera.position.clone();
          const to = hit.point.clone();
          const dist = from.distanceTo(to);
          const dur = Math.max(900, Math.min(7000, (dist / 70) * 1000));
          const yaw = Math.atan2(-(to.x - from.x), -(to.z - from.z)) * 180 / Math.PI;
          walkRef.current = { from, to, start: performance.now(), dur, yaw };
          stateRef.current.auto = false;
          setAuto(false);
          setWalking(true);
        };
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
        let sunTimer = 1;
        const refreshSun = () => {
          const sv = sunVector(mountain.lat, mountain.lon);
          sun.position.copy(sv).multiplyScalar(worldWidth * 0.8);
          sun.intensity = Math.max(0.08, Math.min(1.8, sv.y * 1.7 + 0.12));
          ambient.intensity = 0.35 + Math.max(0, sv.y) * 0.95;
          water.material.uniforms.sunDirection.value.copy(sv);
        };
        refreshSun();
        const loop = (now) => {
          if (disposed) return;
          const dt = Math.min((now - last) / 1000, 0.1);
          last = now;
          if (stateRef.current.auto) stateRef.current.yaw += dt * 8;
          sunTimer += dt;
          if (sunTimer >= 1) { sunTimer = 0; refreshSun(); }
          water.material.uniforms.time.value += dt * 0.35;

          const walk = walkRef.current;
          if (walk) {
            const p = Math.min(1, (now - walk.start) / walk.dur);
            const eased = p * p * (3 - 2 * p);
            camera.position.x = walk.from.x + (walk.to.x - walk.from.x) * eased;
            camera.position.z = walk.from.z + (walk.to.z - walk.from.z) * eased;
            const ground = sampleHeight(heights, SIZE / 2 + camera.position.x / mPerPixel, SIZE / 2 - camera.position.z / mPerPixel);
            camera.position.y = ground * EXAGGERATION + EYE_HEIGHT;
            stateRef.current.yaw = walk.yaw;
            if (p >= 1) { walkRef.current = null; setWalking(false); }
          }

          camera.up.set(0, 1, 0);
          camera.rotation.set(
            -stateRef.current.pitch * Math.PI / 180,
            stateRef.current.yaw * Math.PI / 180,
            0,
            'YXZ',
          );
          renderer.render(scene, camera);

          const groundRound = Math.round(camera.position.y / EXAGGERATION - EYE_HEIGHT);
          if (Math.abs(groundRound - lastLevel) > 20) { lastLevel = groundRound; setLevelLine(groundRound); }
          if (elevationRef.current) elevationRef.current.textContent = `${groundRound.toLocaleString()} m`;

          const vw = renderer.domElement.clientWidth;
          const vh = renderer.domElement.clientHeight;
          labelData.forEach(({ vec, el }) => {
            projected.copy(vec).project(camera);
            if (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 1.05 || Math.abs(projected.y) > 1.05) {
              el.style.display = 'none';
              return;
            }
            el.style.display = 'flex';
            el.style.transform = `translate(-50%, -50%) translate(${(projected.x * 0.5 + 0.5) * vw}px, ${(-projected.y * 0.5 + 0.5) * vh}px)`;
          });

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
          walkRef.current = null;
          labelData.forEach(({ el }) => el.remove());
          if (labelsRef.current) labelsRef.current.innerHTML = '';
          if (levelLine) { levelLine.geometry.dispose(); levelLine.material.dispose(); }
          water.geometry.dispose();
          water.material.dispose();
          normals.dispose();
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
  }, [mountain, mountains]);

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

      <div className="pointer-events-none absolute inset-0 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="pointer-events-auto min-w-0 max-w-[300px] border border-white/15 bg-black/45 px-4 py-3 backdrop-blur-md">
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--forest)]">Summit view · 360°</div>
            <h2 className="serif mt-1 text-lg font-bold leading-tight">{mountain?._name}</h2>
            <p className="mt-1 hidden text-[11px] text-white/65 sm:block">Drag to look · Click ground to walk · Scroll to zoom</p>
            <div className="mt-2 flex items-center gap-3 border-t border-white/15 pt-2 text-[10px] font-bold uppercase tracking-wide text-white/70">
              <span ref={elevationRef} className="text-[var(--ochre)]">{peakElev ? `${peakElev.toLocaleString()} m` : '—'}</span>
              <span className="flex items-center gap-1"><Sun className="h-3 w-3" /> Live sun</span>
              <span className="flex items-center gap-1"><Waves className="h-3 w-3" /> Water</span>
            </div>
          </div>
          <div className="pointer-events-auto flex shrink-0 flex-col items-center gap-2 sm:flex-row">
            <button onClick={toggleAuto} className="grid h-11 w-11 place-items-center border border-white/15 bg-black/45 hover:bg-white/10" title="Auto rotate" aria-label="Auto rotate">
              {auto ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button onClick={reset} className="grid h-11 w-11 place-items-center border border-white/15 bg-black/45 hover:bg-white/10" title="Reset view" aria-label="Reset view"><RotateCcw className="h-4 w-4" /></button>
            <button onClick={onClose} className="grid h-11 w-11 place-items-center border border-white/15 bg-black/45 hover:bg-white/10" title="Close" aria-label="Close"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="pointer-events-auto absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 flex -translate-x-1/2 items-center gap-3 border border-white/15 bg-black/45 px-4 py-2 backdrop-blur-md">
          <Compass ref={compassRef} className="h-5 w-5 text-[var(--rust)]" />
          <span ref={headingRef} className="serif text-sm font-bold tracking-wider">N · 0°</span>
          {walking && <span className="flex items-center gap-1 border-l border-white/20 pl-3 text-[10px] font-bold uppercase tracking-wide text-[var(--forest)]"><Footprints className="h-3.5 w-3.5" /> Walking…</span>}
        </div>

        <div ref={labelsRef} className="pointer-events-none absolute inset-0 overflow-hidden" />

        <div className="pointer-events-none absolute inset-x-0 top-1/2 flex justify-center">
          <span className="h-5 w-5 rounded-full border border-white/50 opacity-60" />
        </div>
      </div>
    </div>
  );
}
