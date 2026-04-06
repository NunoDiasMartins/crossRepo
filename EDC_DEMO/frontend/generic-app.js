const workflow = {
  nodes: [
    { id: 'Web Store', x: 70, y: 80, segment: 'customer-journey' },
    { id: 'Payments', x: 220, y: 90, segment: 'customer-journey' },
    { id: 'Warehouse', x: 370, y: 85, segment: 'fulfillment' },
    { id: 'Carrier Hub', x: 520, y: 90, segment: 'fulfillment' },
    { id: 'Customer Support', x: 170, y: 220, segment: 'care' },
    { id: 'Inventory', x: 320, y: 220, segment: 'fulfillment' },
    { id: 'Notifications', x: 470, y: 220, segment: 'customer-journey' },
    { id: 'Returns Desk', x: 620, y: 220, segment: 'care' }
  ],
  links: [
    { source: 'Web Store', target: 'Payments', segment: 'customer-journey' },
    { source: 'Payments', target: 'Warehouse', segment: 'fulfillment' },
    { source: 'Warehouse', target: 'Carrier Hub', segment: 'fulfillment' },
    { source: 'Payments', target: 'Customer Support', segment: 'care' },
    { source: 'Warehouse', target: 'Inventory', segment: 'fulfillment' },
    { source: 'Carrier Hub', target: 'Notifications', segment: 'customer-journey' },
    { source: 'Notifications', target: 'Returns Desk', segment: 'care' }
  ]
};

const allAlerts = [
  { id: 'OPS-2104', severity: 'High', status: 'Open', relatedNode: 'Payments', impact: 'Checkout abandonment rising' },
  { id: 'OPS-2101', severity: 'Medium', status: 'Investigating', relatedNode: 'Warehouse', impact: 'Packing queue above target' },
  { id: 'OPS-2099', severity: 'Medium', status: 'Open', relatedNode: 'Carrier Hub', impact: 'Delivery ETA slipping in one region' },
  { id: 'OPS-2093', severity: 'Low', status: 'Monitoring', relatedNode: 'Customer Support', impact: 'Refund questions trending up' },
  { id: 'OPS-2088', severity: 'Low', status: 'Monitoring', relatedNode: 'Notifications', impact: 'Shipment email delay spike' }
];

const state = {
  selectedNodeId: null,
  neighborIds: [],
  focusedSegment: null,
  alerts: allAlerts,
  timeline: [],
  awaitingApproval: false,
  proposalText: null,
  agentStatus: 'idle'
};

const app = document.querySelector('#app');
let debugMode = false;

function render() {
  app.innerHTML = `<main class="app"><header class="header"><div><div class="title">Agent-First Business Operations Demo</div><div class="subtitle">A generic demo scenario for order fulfillment, customer impact, and human-in-the-loop decisions.</div></div>
  <div class="chips"><span class="chip">Selected step: ${state.selectedNodeId ?? 'None'}</span>
  <span class="chip">Agent: ${state.agentStatus}</span><span class="chip">Relevant alerts: ${state.alerts.length}</span></div></header>
  <section class="layout">
  <article class="panel"><h2>Business Workflow</h2>${renderWorkflow()}<div class="actions"><button id="investigateBtn" ${state.selectedNodeId ? '' : 'disabled'}>Investigate slowdown</button></div></article>
  <article class="panel"><h2>Operational Alerts</h2><table class="table"><thead><tr><th>Alert ID</th><th>Severity</th><th>Status</th><th>Area</th><th>Impact</th></tr></thead>
  <tbody>${state.alerts.map((alert) => `<tr class="${state.selectedNodeId === alert.relatedNode ? 'row-related' : ''}"><td>${alert.id}</td><td>${alert.severity}</td><td>${alert.status}</td><td>${alert.relatedNode}</td><td>${alert.impact}</td></tr>`).join('')}</tbody></table></article>
  <article class="panel"><h2>Agent Activity Timeline</h2><div class="timeline">${state.timeline.map((evt) => `<div class="event"><small>#${evt.seq} · ${evt.kind.toUpperCase()}</small>${toReadableEvent(evt)}</div>`).join('')}</div>
  <div class="actions"><button id="debugBtn">${debugMode ? 'Hide debug' : 'Show debug'}</button></div>
  ${state.awaitingApproval && state.proposalText ? `<div class="event"><small>Human in the loop</small>${state.proposalText}<div class="actions"><button data-action="approve">Approve</button><button data-action="reject">Reject</button><button data-action="modify">Modify scope</button></div></div>` : ''}
  ${debugMode ? `<pre class="debug">${JSON.stringify(state.timeline, null, 2)}</pre>` : ''}</article>
  </section></main>`;
  wireUi();
}

function renderWorkflow() {
  const nodes = workflow.nodes.map((node) => {
    const cls = ['node', state.selectedNodeId === node.id ? 'selected' : '', state.neighborIds.includes(node.id) ? 'neighbor' : '', state.focusedSegment && state.focusedSegment === node.segment ? 'focus' : ''].filter(Boolean).join(' ');
    return `<g class="${cls}" data-node="${node.id}"><circle cx="${node.x}" cy="${node.y}" r="22" fill="#1f2f63"></circle><text x="${node.x}" y="${node.y + 4}" text-anchor="middle" font-size="8" fill="#dfe8ff">${node.id}</text></g>`;
  }).join('');
  const links = workflow.links.map((link) => {
    const source = workflow.nodes.find((node) => node.id === link.source);
    const target = workflow.nodes.find((node) => node.id === link.target);
    return `<line class="link ${state.focusedSegment && state.focusedSegment === link.segment ? 'focus' : ''}" x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" />`;
  }).join('');
  return `<svg class="topology-svg" viewBox="0 0 700 300">${links}${nodes}</svg>`;
}

function toReadableEvent(evt) {
  if (evt.kind === 'ag-ui') {
    switch (evt.type) {
      case 'intent.received': return `Intent received for workflow step <b>${evt.payload.nodeId}</b>.`;
      case 'agent.plan': return `Plan: ${evt.payload.steps.join(' -> ')}.`;
      case 'tool.called': return `Tool called: <b>${evt.payload.tool}</b>.`;
      case 'state.updated': return `State updated: likely pressure point <b>${evt.payload.suspectedArea ?? evt.payload.status}</b>.`;
      case 'approval.requested': return 'Approval requested from operator.';
      case 'user.action': return `User selected <b>${evt.payload.action}</b>.`;
      case 'agent.completed': return evt.payload.summary;
      default: return evt.type;
    }
  }
  return `A2UI mutation: <b>${evt.type}</b> on <b>${evt.target}</b>.`;
}

function wireUi() {
  document.querySelectorAll('[data-node]').forEach((el) => el.addEventListener('click', () => {
    state.selectedNodeId = el.dataset.node;
    state.neighborIds = computeNeighbors(state.selectedNodeId);
    state.alerts = allAlerts;
    state.agentStatus = 'idle';
    state.awaitingApproval = false;
    state.proposalText = null;
    state.focusedSegment = null;
    state.timeline = [];
    render();
  }));

  document.getElementById('investigateBtn')?.addEventListener('click', () => {
    if (!state.selectedNodeId) return;
    fetch('/generic-demo/investigate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nodeId: state.selectedNodeId })
    });
  });

  document.getElementById('debugBtn')?.addEventListener('click', () => {
    debugMode = !debugMode;
    render();
  });

  document.querySelectorAll('[data-action]').forEach((btn) => btn.addEventListener('click', () => {
    fetch('/generic-demo/approval', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: btn.dataset.action })
    });
  }));
}

function computeNeighbors(nodeId) {
  if (!nodeId) return [];
  return workflow.links.flatMap((link) => {
    if (link.source === nodeId) return [link.target];
    if (link.target === nodeId) return [link.source];
    return [];
  });
}

const renderer = {
  applyDataModelUpdate(msg) {
    if (msg.target === 'alerts') state.alerts = msg.payload.alerts;
    if (msg.target === 'workflow') {
      state.selectedNodeId = msg.payload.selectedNodeId ?? state.selectedNodeId;
      state.neighborIds = msg.payload.neighborIds ?? state.neighborIds;
      state.focusedSegment = msg.payload.focusedSegment ?? state.focusedSegment;
    }
    render();
  }
};

function handleAgUiEvent(evt) {
  state.timeline = [...state.timeline, evt];
  if (['intent.received', 'agent.plan', 'tool.called'].includes(evt.type)) state.agentStatus = 'active';
  if (evt.type === 'approval.requested') {
    state.agentStatus = 'awaiting_approval';
    state.awaitingApproval = true;
    state.proposalText = evt.payload.message;
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
  const source = new EventSource('/generic-demo/events');
  source.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.kind === 'ag-ui') handleAgUiEvent(msg);
    if (msg.kind === 'a2ui') {
      state.timeline = [...state.timeline, msg];
      if (msg.type === 'surface.updateDataModel') renderer.applyDataModelUpdate(msg);
      else render();
    }
  };
}

render();
startEventStream();
