# Shared Topology Map (Phase 1)

This monorepo now includes a reusable, framework-agnostic topology map library exposed as a Web Component, plus a runnable sample app.

## What was built

Phase 1 delivers:
- Read-only topology visualization (nodes + edges)
- Alarm overlays on nodes and optional edges
- Leaflet renderer with configurable OpenStreetMap-compatible tile layer
- Typed custom events and typed imperative API
- Minimal plugin model (`readonlyPlugin`, `alarmOverlayPlugin`)
- Runnable sample app with controls, legend, and event log

## Architecture overview

- **`topology-types`**: Canonical backend-neutral types for graph/alarm/tile config.
- **`topology-core`**: Shared logic utilities (filtering alarms, bounds calculation).
- **`topology-leaflet-renderer`**: Leaflet rendering implementation and interaction wiring.
- **`topology-webcomponent`**: `<company-topology-map>` Custom Element public UI surface.
- **`topology-plugins`**: Minimal plugin contract + built-in plugins.
- **`sample-app`**: Vite app demonstrating host integration and events.

Business workflows (Assurance/Inventory specific logic, API calls, routing, persistence) are intentionally outside these shared modules.

## Project/module structure

```
packages/
  topology-types/
  topology-core/
  topology-leaflet-renderer/
  topology-webcomponent/
  topology-plugins/
  sample-app/
```

## Install

```bash
cd assurance-topology
npm install
```

## Build all packages

```bash
npm run build
```

## Run sample app

```bash
npm run dev
```

Then open the URL shown by Vite (typically `http://localhost:5173`).

## Consume from another application

```ts
import "@assurance-topology/topology-webcomponent";
import type { CompanyTopologyMapElement } from "@assurance-topology/topology-webcomponent";
import type { TopologyGraph, TopologyAlarm, TileLayerConfig } from "@assurance-topology/topology-core";

const el = document.createElement("company-topology-map") as CompanyTopologyMapElement;
el.tileLayerConfig = {
  urlTemplate: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: "&copy; OpenStreetMap contributors",
};
el.setGraph(graph);
el.setAlarms(alarms);
```

## Public API (`<company-topology-map>`)

### Properties
- `graph: TopologyGraph`
- `alarms: TopologyAlarm[]`
- `mode: 'readonly'`
- `selectedNodeId?: string`
- `selectedEdgeId?: string`
- `filters?: AlarmFilter`
- `tileLayerConfig: TileLayerConfig`
- `mapConfig?: object`
- `plugins?: array`
- `theme?: object`

### Events
- `node-selected`
- `edge-selected`
- `alarm-selected`
- `viewport-changed`
- `map-ready`
- `error`

### Imperative methods
- `setGraph(graph)`
- `setAlarms(alarms)`
- `focusNode(nodeId)`
- `focusEdge(edgeId)`
- `fitToView()`
- `clearSelection()`
- `setFilters(filters)`

## Data model

Use canonical, backend-neutral types from `@assurance-topology/topology-types`. Host applications map backend DTOs into these shared types before passing data to the component.

## Leaflet/OpenStreetMap configuration

Base map tiles are passed by `tileLayerConfig`:
- `urlTemplate`
- `attribution`
- `maxZoom?`
- `subdomains?`

OpenStreetMap is the sample default, but any OSM-compatible provider can be used.

## Known limitations (Phase 1)

- Read-only only; no edit mode
- No drag/drop or topology mutation tools
- No backend persistence
- No product-specific business workflows
- Basic marker/polyline visualization focused on clarity over advanced styling
