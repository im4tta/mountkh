# ⛰ MountKH · ភ្នំកម្ពុជា

A small project born from curiosity about the landscape we live in.

Cambodia has **1,634 named mountain features** — mountains, hills, peaks, ranges, ridges, passes, plateaus, even islands with elevation. Most of us know Phnom Aoral. But what about the 1,633 others?

This app puts them on a map. Browse, search, filter, and discover the terrain around you.

---

## What it does

- 🗺 **OpenStreetMap by default** — no API key needed, works immediately
- 🗺 **Google Maps layer** — optional, add your own key in the app
- 📍 **1,634 features** across Cambodia, Thailand border, and Laos border
- 🔍 **Search by name** — including alternate and transliterated names
- 🏷 **Filter by type, country, province** — plus favorites & sorting
- 📊 **Elevation bar** on every card — see relative height at a glance
- ❤️ **Favorites** — saved locally in your browser
- 📱 **Works offline** — install as a PWA, cache persists
- 🌙 **Dark mode** — respects your system preference

---

## Try it

**Live:** [mountkh.vercel.app](https://mountkh.vercel.app) *(replace with your actual URL)*

Or run it locally:

```bash
git clone <your-repo-url>
cd MountKH
npm install
npm run dev
# open http://localhost:5173
```

---

## Using Google Maps

OSM works out of the box. If you want the Google Maps layer:

1. Get a key at [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Enable **Maps JavaScript API** + **Places API**
3. In the app: sidebar (☰) → paste key → Save

Your key stays in **your browser only**. We never see it.

---

## ⚠️ About the data

**This is not guaranteed to be 100% accurate.** Please use it as a starting point, not a source of truth.

- Elevation comes from satellite DEM models (SRTM3 / GTOPO30) — not surveyed heights
- Province labels are reverse-geocoded automatically — they can be wrong
- Some coordinates are approximate; a few may be completely misplaced
- Feature classifications (mountain vs hill vs peak) come from GeoNames and do not always match how locals refer to a place

**Found an error?** Open an issue or PR. Better yet, if you know the real name, the real height, or the real location of a feature near your home — contribute it.

---

## Contributing

This project is **not for profit.** No ads, no tracking, no investors. Just a love for maps and Cambodian geography.

Ways to help:

- **Verify data** — pick a province you know and check if the features look right
- **Add missing peaks** — especially those with local names not in GeoNames
- **Improve the UI/UX** — designers welcome
- **Translate** — the app is currently English-primary with Khmer metadata; full Khmer UI would be incredible
- **Share it** — with hikers, climbers, geography teachers, students, anyone curious about the land

---

## How it is built

React + Vite + TailwindCSS. Modern, fast, and still fully static after the build step.

```
MountKH/
├── src/
│   ├── App.jsx          Main app logic (filters, state, maps)
│   ├── main.jsx         React entry point
│   ├── index.css        Tailwind + custom theme variables
│   ├── components/      React components (Header, ListView, MapView, DetailPanel, Sidebar, ...)
│   ├── hooks/           useLocalStorage
│   └── lib/             i18n, utilities
├── public/
│   ├── mountains.json       Main dataset (~1,600 features)
│   ├── mountains-kh.json    Cambodia-only subset
│   ├── mountains-cross.json Border features
│   ├── manifest.json        PWA manifest
│   ├── sw.js                Offline caching
│   ├── favicon.ico
│   └── icons/
├── index.html           App shell
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

**Tech stack:**
- [React 18](https://react.dev/) — UI
- [Vite](https://vitejs.dev/) — build tooling
- [TailwindCSS](https://tailwindcss.com/) — styling
- [Leaflet](https://leafletjs.com/) + [react-leaflet](https://react-leaflet.js.org/) — OSM maps
- [Lucide React](https://lucide.dev/) — icons
- Google Maps JS API — optional layer

Data source: [GeoNames Gazetteer](https://www.geonames.org/) (CC BY 4.0)  
Map tiles: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors

---

*Made by people who think Cambodia's geography deserves to be known better.*
