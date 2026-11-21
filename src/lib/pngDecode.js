// Minimal PNG decoder (8-bit RGB/RGBA, non-interlaced) built on DecompressionStream.
// Elevation tiles encode height in raw RGB bytes, so they must bypass every browser
// colour-management path (canvas drawImage / getImageData, image decoding with ICC/gamma).

const SIG = [137, 80, 78, 71, 13, 10, 26, 10];

export const canDecodePng = typeof DecompressionStream !== 'undefined';

async function inflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/** Returns { width, height, data: Uint8Array RGBA } with untouched source bytes. */
export async function decodePng(buffer) {
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < 8; i++) if (bytes[i] !== SIG[i]) throw new Error('Not a PNG');
  const view = new DataView(buffer);
  let pos = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  let palette = null;
  const idat = [];
  while (pos < bytes.length) {
    const len = view.getUint32(pos);
    const type = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);
    const data = bytes.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = view.getUint32(pos + 8);
      height = view.getUint32(pos + 12);
      bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === 'PLTE') palette = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (bitDepth !== 8 || interlace) throw new Error('Unsupported PNG');
  const channels = { 2: 3, 6: 4, 0: 1, 4: 2, 3: 1 }[colorType];
  if (!channels) throw new Error('Unsupported PNG colour type');

  const total = idat.reduce((n, c) => n + c.length, 0);
  const joined = new Uint8Array(total);
  let off = 0;
  for (const c of idat) { joined.set(c, off); off += c.length; }
  const raw = await inflate(joined);

  const stride = width * channels;
  const pixels = new Uint8Array(stride * height);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) v += paeth(a, b, c);
      out[x] = v & 255;
    }
    prev = out;
  }

  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0, j = 0; i < width * height; i++, j += channels) {
    if (colorType === 3) {
      const p = pixels[i] * 3;
      rgba[i * 4] = palette[p]; rgba[i * 4 + 1] = palette[p + 1]; rgba[i * 4 + 2] = palette[p + 2];
    } else if (channels >= 3) {
      rgba[i * 4] = pixels[j]; rgba[i * 4 + 1] = pixels[j + 1]; rgba[i * 4 + 2] = pixels[j + 2];
    } else {
      rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = pixels[j];
    }
    rgba[i * 4 + 3] = 255;
  }
  return { width, height, data: rgba };
}
