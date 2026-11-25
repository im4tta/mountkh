import * as THREE from 'three';
import * as SunCalc from 'suncalc';

const RAD = Math.PI / 180;

// Direction in scene space (x = east, y = up, -z = north).
// suncalc 2.x returns degrees, with azimuth measured clockwise from north.
export function dirFromAzAlt(azimuthDeg, altitudeDeg) {
  const az = azimuthDeg * RAD, alt = altitudeDeg * RAD;
  const c = Math.cos(alt);
  return new THREE.Vector3(Math.sin(az) * c, Math.sin(alt), -Math.cos(az) * c);
}

const KEYS = [
  // sun altitude (deg) → zenith, horizon, light colour, light intensity, ambient
  { a: -18, zenith: 0x02060f, horizon: 0x0a1426, light: 0x9fb4ff, sun: 0.0, amb: 0.32 },
  { a: -10, zenith: 0x0a1630, horizon: 0x2b3456, light: 0x9fb4ff, sun: 0.0, amb: 0.4 },
  { a: -4, zenith: 0x1d2f5c, horizon: 0xd8746a, light: 0xffa27a, sun: 0.05, amb: 0.55 },
  { a: 2, zenith: 0x3a5f9a, horizon: 0xf6a56a, light: 0xffb07a, sun: 0.6, amb: 0.75 },
  { a: 10, zenith: 0x3f78c2, horizon: 0xe9cfa8, light: 0xffe0b8, sun: 1.3, amb: 0.95 },
  { a: 25, zenith: 0x3b7fd4, horizon: 0xbcd8ee, light: 0xfff3df, sun: 1.8, amb: 1.1 },
];

const tmpA = new THREE.Color();
const tmpB = new THREE.Color();

export function skyState(sunAltDeg) {
  let i = 0;
  while (i < KEYS.length - 2 && sunAltDeg > KEYS[i + 1].a) i++;
  const k0 = KEYS[i], k1 = KEYS[i + 1];
  const t = Math.max(0, Math.min(1, (sunAltDeg - k0.a) / (k1.a - k0.a)));
  const lerpC = (p, q) => tmpA.setHex(p).lerp(tmpB.setHex(q), t).clone();
  return {
    zenith: lerpC(k0.zenith, k1.zenith),
    horizon: lerpC(k0.horizon, k1.horizon),
    light: lerpC(k0.light, k1.light),
    sun: k0.sun + (k1.sun - k0.sun) * t,
    amb: k0.amb + (k1.amb - k0.amb) * t,
    night: Math.max(0, Math.min(1, (-4 - sunAltDeg) / 10)),
  };
}

// Returns i18n keys; the UI translates them.
export function phaseLabel(sunAltDeg, rising) {
  if (sunAltDeg < -12) return 'phaseNight';
  if (sunAltDeg < -6) return rising ? 'phaseDawnTwilight' : 'phaseDuskTwilight';
  if (sunAltDeg < -0.8) return rising ? 'phaseDawn' : 'phaseDusk';
  if (sunAltDeg < 6) return rising ? 'phaseSunrise' : 'phaseSunset';
  if (sunAltDeg < 15) return 'phaseGolden';
  return 'phaseDay';
}

export function moonPhaseName(phase) {
  return `moon${Math.round(phase * 8) % 8}`;
}

function discTexture(draw, size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function drawMoon(ctx, size, phase) {
  const r = size * 0.42, cx = size / 2, cy = size / 2;
  ctx.clearRect(0, 0, size, size);
  const glow = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, size / 2);
  glow.addColorStop(0, 'rgba(220,230,255,0.35)');
  glow.addColorStop(1, 'rgba(220,230,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);
  // dark disc
  ctx.fillStyle = 'rgba(60,66,84,0.55)';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  // lit part: phase 0 new → 0.5 full → 1 new; waxing lit on the right
  const k = Math.cos(phase * 2 * Math.PI); // 1 new, -1 full
  const waxing = phase < 0.5;
  ctx.fillStyle = '#f3f1e6';
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, !waxing);
  ctx.ellipse(cx, cy, Math.abs(k) * r, r, 0, Math.PI / 2, -Math.PI / 2, (k > 0) === waxing);
  ctx.fill();
  // subtle maria
  ctx.fillStyle = 'rgba(150,150,140,0.18)';
  [[-0.25, -0.2, 0.18], [0.15, 0.1, 0.14], [-0.05, 0.3, 0.1]].forEach(([x, y, s]) => {
    ctx.beginPath(); ctx.arc(cx + x * r, cy + y * r, s * r, 0, Math.PI * 2); ctx.fill();
  });
}

export function createSky(radius) {
  const group = new THREE.Group();

  const uniforms = {
    zenith: { value: new THREE.Color() },
    horizon: { value: new THREE.Color() },
    sunDir: { value: new THREE.Vector3(0, 1, 0) },
    sunColor: { value: new THREE.Color(0xffe2b0) },
    sunGlow: { value: 1 },
    moonDir: { value: new THREE.Vector3(0, -1, 0) },
    moonGlow: { value: 0 },
  };
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 48, 24),
    new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: /* glsl */`
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 zenith; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor;
        uniform float sunGlow; uniform vec3 moonDir; uniform float moonGlow;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 col = mix(horizon, zenith, pow(clamp(h, 0.0, 1.0), 0.45));
          // below the horizon: haze fading to a darker horizon tone (never pure black)
          col = h < 0.0 ? mix(horizon, horizon * 0.55, clamp(-h * 4.0, 0.0, 1.0)) : col;
          float s = max(dot(d, normalize(sunDir)), 0.0);
          col += sunColor * (pow(s, 6.0) * 0.28 + pow(s, 60.0) * 0.5) * sunGlow;
          float m = max(dot(d, normalize(moonDir)), 0.0);
          col += vec3(0.55, 0.62, 0.8) * pow(m, 40.0) * 0.25 * moonGlow;
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  group.add(dome);

  // Stars
  const starCount = 1600;
  const pos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const u = Math.random(), v = Math.random() * 0.95 + 0.05;
    const theta = u * Math.PI * 2, y = v;
    const r = Math.sqrt(1 - y * y);
    pos[i * 3] = Math.cos(theta) * r * radius * 0.95;
    pos[i * 3 + 1] = y * radius * 0.95;
    pos[i * 3 + 2] = Math.sin(theta) * r * radius * 0.95;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  group.add(stars);

  // Sun disc
  const sunTex = discTexture((ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,252,240,1)');
    g.addColorStop(0.22, 'rgba(255,240,200,1)');
    g.addColorStop(0.3, 'rgba(255,210,140,0.5)');
    g.addColorStop(1, 'rgba(255,190,120,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  });
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  sunSprite.scale.setScalar(radius * 0.16);
  group.add(sunSprite);

  // Moon disc (texture redrawn when the phase changes)
  const moonCanvas = document.createElement('canvas');
  moonCanvas.width = moonCanvas.height = 128;
  const moonTex = new THREE.CanvasTexture(moonCanvas);
  moonTex.colorSpace = THREE.SRGBColorSpace;
  const moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, transparent: true, depthWrite: false, fog: false }));
  moonSprite.scale.setScalar(radius * 0.085);
  group.add(moonSprite);
  let lastPhase = -1;

  /** Update for a date & place. Returns lighting info for the scene. */
  const update = (date, lat, lon) => {
    const sp = SunCalc.getPosition(date, lat, lon);
    const mp = SunCalc.getMoonPosition(date, lat, lon);
    const mi = SunCalc.getMoonIllumination(date);
    const sunDir = dirFromAzAlt(sp.azimuth, sp.altitude);
    const moonDir = dirFromAzAlt(mp.azimuth, mp.altitude);
    const altDeg = sp.altitude;
    const st = skyState(altDeg);

    uniforms.zenith.value.copy(st.zenith);
    uniforms.horizon.value.copy(st.horizon);
    uniforms.sunDir.value.copy(sunDir);
    uniforms.sunGlow.value = Math.max(0, Math.min(1, (altDeg + 8) / 10));
    uniforms.moonDir.value.copy(moonDir);
    uniforms.moonGlow.value = mp.altitude > 0 ? st.night * mi.fraction : 0;

    sunSprite.position.copy(sunDir).multiplyScalar(radius * 0.9);
    sunSprite.visible = altDeg > -2;
    moonSprite.position.copy(moonDir).multiplyScalar(radius * 0.9);
    moonSprite.visible = mp.altitude > -1;
    moonSprite.material.opacity = 0.35 + 0.65 * Math.max(st.night, 0.3);
    if (Math.abs(mi.phase - lastPhase) > 0.005) {
      lastPhase = mi.phase;
      drawMoon(moonCanvas.getContext('2d'), 128, mi.phase);
      moonTex.needsUpdate = true;
    }
    starMat.opacity = st.night * 0.9;

    const rising = SunCalc.getPosition(new Date(date.getTime() + 600000), lat, lon).altitude > sp.altitude;
    return { sunDir, moonDir, altDeg, moonUp: mp.altitude > 0, moonFrac: mi.fraction, moonPhase: mi.phase, rising, ...st };
  };

  const followCamera = (camera) => group.position.copy(camera.position);

  const dispose = () => {
    dome.geometry.dispose(); dome.material.dispose();
    starGeo.dispose(); starMat.dispose();
    sunTex.dispose(); sunSprite.material.dispose();
    moonTex.dispose(); moonSprite.material.dispose();
  };

  return { group, update, followCamera, dispose };
}
