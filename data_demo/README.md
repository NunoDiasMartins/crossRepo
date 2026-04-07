# Backend-Driven Agentic Data Analysis Demo (AG-UI + A2UI)

This demo is a **2-tier architecture** where the backend is the source-of-truth agent runtime.

- Frontend: React + TypeScript AG-UI event consumer + A2UI renderer
- Backend: Node + TypeScript agent runtime and analysis pipeline
- Shared package: contracts/types for AG-UI event payloads and A2UI structures

## Architecture

```text
User action in FE
  -> POST /api/agent/run or /api/agent/action
  -> backend agent run (AG-UI style)
  -> SSE stream emits lifecycle + step + state events
  -> FE receives events and updates surface registry
  -> FE renders A2UI surfaces only
```

## Monorepo layout

```text
data_demo/
  apps/
    server/
      src/
        agent/runtimeAgent.ts
        analysis/pipeline.ts
        data/{sales_q3.json,campaigns.json}
        routes/agentRoutes.ts
        state/sessionStore.ts
        streaming/sseHub.ts
        server.ts
    web/
      src/
        client/api.ts
        renderers/A2UIRenderer.tsx
        state/useSession.ts
        App.tsx
        main.tsx
        styles.css
  packages/
    shared/
      src/
        a2ui/helpers.ts
        events/eventNames.ts
        types/contracts.ts
        index.ts
```

## Setup

```bash
cd data_demo
npm install
```

## Run

In one terminal:

```bash
npm run dev
```

Or separately:

```bash
npm run dev:server
npm run dev:web
```

- Web: `http://localhost:5173`
- API/Agent server: `http://localhost:8787`

## AG-UI usage (FE ↔ BE)

- FE starts runs with `POST /api/agent/run` and sends interactions to `POST /api/agent/action`.
- BE emits streamed events via SSE at `GET /api/agent/stream/:sessionId`.
- Events include lifecycle (`RUN_STARTED`, `RUN_FINISHED`), stage events, and `state.updated`.
- Replay is backend-driven by re-emitting saved event log entries.

## Where backend agent logic lives

- `apps/server/src/agent/runtimeAgent.ts`
- `apps/server/src/analysis/pipeline.ts`

This includes data load, aggregation, anomaly detection, campaign correlation, segmentation, forecast, and stepwise event emission.

## Where A2UI surfaces are generated

- Generated in backend agent methods in `runtimeAgent.ts`:
  - `planSurface`
  - `datasetSurface` / `trendSurface` / `annotatedDataSurface`
  - `explanationSurface` / `drillDownSurface`
  - `forecastSurface` / `segmentSurface`
  - `controlSurface`

## Where A2UI rendering happens (frontend)

- `apps/web/src/renderers/A2UIRenderer.tsx`
- UI registry and stream handling: `apps/web/src/state/useSession.ts`

Frontend does no analysis computation; it renders based on streamed surfaces only.

## Deterministic demo data patterns

Backend dataset includes:
- strong positive spike at `2025-W31` tied to **Campaign A Launch**
- negative dip at `2025-W33` tied to inventory/checkout incident
- ambiguous anomaly at `2025-W35` tied to creative test

## Presenter demo script (concise)

1. Click **Start backend analysis run**.
2. Narrate progressive streamed stages (plan → dataset → transform → chart → anomalies → explanations → suggestions).
3. Change filters (region/channel/category/sensitivity) and observe backend-driven recomputation.
4. Click a chart anomaly point to request cause drill-down.
5. Click **Forecast next quarter** for projected view + assumptions.
6. Click **Segment by region** for segmented summary.
7. Click **Replay analysis** to re-stream prior backend event history.
