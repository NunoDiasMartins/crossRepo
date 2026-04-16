import { FormEvent, useMemo, useState } from 'react';
import './legacy-styles.css';

type ChatItem = {
  id: number;
  sender: 'user' | 'bot';
  text: string;
  linkLabel?: string;
  linkHref?: string;
};

const KPI_PAGE_URL = '/?view=kpis';
const TOPOLOGY_PAGE_URL = '/?view=topology';

function buildReply(input: string): Omit<ChatItem, 'id'> {
  const normalized = input.trim().toLowerCase();

  if (normalized.includes('kpi')) {
    return {
      sender: 'bot',
      text: 'For KPI analysis, open the KPI List page.',
      linkLabel: 'Go to KPI List',
      linkHref: KPI_PAGE_URL
    };
  }

  if (normalized.includes('topology')) {
    return {
      sender: 'bot',
      text: 'For topology analysis, open the Topology View page.',
      linkLabel: 'Go to Topology View',
      linkHref: TOPOLOGY_PAGE_URL
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
          <h1>Agent-First Assurance Demo</h1>
          <p>Legacy chatbot mode with the same landing layout and dedicated KPI / topology pages.</p>
        </div>
        <span className="legacy-badge">Legacy Mode</span>
      </header>

      <nav className="legacy-top-nav" aria-label="Legacy sections">
        <a className="legacy-top-nav-item active" href="/legacy-chatbot.html">
          Service Dashboard
        </a>
        <a className="legacy-top-nav-item" href={KPI_PAGE_URL} target="_blank" rel="noopener noreferrer">
          KPI List
        </a>
        <a className="legacy-top-nav-item" href={TOPOLOGY_PAGE_URL} target="_blank" rel="noopener noreferrer">
          Topology View
        </a>
      </nav>

      <main className="legacy-main">
        <section className="legacy-panel legacy-work-panel">
          <h2>Service Assurance Dashboard</h2>
          <p>
            This legacy page now mirrors the demo landing experience. Use the links below (or ask in chat) to open KPI
            and topology pages in new tabs.
          </p>
          <div className="legacy-catalog">
            <article className="legacy-card">
              <h3>KPI List</h3>
              <p>Open the full KPI page in a separate tab.</p>
              <a href={KPI_PAGE_URL} target="_blank" rel="noopener noreferrer">
                Open KPI List
              </a>
            </article>
            <article className="legacy-card">
              <h3>Topology View</h3>
              <p>Open the full topology page in a separate tab.</p>
              <a href={TOPOLOGY_PAGE_URL} target="_blank" rel="noopener noreferrer">
                Open Topology View
              </a>
            </article>
          </div>
          <ul>
            <li>Try: “KPI analysis”</li>
            <li>Try: “Show topology”</li>
          </ul>
        </section>

        <aside className="legacy-panel legacy-chat-panel">
          <h2>Chatbot</h2>
          <div className="legacy-timeline">
            {messages.map((item) => (
              <div key={item.id} className={`legacy-msg ${item.sender}`}>
                <p>{item.text}</p>
                {item.linkHref && item.linkLabel ? (
                  <a href={item.linkHref} target="_blank" rel="noopener noreferrer">
                    {item.linkLabel}
                  </a>
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
