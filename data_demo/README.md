# Agentic Data Analysis Workspace Demo (AG-UI + A2UI)

This folder contains a runnable local demo for an event-driven analytics workspace where the **agent drives the UI**.

## What this demonstrates

- **AG-UI as first-class runtime loop** using `AbstractAgent` and `RunAgentInput`.
- **Streaming events** (`run started/finished`, message stream, tool-like step events, state updates).
- **A2UI-driven rendering**: all visible surfaces are generated as declarative payloads from agent events.
- **Bidirectional flow**: UI sends AG-UI context events (`filter.changed`, `anomaly.selected`, `action.triggered`) and receives new streamed surfaces.
- **Replay**: stored AG-UI event stream can rebuild the workspace progressively.

## Install

```bash
cd data_demo
npm install
```

Required packages include:

```bash
npm install @ag-ui/core @ag-ui/client
```

## Run

```bash
npm run dev
```

Open `http://localhost:5173`.

## Demo prompt

Run the scenario with:

> Analyze last quarter sales, identify anomalies, and explain what caused them.

The agent streams this step sequence:

1. `plan.created`
2. `dataset.loaded`
3. `transform.applied`
4. `chart.created`
5. `anomalies.detected`
6. `annotations.added`
7. `explanation.generated`
8. `suggestion.offered`

## Where AG-UI is implemented

- `src/agent.ts`
  - `AnalyticsAgent` extends `AbstractAgent` from `@ag-ui/client`.
  - `run(input: RunAgentInput)` returns a stream (`Observable`) and emits lifecycle + step events.
  - Uses AG-UI core model types (`Message`, `Context`, `Tool`, `State`) via `src/types.ts`.

## Where A2UI rendering happens

- Agent emits surface payloads shaped as declarative A2UI JSON in `src/agent.ts`.
- Frontend keeps a **surface registry** keyed by surface IDs and renders only from payloads in `src/App.tsx` via `A2UIRenderer`.
- No surface-specific React chart/table hardcoding outside the generic renderer.

## Required interactive scenarios implemented

1. **Filter to Europe**
   - UI sends `filter.changed`
   - Agent recomputes weekly aggregates + anomaly classification
   - Agent emits updated `data_surface` and `activity_surface`

2. **Click anomaly**
   - UI sends `anomaly.selected`
   - Agent emits drill-down explanation surface

3. **Forecast**
   - UI sends `action.triggered` (`forecast`)
   - Agent emits forecast chart surface

4. **Replay**
   - UI sends `action.triggered` (`replay`)
   - Agent returns stored event stream
   - UI replays state updates over time to rebuild surfaces

## Data

- `src/data/sales_q3.json`
- `src/data/campaigns.json`

Includes:
- Campaign-driven spike (`2025-W31`)
- Negative dip (`2025-W33`)
- Ambiguous anomaly (`2025-W35`)
