/**
 * Enrich mountain JSON files with province data via Nominatim reverse geocoding.
 * Run: node add-provinces.js
 *
 * Nominatim rate limit: ~1 req/sec. For ~1,600 mountains this takes ~30 minutes.
 * Already-enriched items are skipped on re-runs.
 */
const fs = require('fs');
const path = require('path');

const FILES = ['mountains.json', 'mountains-kh.json', 'mountains-cross.json'];
const DELAY_MS = 1200; // 1.2s between requests to respect Nominatim limits

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchProvince(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en&zoom=8`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MountKH/1.0 (province-enricher)' },
    });
    if (!res.ok) {
      console.warn(`  HTTP ${res.status} for ${lat},${lon}`);
      return null;
    }
    const data = await res.json();
    // Try common province/state field names
    const addr = data.address || {};
    const province = addr.state || addr.province || addr.county || addr.region || addr.district || null;
    return province;
  } catch (err) {
    console.warn(`  Error: ${err.message}`);
    return null;
  }
}

async function processFile(filename) {
  const filepath = path.join(__dirname, filename);
  if (!fs.existsSync(filepath)) {
    console.log(`Skip: ${filename} not found`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  console.log(`\nProcessing ${filename} (${data.length} items)...`);

  let enriched = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < data.length; i++) {
    const m = data[i];
    if (m.province) {
      skipped++;
      continue;
    }

    const province = await fetchProvince(m.lat, m.lon);
    if (province) {
      m.province = province;
      enriched++;
      console.log(`  [${i + 1}/${data.length}] ${m.name} → ${province}`);
    } else {
      failed++;
      console.log(`  [${i + 1}/${data.length}] ${m.name} → (no result)`);
    }

    if (i < data.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`Done: ${enriched} enriched, ${skipped} skipped (already had province), ${failed} failed`);
}

(async () => {
  for (const f of FILES) {
    await processFile(f);
  }
  console.log('\nAll files processed.');
})();
