// Draws the share card straight onto a Canvas 2D context.
// Native canvas text uses the browser's own shaping (correct Khmer), and
// nothing depends on parsing page CSS, so the output matches on every device.
import { mountainMarkerSvg } from './iconmcp';

const W = 640;
const PAD = 28;
const MAP_H = 250;
const C = {
  paper: '#fbf8f1', ink: '#1d2a23', muted: '#768077', soft: '#4c5d52',
  rule: '#d9d2c4', rust: '#b4542e', rustLight: '#e6926a', head: '#1d2a23', headInk: '#f4efe4',
};
const SANS = '"Noto Sans Khmer", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const SERIF = 'Georgia, "Noto Serif Khmer", "Noto Sans Khmer", serif';
const TILE = 256;

function loadImage(src, cors = true) {
  return new Promise((resolve) => {
    const img = new Image();
    if (cors) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function setSpacing(ctx, px) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`;
}

// Khmer must never be letter-spaced or upper-cased.
const hasKhmer = (s) => /[ក-៿]/.test(s);

function text(ctx, str, x, y, { font, color, spacing = 0, align = 'left', maxWidth } = {}) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  setSpacing(ctx, hasKhmer(str) ? 0 : spacing);
  if (maxWidth && ctx.measureText(str).width > maxWidth) {
    while (str.length > 1 && ctx.measureText(`${str}…`).width > maxWidth) str = str.slice(0, -1);
    str = `${str}…`;
  }
  ctx.fillText(str, x, y);
  const width = ctx.measureText(str).width;
  setSpacing(ctx, 0);
  return width;
}

// Fit a headline by shrinking the font until it fits the width.
function fitFont(ctx, str, weight, family, start, min, maxWidth) {
  let size = start;
  for (; size > min; size -= 2) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(str).width <= maxWidth) break;
  }
  return `${weight} ${size}px ${family}`;
}

async function drawMap(ctx, lat, lon, x, y, w, h, zoom = 11) {
  ctx.save();
  ctx.fillStyle = '#e8eef0';
  ctx.fillRect(x, y, w, h);
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  const n = 2 ** zoom;
  const px = ((lon + 180) / 360) * n * TILE;
  const rad = (lat * Math.PI) / 180;
  const py = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n * TILE;
  const left = px - w / 2;
  const top = py - h / 2;
  const tx0 = Math.floor(left / TILE);
  const ty0 = Math.floor(top / TILE);
  const tx1 = Math.floor((left + w) / TILE);
  const ty1 = Math.floor((top + h) / TILE);

  const jobs = [];
  let i = 0;
  for (let tx = tx0; tx <= tx1; tx++) {
    for (let ty = ty0; ty <= ty1; ty++) {
      const sub = `mt${i++ % 4}`;
      const url = `https://${sub}.google.com/vt/lyrs=m&x=${((tx % n) + n) % n}&y=${ty}&z=${zoom}`;
      jobs.push(loadImage(url).then(async (img) => {
        const tile = img || await loadImage(`https://tile.openstreetmap.org/${zoom}/${((tx % n) + n) % n}/${ty}.png`);
        if (tile) ctx.drawImage(tile, Math.round(x + tx * TILE - left), Math.round(y + ty * TILE - top), TILE, TILE);
      }));
    }
  }
  await Promise.all(jobs);

  const pin = await loadImage(`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(mountainMarkerSvg(C.rust, { size: 34, selected: true }))}`, false);
  if (pin) ctx.drawImage(pin, x + w / 2 - 17, y + h / 2 - 38, 34, 40);

  ctx.font = `600 9px ${SANS}`;
  const credit = '© Google';
  const cw = ctx.measureText(credit).width + 12;
  ctx.fillStyle = 'rgba(251,248,241,.9)';
  ctx.fillRect(x + w - cw, y + h - 16, cw, 16);
  text(ctx, credit, x + w - 6, y + h - 5, { font: `600 9px ${SANS}`, color: C.muted, align: 'right' });
  ctx.restore();

  ctx.strokeStyle = C.rule;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

export async function renderShareCard({ mountain, elev, countryLabel, typeLabel, flag, qrDataUrl, shareUrl, scale = 2 }) {
  try { await document.fonts.ready; } catch { /* ignore */ }
  // Make sure the Khmer faces are actually loaded before drawing.
  await Promise.allSettled([
    document.fonts?.load(`700 38px "Noto Serif Khmer"`, 'ក'),
    document.fonts?.load(`400 12px "Noto Sans Khmer"`, 'ក'),
    document.fonts?.load(`700 12px "Noto Sans Khmer"`, 'ក'),
  ]);

  const H = 76 + 150 + MAP_H + 172;
  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.textBaseline = 'alphabetic';

  // Background + border
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);

  // Header band
  ctx.fillStyle = C.head;
  ctx.fillRect(0, 0, W, 72);
  const mw = text(ctx, 'Mount', PAD, 45, { font: `700 24px ${SERIF}`, color: C.headInk });
  text(ctx, 'KH', PAD + mw, 45, { font: `700 24px ${SERIF}`, color: C.rustLight });
  text(ctx, `FIELD NOTE · ${mountain.id}`, W - PAD, 41, { font: `600 10px ${SANS}`, color: 'rgba(244,239,228,.8)', spacing: 2, align: 'right' });

  // Eyebrow
  let y = 108;
  text(ctx, `${flag ? `${flag} ` : ''}${countryLabel} / ${typeLabel}`, PAD, y, { font: `700 11px ${SANS}`, color: C.rust, spacing: 1.6, maxWidth: W - PAD * 2 });

  // Name
  y += 46;
  const name = mountain._name || mountain.ascii || '';
  const nameFont = fitFont(ctx, name, 700, SERIF, 38, 22, W - PAD * 2);
  text(ctx, name, PAD, y, { font: nameFont, color: C.ink, maxWidth: W - PAD * 2 });

  // Elevation
  y += 52;
  const ew = text(ctx, elev ? elev.toLocaleString('en-US') : '—', PAD, y, { font: `700 44px ${SERIF}`, color: C.rust });
  if (elev) text(ctx, 'metres', PAD + ew + 10, y, { font: `700 15px ${SANS}`, color: C.muted });

  // Meta line
  y += 26;
  const meta = `${mountain.province || '—'}   ·   ${mountain.lat.toFixed(4)}, ${mountain.lon.toFixed(4)}`;
  text(ctx, meta, PAD, y, { font: `500 12px ${SANS}`, color: C.soft, maxWidth: W - PAD * 2 });

  // Map
  const mapY = y + 18;
  await drawMap(ctx, mountain.lat, mountain.lon, PAD, mapY, W - PAD * 2, MAP_H);

  // QR + caption
  const qy = mapY + MAP_H + 20;
  ctx.fillStyle = C.paper;
  ctx.fillRect(PAD, qy, 100, 100);
  ctx.strokeStyle = C.rule;
  ctx.strokeRect(PAD + 0.5, qy + 0.5, 99, 99);
  const qr = qrDataUrl ? await loadImage(qrDataUrl, false) : null;
  if (qr) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(qr, PAD + 6, qy + 6, 88, 88);
    ctx.imageSmoothingEnabled = true;
  }
  const tx = PAD + 120;
  const tw = W - tx - PAD;
  text(ctx, 'Scan to explore this peak', tx, qy + 34, { font: `800 15px ${SANS}`, color: C.ink, maxWidth: tw });
  text(ctx, shareUrl, tx, qy + 56, { font: `400 12px ${SANS}`, color: C.muted, maxWidth: tw });
  const bw = text(ctx, 'MOUNTKH · ', tx, qy + 82, { font: `700 11px ${SANS}`, color: C.rust, spacing: 1 });
  text(ctx, 'ភ្នំកម្ពុជា', tx + bw, qy + 82, { font: `700 11px ${SANS}`, color: C.rust });

  ctx.strokeStyle = C.rule;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Empty canvas'))), 'image/png');
    } catch (err) {
      reject(err); // tainted canvas (tile CORS failure)
    }
  });
}
