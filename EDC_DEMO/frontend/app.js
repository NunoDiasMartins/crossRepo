import './styles.css';

const topology = {
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

const allIncidents = [
  { id: 'INC-4412', severity: 'High', status: 'Open', relatedNode: 'RAN-Cluster-12' },
  { id: 'INC-4403', severity: 'Medium', status: 'Investigating', relatedNode: 'Edge-GW-02' },
  { id: 'INC-4398', severity: 'Low', status: 'Monitoring', relatedNode: 'Auth-SVC' },
  { id: 'INC-4381', severity: 'Medium', status: 'Open', relatedNode: 'Transport-SW3' },
  { id: 'INC-4369', severity: 'Low', status: 'Open', relatedNode: 'DB-Primary' }
];

const state = {
  selectedNodeId: null,
  neighborIds: [],
  focusedSegment: null,
  incidents: allIncidents,
  timeline: [],
  awaitingApproval: false,
  proposalText: null,
  agentStatus: 'idle'
};

const app = document.querySelector('#app');
let debugMode = false;

function render() {
  app.innerHTML = `<main class="app"><header class="header"><div class="title">Agent-First Assurance Demo</div>
  <div class="chips"><span class="chip">Selected node: ${state.selectedNodeId ?? 'None'}</span>
  <span class="chip">Agent: ${state.agentStatus}</span><span class="chip">Related incidents: ${state.incidents.length}</span></div></header>
  <section class="layout">
  <article class="panel"><h2>Topology View</h2>${renderTopology()}<div class="actions"><button id="investigateBtn" ${state.selectedNodeId ? '' : 'disabled'}>Investigate issue</button></div></article>
  <article class="panel"><h2>Incident Table</h2><table class="table"><thead><tr><th>Incident ID</th><th>Severity</th><th>Status</th><th>Related Node</th></tr></thead>
  <tbody>${state.incidents.map((inc) => `<tr class="${state.selectedNodeId === inc.relatedNode ? 'row-related' : ''}"><td>${inc.id}</td><td>${inc.severity}</td><td>${inc.status}</td><td>${inc.relatedNode}</td></tr>`).join('')}</tbody></table></article>
  <article class="panel"><h2>Agent Activity Timeline</h2><div class="timeline">${state.timeline.map((evt) => `<div class="event"><small>#${evt.seq} · ${evt.kind.toUpperCase()}</small>${toReadableEvent(evt)}</div>`).join('')}</div>
  <div class="actions"><button id="debugBtn">${debugMode ? 'Hide debug' : 'Show debug'}</button></div>
  ${state.awaitingApproval && state.proposalText ? `<div class="event"><small>Human in the loop</small>${state.proposalText}<div class="actions"><button data-action="approve">Approve</button><button data-action="reject">Reject</button><button data-action="modify">Modify scope</button></div></div>` : ''}
  ${debugMode ? `<pre class="debug">${JSON.stringify(state.timeline, null, 2)}</pre>` : ''}</article>
  </section></main>`;
  wireUi();
}

function renderTopology() {
  const nodes = topology.nodes.map((node) => {
    const cls = ['node', state.selectedNodeId === node.id ? 'selected' : '', state.neighborIds.includes(node.id) ? 'neighbor' : '', state.focusedSegment && state.focusedSegment === node.segment ? 'focus' : ''].filter(Boolean).join(' ');
    return `<g class="${cls}" data-node="${node.id}"><circle cx="${node.x}" cy="${node.y}" r="22" fill="#1f2f63"></circle><text x="${node.x}" y="${node.y + 4}" text-anchor="middle" font-size="9" fill="#dfe8ff">${node.id}</text></g>`;
  }).join('');
  const links = topology.links.map((link) => {
    const s = topology.nodes.find((n) => n.id === link.source);
    const t = topology.nodes.find((n) => n.id === link.target);
    return `<line class="link ${state.focusedSegment && state.focusedSegment === link.segment ? 'focus' : ''}" x1="${s.x}" y1="${s.y}" x2="${t.x}" y2="${t.y}" />`;
  }).join('');
  return `<svg class="topology-svg" viewBox="0 0 700 300">${links}${nodes}</svg>`;
}

function toReadableEvent(evt) {
  if (evt.kind === 'ag-ui') {
    switch (evt.type) {
      case 'intent.received': return `Intent received for node <b>${evt.payload.nodeId}</b>.`;
      case 'agent.plan': return `Plan: ${evt.payload.steps.join(' → ')}.`;
      case 'tool.called': return `Tool called: <b>${evt.payload.tool}</b>.`;
      case 'state.updated': return `State updated: suspected layer <b>${evt.payload.suspectedLayer ?? evt.payload.status}</b>.`;
      case 'approval.requested': return 'Approval requested from operator.';
      case 'user.action': return `User selected <b>${evt.payload.action}</b>.`;
      case 'agent.completed': return evt.payload.summary;
    }
  }
  return `A2UI mutation: <b>${evt.type}</b> on <b>${evt.target}</b>.`;
}

function wireUi() {
  document.querySelectorAll('[data-node]').forEach((el) => el.addEventListener('click', () => {
    state.selectedNodeId = el.dataset.node;
    state.neighborIds = computeNeighbors(state.selectedNodeId);
    state.incidents = allIncidents;
    state.agentStatus = 'idle';
    state.awaitingApproval = false;
    state.proposalText = null;
    render();
  }));

  document.getElementById('investigateBtn')?.addEventListener('click', () => {
    if (!state.selectedNodeId) return;
    fetch('/investigate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nodeId: state.selectedNodeId }) });
  });

  document.getElementById('debugBtn')?.addEventListener('click', () => { debugMode = !debugMode; render(); });
  document.querySelectorAll('[data-action]').forEach((btn) => btn.addEventListener('click', () => {
    fetch('/approval', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: btn.dataset.action }) });
  }));
}

function computeNeighbors(nodeId) {
  if (!nodeId) return [];
  return topology.links.flatMap((link) => link.source === nodeId ? [link.target] : link.target === nodeId ? [link.source] : []);
}

// A2UI-inspired renderer abstraction for declarative mutations.
const a2uiRenderer = {
  applyDataModelUpdate(msg) {
    if (msg.target === 'incidents') state.incidents = msg.payload.incidents;
    if (msg.target === 'topology') {
      state.selectedNodeId = msg.payload.selectedNodeId ?? state.selectedNodeId;
      state.neighborIds = msg.payload.neighborIds ?? state.neighborIds;
      state.focusedSegment = msg.payload.focusedSegment ?? state.focusedSegment;
    }
    render();
  },
  applySurfaceCreate() {},
  applyComponentUpdate() {},
  applySurfaceDelete() {}
};

// AG-UI-inspired event handling layer.
function handleAgUiEvent(evt) {
  state.timeline = [...state.timeline, evt];
  if (['intent.received', 'agent.plan', 'tool.called'].includes(evt.type)) state.agentStatus = 'active';
  if (evt.type === 'approval.requested') {
    state.agentStatus = 'awaiting_approval';
    state.awaitingApproval = true;
    state.proposalText = evt.payload.message;
  }
  if (evt.type === 'user.action') { state.awaitingApproval = false; state.proposalText = null; state.agentStatus = 'active'; }
  if (evt.type === 'agent.completed') state.agentStatus = 'completed';
  render();
}

function startEventStream() {
  const source = new EventSource('/events');
  source.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.kind === 'ag-ui') handleAgUiEvent(msg);
    if (msg.kind === 'a2ui') {
      state.timeline = [...state.timeline, msg];
      if (msg.type === 'surface.updateDataModel') a2uiRenderer.applyDataModelUpdate(msg);
      else render();
    }
  };
}

render();
startEventStream();
