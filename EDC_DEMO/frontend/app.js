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
  { id: 'INC-4412', severity: 'High', status: 'Open', relatedNode: 'RAN-Cluster-12', service: 'Access' },
  { id: 'INC-4403', severity: 'Medium', status: 'Investigating', relatedNode: 'Edge-GW-02', service: 'Core' },
  { id: 'INC-4398', severity: 'Low', status: 'Monitoring', relatedNode: 'Auth-SVC', service: 'Digital' },
  { id: 'INC-4381', severity: 'Medium', status: 'Open', relatedNode: 'Transport-SW3', service: 'Data' },
  { id: 'INC-4369', severity: 'Low', status: 'Open', relatedNode: 'DB-Primary', service: 'Data' }
];

const serviceHealth = [
  { name: 'Access', value: 96 },
  { name: 'Core', value: 94 },
  { name: 'Digital', value: 93 },
  { name: 'Data', value: 84 }
];

const state = {
  selectedNodeId: null,
  selectedIncidentId: allIncidents[0].id,
  neighborIds: [],
  focusedSegment: null,
  incidents: allIncidents,
  timeline: [],
  awaitingApproval: false,
  proposalText: null,
  agentStatus: 'idle',
  viewMode: 'overview',
  degradationSeries: [],
  realtimeSeries: []
};

const app = document.querySelector('#app');
let debugMode = false;
let realtimeTimer = null;

function render() {
  const selectedIncident = state.incidents.find((inc) => inc.id === state.selectedIncidentId) ?? null;

  app.innerHTML = `<main class="app"><header class="header"><div><div class="title">Agent-First Assurance Dashboard Demo</div>
  <div class="subtitle">Start from service health, then let the agent reveal topology only when it becomes relevant.</div></div>
  <div class="chips"><span class="chip">Incident: ${state.selectedIncidentId ?? 'None'}</span>
  <span class="chip">Agent: ${state.agentStatus}</span><span class="chip">Topology: ${state.viewMode === 'overview' ? 'Hidden' : 'Visible'}</span></div></header>
  <section class="layout">
    <section class="left-column">
      ${state.viewMode === 'overview' ? renderServiceHealthPanel(selectedIncident) : ''}
      ${state.viewMode === 'overview' ? renderIncidentQueuePanel() : ''}
      <article class="panel span-full"><h2>Topology View <small>Revealed by agent action</small></h2>${renderTopology()}</article>
      ${state.viewMode === 'investigating' ? renderDegradationPanel() : ''}
      ${state.viewMode === 'post-approval' ? renderRealtimePanel() : ''}
    </section>

    <article class="panel timeline-panel"><div class="panel-head"><h2>Agent Activity Timeline</h2><button id="debugBtn">${debugMode ? 'Hide debug' : 'Show debug'}</button></div>
      <div class="timeline-wrapper"><div class="timeline">${state.timeline.map((evt) => `<div class="event"><small>#${evt.seq} · ${evt.kind.toUpperCase()}</small>${toReadableEvent(evt)}</div>`).join('')}
      ${state.awaitingApproval && state.proposalText ? `<div class="event"><small>Human in the loop</small>${state.proposalText}<div class="actions"><button data-action="approve">Approve</button><button data-action="reject">Reject</button><button data-action="modify">Modify scope</button></div></div>` : ''}
      ${debugMode ? `<pre class="debug">${JSON.stringify(state.timeline, null, 2)}</pre>` : ''}</div></div></article>
  </section></main>`;

  wireUi();
}

function renderServiceHealthPanel(selectedIncident) {
  return `<article class="panel"><h2>Service Health <small>Entry point for the operator</small></h2>
    <div class="service-grid">${serviceHealth.map((svc) => `<div class="service-card"><div class="pct">${svc.value}%</div><div>${svc.name}</div></div>`).join('')}</div>
    <div class="impact-grid">
      <div class="impact"><small>Impacted service</small><strong>${selectedIncident?.service ?? 'N/A'}</strong></div>
      <div class="impact"><small>Customer effect</small><strong>No active subscriber impact at this time</strong></div>
      <div class="impact"><small>Recommended action</small><strong>Keep topology visible for validation before changes</strong></div>
    </div>
  </article>`;
}

function renderIncidentQueuePanel() {
  return `<article class="panel"><h2>Incident Queue <small>Select one incident to begin</small></h2>
      <div class="incident-list">${state.incidents.map((inc) => `<button class="incident-item ${state.selectedIncidentId === inc.id ? 'selected' : ''}" data-incident="${inc.id}"><div><strong>${inc.id}</strong><div>${inc.relatedNode} · ${inc.status}</div></div><span class="sev ${inc.severity.toLowerCase()}">${inc.severity}</span></button>`).join('')}</div>
      <div class="actions"><button id="investigateBtn" ${state.selectedIncidentId ? '' : 'disabled'}>Investigate issue</button></div>
  </article>`;
}

function renderDegradationPanel() {
  const max = Math.max(...state.degradationSeries.map((d) => d.value), 1);
  return `<article class="panel"><h2>Impacted Node Degradation</h2>
    <div class="bar-list">${state.degradationSeries.map((item) => `<div class="bar-row"><small>${item.node}</small><div class="bar-track"><div class="bar-fill" style="width:${Math.max(6, Math.round((item.value / max) * 100))}%"></div></div><span>${item.value}%</span></div>`).join('')}</div>
  </article>`;
}

function renderRealtimePanel() {
  return `<article class="panel"><h2>Correction Nodes · Realtime Values</h2>
    <div class="bar-list">${state.realtimeSeries.map((item) => `<div class="bar-row"><small>${item.node}</small><div class="metric-pill">Latency ${item.latency}ms</div><div class="metric-pill">Loss ${item.loss}%</div><div class="metric-pill">Jitter ${item.jitter}ms</div></div>`).join('')}</div>
  </article>`;
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
      case 'intent.received': return `Intent received for incident <b>${evt.payload.incidentId ?? 'n/a'}</b>.`;
      case 'agent.plan': return `Plan: ${(evt.payload.steps || []).join(' → ') || 'analysis in progress'}.`;
      case 'tool.called': return `Tool called: <b>${evt.payload.tool ?? 'UnknownTool'}</b>.`;
      case 'state.updated': return `State updated: <b>${evt.payload.suspectedLayer ?? evt.payload.status ?? 'context updated'}</b>.`;
      case 'approval.requested': return 'Approval requested from operator.';
      case 'user.action': return `User selected <b>${evt.payload.action ?? 'unknown'}</b>.`;
      case 'agent.completed': return evt.payload.summary ?? 'Agent completed.';
      default: return 'Agent event received.';
    }
  }
  return `A2UI mutation: <b>${evt.type ?? 'unknown'}</b> on <b>${evt.target ?? 'unknown'}</b>.`;
}

function wireUi() {
  document.querySelectorAll('[data-node]').forEach((el) => el.addEventListener('click', () => {
    state.selectedNodeId = el.dataset.node;
    state.neighborIds = computeNeighbors(state.selectedNodeId);
    render();
  }));

  document.querySelectorAll('[data-incident]').forEach((el) => el.addEventListener('click', () => {
    state.selectedIncidentId = el.dataset.incident;
    render();
  }));

  document.getElementById('investigateBtn')?.addEventListener('click', () => {
    const incident = state.incidents.find((inc) => inc.id === state.selectedIncidentId);
    if (!incident) return;
    stopRealtimeTicker();
    state.selectedNodeId = incident.relatedNode;
    state.neighborIds = computeNeighbors(state.selectedNodeId);
    state.viewMode = 'investigating';
    state.degradationSeries = createDegradationSeries(incident.relatedNode);
    render();
    fetch('/investigate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nodeId: incident.relatedNode, incidentId: incident.id }) });
  });

  document.getElementById('debugBtn')?.addEventListener('click', () => { debugMode = !debugMode; render(); });

  document.querySelectorAll('[data-action]').forEach((btn) => btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    if (action === 'approve') {
      state.viewMode = 'post-approval';
      state.realtimeSeries = createRealtimeSeed();
      startRealtimeTicker();
      render();
    }
    if (action !== 'approve') {
      stopRealtimeTicker();
      if (state.viewMode === 'post-approval') state.viewMode = 'investigating';
      render();
    }
    fetch('/approval', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) });
  }));
}

function createDegradationSeries(nodeId) {
  const impacted = [nodeId, ...computeNeighbors(nodeId).slice(0, 2)];
  return impacted.map((node, index) => ({ node, value: Math.max(28, 82 - index * 18) }));
}

function createRealtimeSeed() {
  return [
    { node: 'Core-RT-7', latency: 74, loss: 2.4, jitter: 18 },
    { node: 'API-GW-1', latency: 69, loss: 2.1, jitter: 16 },
    { node: 'Transport-SW3', latency: 81, loss: 2.8, jitter: 21 }
  ];
}

function startRealtimeTicker() {
  stopRealtimeTicker();
  realtimeTimer = setInterval(() => {
    state.realtimeSeries = state.realtimeSeries.map((item) => ({
      ...item,
      latency: Math.max(36, +(item.latency - (Math.random() * 3.2)).toFixed(1)),
      loss: Math.max(0.2, +(item.loss - (Math.random() * 0.2)).toFixed(2)),
      jitter: Math.max(4, +(item.jitter - (Math.random() * 1.4)).toFixed(1))
    }));
    render();
  }, 1000);
}

function stopRealtimeTicker() {
  if (realtimeTimer) {
    clearInterval(realtimeTimer);
    realtimeTimer = null;
  }
}

function computeNeighbors(nodeId) {
  if (!nodeId) return [];
  return topology.links.flatMap((link) => link.source === nodeId ? [link.target] : link.target === nodeId ? [link.source] : []);
}

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

function handleAgUiEvent(evt) {
  state.timeline = [...state.timeline, evt];
  if (['intent.received', 'agent.plan', 'tool.called'].includes(evt.type)) state.agentStatus = 'active';
  if (evt.type === 'approval.requested') {
    state.agentStatus = 'awaiting_approval';
    state.awaitingApproval = true;
    state.proposalText = evt.payload.message ?? 'Approve recommended corrective action?';
  }
  if (evt.type === 'user.action') {
    state.awaitingApproval = false;
    state.proposalText = null;
    state.agentStatus = 'active';
  }
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
