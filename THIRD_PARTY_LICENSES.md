# Third-party assets

The MountKH application code itself is MIT licensed — see [`LICENSE`](LICENSE). The notices below apply only to bundled third-party data and assets.

## Icons

Map pins and the mountain glyph use the **Mountain**, **Flag**, **Map pin** and **Compass** icons from [Tabler Icons](https://tabler.io/icons) (MIT License), discovered through [IconMCP](https://iconmcp.com/) (MIT License). The SVG path data is bundled locally in `src/lib/iconmcp.js`; no runtime icon CDN is used.

Tabler Icons — Copyright (c) 2020–2026 Paweł Kuna. Licensed under the MIT License.
IconMCP — licensed under the MIT License.

## 3D terrain

The 3D map view uses [MapLibre GL JS](https://maplibre.org/) (BSD-3-Clause) and the Summit 360° view uses [Three.js](https://threejs.org/) (MIT), its `Water` example (MIT), the `waternormals.jpg` texture from the Three.js examples (MIT), and [SunCalc](https://github.com/mourner/suncalc) (BSD-2-Clause) for real-time sun position. All are bundled locally; no runtime CDN is used for these assets. Elevation comes from the public [AWS Terrarium](https://registry.opendata.aws/terrain-tiles/) dataset (Mapzen terrain tiles, public domain / CC0-derived sources). Satellite imagery is © Esri; the alternative base map is © OpenStreetMap contributors (ODbL).

## Other dependencies

See `package.json` and `package-lock.json` for the runtime and build dependencies (React, Leaflet, Vite, Tailwind CSS, lucide-react). Each retains its original license.

## Data

[GeoNames Gazetteer](https://www.geonames.org/) — Creative Commons Attribution 4.0 License.
OpenStreetMap map data — © OpenStreetMap contributors, ODbL.
