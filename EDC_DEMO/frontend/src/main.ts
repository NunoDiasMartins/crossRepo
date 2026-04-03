import './styles.css';

type Node = { id: string; x: number; y: number; segment: string };
type Link = { source: string; target: string; segment: string };
type Incident = { id: string; severity: 'High' | 'Medium' | 'Low'; status: string; relatedNode: string };

type AgUiEventType =
  | 'intent.received'
  | 'agent.plan'
  | 'tool.called'
  | 'state.updated'
  | 'approval.requested'
  | 'user.action'
  | 'agent.completed';

type AgUiEvent = {
  id: string;
  kind: 'ag-ui';
  type: AgUiEventType;
  payload: Record<string, unknown>;
  seq: number;
};

type A2UiMessage = {
  id: string;
  kind: 'a2ui';
  type: 'surface.updateDataModel' | 'surface.create' | 'component.update' | 'surface.delete';
  target: 'topology' | 'incidents' | 'approval';
  payload: Record<string, unknown>;
  seq: number;
};

type ProtocolMessage = AgUiEvent | A2UiMessage;

type DemoState = {
  selectedNodeId: string | null;
  neighborIds: string[];
  focusedSegment: string | null;
  incidents: Incident[];
  timeline: ProtocolMessage[];
  awaitingApproval: boolean;
  proposalText: string | null;
  agentStatus: 'idle' | 'active' | 'awaiting_approval' | 'completed';
};

const topology: { nodes: Node[]; links: Link[] } = {
  nodes: [
    { id: 'RAN-Cluster-12', x: 70, y: 80, segment: 'transport-west' },
    { id: 'Edge-GW-02', x: 220, y: 90, segment: 'transport-west' },
    { id: 'Core-RT-7', x: 370, y: 85, segment: 'transport-west' },
    { id: 'API-GW-1', x: 520, y: 90, segment: 'service-mesh' },
    { id: 'Billing-SVC', x: 170, y: 220, segment: 'service-mesh' },
    { id: 'Auth-SVC', x: 320, y: 220, segment: 'service-mesh' },
    { id: 'Transport-SW3', x: 470, y: 220, segment: 'transport-west' },
    { id: 'DB-Primary', x: 620, y: 220, segment: 'data-plane' }
  ],
  links: [
    { source: 'RAN-Cluster-12', target: 'Edge-GW-02', segment: 'transport-west' },
    { source: 'Edge-GW-02', target: 'Core-RT-7', segment: 'transport-west' },
    { source: 'Core-RT-7', target: 'API-GW-1', segment: 'transport-west' },
    { source: 'Edge-GW-02', target: 'Billing-SVC', segment: 'service-mesh' },
    { source: 'Core-RT-7', target: 'Auth-SVC', segment: 'service-mesh' },
    { source: 'API-GW-1', target: 'Transport-SW3', segment: 'transport-west' },
    { source: 'Transport-SW3', target: 'DB-Primary', segment: 'data-plane' }
  ]
};

const allIncidents: Incident[] = [
  { id: 'INC-4412', severity: 'High', status: 'Open', relatedNode: 'RAN-Cluster-12' },
  { id: 'INC-4403', severity: 'Medium', status: 'Investigating', relatedNode: 'Edge-GW-02' },
  { id: 'INC-4398', severity: 'Low', status: 'Monitoring', relatedNode: 'Auth-SVC' },
  { id: 'INC-4381', severity: 'Medium', status: 'Open', relatedNode: 'Transport-SW3' },
  { id: 'INC-4369', severity: 'Low', status: 'Open', relatedNode: 'DB-Primary' }
];

const state: DemoState = {
  selectedNodeId: null,
  neighborIds: [],
  focusedSegment: null,
  incidents: allIncidents,
  timeline: [],
  awaitingApproval: false,
  proposalText: null,
  agentStatus: 'idle'
};

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing app root');

let debugMode = false;

function render(): void {
  app.innerHTML = `
  <main class="app">
    <header class="header">
      <div class="title">Agent-First Assurance Demo</div>
      <div class="chips">
        <span class="chip">Selected node: ${state.selectedNodeId ?? 'None'}</span>
        <span class="chip">Agent: ${state.agentStatus}</span>
        <span class="chip">Related incidents: ${state.incidents.length}</span>
      </div>
    </header>

    <section class="layout">
      <article class="panel">
        <h2>Topology View</h2>
        ${renderTopology()}
        <div class="actions">
          <button id="investigateBtn" ${state.selectedNodeId ? '' : 'disabled'}>Investigate issue</button>
        </div>
      </article>

      <article class="panel">
        <h2>Incident Table</h2>
        <table class="table">
          <thead><tr><th>Incident ID</th><th>Severity</th><th>Status</th><th>Related Node</th></tr></thead>
          <tbody>
            ${state.incidents
              .map((inc) => `<tr class="${state.selectedNodeId === inc.relatedNode ? 'row-related' : ''}"><td>${inc.id}</td><td>${inc.severity}</td><td>${inc.status}</td><td>${inc.relatedNode}</td></tr>`)
              .join('')}
          </tbody>
        </table>
      </article>

      <article class="panel">
        <h2>Agent Activity Timeline</h2>
        <div class="timeline">
          ${state.timeline
            .map(
              (evt) => `<div class="event"><small>#${evt.seq} · ${evt.kind.toUpperCase()}</small>${toReadableEvent(evt)}</div>`
            )
            .join('')}
        </div>
        <div class="actions">
          <button id="debugBtn">${debugMode ? 'Hide debug' : 'Show debug'}</button>
        </div>
        ${state.awaitingApproval && state.proposalText ? `<div class="event"><small>Human in the loop</small>${state.proposalText}
          <div class="actions">
            <button data-action="approve">Approve</button>
            <button data-action="reject">Reject</button>
            <button data-action="modify">Modify scope</button>
          </div></div>` : ''}
        ${debugMode ? `<pre class="debug">${JSON.stringify(state.timeline, null, 2)}</pre>` : ''}
      </article>
    </section>
  </main>`;

  wireUi();
}

function renderTopology(): string {
  const nodesMarkup = topology.nodes
    .map((node) => {
      const cls = [
        'node',
        state.selectedNodeId === node.id ? 'selected' : '',
        state.neighborIds.includes(node.id) ? 'neighbor' : '',
        state.focusedSegment && state.focusedSegment === node.segment ? 'focus' : ''
      ]
        .filter(Boolean)
        .join(' ');
      return `<g class="${cls}" data-node="${node.id}">
        <circle cx="${node.x}" cy="${node.y}" r="22" fill="#1f2f63"></circle>
        <text x="${node.x}" y="${node.y + 4}" text-anchor="middle" font-size="9" fill="#dfe8ff">${node.id}</text>
      </g>`;
    })
    .join('');

  const linksMarkup = topology.links
    .map((link) => {
      const s = topology.nodes.find((n) => n.id === link.source)!;
      const t = topology.nodes.find((n) => n.id === link.target)!;
      const cls = `link ${state.focusedSegment && state.focusedSegment === link.segment ? 'focus' : ''}`;
      return `<line class="${cls}" x1="${s.x}" y1="${s.y}" x2="${t.x}" y2="${t.y}" />`;
    })
    .join('');

  return `<svg class="topology-svg" viewBox="0 0 700 300">${linksMarkup}${nodesMarkup}</svg>`;
}

function toReadableEvent(evt: ProtocolMessage): string {
  if (evt.kind === 'ag-ui') {
    const p = evt.payload;
    switch (evt.type) {
      case 'intent.received': return `Intent received for node <b>${String(p.nodeId)}</b>.`;
      case 'agent.plan': return `Plan: ${(p.steps as string[]).join(' → ')}.`;
      case 'tool.called': return `Tool called: <b>${String(p.tool)}</b>.`;
      case 'state.updated': return `State updated: suspected layer <b>${String(p.suspectedLayer)}</b>.`;
      case 'approval.requested': return `Approval requested from operator.`;
      case 'user.action': return `User selected <b>${String(p.action)}</b>.`;
      case 'agent.completed': return String(p.summary);
    }
  }
  return `A2UI mutation: <b>${evt.type}</b> on <b>${evt.target}</b>.`;
}

function wireUi(): void {
  document.querySelectorAll<SVGGElement>('[data-node]').forEach((el) => {
    el.addEventListener('click', () => {
      state.selectedNodeId = el.dataset.node ?? null;
      state.neighborIds = computeNeighbors(state.selectedNodeId);
      state.incidents = allIncidents;
      state.agentStatus = 'idle';
      state.awaitingApproval = false;
      state.proposalText = null;
      render();
    });
  });

  document.getElementById('investigateBtn')?.addEventListener('click', async () => {
    if (!state.selectedNodeId) return;
    await fetch('http://localhost:8000/investigate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nodeId: state.selectedNodeId })
    });
  });

  document.getElementById('debugBtn')?.addEventListener('click', () => {
    debugMode = !debugMode;
    render();
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await fetch('http://localhost:8000/approval', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: btn.dataset.action })
      });
    });
  });
}

function computeNeighbors(nodeId: string | null): string[] {
  if (!nodeId) return [];
  return topology.links.flatMap((link) => {
    if (link.source === nodeId) return [link.target];
    if (link.target === nodeId) return [link.source];
    return [];
  });
}

// A2UI-inspired renderer abstraction for declarative UI mutation messages.
const a2uiRenderer = {
  applyDataModelUpdate(msg: A2UiMessage): void {
    if (msg.target === 'incidents') {
      const incoming = msg.payload.incidents as Incident[];
      state.incidents = incoming;
    }
    if (msg.target === 'topology') {
      state.selectedNodeId = (msg.payload.selectedNodeId as string | null) ?? state.selectedNodeId;
      state.neighborIds = (msg.payload.neighborIds as string[]) ?? state.neighborIds;
      state.focusedSegment = (msg.payload.focusedSegment as string | null) ?? state.focusedSegment;
    }
    render();
  },
  applySurfaceCreate(_msg: A2UiMessage): void {},
  applyComponentUpdate(_msg: A2UiMessage): void {},
  applySurfaceDelete(_msg: A2UiMessage): void {}
};

// AG-UI-inspired event handling layer for agent execution state.
function handleAgUiEvent(evt: AgUiEvent): void {
  state.timeline = [...state.timeline, evt];
  if (evt.type === 'intent.received' || evt.type === 'agent.plan' || evt.type === 'tool.called') {
    state.agentStatus = 'active';
  }
  if (evt.type === 'approval.requested') {
    state.agentStatus = 'awaiting_approval';
    state.awaitingApproval = true;
    state.proposalText = String(evt.payload.message);
  }
  if (evt.type === 'user.action') {
    state.awaitingApproval = false;
    state.proposalText = null;
    state.agentStatus = 'active';
  }
  if (evt.type === 'agent.completed') {
    state.agentStatus = 'completed';
  }
  render();
}

function handleA2UiMessage(msg: A2UiMessage): void {
  state.timeline = [...state.timeline, msg];
  if (msg.type === 'surface.updateDataModel') {
    a2uiRenderer.applyDataModelUpdate(msg);
    return;
  }
  render();
}

function startEventStream(): void {
  const source = new EventSource('http://localhost:8000/events');
  source.onmessage = (ev) => {
    const msg = JSON.parse(ev.data) as ProtocolMessage;
    if (msg.kind === 'ag-ui') handleAgUiEvent(msg);
    if (msg.kind === 'a2ui') handleA2UiMessage(msg);
  };
}

render();
startEventStream();
