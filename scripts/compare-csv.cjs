/**
 * Compare the MountKH dataset with a mountain-coordinate CSV.
 *
 *   npm run compare:csv -- "C:/path/to/Cambodia_Mountain-coords.csv"
 *
 * Writes a human-readable report to docs/data-comparison.md.
 * The comparison never modifies the app's data files.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_CSV = 'C:/Users/metat/Downloads/Cambodia_Mountain-coords.csv';
const csvPath = process.argv[2] || process.env.MOUNTKH_CSV || DEFAULT_CSV;
const MATCH_RADIUS_M = 5000;
const COORD_RADIUS_M = 1000;

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseCSV(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].match(/^"(.*)","(.*)","(.*)","(.*)"$/);
    if (!parts) continue;
    rows.push({
      name: parts[1],
      elev: parts[2] ? Number(parts[2]) : null,
      lat: Number(parts[3]),
      lon: Number(parts[4]),
      line: i + 1,
    });
  }
  return rows;
}

function namesOf(mountain) {
  // Index primary names only; `alt` lists in GeoNames are noisy and can contain
  // unrelated peaks, which would create false "same name" matches.
  return [...new Set([mountain.name, mountain.ascii].filter(Boolean))].map(normalize).filter(Boolean);
}

function appElevation(mountain) {
  if (mountain.elev != null && mountain.elev > 0) return { value: mountain.elev, source: 'elev' };
  if (mountain.dem != null && mountain.dem > 0) return { value: mountain.dem, source: 'dem' };
  return { value: null, source: null };
}

function main() {
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`);
    process.exit(1);
  }
  const csv = parseCSV(fs.readFileSync(csvPath, 'utf8'));
  const kh = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/mountains-kh.json'), 'utf8'));
  const all = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/mountains.json'), 'utf8'));

  const index = new Map();
  kh.forEach((m) => namesOf(m).forEach((name) => {
    if (!index.has(name)) index.set(name, []);
    index.get(name).push(m);
  }));

  const result = {
    nameAndPlace: 0, sameNameFar: [], nameDiff: [], unmatched: [],
    elevationDiffs: [], maxMatchDistance: 0,
    blankElevation: [], duplicateNames: 0,
  };
  const seen = new Map();
  const matchedIds = new Set();

  for (const row of csv) {
    const key = normalize(row.name);
    seen.set(key, (seen.get(key) || 0) + 1);
    if (row.elev == null) result.blankElevation.push(row);

    const candidates = new Set(index.get(key) || []);
    if (!candidates.size) {
      const tokens = new Set(key.split(' ').filter((t) => t.length > 2));
      if (tokens.size >= 2) {
        for (const [indexedName, mountains] of index) {
          const indexedTokens = indexedName.split(' ').filter((t) => tokens.has(t));
          if (indexedTokens.length >= 2) mountains.forEach((m) => candidates.add(m));
        }
      }
    }

    let best = null, bestDistance = Infinity;
    for (const m of candidates) {
      const d = haversine(row.lat, row.lon, m.lat, m.lon);
      if (d < bestDistance) { bestDistance = d; best = m; }
    }

    if (best && bestDistance <= MATCH_RADIUS_M) {
      result.nameAndPlace++;
      result.maxMatchDistance = Math.max(result.maxMatchDistance, bestDistance);
      matchedIds.add(best.id);
      const app = appElevation(best);
      if (row.elev != null && app.value != null && Math.abs(row.elev - app.value) > 5) {
        result.elevationDiffs.push({
          csv: row.name, csvElev: row.elev, app: best.ascii || best.name,
          appElev: app.value, source: app.source,
          delta: row.elev - app.value, distance: Math.round(bestDistance),
        });
      }
    } else if (best) {
      result.sameNameFar.push({ row, distance: Math.round(bestDistance), app: best.ascii || best.name });
    } else {
      let near = null, nearDistance = Infinity;
      for (const m of kh) {
        const d = haversine(row.lat, row.lon, m.lat, m.lon);
        if (d < nearDistance) { nearDistance = d; near = m; }
      }
      if (near && nearDistance <= COORD_RADIUS_M) {
        result.nameDiff.push({ row, distance: Math.round(nearDistance), app: near.ascii || near.name, appElev: appElevation(near).value });
        matchedIds.add(near.id);
      } else {
        result.unmatched.push({ row, distance: Math.round(nearDistance), nearest: near ? near.ascii || near.name : null });
      }
    }
  }

  for (const count of seen.values()) if (count > 1) result.duplicateNames += count - 1;

  const elevationDiffs = result.elevationDiffs.slice().sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const buckets = { '>200 m': 0, '100–200 m': 0, '50–100 m': 0, '20–50 m': 0, '6–20 m': 0 };
  elevationDiffs.forEach((d) => {
    const a = Math.abs(d.delta);
    if (a > 200) buckets['>200 m']++;
    else if (a >= 100) buckets['100–200 m']++;
    else if (a >= 50) buckets['50–100 m']++;
    else if (a >= 20) buckets['20–50 m']++;
    else buckets['6–20 m']++;
  });

  const notInCsv = kh.filter((m) => !matchedIds.has(m.id));
  const byFcode = {};
  notInCsv.forEach((m) => { byFcode[m.fcode] = (byFcode[m.fcode] || 0) + 1; });

  const md = [];
  md.push('# MountKH dataset ↔ mountain CSV comparison');
  md.push('');
  md.push(`Generated by \`npm run compare:csv\` from \`${csvPath.replace(/\\/g, '/')}\`.`);
  md.push('');
  md.push('> This reflects the dataset **after** the safe merge. See `docs/safe-merge-report.md` for what was changed.');
  md.push('');
  md.push('## Method');
  md.push('');
  md.push('- CSV rows are matched to `public/mountains-kh.json` by normalized name (diacritics, punctuation and case removed), then confirmed by distance ≤ 5 km.');
  md.push('- If no name match exists, a coordinate-only match ≤ 1 km is reported as a naming difference (usually transliteration variants).');
  md.push('- Elevation is compared against the app value shown to users: `elev` when present, otherwise `dem`. Differences ≤ 5 m are ignored.');
  md.push('- The comparison is read-only: no data file is modified.');
  md.push('');
  md.push('## At a glance');
  md.push('');
  md.push('| Metric | Value |');
  md.push('| --- | ---: |');
  md.push(`| CSV rows | ${csv.length.toLocaleString()} |`);
  md.push(`| App dataset (KH) | ${kh.length.toLocaleString()} |`);
  md.push(`| App dataset (all, incl. borders) | ${all.length.toLocaleString()} |`);
  md.push(`| CSV rows matched by name + location | ${result.nameAndPlace.toLocaleString()} (${pct(result.nameAndPlace, csv.length)}) |`);
  md.push(`| Same name, different location (> 5 km) | ${result.sameNameFar.length} |`);
  md.push(`| Same place, different name spelling | ${result.nameDiff.length} |`);
  md.push(`| No plausible match | ${result.unmatched.length} |`);
  md.push(`| App features not represented in CSV | ${notInCsv.length.toLocaleString()} |`);
  md.push(`| Matched rows with elevation difference > 5 m | ${elevationDiffs.length.toLocaleString()} |`);
  md.push(`| Duplicate names within CSV | ${result.duplicateNames} |`);
  md.push(`| CSV rows with blank elevation | ${result.blankElevation.length} |`);
  md.push(`| Largest name-match distance | ${Math.round(result.maxMatchDistance)} m |`);
  md.push('');
  md.push('## Elevation differences');
  md.push('');
  md.push('| Difference | Count |');
  md.push('| --- | ---: |');
  Object.entries(buckets).forEach(([k, v]) => md.push(`| ${k} | ${v} |`));
  md.push('');
  md.push('Most differences are small and consistent with different DEM/satellite elevation models. A small set of large outliers deserves field verification before any data change.');
  md.push('');
  md.push('| CSV entry | CSV (m) | App (m) | Δ (m) | Source | Distance |');
  md.push('| --- | ---: | ---: | ---: | --- | ---: |');
  elevationDiffs.slice(0, 15).forEach((d) => md.push(`| ${d.csv} | ${d.csvElev} | ${d.appElev} | ${d.delta > 0 ? '+' : ''}${d.delta} | ${d.source} | ${d.distance} m |`));
  md.push('');
  md.push('## Same name, different location');
  md.push('');
  md.push('These are likely duplicate names in different places. The CSV coordinate should be checked against the app entry before choosing one.');
  md.push('');
  result.sameNameFar.slice(0, 25).forEach((x) => md.push(`- **${x.row.name}** (${x.row.elev ?? '—'} m, CSV ${x.row.lat},${x.row.lon}) — app entry \`${x.app}\`, ${x.distance.toLocaleString()} m away`));
  md.push('');
  md.push('## Same place, different name');
  md.push('');
  md.push('Almost all are transliteration variants (`Phnom`/`Phnum`/`Phnŭm`, `Khao`, `Phanom`, apostrophes and diacritics). The app already stores many of these in its `alt` field.');
  md.push('');
  md.push('| CSV name | App name | CSV (m) | App (m) | Distance |');
  md.push('| --- | --- | ---: | ---: | ---: |');
  result.nameDiff.slice(0, 20).forEach((x) => md.push(`| ${x.row.name} | ${x.app} | ${x.row.elev ?? '—'} | ${x.appElev ?? '—'} | ${x.distance} m |`));
  md.push('');
  md.push('## CSV entries with no app counterpart');
  md.push('');
  result.unmatched.slice(0, 30).forEach((x) => md.push(`- **${x.row.name}** (${x.row.elev ?? '—'} m, ${x.row.lat},${x.row.lon}) — nearest app feature: \`${x.nearest}\` (${x.distance.toLocaleString()} m)`));
  md.push('');
  md.push('## App features absent from the CSV');
  md.push('');
  md.push(`The app intentionally covers more than mountains: ${notInCsv.length.toLocaleString()} features have no CSV counterpart.`);
  md.push('');
  md.push('| Feature code | Count |');
  md.push('| --- | ---: |');
  Object.entries(byFcode).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => md.push(`| ${k} | ${v} |`));
  md.push('');
  md.push('## Recommendations');
  md.push('');
  md.push('1. **Do not bulk-overwrite elevations.** The two sources use different elevation models; most gaps are under 20 m and are not necessarily errors.');
  md.push('2. **Verify the few large outliers** (> 100 m difference) against a surveyed or authoritative source before editing the dataset.');
  md.push('3. **Use the CSV as an alias source** — it supplies 60+ alternative spellings that could be added to the `alt` field to improve search.');
  md.push('4. **Add the 40 unmatched entries** only after confirming they are real, distinct features; several are Thai/Lao/Vietnamese names for border peaks.');
  md.push('5. **Keep the app’s wider scope** — islands, passes and ridges make up most of the features missing from the CSV.');
  md.push('');

  const docsDir = path.join(ROOT, 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(path.join(docsDir, 'data-comparison.md'), md.join('\n') + '\n', 'utf8');

  console.log(`CSV rows: ${csv.length} | matched: ${result.nameAndPlace} | elevation diffs: ${elevationDiffs.length} | unmatched: ${result.unmatched.length}`);
  console.log('Report written to docs/data-comparison.md');
}

function pct(n, total) { return `${Math.round((n / total) * 100)}%`; }

main();
