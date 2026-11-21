import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as SunCalc from 'suncalc';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { createSky, phaseLabel, moonPhaseName, dirFromAzAlt } from '../lib/skyDome';
import { decodePng, canDecodePng } from '../lib/pngDecode';
import { Compass, Loader2, RotateCcw, X, Play, Pause, Mountain, Footprints, Sun, Moon, Sunrise, Sunset, MoveVertical, Radio } from 'lucide-react';
import { elevationOf, haversine } from '../lib/utils';

const ZOOM = 12;
const GRID = 4;
const TILE = 256;
const SIZE = GRID * TILE;
const MOBILE = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
const SEGMENTS = MOBILE ? 256 : 384;
const EXAGGERATION = 1.35;
const EYE_HEIGHT = 6;
const TZ = 'Asia/Phnom_Penh';
const TZ_OFFSET_MIN = 7 * 60; // Cambodia, Thailand, Laos and Vietnam are all UTC+7, no DST
const EYE_MIN = 2;
const EYE_MAX = 3000;
const eyeFromSlider = (v) => EYE_MIN * (EYE_MAX / EYE_MIN) ** v; // log scale 0..1
const sliderFromEye = (m) => Math.log(m / EYE_MIN) / Math.log(EYE_MAX / EYE_MIN);
const localMinutesNow = () => {
  const d = new Date();
  return ((d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60 + TZ_OFFSET_MIN) % 1440 + 1440) % 1440;
};
// Date for a given local minute-of-day, on today's local date.
const dateForLocalMinutes = (min) => {
  const now = new Date();
  const local = new Date(now.getTime() + TZ_OFFSET_MIN * 60000);
  const midnightUtc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - TZ_OFFSET_MIN * 60000;
  return new Date(midnightUtc + min * 60000);
};
const fmtTime = (date) => (date && !Number.isNaN(date.getTime())
  ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(date)
  : '—');
const fmtClock = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(Math.floor(min % 60)).padStart(2, '0')}`;

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

// Read a DEM canvas's exact RGB bytes. A 2D canvas's getImageData is colour-managed
// on iOS Safari, which corrupts Terrarium-encoded heights. WebGL with colour-space
// conversion disabled returns the raw bytes on every browser.
let rawGl = null;
function readRawPixels(source) {
  const w = source.naturalWidth || source.width;
  const h = source.naturalHeight || source.height;
  if (!rawGl) rawGl = document.createElement('canvas').getContext('webgl', { premultipliedAlpha: false });
  const gl = rawGl;
  if (!gl) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'); ctx.drawImage(source, 0, 0);
    return ctx.getImageData(0, 0, w, h).data;
  }
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  const out = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, out);
  gl.deleteFramebuffer(fb);
  gl.deleteTexture(tex);
  return out;
}

// Remove isolated spikes/holes left by bad DEM pixels (3x3 median-ish clamp).
function despike(heights) {
  const out = new Float32Array(heights);
  for (let y = 1; y < SIZE - 1; y++) {
    for (let x = 1; x < SIZE - 1; x++) {
      const i = y * SIZE + x;
      let min = Infinity, max = -Infinity, sum = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const v = heights[i + dy * SIZE + dx];
        if (v < min) min = v; if (v > max) max = v; sum += v;
      }
      const v = heights[i];
      if (v > max + 60 || v < min - 60 || v < -100 || v > 9000) out[i] = sum / 8;
    }
  }
  return out;
}

// Exact DEM bytes: pure-JS PNG decode where possible, WebGL readback otherwise.
async function loadDem(url) {
  if (canDecodePng) {
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const png = await decodePng(await res.arrayBuffer());
      if (png.width === TILE && png.height === TILE) return png.data;
    } catch (err) {
      console.warn('PNG decode fallback', err);
    }
  }
  return readRawPixels(await loadImage(url));
}

function sampleHeight(heights, px, py) {
  const x = Math.max(0, Math.min(SIZE - 1.001, px));
  const y = Math.max(0, Math.min(SIZE - 1.001, py));
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const i = y0 * SIZE + x0;
  const a = heights[i], b = heights[i + 1], c = heights[i + SIZE], d = heights[i + SIZE + 1];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}

function headingLabel(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function sunVector(lat, lon, date = new Date()) {
  const pos = SunCalc.getPosition(date, lat, lon);
  return dirFromAzAlt(pos.azimuth, pos.altitude);
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
  const stateRef = useRef({ yaw: 0, pitch: -6, fov: 70, auto: false, eye: EYE_HEIGHT, live: true, minutes: localMinutesNow() });
  const [status, setStatus] = useState('loading');
  const [auto, setAuto] = useState(false);
  const [walking, setWalking] = useState(false);
  const headingRef = useRef(null);
  const compassRef = useRef(null);
  const elevationRef = useRef(null);
  const sunRef = useRef(null);

  jumpRef.current = onJump;
  const [peakElev, setPeakElev] = useState(null);
  const [eyeSlider, setEyeSlider] = useState(sliderFromEye(EYE_HEIGHT));
  const [live, setLive] = useState(true);
  const [minutes, setMinutes] = useState(localMinutesNow());
  const [sky, setSky] = useState(null);
  const [panel, setPanel] = useState(null); // 'time' | null

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

        const raw = new Float32Array(SIZE * SIZE);
        const satCanvas = document.createElement('canvas');
        satCanvas.width = satCanvas.height = SIZE;
        const satCtx = satCanvas.getContext('2d');

        const jobs = [];
        for (let row = 0; row < GRID; row++) {
          for (let col = 0; col < GRID; col++) {
            const x = Math.round(startX + col);
            const y = Math.round(startY + row);
            jobs.push(Promise.all([loadDem(DEM_URL(z, x, y)), loadImage(SAT_URL(z, x, y))]).then(([px, sat]) => {
              for (let ty = 0; ty < TILE; ty++) {
                const rowOff = (row * TILE + ty) * SIZE + col * TILE;
                for (let tx = 0; tx < TILE; tx++) {
                  const k = (ty * TILE + tx) * 4;
                  raw[rowOff + tx] = px[k] * 256 + px[k + 1] + px[k + 2] / 256 - 32768;
                }
              }
              satCtx.drawImage(sat, col * TILE, row * TILE, TILE, TILE);
            }));
          }
        }
        await Promise.all(jobs);
        if (disposed) return;

        const heights = despike(raw);

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
        // Snap to the highest DEM point within ~250 m: listed coordinates are often slightly off the top.
        let bestX = px, bestY = py, demElev = sampleHeight(heights, px, py);
        const r = Math.ceil(250 / mPerPixel);
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > r * r) continue;
          const hh = sampleHeight(heights, px + dx, py + dy);
          if (hh > demElev) { demElev = hh; bestX = px + dx; bestY = py + dy; }
        }
        const summitX = (bestX - SIZE / 2) * mPerPixel;
        const summitZ = -(bestY - SIZE / 2) * mPerPixel;
        const elev = demElev;
        const elevOffset = (elevationOf(mountain) || 0) > 0 ? elevationOf(mountain) - demElev : 0;
        setPeakElev(Math.round(elevationOf(mountain) || demElev));

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
        texture.anisotropy = 8;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95, metalness: 0 });
        const terrain = new THREE.Mesh(geometry, material);

        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0xb9d3e3, worldWidth * 0.25, worldWidth * 0.95);
        const skyDome = createSky(worldWidth * 1.4);
        scene.add(skyDome.group);
        scene.background = new THREE.Color(0x0a1426);
        scene.add(terrain);
        const ambient = new THREE.HemisphereLight(0xdceaff, 0x5a4a35, 1.25);
        scene.add(ambient);

        // Real sun position for the current date/time at the peak.
        const sun = new THREE.DirectionalLight(0xfff3dd, 1.5);
        sun.castShadow = true;
        sun.shadow.mapSize.set(MOBILE ? 1024 : 2048, MOBILE ? 1024 : 2048);
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
        const moonLight = new THREE.DirectionalLight(0xaabbee, 0);
        moonLight.target.position.set(summitX, 0, summitZ);
        scene.add(moonLight);
        scene.add(moonLight.target);
        sun.target.position.set(summitX, 0, summitZ);
        terrain.receiveShadow = true;
        sunRef.current = sun;

        // Real water shader (Three.js Water) at sea level.
        const normals = new THREE.TextureLoader().load('/textures/waternormals.jpg');
        normals.wrapS = normals.wrapT = THREE.RepeatWrapping;
        const waterGeo = new THREE.PlaneGeometry(worldWidth, worldWidth);
        waterGeo.rotateX(-Math.PI / 2);
        const water = new Water(waterGeo, {
          textureWidth: MOBILE ? 256 : 512,
          textureHeight: MOBILE ? 256 : 512,
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
          const pts = contourSegments(heights, level - elevOffset, mPerPixel, EXAGGERATION);
          if (!pts.length) { levelLine = null; return; }
          levelLine = new THREE.LineSegments(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({ color: 0xf2b24c, transparent: true, opacity: 0.9 }),
          );
          levelGroup.add(levelLine);
        };
        setLevelLine(elev);

        const camera = new THREE.PerspectiveCamera(stateRef.current.fov, 1, 2, worldWidth * 3);
        camera.rotation.order = 'YXZ';
        camera.position.set(summitX, elev * EXAGGERATION + stateRef.current.eye, summitZ);
        const groundAt = (x, z) => sampleHeight(heights, SIZE / 2 + x / mPerPixel, SIZE / 2 - z / mPerPixel);
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
          const vec = new THREE.Vector3(local.x, h * EXAGGERATION + 40, local.z);
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

        renderer = new THREE.WebGLRenderer({ antialias: !MOBILE || window.devicePixelRatio < 2, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, MOBILE ? 1.75 : 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.9;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;cursor:grab';
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
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
        const pointers = new Map();
        let pinchDist = 0;
        let velYaw = 0, velPitch = 0;
        const setFov = (fov) => {
          stateRef.current.fov = Math.max(30, Math.min(95, fov));
        };
        const down = (e) => {
          pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
          renderer.domElement.setPointerCapture?.(e.pointerId);
          if (pointers.size === 2) {
            const [a, b] = [...pointers.values()];
            pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
            moved = 999;
            return;
          }
          dragging = true; moved = 0; velYaw = velPitch = 0;
          lastX = pointerStartX = e.clientX; lastY = pointerStartY = e.clientY;
          renderer.domElement.style.cursor = 'grabbing';
        };
        const move = (e) => {
          if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.size === 2) {
            const [a, b] = [...pointers.values()];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (pinchDist) setFov(stateRef.current.fov * (pinchDist / d));
            pinchDist = d;
            return;
          }
          if (!dragging) return;
          const dx = e.clientX - lastX;
          const dy = e.clientY - lastY;
          lastX = e.clientX; lastY = e.clientY;
          moved += Math.abs(dx) + Math.abs(dy);
          if (walkRef.current) { walkRef.current = null; setWalking(false); }
          const k = stateRef.current.fov / 74;
          const dYaw = -dx * 0.2 * k;
          const dPitch = -dy * 0.15 * k;
          stateRef.current.yaw += dYaw;
          stateRef.current.pitch = Math.max(-80, Math.min(80, stateRef.current.pitch + dPitch));
          velYaw = dYaw * 60; velPitch = dPitch * 60;
        };
        const up = (e) => {
          pointers.delete(e.pointerId);
          if (pointers.size) return;
          pinchDist = 0;
          if (!dragging) return;
          dragging = false;
          renderer.domElement.style.cursor = 'grab';
          if (moved > 8 || Math.abs(e.clientX - pointerStartX) + Math.abs(e.clientY - pointerStartY) > 8) return;
          velYaw = velPitch = 0;
          const rect = renderer.domElement.getBoundingClientRect();
          ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(ndc, camera);
          const hit = raycaster.intersectObject(terrain, false)[0];
          if (!hit) return;
          const from = camera.position.clone();
          const to = hit.point.clone();
          const dist = Math.hypot(to.x - from.x, to.z - from.z);
          const dur = Math.max(1200, Math.min(9000, (dist / 90) * 1000));
          const yaw = Math.atan2(-(to.x - from.x), -(to.z - from.z)) * 180 / Math.PI;
          walkRef.current = { from, to, start: performance.now(), dur, yaw, yawFrom: stateRef.current.yaw };
          stateRef.current.auto = false;
          setAuto(false);
          setWalking(true);
        };
        const wheel = (e) => {
          e.preventDefault();
          setFov(stateRef.current.fov + e.deltaY * 0.03);
        };
        renderer.domElement.addEventListener('pointerdown', down);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
        renderer.domElement.addEventListener('wheel', wheel, { passive: false });

        const view = { yaw: stateRef.current.yaw, pitch: stateRef.current.pitch };
        let last = performance.now();
        let sunTimer = 1;
        let lastSkyKey = '';
        const refreshSun = () => {
          const st = stateRef.current;
          if (st.live) st.minutes = localMinutesNow();
          const date = dateForLocalMinutes(st.minutes);
          const info = skyDome.update(date, mountain.lat, mountain.lon);
          const sv = info.sunDir;
          sun.position.copy(sv).multiplyScalar(worldWidth * 0.8).add(sun.target.position);
          sun.color.copy(info.light);
          sun.intensity = info.sun;
          sun.visible = info.sun > 0.01;
          moonLight.position.copy(info.moonDir).multiplyScalar(worldWidth * 0.8).add(moonLight.target.position);
          moonLight.intensity = info.moonUp ? 0.15 + 0.45 * info.moonFrac * info.night : 0;
          ambient.color.copy(info.zenith).lerp(new THREE.Color(0xffffff), 0.55);
          ambient.intensity = info.amb;
          scene.fog.color.copy(info.horizon);
          scene.background.copy(info.horizon);
          renderer.toneMappingExposure = 0.85 + info.night * 0.25;
          water.material.uniforms.sunDirection.value.copy(info.altDeg > 0 ? sv : info.moonDir);
          water.material.uniforms.sunColor.value.copy(info.altDeg > 0 ? info.light : new THREE.Color(0x8899bb));
          const key = `${Math.floor(st.minutes)}|${st.live}`;
          if (key !== lastSkyKey) {
            lastSkyKey = key;
            const times = SunCalc.getTimes(date, mountain.lat, mountain.lon);
            setSky({
              time: fmtClock(st.minutes),
              phase: phaseLabel(info.altDeg, info.rising),
              isNight: info.altDeg < -6,
              sunAlt: Math.round(info.altDeg),
              sunrise: fmtTime(times.sunrise),
              sunset: fmtTime(times.sunset),
              moon: moonPhaseName(info.moonPhase),
              moonPct: Math.round(info.moonFrac * 100),
              moonUp: info.moonUp,
            });
            if (st.live) setMinutes(st.minutes);
          }
        };
        refreshSun();
        const loop = (now) => {
          if (disposed) return;
          const dt = Math.min((now - last) / 1000, 0.1);
          last = now;
          if (stateRef.current.auto) stateRef.current.yaw += dt * 8;
          if (!dragging && (Math.abs(velYaw) > 0.01 || Math.abs(velPitch) > 0.01)) {
            stateRef.current.yaw += velYaw * dt;
            stateRef.current.pitch = Math.max(-80, Math.min(80, stateRef.current.pitch + velPitch * dt));
            const decay = Math.exp(-dt * 5);
            velYaw *= decay; velPitch *= decay;
          }
          sunTimer += dt;
          if (sunTimer >= 1 || stateRef.current.skyDirty) { sunTimer = 0; stateRef.current.skyDirty = false; refreshSun(); }
          water.material.uniforms.time.value += dt * 0.35;

          const walk = walkRef.current;
          if (walk) {
            const p = Math.min(1, (now - walk.start) / walk.dur);
            const eased = p * p * (3 - 2 * p);
            camera.position.x = walk.from.x + (walk.to.x - walk.from.x) * eased;
            camera.position.z = walk.from.z + (walk.to.z - walk.from.z) * eased;
            let dYaw = ((walk.yaw - walk.yawFrom) % 360 + 540) % 360 - 180;
            stateRef.current.yaw = walk.yawFrom + dYaw * Math.min(1, p * 3);
            if (p >= 1) { walkRef.current = null; setWalking(false); }
          }

          // Keep the eye above the ground (smoothed so slopes don't jitter).
          const targetY = groundAt(camera.position.x, camera.position.z) * EXAGGERATION + stateRef.current.eye;
          camera.position.y += (targetY - camera.position.y) * Math.min(1, dt * 10);
          const floorY = groundAt(camera.position.x, camera.position.z) * EXAGGERATION + EYE_MIN;
          if (camera.position.y < floorY) camera.position.y = floorY;

          // Ease view angles and zoom toward their targets for smooth motion.
          const ease = 1 - Math.exp(-dt * 14);
          view.yaw += (stateRef.current.yaw - view.yaw) * ease;
          view.pitch += (stateRef.current.pitch - view.pitch) * ease;
          if (Math.abs(stateRef.current.fov - camera.fov) > 0.01) {
            camera.fov += (stateRef.current.fov - camera.fov) * ease;
            camera.updateProjectionMatrix();
          }
          camera.rotation.set(-view.pitch * Math.PI / 180, view.yaw * Math.PI / 180, 0, 'YXZ');
          skyDome.followCamera(camera);
          renderer.render(scene, camera);

          const groundRound = Math.round(groundAt(camera.position.x, camera.position.z) + elevOffset);
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

          // Camera yaw is counter-clockwise; compass heading is clockwise from north.
          const h = Math.round(((-view.yaw % 360) + 360) % 360) % 360;
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
          window.removeEventListener('pointercancel', up);
          renderer.domElement.removeEventListener('pointerdown', down);
          renderer.domElement.removeEventListener('wheel', wheel);
          cancelAnimationFrame(frame);
          walkRef.current = null;
          labelData.forEach(({ el }) => el.remove());
          if (labelsRef.current) labelsRef.current.innerHTML = '';
          if (levelLine) { levelLine.geometry.dispose(); levelLine.material.dispose(); }
          water.geometry.dispose();
          water.material.dispose();
          skyDome.dispose();
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
    stateRef.current.pitch = -6;
    stateRef.current.fov = 70;
    stateRef.current.eye = EYE_HEIGHT;
    setEyeSlider(sliderFromEye(EYE_HEIGHT));
  };
  const onEye = (v) => {
    setEyeSlider(v);
    stateRef.current.eye = eyeFromSlider(v);
  };
  const onTime = (min) => {
    setLive(false);
    setMinutes(min);
    stateRef.current.live = false;
    stateRef.current.minutes = min;
    stateRef.current.skyDirty = true;
  };
  const goLive = () => {
    setLive(true);
    stateRef.current.live = true;
    stateRef.current.skyDirty = true;
  };
  const eyeM = eyeFromSlider(eyeSlider);
  const eyeLabel = eyeM >= 1000 ? `${(eyeM / 1000).toFixed(1)} km` : `${Math.round(eyeM)} m`;
  const glass = 'border border-white/15 bg-black/45 backdrop-blur-md';

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
          <div className={`pointer-events-auto min-w-0 max-w-[290px] rounded-xl px-4 py-3 ${glass}`}>
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#8fc7a9]">Summit view · 360°</div>
            <h2 className="serif mt-1 truncate text-lg font-bold leading-tight">{mountain?._name}</h2>
            <div className="mt-2 flex items-baseline gap-2 border-t border-white/15 pt-2">
              <span ref={elevationRef} className="text-base font-bold text-[#e3c07a]">{peakElev ? `${peakElev.toLocaleString()} m` : '—'}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-white/55">ground · eye +{eyeLabel}</span>
            </div>
            <button
              onClick={() => setPanel((v) => (v === 'time' ? null : 'time'))}
              className="mt-2 flex w-full items-center gap-2 rounded-lg bg-white/5 px-2.5 py-2 text-left hover:bg-white/10"
              aria-expanded={panel === 'time'}
            >
              {sky?.isNight ? <Moon className="h-4 w-4 shrink-0 text-[#cfd8ff]" /> : <Sun className="h-4 w-4 shrink-0 text-[#ffd27a]" />}
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold tabular-nums">{sky?.time ?? '--:--'} <span className="text-[10px] font-semibold text-white/50">ICT</span></span>
                <span className="block truncate text-[10px] text-white/65">{sky?.phase ?? 'Loading sky…'}</span>
              </span>
              {live && <span className="flex items-center gap-1 rounded-full bg-[#e5533d]/90 px-1.5 py-0.5 text-[9px] font-bold uppercase"><Radio className="h-2.5 w-2.5" />Live</span>}
            </button>
          </div>
          <div className="pointer-events-auto flex shrink-0 flex-col items-center gap-2">
            <button onClick={onClose} className={`grid h-11 w-11 place-items-center rounded-full ${glass} hover:bg-white/10`} title="Close" aria-label="Close"><X className="h-4 w-4" /></button>
            <button onClick={toggleAuto} className={`grid h-11 w-11 place-items-center rounded-full ${glass} hover:bg-white/10`} title="Auto rotate" aria-label="Auto rotate" aria-pressed={auto}>
              {auto ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button onClick={reset} className={`grid h-11 w-11 place-items-center rounded-full ${glass} hover:bg-white/10`} title="Reset view" aria-label="Reset view"><RotateCcw className="h-4 w-4" /></button>
          </div>
        </div>

        {panel === 'time' && sky && (
          <div className={`pointer-events-auto absolute left-3 right-[4.75rem] top-[calc(max(0.75rem,env(safe-area-inset-top))+11.5rem)] max-w-[360px] rounded-xl p-4 sm:left-6 ${glass} animate-pop-in`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/60">Sun & moon · UTC+7</span>
              <button onClick={goLive} disabled={live} className="rounded-full border border-white/20 px-2.5 py-1 text-[10px] font-bold uppercase disabled:border-[#e5533d] disabled:text-[#ff8a75]">{live ? 'Live' : 'Live now'}</button>
            </div>
            <input
              type="range" min="0" max="1439" step="5"
              value={Math.round(minutes)}
              onChange={(e) => onTime(Number(e.target.value))}
              aria-label="Time of day"
              className="summit-time mt-4 w-full"
            />
            <div className="mt-1 flex justify-between text-[9px] font-semibold text-white/45"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>
            <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[10px]">
              <div className="rounded-lg bg-white/5 py-2"><Sunrise className="mx-auto h-4 w-4 text-[#ffd27a]" /><div className="mt-1 font-bold tabular-nums">{sky.sunrise}</div><div className="text-white/50">Sunrise</div></div>
              <div className="rounded-lg bg-white/5 py-2"><Sunset className="mx-auto h-4 w-4 text-[#ff9a6a]" /><div className="mt-1 font-bold tabular-nums">{sky.sunset}</div><div className="text-white/50">Sunset</div></div>
              <div className="rounded-lg bg-white/5 py-2"><Moon className="mx-auto h-4 w-4 text-[#cfd8ff]" /><div className="mt-1 font-bold">{sky.moonPct}%</div><div className="px-1 leading-tight text-white/50">{sky.moon}</div></div>
            </div>
            <p className="mt-2 text-[10px] text-white/50">Sun altitude {sky.sunAlt}° · moon {sky.moonUp ? 'above' : 'below'} the horizon</p>
          </div>
        )}

        <div className={`pointer-events-auto absolute right-3 top-1/2 flex -translate-y-1/2 flex-col items-center gap-2 rounded-full px-2 py-3 sm:right-6 ${glass}`}>
          <MoveVertical className="h-4 w-4 text-white/70" />
          <input
            type="range" min="0" max="1" step="0.001"
            value={eyeSlider}
            onChange={(e) => onEye(Number(e.target.value))}
            aria-label="Eye height above ground"
            className="summit-eye"
          />
          <span className="w-12 text-center text-[10px] font-bold tabular-nums">{eyeLabel}</span>
        </div>

        <div className={`pointer-events-auto absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full px-4 py-2 ${glass}`}>
          <Compass ref={compassRef} className="h-5 w-5 text-[#e69167]" />
          <span ref={headingRef} className="serif text-sm font-bold tracking-wider">N · 0°</span>
          {walking && <span className="flex items-center gap-1 border-l border-white/20 pl-3 text-[10px] font-bold uppercase tracking-wide text-[#8fc7a9]"><Footprints className="h-3.5 w-3.5" /> Walking…</span>}
        </div>

        <div ref={labelsRef} className="pointer-events-none absolute inset-0 overflow-hidden" />

        <div className="pointer-events-none absolute inset-x-0 top-1/2 flex justify-center">
          <span className="h-5 w-5 rounded-full border border-white/50 opacity-60" />
        </div>
      </div>
    </div>
  );
}
