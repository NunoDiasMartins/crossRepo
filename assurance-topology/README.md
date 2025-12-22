# Assurance Topology Monorepo

Framework-agnostic, TypeScript-first topology library for Telco Assurance use cases. Includes a headless core, WebGL renderer, map adapter, web component wrapper, and a demo app.

## Prerequisites

- Node.js 18+ (ES2022 target)
- npm 9+

## Install

From the repo root:

```bash
cd assurance-topology
npm install
```

> Note: The environment you run in must have access to the npm registry for dependency installation.

## Build (all packages)

```bash
cd assurance-topology
npm run build
```

This runs `tsc` for each workspace package.

## Run the demo

```bash
cd assurance-topology
npm run dev
```

Then open the URL printed by Vite (typically `http://localhost:5173`).

The demo loads a local offline SVG basemap and generates a large topology (thousands of nodes and dense polylines) to exercise pan/zoom and selection events.

## Package overview

- `packages/core`: Headless graph store with patch-based updates and overlay separation.
- `packages/render-webgl`: WebGL2 renderer surface and LOD hooks.
- `packages/map-adapter`: Map adapter contract and MapLibre implementation.
- `packages/wc`: `<assurance-topology>` web component with shadow DOM.
- `packages/demo`: Local Vite demo app (offline basemap, large topology generator).

## Offline map assets

The demo ships a local basemap:

- `packages/demo/public/offline-map.svg`
- `packages/demo/public/map-style.json`

You can swap the style file to point to your own offline tile packs or images.
