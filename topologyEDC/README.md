# topologyEDC - Agent-First UI Demo

This demo implements an **AG-UI / A2UI inspired** interaction where the UI is orchestrated by deterministic agent instructions instead of navigation or chatbot-only responses.

## What it demonstrates

Scenario: **Investigate → Understand → Act**

1. Start on topology view.
2. Trigger investigation (node click or investigate button).
3. Agent emits `ui_actions` to:
   - highlight nodes,
   - open incident table,
   - render KPI chart,
   - render RCA graph.
4. Refine via chat (`Focus on core routers`).
5. Agent updates incident filtering + chart scope.
6. Request corrective action.
7. Approve in action panel.
8. Agent updates topology state to healthy and resolves incidents.

## Architecture

- **Frontend:** framework-agnostic Web Components in `public/main.js`.
- **Backend:** deterministic mock agent in `server/server.js`.
- **Protocol:** Server-Sent Events (`/events`) + command channel (`POST /agent`) carrying:
  - `intent`
  - `context`
  - `ui_actions`
  - `tool_usage`

Declared available tools:

```json
{
  "availableTools": [
    "topology",
    "incidentTable",
    "kpiChart",
    "rcaGraph",
    "actionPanel"
  ]
}
```

## Run locally

```bash
cd topologyEDC
npm install
npm start
```

Open: `http://localhost:4310`

## Demo script (presentation-ready)

1. Say: "The user starts from topology only."
2. Click `node-1` or the investigate button.
3. Show stream log with agent payload containing `intent/context/ui_actions/tool_usage`.
4. In chat input enter: `Focus on core routers`.
5. Click `Ask for corrective action`.
6. Click `Approve` in Action Panel.
7. Observe topology turns healthy and incident statuses move to resolved.

## Notes

- No auth.
- No real LLM.
- Deterministic flows for reliable demos.
