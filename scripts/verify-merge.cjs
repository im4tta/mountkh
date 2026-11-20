const fs = require('fs');
const path = require('path');
const dir = 'D:/PERSONAL/OpenCode/MountKH';
const backups = fs.readdirSync(path.join(dir, 'data/backups')).filter((f) => f.startsWith('mountains-kh.')).sort();
const before = JSON.parse(fs.readFileSync(path.join(dir, 'data/backups', backups[backups.length - 1]), 'utf8'));
const after = JSON.parse(fs.readFileSync(path.join(dir, 'public/mountains-kh.json'), 'utf8'));
let ids = 0, coords = 0, types = 0, elevChanged = 0, added = 0, removed = 0;
const beforeMap = new Map(before.map((m) => [m.id, m]));
const afterMap = new Map(after.map((m) => [m.id, m]));
for (const m of after) {
  const b = beforeMap.get(m.id);
  if (!b) { added++; continue; }
  if (m.lat !== b.lat || m.lon !== b.lon) coords++;
  if (m.fcode !== b.fcode || m.country !== b.country || m.province !== b.province) types++;
  if (m.elev !== b.elev) elevChanged++;
}
for (const m of before) if (!afterMap.has(m.id)) removed++;
console.log({ before: before.length, after: after.length, added, removed, coordsChanged: coords, typeCountryProvinceChanged: types, elevationsChanged: elevChanged });
