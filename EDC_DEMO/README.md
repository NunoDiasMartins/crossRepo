# EDC_DEMO - Agent-First Assurance Demo

`EDC_DEMO` is a lightweight presentation demo that shows how an operator-facing assurance experience can become agent-first instead of chat-first.

The demo simulates an investigation flow where:
- an operator selects a network node
- an agent interprets the intent
- tools update the incident and topology views
- the system pauses for human approval
- the final action is executed with the operator still in control

The point of the demo is not AI conversation. The point is that the interface itself becomes the shared execution surface for the operator and the agent.

## What The Demo Shows

This demo is designed to highlight four ideas:

1. **Intent-driven investigation**  
   The user does not write a prompt. They act directly in the operational UI by selecting a node and starting an investigation.

2. **Visible agent reasoning**  
   The timeline makes the workflow explicit by showing intent receipt, planning, tool calls, state updates, and completion.

3. **Declarative UI updates**  
   The agent does not just generate text. It updates the actual working surfaces:
   - incident table
   - topology focus
   - operator decision point

4. **Human-in-the-loop control**  
   The system pauses before taking the final action and asks for approval, reinforcing that the operator remains accountable.

## Repository Structure

- `frontend/` - static UI served by the Node server
- `frontend/index.html` - page shell
- `frontend/app.js` - demo logic, UI rendering, and SSE event handling
- `frontend/styles.css` - demo styling
- `server/` - mock backend and static host
- `server/server.js` - SSE stream, API endpoints, and static file serving

## How To Run

From the `server` folder:

```bash
npm run dev
```

Then open:

```text
http://localhost:8000
```

## Demo Flow

The current flow in the app is:

1. The operator clicks a topology node such as `RAN-Cluster-12`.
2. The operator clicks **Investigate issue**.
3. The backend emits agent activity over Server-Sent Events.
4. The timeline shows the execution narrative:
   - `intent.received`
   - `agent.plan`
   - `tool.called`
   - `surface.updateDataModel` for incidents
   - `tool.called`
   - `surface.updateDataModel` for topology
   - `state.updated`
   - `approval.requested`
5. The operator chooses `Approve`, `Reject`, or `Modify scope`.
6. The agent completes the flow and posts a final completion event.

## Suggested Presentation Storyline

Use this storyline for a clean 3 to 5 minute narrative.

### 1. Set the context

Start with the operational problem:

> "Operations teams do not need another chat window. They need an assistant that works directly inside the tools they already use to investigate issues."

Then frame the screen:

- left: topology context
- center: operational incident view
- right: agent activity timeline

### 2. Explain the trigger

Click a node and say:

> "The investigation starts from context, not from a blank prompt. I select the affected asset and ask the system to investigate."

Then click **Investigate issue**.

### 3. Narrate the agent behavior

As the timeline fills, focus on the sequence:

- the system captures intent
- the agent produces a plan
- tools are called against the operational surfaces
- incidents are filtered to relevant scope
- topology context is expanded around the selected node
- the system updates shared state

Suggested line:

> "What matters here is that the agent is not just talking. It is coordinating the workflow and updating the live operational surfaces."

### 4. Emphasize human approval

When the approval request appears, pause intentionally and say:

> "This is the control point. The agent can recommend the next action, but the operator still decides whether to execute it."

Click **Approve** if you want the strongest version of the story.

### 5. Close on the design principle

End with a short takeaway:

> "This is an agent-first assurance experience: observable, controllable, and embedded in the working UI rather than layered on top as chat."

## What To Highlight During The Demo

These are the actions and talking points worth emphasizing live.

### Highlight 1: Selecting the node

Focus:
- the workflow starts from the operational object
- context is already known to the system
- no manual prompt engineering is required

What to say:

> "The user starts with the asset, not with text entry."

### Highlight 2: Clicking **Investigate issue**

Focus:
- this is the intent handoff from operator to agent
- the user asks for an outcome, not a sequence of manual steps

What to say:

> "I am delegating investigation, not opening a conversation."

### Highlight 3: Watching the timeline

Focus:
- the agent plan is visible
- tool use is explicit
- state transitions are transparent
- the system is auditable and easier to trust

What to say:

> "The timeline gives us operational observability into the agent's work."

### Highlight 4: Incident table updates

Focus:
- the UI changes in response to agent actions
- relevant incidents are narrowed automatically
- the agent is helping reduce noise

What to say:

> "Instead of returning a paragraph, the agent restructures the working data."

### Highlight 5: Topology updates

Focus:
- the topology reflects the current investigation scope
- neighboring assets and affected segment become clearer
- the UI becomes the explanation

What to say:

> "The system is expressing analysis through the interface, not only through narration."

### Highlight 6: Approval step

Focus:
- this is collaborative automation, not autonomous execution
- the operator remains responsible for the final decision
- trust comes from both visibility and control

What to say:

> "The agent accelerates the workflow, but the operator still governs the action."

## Recommended Live Demo Path

If you want the smoothest live sequence, use this exact path:

1. Open the app and briefly orient the audience to the three panels.
2. Click `RAN-Cluster-12`.
3. Call out the selected node chip at the top.
4. Click **Investigate issue**.
5. Let the timeline play for a second without interrupting it.
6. Narrate the plan and tool calls as they appear.
7. Point to the filtered incidents.
8. Point to the topology neighborhood update.
9. Pause at approval and explain why this matters.
10. Click **Approve**.
11. End on the focused transport segment and completion event.

## Short Presenter Notes

If you need concise talking points to remember during the presentation, use these:

- start from context, not chat
- show visible agent workflow
- show real UI mutation, not text-only output
- keep the operator in control
- frame it as collaborative execution

## Technical Notes

The implementation is intentionally minimal and deterministic for presentation use:

- the backend is a zero-dependency Node server
- the frontend is a static browser app
- agent activity is streamed over SSE
- UI changes are applied through structured event messages

This makes the demo easy to run, easy to explain, and reliable in a live presentation setting.

## Second Demo Path

A second, broader-audience scenario is also available for presentations that should avoid telecom-specific language.

Use this URL after restarting the server:

```text
http://localhost:8000/generic-demo
```

### Generic Demo Theme

The second demo is an agent-first business operations scenario centered on order fulfillment and customer impact.

It replaces telecom concepts with a more broadly relatable workflow:

- `Web Store`
- `Payments`
- `Warehouse`
- `Carrier Hub`
- `Customer Support`
- `Inventory`
- `Notifications`
- `Returns Desk`

The operator selects a workflow step, clicks **Investigate slowdown**, and watches the agent:

- review related operational alerts
- expand upstream and downstream workflow context
- estimate customer impact
- request approval before taking a business action

This route keeps the same agent-first interaction model while making the story easier to understand for a general audience.

## Third Demo Path

For a more everyday, human retail story, a separate frontend is also available:

```text
http://localhost:8000/retail-demo
```

### Retail Demo Theme

This route is built as a fully separate frontend so the current assurance and generic demos stay untouched.

The scenario focuses on common retail moments people recognize immediately:

- weeknight dinner pickup
- lunchbox refill for tomorrow
- weekend household stock-up

The operator selects a shopper mission and runs a retail assist flow. The agent then:

- rebuilds the basket around real availability
- focuses the store zones that matter
- refreshes daily retail metrics
- coordinates pickup timing and shopper communication
- pauses for approval before customer-facing changes go live

This version is designed for audiences who respond better to familiar daily-life moments than to incidents, assurance, or topology language.

## Fourth Demo Path

For a dashboard-first assurance story that hides topology until the agent decides it is needed, use:

```text
http://localhost:8000/dashboard-demo
```

### Dashboard Demo Theme

This route now includes a top-level navigation menu with three pages:

- **Service Dashboard** (default landing page)
- **KPI Catalog** (full list of KPIs)
- **Network Topology** (full end-to-end network view)

The **Service Dashboard** page still starts with service health donuts and an incident queue instead of showing the topology immediately.

The user journey is:

1. start on **Service Dashboard** to review service health and open incidents
2. optionally switch to **KPI Catalog** to inspect all KPIs
3. optionally switch to **Network Topology** for a full network map
4. return to **Service Dashboard**, select one incident, and click **Investigate issue**
5. watch the agent reveal focused topology scope, expand service impact, and request approval

This version is useful when you want both realistic top-level navigation and the original agent-driven topology reveal workflow.

## Fifth Demo Path

For an intent-driven service order story that makes AG-UI and A2UI protocol behavior visible, use:

```text
http://localhost:8000/intent-order-demo
```

### Intent Order Demo Theme

This route shows an operator submitting a realistic TMF641-style draft order with Autonomous Network intent, then watching the lifecycle trigger TMF921-style intent validation, service mapping, and a pre-approval impact topology.

The user journey is:

1. review the draft service order
2. click **Submit order**
3. watch the order canvas move from draft to submitted and acknowledged
4. see the intent registry return an `IntentRef`
5. watch A2UI mutations add service characteristics and preview the impacted topology
6. approve, reject, or modify provisioning before services are created

The demo intentionally emphasizes visual UI mutation over agent text, so the audience can see how AG-UI/A2UI support transparent, governed, human-in-the-loop orchestration.