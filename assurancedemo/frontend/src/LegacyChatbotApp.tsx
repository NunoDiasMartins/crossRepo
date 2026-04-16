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
      linkHref: '#kpi-list'
    };
  }

  if (normalized.includes('topology')) {
    return {
      sender: 'bot',
      text: 'For topology analysis, open the Topology View page.',
      linkLabel: 'Go to Topology View',
      linkHref: '#topology-view'
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
          <h2>Legacy Assistant</h2>
          <p>
            This page mocks the old approach. It does not compose UI surfaces.
            It only returns links for KPI List or Topology View.
          </p>
          <ul>
            <li>Try: “KPI analysis”</li>
            <li>Try: “Show topology”</li>
          </ul>
          <div className="legacy-catalog">
            <article id="kpi-list" className="legacy-card">
              <h3>KPI List</h3>
              <p>Static legacy destination. In old mode, chatbot sends users here for KPI analysis.</p>
            </article>
            <article id="topology-view" className="legacy-card">
              <h3>Topology View</h3>
              <p>Static legacy destination. In old mode, chatbot sends users here for topology requests.</p>
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
