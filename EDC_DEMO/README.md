# EDC_DEMO — Agent-First Assurance Demo

A deterministic, talk-ready demo showing **agent-first UI interaction** using AG-UI-inspired event semantics and A2UI-inspired declarative UI mutations.

## Structure
- `frontend/` — presentation UI (TypeScript source in `src/main.ts`, runnable module in `app.js`)
- `server/` — zero-dependency Node mock backend + static file host + SSE stream

## Quick start (minimal setup)
```bash
cd EDC_DEMO/server
npm run dev
```
Then open: `http://localhost:8000`

## Architecture summary

### AG-UI-inspired event layer
The backend streams protocol-shaped events (`kind: "ag-ui"`) over SSE:
- `intent.received`
- `agent.plan`
- `tool.called`
- `state.updated`
- `approval.requested`
- `user.action`
- `agent.completed`

The frontend timeline subscribes to all of these and shows a readable execution narrative.

### A2UI-inspired mutation layer
The backend streams declarative UI messages (`kind: "a2ui"`) such as:
- `surface.updateDataModel` targeting `incidents`
- `surface.updateDataModel` targeting `topology`

Frontend applies these through an explicit renderer abstraction:
- `applySurfaceCreate`
- `applyComponentUpdate`
- `applyDataModelUpdate`
- `applySurfaceDelete`

This keeps the demo centered on **structured activity + declarative mutation**, not chat bubbles.

## Live talk demo script (2–3 min)
1. Open the screen and point out three panes: topology, incidents, activity timeline.
2. Click a topology node (e.g. `RAN-Cluster-12`).
3. Click **Investigate issue**.
4. Narrate timeline events in order:
   - intent received
   - plan declared
   - tool called: incident filter
   - incident table mutation
   - tool called: topology expansion
   - topology mutation
   - state update
   - approval requested
5. Click **Approve**.
6. Show the final topology focus update and completion event.
7. Close with: “This is a collaborative execution surface, not a chatbot pasted over legacy UI.”

## Future extensions
- Swap mock backend for real agent runtime.
- Replace thin event shape with official AG-UI SDK handlers.
- Replace thin renderer with official A2UI renderer/catalog.
- Add richer tool telemetry and shared-state synchronization.
- Optional contrast mode: “legacy chat mode” vs “agent-first mode”.

## Notes on requested public APIs
- This environment blocks external package installs for `@ag-ui/*` and A2UI dependencies (HTTP 403), so this repo uses a protocol-aligned thin implementation and clear mapping comments.
- TypeScript protocol types are included in `frontend/src/main.ts` for clarity and future drop-in replacement with official SDKs.
