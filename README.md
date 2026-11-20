# ⛰ MountKH · ភ្នំកម្ពុជា

A light, editorial field guide to Cambodia's mountains — **1,605 named features**, an interactive map, and a quiet place to browse the country's high places.

---

## What it does

- 🗺 **Google map tiles by default** — no API key needed; switch to OpenStreetMap anytime
- ⛰ **Mountain-shaped map pins** from [Tabler Icons](https://tabler.io/icons) via [IconMCP](https://iconmcp.com/), coloured by elevation
- 🎨 **Two homepages, switchable in the menu** — *The Atlas* (concept 2: split register + vintage map) and *Explorer* (concept 5: playful illustrated hero). Your choice is remembered.
- ⚡ **Virtualized scrolling** — only the visible rows are rendered; sticky index header and back-to-top button keep the page short and fast
- 🅰️ **Google Fonts** — Noto Sans Khmer and Noto Serif Khmer, preconnected and loaded with `display=swap`
- 🔍 **Search** names, ASCII names and alternate spellings (`/` to focus)
- 🏷 **Filters** for type, country, province, elevation band and favorites
- 🎲 **Surprise me**, **shareable deep links** (`#m/<id>`), **copy coordinates**
- ❤️ **Favorites** saved locally · 🌙 light/ink themes · 📱 installable PWA

---

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
```

Requires Node **20.19+**.

---

## Data

| File | Features | Purpose |
| --- | ---: | --- |
| `public/mountains-kh.json` | 1,605 | Dataset used by the app |
| `public/mountains.json` | 1,634 | Full set including border features |

Source: [GeoNames Gazetteer](https://www.geonames.org/) (CC BY 4.0). Elevation comes from satellite DEM models and province labels are reverse-geocoded — use the data as a starting point, not a source of truth.

### CSV analysis & safe merge

```bash
npm run compare:csv -- "C:/path/to/Cambodia_Mountain-coords.csv"   # report only
npm run merge:csv                                                  # dry run
npm run merge:csv -- --apply                                       # write merge
npm run verify:merge                                               # audit invariants
```

- [`docs/data-comparison.md`](docs/data-comparison.md) — comparison of the 1,339-row CSV against the current app dataset. Before the merge, 1,056 matched rows differed in elevation by > 5 m; afterwards only **103** remain (the unresolved conflicts).
- [`docs/safe-merge-report.md`](docs/safe-merge-report.md) — what the merge changed.

**Safe-merge rules:** only exact-name matches within 1 km (or known aliases within 250 m) are used. Elevation is filled only where the app had none; existing elevations are never overwritten, CSV values are stored as `csvElev` provenance. Coordinates, IDs, types, countries and provinces are untouched; no features are added or removed. Backups are written to `data/backups/` before applying.

Result: 1,205 high-confidence matches, 1,097 elevations filled, 88 conflicts where the original value was kept. `npm run verify:merge` confirms 0 changes to IDs, coordinates, types, countries or provinces.

---

## Security & dependencies

- Latest majors: React 19, react-leaflet 5, Vite 8, Tailwind 4, lucide-react 1. `npm audit`: **0 vulnerabilities**.
- Leaflet CSS is bundled locally; no CDN scripts or styles (only the Google Fonts stylesheet).
- The dataset JSON is preloaded, React is deduped in Vite, rows use TanStack Virtual, and React.memo prevents needless re-renders.
- CSP, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` and COOP/COAP are set in `vercel.json`.
- Service worker uses network-first navigation and versioned caches.
- Favorites and preferences stay in the browser's `localStorage`; no API keys are collected.

---

## Design concepts

`designs/` contains five standalone homepage prototypes (Summit, The Atlas, Field Notes, Night Expedition, Explorer). Open `designs/index.html` to compare them. **The Atlas (#2) and Explorer (#5) are now built into the app** — switch between them in the menu under *Homepage style*.

## Design & credits

The visual system lives in `src/index.css` (warm paper, serif display type, hairline rules). Map pins are local SVGs from `src/lib/iconmcp.js`. See [`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md) for icon and data licensing.

Map tiles: © Google / © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors. Not for profit — no ads, no tracking.

---

## License

The application source code is released under the [MIT License](LICENSE) — Copyright (c) 2026 im4tta.

Third-party data and assets keep their own licenses: GeoNames (CC BY 4.0), OpenStreetMap data (ODbL), Google map tiles (Google Maps Terms of Service), and Tabler Icons / IconMCP (MIT). See [`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md) for details.
