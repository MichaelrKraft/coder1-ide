/**
 * Deckpress — Keynote template chat.js
 *
 * Reused logic from the cinematic template's chat widget. The only
 * template-specific nuance is CSS — the DOM structure and backend
 * contract are identical. Both templates post to /api/chat and poll
 * /api/chat/messages the same way.
 */
(function () {
  'use strict';

  const CONFIG = window.DECK_CONFIG;
  if (!CONFIG || !CONFIG.features || !CONFIG.features.chatWidget) {
    return;
  }

  // -----------------------------------------------------------------
  // Session ID — same format as cinematic template
  // -----------------------------------------------------------------
  const urlToken = new URLSearchParams(window.location.search).get('t') || 'direct';
  const SESSION_KEY = 'deckpress-session';
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    const randomPart =
      Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    sessionId = `${urlToken}-${randomPart}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  window.__deckSessionId = sessionId;

  const root = document.getElementById('chat-root');
  if (!root) return;

  const founderName = (CONFIG.founder && CONFIG.founder.name) || 'Founder';
  const initials = founderName
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  root.innerHTML = `
    <div class="chat-panel" id="chat-panel" aria-hidden="true">
      <div class="chat-header">
        <div class="chat-avatar">${escapeHtml(initials)}</div>
        <div>
          <div class="chat-founder-name">${escapeHtml(founderName)}</div>
          <div class="chat-status">&bull; online</div>
        </div>
        <button class="chat-close" id="chat-close" type="button" aria-label="Close chat">&times;</button>
      </div>
      <div class="chat-messages" id="chat-messages" aria-live="polite"></div>
      <form class="chat-form" id="chat-form" autocomplete="off">
        <input
          type="text"
          id="chat-input"
          placeholder="Ask a question..."
          aria-label="Chat message"
          maxlength="500"
        >
        <button type="submit" aria-label="Send message">&uarr;</button>
      </form>
    </div>
    <button class="chat-fab" id="chat-fab" type="button" aria-label="Chat with founder">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span class="chat-fab-dot"></span>
    </button>
  `;

  const fab = document.getElementById('chat-fab');
  const panel = document.getElementById('chat-panel');
  const closeBtn = document.getElementById('chat-close');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const messagesEl = document.getElementById('chat-messages');

  function openChat() {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    input.focus();
  }
  function closeChat() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  }

  fab.addEventListener('click', () => {
    if (panel.classList.contains('open')) closeChat();
    else openChat();
  });
  closeBtn.addEventListener('click', closeChat);

  // Expose openChat so CTA buttons (via data-action="openChat") can call it
  window.__deckOpenChat = openChat;

  // -----------------------------------------------------------------
  // Polling + rendering
  // -----------------------------------------------------------------
  let lastRenderedKey = '';

  function renderMessages(msgs) {
    const key = msgs.map((m) => `${m.role}:${m.ts}`).join('|');
    if (key === lastRenderedKey) return;
    lastRenderedKey = key;

    messagesEl.innerHTML = '';
    if (msgs.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText =
        'text-align:center;color:#64748b;font-size:0.8rem;padding:1rem 0;';
      empty.textContent = 'Ask the founder a question';
      messagesEl.appendChild(empty);
      return;
    }

    for (const msg of msgs) {
      const el = document.createElement('div');
      el.className = `chat-msg chat-msg-${
        msg.role === 'founder' ? 'founder' : 'investor'
      }`;
      el.textContent = msg.text;
      messagesEl.appendChild(el);
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function pollMessages() {
    try {
      const res = await fetch(
        `/api/chat/messages?sessionId=${encodeURIComponent(sessionId)}`
      );
      if (!res.ok) return;
      const data = await res.json();
      renderMessages(data.messages || []);
    } catch {
      /* silent */
    }
  }

  pollMessages();
  const pollTimer = setInterval(pollMessages, 2000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') pollMessages();
  });

  window.addEventListener('beforeunload', () => clearInterval(pollTimer));

  // -----------------------------------------------------------------
  // Send
  // -----------------------------------------------------------------
  let sending = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || sending) return;

    sending = true;
    input.value = '';

    const optimistic = document.createElement('div');
    optimistic.className = 'chat-msg chat-msg-investor';
    optimistic.textContent = text;
    messagesEl.appendChild(optimistic);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text }),
      });
      pollMessages();
    } catch {
      const err = document.createElement('div');
      err.className = 'chat-msg chat-msg-founder';
      err.textContent = 'Could not send message. Please try again.';
      messagesEl.appendChild(err);
    } finally {
      sending = false;
    }
  });

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
})();
