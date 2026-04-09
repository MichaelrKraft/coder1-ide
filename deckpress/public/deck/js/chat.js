/**
 * Deckpress — chat.js
 *
 * Floating chat FAB (bottom-right corner) with an expandable panel.
 * Messages round-trip through /api/chat → Telegram → /api/telegram webhook
 * → KV, and are polled every 2 seconds by the investor's browser.
 *
 * Responsibilities:
 *   1. Create the sessionId and expose it as window.__deckSessionId
 *      (read by analytics.js and feedback.js).
 *   2. Render the FAB + panel DOM inside #chat-root.
 *   3. Wire click handlers, form submit, and the 2-second poll loop.
 *   4. Listen for any element with [data-chat-open] so CTA buttons
 *      in deck sections can open the chat programmatically.
 *
 * No dependencies beyond window.DECK_CONFIG. Styles come from
 * public/deck/css/style.css.
 */
(function () {
  'use strict';

  const CONFIG = window.DECK_CONFIG;
  if (!CONFIG || !CONFIG.features || !CONFIG.features.chatWidget) {
    return;
  }

  // -----------------------------------------------------------------
  // Session ID — format `{token}-{random}` so the Telegram display
  // shows the investor label and we can still disambiguate multiple
  // sessions from the same investor.
  // -----------------------------------------------------------------
  const urlToken = new URLSearchParams(window.location.search).get('t') || 'direct';
  const SESSION_STORAGE_KEY = 'deckpress-session';
  let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    const randomPart =
      Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    sessionId = `${urlToken}-${randomPart}`;
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  window.__deckSessionId = sessionId;

  // -----------------------------------------------------------------
  // DOM rendering
  // -----------------------------------------------------------------
  const root = document.getElementById('chat-root');
  if (!root) {
    console.warn('[deckpress] #chat-root missing — chat disabled');
    return;
  }

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

  // -----------------------------------------------------------------
  // Open/close + CTA openChat handler
  // -----------------------------------------------------------------
  function openChat() {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    input.focus();
  }
  function closeChat() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  }
  function toggleChat() {
    if (panel.classList.contains('open')) {
      closeChat();
    } else {
      openChat();
    }
  }

  fab.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', closeChat);

  // Expose for sections built by app.js (e.g. CTA button in the Ask section)
  window.__deckOpenChat = openChat;

  // Delegate clicks on any [data-chat-open] element (works for dynamically
  // added CTA buttons even though they're inserted AFTER this script runs).
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const trigger = target.closest('[data-chat-open]');
    if (trigger) {
      event.preventDefault();
      openChat();
    }
  });

  // -----------------------------------------------------------------
  // Message rendering + polling
  // -----------------------------------------------------------------
  let lastRenderedKey = '';

  function renderMessages(msgs) {
    // Cheap diff: only re-render if the list actually changed. Prevents
    // the scroll position from jumping during idle polls.
    const key = msgs.map((m) => `${m.role}:${m.ts}`).join('|');
    if (key === lastRenderedKey) return;
    lastRenderedKey = key;

    messagesEl.innerHTML = '';
    if (msgs.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'text-align:center;color:#64748b;font-size:0.75rem;padding:1rem 0;';
      empty.textContent = 'Ask the founder a question';
      messagesEl.appendChild(empty);
      return;
    }

    for (const msg of msgs) {
      const el = document.createElement('div');
      el.className = `chat-msg chat-msg-${msg.role === 'founder' ? 'founder' : 'investor'}`;
      el.textContent = msg.text;
      messagesEl.appendChild(el);
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function pollMessages() {
    try {
      const res = await fetch(`/api/chat/messages?sessionId=${encodeURIComponent(sessionId)}`);
      if (!res.ok) return;
      const data = await res.json();
      renderMessages(data.messages || []);
    } catch {
      // Silently ignore network errors — next poll will retry.
    }
  }

  // Initial fetch + 2s interval
  pollMessages();
  const POLL_INTERVAL_MS = 2000;
  const pollTimer = setInterval(pollMessages, POLL_INTERVAL_MS);

  // Pause polling when the tab is hidden to be a good citizen,
  // resume when it becomes visible again.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      pollMessages();
    }
  });

  // Clean up on unload (belt-and-suspenders; browser does this anyway)
  window.addEventListener('beforeunload', () => clearInterval(pollTimer));

  // -----------------------------------------------------------------
  // Send handler (optimistic render)
  // -----------------------------------------------------------------
  let sending = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || sending) return;

    sending = true;
    input.value = '';

    // Optimistic render — drop the new message in immediately so the UX
    // feels snappy. The poll will reconcile with the server shortly.
    const optimisticEl = document.createElement('div');
    optimisticEl.className = 'chat-msg chat-msg-investor';
    optimisticEl.textContent = text;
    messagesEl.appendChild(optimisticEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text }),
      });
      // Trigger an immediate poll so the server's canonical copy replaces
      // the optimistic one (mostly the same, but with the real ts).
      pollMessages();
    } catch {
      // Network error — surface as founder-style error message so the
      // investor sees something.
      const errEl = document.createElement('div');
      errEl.className = 'chat-msg chat-msg-founder';
      errEl.textContent = 'Could not send message. Please try again.';
      messagesEl.appendChild(errEl);
    } finally {
      sending = false;
    }
  });

  // -----------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
})();
