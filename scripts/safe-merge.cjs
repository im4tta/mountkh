/**
 * Safely enrich MountKH data from a mountain-coordinate CSV.
 *
 *   node scripts/safe-merge.cjs                 # dry run (default)
 *   node scripts/safe-merge.cjs --apply         # write merged datasets + report
 *
 * Rules:
 *   - Only high-confidence matches are used (exact primary name within 1 km,
 *     or a known alternate name within 250 m).
 *   - Elevation is only WRITTEN when the app has no usable elevation.
 *     Existing elevations are never overwritten; CSV values are kept as provenance.
 *   - Aliases are only appended when they are a near-identical spelling variant.
 *   - Coordinates, IDs, types, countries and provinces are never changed.
 *   - No features are added or removed.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CSV_PATH = process.argv.find((a) => a.endsWith('.csv')) || process.env.MOUNTKH_CSV || 'C:/Users/metat/Downloads/Cambodia_Mountain-coords.csv';
const APPLY = process.argv.includes('--apply');
const NAME_RADIUS = 1000;
const ALT_RADIUS = 250;

function normalize(value) {
  return String(value || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function distance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[m][n];
}

function parseCSV(text) {
  return text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim()).slice(1).map((line) => {
    const m = line.match(/^"(.*)","(.*)","(.*)","(.*)"$/);
    return m ? { name: m[1], elev: m[2] ? Number(m[2]) : null, lat: Number(m[3]), lon: Number(m[4]) } : null;
  }).filter(Boolean);
}

function main() {
  if (!fs.existsSync(CSV_PATH)) { console.error(`CSV not found: ${CSV_PATH}`); process.exit(1); }
  const csv = parseCSV(fs.readFileSync(CSV_PATH, 'utf8'));
  const khPath = path.join(ROOT, 'public/mountains-kh.json');
  const allPath = path.join(ROOT, 'public/mountains.json');
  const kh = JSON.parse(fs.readFileSync(khPath, 'utf8'));
  const all = JSON.parse(fs.readFileSync(allPath, 'utf8'));

  const primaryIndex = new Map();
  const altIndex = new Map();
  kh.forEach((m) => {
    [m.name, m.ascii].filter(Boolean).forEach((name) => {
      const key = normalize(name);
      if (!primaryIndex.has(key)) primaryIndex.set(key, []);
      primaryIndex.get(key).push(m);
    });
    if (m.alt) m.alt.split(',').forEach((a) => {
      const key = normalize(a);
      if (!altIndex.has(key)) altIndex.set(key, []);
      altIndex.get(key).push(m);
    });
  });

  const stats = { matched: 0, filled: 0, conflicts: 0, aliases: 0, duplicates: 0, unmatched: 0 };
  const changes = new Map();
  const conflictExamples = [];

  for (const row of csv) {
    if (!Number.isFinite(row.lat) || !Number.isFinite(row.lon) || !(row.elev > 0)) continue;
    const key = normalize(row.name);
    let candidates = (primaryIndex.get(key) || []).map((m) => ({ m, radius: NAME_RADIUS, via: 'name' }));
    if (!candidates.length) candidates = (altIndex.get(key) || []).map((m) => ({ m, radius: ALT_RADIUS, via: 'alt' }));

    let best = null, bestDistance = Infinity, via = '';
    for (const c of candidates) {
      const d = distance(row.lat, row.lon, c.m.lat, c.m.lon);
      if (d <= c.radius && d < bestDistance) { best = c.m; bestDistance = d; via = c.via; }
    }
    if (!best) { stats.unmatched++; continue; }

    const existing = changes.get(best.id);
    if (existing) { stats.duplicates++; continue; }
    stats.matched++;

    const update = { csvElev: row.elev, csvName: row.name, via, distance: Math.round(bestDistance) };
    const currentElev = best.elev > 0 ? best.elev : null;
    if (currentElev == null) {
      update.elev = row.elev;
      update.elevSource = 'csv';
      stats.filled++;
    } else if (Math.abs(currentElev - row.elev) > 5) {
      stats.conflicts++;
      if (conflictExamples.length < 12) conflictExamples.push(`${best.ascii || best.name}: app ${currentElev} m, CSV ${row.elev} m (kept app value)`);
    }

    const known = new Set([best.name, best.ascii, ...(best.alt || '').split(',').filter(Boolean)].map(normalize).filter(Boolean));
    if (!known.has(key) && levenshtein(key, normalize(best.ascii || best.name)) <= 4) {
      const existingAlt = best.alt ? best.alt.split(',').filter(Boolean) : [];
      update.alt = [...existingAlt, row.name];
      stats.aliases++;
    }
    changes.set(best.id, update);
  }

  if (APPLY) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(ROOT, 'data/backups');
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(khPath, path.join(backupDir, `mountains-kh.${stamp}.json`));
    fs.copyFileSync(allPath, path.join(backupDir, `mountains.${stamp}.json`));

    for (const dataset of [kh, all]) {
      dataset.forEach((m) => {
        const update = changes.get(m.id);
        if (!update) return;
        if (update.elev != null) { m.elev = update.elev; m.elevSource = update.elevSource; }
        if (update.csvElev != null) m.csvElev = update.csvElev;
        if (update.alt) m.alt = update.alt.join(',');
      });
    }
    fs.writeFileSync(khPath, JSON.stringify(kh, null, 2) + '\n', 'utf8');
    fs.writeFileSync(allPath, JSON.stringify(all, null, 2) + '\n', 'utf8');

    const md = [
      '# Safe CSV merge report', '',
      `Generated: ${new Date().toISOString()}`, '',
      'Only high-confidence matches were enriched. No features were added, removed, moved or retyped.', '',
      '| Metric | Count |', '| --- | ---: |',
      `| CSV rows used | ${csv.length} |`,
      `| High-confidence matches | ${stats.matched} |`,
      `| Elevations filled (app had none) | ${stats.filled} |`,
      `| Elevation conflicts (app value kept) | ${stats.conflicts} |`,
      `| Spelling aliases added | ${stats.aliases} |`,
      `| Duplicate CSV rows for same feature | ${stats.duplicates} |`,
      `| CSV rows with no safe match | ${stats.unmatched} |`, '',
      '## Conflict examples (values kept from the original dataset)', '',
      ...conflictExamples.map((x) => `- ${x}`), '',
      'Backups of both datasets were written to `data/backups/` before the merge.',
    ].join('\n');
    fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'docs/safe-merge-report.md'), md + '\n', 'utf8');
  }

  console.log(APPLY ? 'Applied safe merge.' : 'Dry run — nothing written.');
  console.log(stats);
}

main();
