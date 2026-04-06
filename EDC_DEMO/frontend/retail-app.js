const customerMissions = [
  {
    id: 'weeknight-dinner',
    name: 'Weeknight Dinner',
    shopper: 'Maya, picking up dinner ingredients after work',
    urgency: 'Tonight by 18:30',
    basketValue: '$42',
    pickupWindow: '18:45 - 19:15',
    headline: 'Make dinner easy with a one-tap basket and a reserved pickup slot.',
    objective: 'Bundle a fast dinner, confirm stock, and keep pickup smooth for the evening rush.',
    basket: [
      { item: 'Fresh pasta kit', qty: '1', area: 'Meal Solutions', status: 'Ready' },
      { item: 'Garlic bread', qty: '1', area: 'Bakery', status: 'Ready' },
      { item: 'Sparkling water', qty: '2', area: 'Beverages', status: 'Ready' },
      { item: 'Caesar salad kit', qty: '1', area: 'Produce', status: 'Substitute suggested' }
    ],
    zones: [
      { name: 'Meal Solutions', status: 'On pace', detail: 'Dinner kits fully stocked', tone: 'good' },
      { name: 'Bakery', status: 'Warming', detail: 'Garlic bread batch ready in 12 min', tone: 'watch' },
      { name: 'Produce', status: 'Tight', detail: 'Salad kits running low', tone: 'risk' },
      { name: 'Pickup Desk', status: 'Busy', detail: '7 orders queued for 18:00 - 19:00', tone: 'watch' }
    ]
  },
  {
    id: 'lunchbox-refill',
    name: 'Lunchbox Refill',
    shopper: 'Andre, topping up family staples for tomorrow',
    urgency: 'Tomorrow morning',
    basketValue: '$31',
    pickupWindow: '20:00 - 20:30',
    headline: 'Refill lunchbox staples before the after-school rush empties the shelf.',
    objective: 'Protect staple availability, build a quick basket, and recommend low-friction substitutions.',
    basket: [
      { item: 'Whole grain bread', qty: '2', area: 'Bakery', status: 'Ready' },
      { item: 'Yogurt pouches', qty: '1 pack', area: 'Dairy', status: 'Ready' },
      { item: 'Sliced turkey', qty: '1', area: 'Deli', status: 'Low stock' },
      { item: 'Apple snack bags', qty: '1', area: 'Produce', status: 'Ready' }
    ],
    zones: [
      { name: 'Bakery', status: 'On pace', detail: 'Bread replenished this hour', tone: 'good' },
      { name: 'Dairy', status: 'On pace', detail: 'Yogurt promo active', tone: 'good' },
      { name: 'Deli', status: 'Tight', detail: 'Turkey pack count below forecast', tone: 'risk' },
      { name: 'Pickup Desk', status: 'Open', detail: 'Capacity available after 20:00', tone: 'good' }
    ]
  },
  {
    id: 'weekend-stock-up',
    name: 'Weekend Stock-Up',
    shopper: 'Leah, planning a larger basket for the household',
    urgency: 'Saturday prep',
    basketValue: '$118',
    pickupWindow: '09:00 - 09:30',
    headline: 'Keep a high-value basket flowing even when the morning store fills up fast.',
    objective: 'Balance a larger basket across store zones and keep the early pickup promise.',
    basket: [
      { item: 'Family fruit box', qty: '1', area: 'Produce', status: 'Ready' },
      { item: 'Chicken thighs', qty: '2 packs', area: 'Meat', status: 'Ready' },
      { item: 'Paper towels', qty: '1', area: 'Home', status: 'Ready' },
      { item: 'Laundry detergent', qty: '1', area: 'Home', status: 'Ready' }
    ],
    zones: [
      { name: 'Produce', status: 'Busy', detail: 'Morning volume forecast above normal', tone: 'watch' },
      { name: 'Meat', status: 'On pace', detail: 'Prep completed ahead of demand', tone: 'good' },
      { name: 'Home', status: 'On pace', detail: 'Bulk staples well stocked', tone: 'good' },
      { name: 'Pickup Desk', status: 'Tight', detail: 'Early slots nearly full', tone: 'risk' }
    ]
  }
];

const missionMap = Object.fromEntries(customerMissions.map((mission) => [mission.id, mission]));

const defaultMetrics = [
  { label: 'Open baskets', value: '148', delta: '+12 vs last hour' },
  { label: 'Dinner conversion', value: '6.8%', delta: '+0.9 pts after bundle offers' },
  { label: 'Pickup wait', value: '11 min', delta: 'Holding under 15 min target' },
  { label: 'Fresh fill rate', value: '93%', delta: 'Produce is the main watch zone' }
];

const defaultItinerary = [
  { step: 'Pick items', owner: 'Store team', status: 'Waiting' },
  { step: 'Confirm substitutions', owner: 'Retail agent', status: 'Waiting' },
  { step: 'Reserve slot', owner: 'Pickup desk', status: 'Waiting' },
  { step: 'Notify shopper', owner: 'CRM journey', status: 'Waiting' }
];

const state = {
  selectedMissionId: customerMissions[0].id,
  highlightedZones: [],
  metrics: defaultMetrics,
  basket: customerMissions[0].basket,
  zones: customerMissions[0].zones,
  itinerary: defaultItinerary,
  timeline: [],
  awaitingApproval: false,
  proposalText: null,
  agentStatus: 'idle'
};

const app = document.querySelector('#app');
let debugMode = false;

function getSelectedMission() {
  return missionMap[state.selectedMissionId] ?? customerMissions[0];
}

function render() {
  const mission = getSelectedMission();

  app.innerHTML = `
    <main class="retail-app">
      <section class="hero">
        <div>
          <p class="eyebrow">Agent-first retail</p>
          <h1>Daily shopping help that feels familiar to anyone.</h1>
          <p class="hero-copy">${mission.headline}</p>
        </div>
        <div class="hero-card">
          <div class="hero-card-label">Current mission</div>
          <div class="hero-card-title">${mission.name}</div>
          <div class="hero-card-copy">${mission.shopper}</div>
          <div class="hero-meta">
            <span>${mission.urgency}</span>
            <span>${mission.basketValue}</span>
            <span>${mission.pickupWindow}</span>
          </div>
        </div>
      </section>

      <section class="panel timeline-hero">
        <div class="panel-heading">
          <div>
            <p class="panel-kicker">Observable agent work</p>
            <h2>Activity timeline</h2>
          </div>
          <button id="debugBtn" class="ghost-button">${debugMode ? 'Hide debug' : 'Show debug'}</button>
        </div>
        <div class="timeline compact">
          ${state.timeline.length ? state.timeline.map((evt) => `
            <div class="event">
              <small>#${evt.seq} · ${evt.kind.toUpperCase()}</small>
              ${toReadableEvent(evt)}
            </div>
          `).join('') : '<div class="event quiet"><p>Select a shopping mission and run the retail assist flow to narrate the story live.</p></div>'}
        </div>
        ${state.awaitingApproval && state.proposalText ? `
          <div class="approval-card">
            <div class="approval-label">Human approval</div>
            <p>${state.proposalText}</p>
            <div class="approval-actions">
              <button data-action="approve">Approve</button>
              <button data-action="reject" class="ghost-button">Reject</button>
              <button data-action="modify" class="ghost-button">Modify scope</button>
            </div>
          </div>
        ` : ''}
        ${debugMode ? `<pre class="debug">${JSON.stringify(state.timeline, null, 2)}</pre>` : ''}
      </section>

      <section class="grid simplified-grid">
        <article class="panel missions-panel">
          <div class="panel-heading">
            <div>
              <p class="panel-kicker">Choose the daily moment</p>
              <h2>Household missions</h2>
            </div>
            <button id="runAgentBtn">Run retail assist</button>
          </div>
          <div class="missions-list">
            ${customerMissions.map((missionOption) => `
              <button class="mission-card ${state.selectedMissionId === missionOption.id ? 'selected' : ''}" data-mission="${missionOption.id}">
                <span class="mission-title">${missionOption.name}</span>
                <span class="mission-copy">${missionOption.shopper}</span>
                <span class="mission-meta">${missionOption.urgency}</span>
              </button>
            `).join('')}
          </div>
          <div class="objective-card">
            <div class="objective-label">Agent objective</div>
            <p>${mission.objective}</p>
          </div>
        </article>

        <article class="panel basket-panel">
          <div class="panel-heading">
            <div>
              <p class="panel-kicker">Customer-facing outcome</p>
              <h2>Basket and store focus</h2>
            </div>
            <span class="badge">${mission.basketValue}</span>
          </div>
          <table class="basket-table">
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Area</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${state.basket.map((item) => `
                <tr class="${item.status === 'Substitute suggested' || item.status === 'Low stock' ? 'row-flagged' : ''}">
                  <td>${item.item}</td>
                  <td>${item.qty}</td>
                  <td>${item.area}</td>
                  <td>${item.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="zone-list concise-zones">
            ${state.zones.map((zone) => `
              <div class="zone-card ${state.highlightedZones.includes(zone.name) ? 'highlighted' : ''}">
                <div class="zone-topline">
                  <strong>${zone.name}</strong>
                  <span class="tone ${zone.tone}">${zone.status}</span>
                </div>
                <p>${zone.detail}</p>
              </div>
            `).join('')}
          </div>
        </article>
      </section>
    </main>
  `;

  wireUi();
}

function toReadableEvent(evt) {
  if (evt.kind === 'ag-ui') {
    switch (evt.type) {
      case 'intent.received':
        return `<p>Intent received for <b>${evt.payload.missionName}</b>.</p>`;
      case 'agent.plan':
        return `<p>Plan: ${evt.payload.steps.join(' -> ')}.</p>`;
      case 'tool.called':
        return `<p>Tool called: <b>${evt.payload.tool}</b>.</p>`;
      case 'state.updated':
        return `<p>State updated: <b>${evt.payload.summary ?? evt.payload.status}</b>.</p>`;
      case 'approval.requested':
        return '<p>Approval requested before customer-facing changes go live.</p>';
      case 'user.action':
        return `<p>User selected <b>${evt.payload.action}</b>.</p>`;
      case 'agent.completed':
        return `<p>${evt.payload.summary}</p>`;
      default:
        return `<p>${evt.type}</p>`;
    }
  }

  return `<p>UI mutation: <b>${evt.type}</b> on <b>${evt.target}</b>.</p>`;
}

function wireUi() {
  document.querySelectorAll('[data-mission]').forEach((button) => {
    button.addEventListener('click', () => {
      const missionId = button.dataset.mission;
      const mission = missionMap[missionId];
      if (!mission) return;

      state.selectedMissionId = missionId;
      state.highlightedZones = [];
      state.metrics = defaultMetrics;
      state.basket = mission.basket;
      state.zones = mission.zones;
      state.itinerary = defaultItinerary;
      state.timeline = [];
      state.awaitingApproval = false;
      state.proposalText = null;
      state.agentStatus = 'idle';
      render();
    });
  });

  document.getElementById('runAgentBtn')?.addEventListener('click', () => {
    fetch('/retail-demo/investigate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ missionId: state.selectedMissionId })
    });
  });

  document.getElementById('debugBtn')?.addEventListener('click', () => {
    debugMode = !debugMode;
    render();
  });

  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      fetch('/retail-demo/approval', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: button.dataset.action })
      });
    });
  });
}

function applyDataModelUpdate(msg) {
  if (msg.target === 'basket') state.basket = msg.payload.items ?? state.basket;
  if (msg.target === 'zones') {
    state.zones = msg.payload.zones ?? state.zones;
    state.highlightedZones = msg.payload.highlightedZones ?? state.highlightedZones;
  }
  if (msg.target === 'metrics') state.metrics = msg.payload.metrics ?? state.metrics;
  if (msg.target === 'itinerary') state.itinerary = msg.payload.steps ?? state.itinerary;
  render();
}

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
  const source = new EventSource('/retail-demo/events');
  source.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.kind === 'ag-ui') handleAgUiEvent(msg);
    if (msg.kind === 'a2ui') {
      state.timeline = [...state.timeline, msg];
      if (msg.type === 'surface.updateDataModel') applyDataModelUpdate(msg);
      else render();
    }
  };
}

render();
startEventStream();
