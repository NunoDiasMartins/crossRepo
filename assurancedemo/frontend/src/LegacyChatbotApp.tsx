import { FormEvent, useMemo, useState } from 'react';
import './legacy-styles.css';

type ChatItem = {
  id: number;
  sender: 'user' | 'bot';
  text: string;
  linkLabel?: string;
  linkHref?: string;
};

function buildReply(input: string): Omit<ChatItem, 'id'> {
  const normalized = input.trim().toLowerCase();

  if (normalized.includes('kpi')) {
    return {
      sender: 'bot',
      text: 'For KPI analysis, open the KPI List page.',
      linkLabel: 'Go to KPI List',
      linkHref: '/?page=kpis'
    };
  }

  if (normalized.includes('topology')) {
    return {
      sender: 'bot',
      text: 'For topology analysis, open the Topology View page.',
      linkLabel: 'Go to Topology View',
      linkHref: '/?page=topology'
    };
  }

  return {
    sender: 'bot',
    text: 'Legacy chatbot can only route to KPI List or Topology View.'
  };
}

export default function LegacyChatbotApp() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatItem[]>([
    {
      id: 1,
      sender: 'bot',
      text: 'Legacy chatbot ready. Ask about KPI analysis or topology.'
    }
  ]);

  const nextId = useMemo(() => messages.length + 1, [messages.length]);

  function onSubmit(evt: FormEvent) {
    evt.preventDefault();
    const value = input.trim();
    if (!value) return;

    const userMessage: ChatItem = {
      id: nextId,
      sender: 'user',
      text: value
    };

    const botPayload = buildReply(value);
    const botMessage: ChatItem = {
      ...botPayload,
      id: nextId + 1
    };

    setMessages((prev) => [...prev, userMessage, botMessage]);
    setInput('');
  }

  return (
    <div className="legacy-shell">
      <header className="legacy-header">
        <div>
          <h1>Assurance Demo — Legacy Chatbot</h1>
          <p>Old chatbot behavior: static routing only (no AG-UI / A2UI).</p>
        </div>
        <span className="legacy-badge">Legacy Mode</span>
      </header>

      <main className="legacy-main">
        <section className="legacy-panel legacy-work-panel">
          <h2>Service Assurance Dashboard</h2>
          <p>Enterprise Surveillance Slice</p>

          <div className="legacy-metrics-grid">
            <article className="legacy-metric">
              <span>SLA compliance</span>
              <strong>97.8%</strong>
            </article>
            <article className="legacy-metric">
              <span>Latency P95</span>
              <strong>148 ms</strong>
            </article>
            <article className="legacy-metric">
              <span>Active alarms</span>
              <strong>3</strong>
            </article>
            <article className="legacy-metric">
              <span>Impacted endpoints</span>
              <strong>1200</strong>
            </article>
            <article className="legacy-metric">
              <span>Service availability</span>
              <strong>99.71%</strong>
            </article>
            <article className="legacy-metric">
              <span>Major incidents (24h)</span>
              <strong>2</strong>
            </article>
            <article className="legacy-metric">
              <span>MTTR</span>
              <strong>24 min</strong>
            </article>
            <article className="legacy-metric">
              <span>SLA breach risk</span>
              <strong>1</strong>
            </article>
          </div>

          <div className="legacy-chart-grid">
            <article className="legacy-chart-card">
              <div className="legacy-chart-header">
                <h3>Availability</h3>
                <strong>99.71%</strong>
              </div>
              <div className="legacy-chart-line legacy-chart-down" />
            </article>
            <article className="legacy-chart-card">
              <div className="legacy-chart-header">
                <h3>Latency (P95)</h3>
                <strong>148 ms</strong>
              </div>
              <div className="legacy-chart-line legacy-chart-up" />
            </article>
            <article className="legacy-chart-card">
              <div className="legacy-chart-header">
                <h3>Error rate</h3>
                <strong>2.2%</strong>
              </div>
              <div className="legacy-chart-line legacy-chart-up-soft" />
            </article>
            <article className="legacy-chart-card">
              <div className="legacy-chart-header">
                <h3>Throughput</h3>
                <strong>309 Mbps</strong>
              </div>
              <div className="legacy-chart-line legacy-chart-down-hard" />
            </article>
          </div>

          <div className="legacy-catalog">
            <article id="kpi-list" className="legacy-card">
              <h3>KPI List</h3>
              <p>Legacy destination for KPI analysis requests.</p>
              <a href="/?page=kpis">Open KPI List page</a>
            </article>
            <article id="topology-view" className="legacy-card">
              <h3>Topology View</h3>
              <p>Legacy destination for topology requests.</p>
              <a href="/?page=topology">Open Topology View page</a>
            </article>
          </div>
        </section>

        <aside className="legacy-panel legacy-chat-panel">
          <h2>Chatbot</h2>
          <div className="legacy-timeline">
            {messages.map((item) => (
              <div key={item.id} className={`legacy-msg ${item.sender}`}>
                <p>{item.text}</p>
                {item.linkHref && item.linkLabel ? (
                  <a href={item.linkHref}>{item.linkLabel}</a>
                ) : null}
              </div>
            ))}
          </div>

          <form onSubmit={onSubmit} className="legacy-input-form">
            <textarea
              rows={3}
              value={input}
              onChange={(evt) => setInput(evt.target.value)}
              placeholder="Ask for KPI analysis or topology"
            />
            <button type="submit" disabled={!input.trim()}>
              Send
            </button>
          </form>
        </aside>
      </main>
    </div>
  );
}
