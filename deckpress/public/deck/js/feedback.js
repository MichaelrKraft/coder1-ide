/**
 * Deckpress — feedback.js
 *
 * End-of-deck feedback box. Hidden by default and revealed only when
 * the investor reaches the bottom of the scroll container so it feels
 * like a natural conclusion, not a blocker.
 *
 * On submit: POSTs { sessionId, message } to /api/feedback. The server
 * stores it under the global `feedback` list in KV and pings Telegram
 * so the founder sees it immediately.
 *
 * Styles live in style.css under #feedback-root and its descendants.
 */
(function () {
  'use strict';

  const CONFIG = window.DECK_CONFIG;
  if (!CONFIG || !CONFIG.features || !CONFIG.features.feedbackBox) {
    return;
  }

  const root = document.getElementById('feedback-root');
  if (!root) return;

  root.innerHTML = `
    <h3 class="feedback-title">Not the right fit right now?</h3>
    <p class="feedback-subtitle">Your feedback helps us improve.</p>
    <textarea
      id="feedback-input"
      rows="3"
      placeholder="Thanks for sending this, but we're focused on..."
      maxlength="1000"
      aria-label="Feedback message"
    ></textarea>
    <div>
      <button id="feedback-submit" type="button">Send feedback anonymously</button>
    </div>
  `;

  const input = document.getElementById('feedback-input');
  const submit = document.getElementById('feedback-submit');

  // -----------------------------------------------------------------
  // Reveal once the investor reaches the bottom of the scroll container
  // -----------------------------------------------------------------
  const scrollContainer = document.getElementById('scroll-container');
  let revealed = false;

  function checkReveal() {
    if (revealed) return;
    if (!scrollContainer) {
      root.classList.add('visible');
      revealed = true;
      return;
    }
    const rect = scrollContainer.getBoundingClientRect();
    // Reveal when the bottom of the scroll container is within 200px
    // below the viewport bottom (i.e. investor is at the end).
    if (rect.bottom <= window.innerHeight + 200) {
      root.classList.add('visible');
      revealed = true;
      window.removeEventListener('scroll', checkReveal);
    }
  }

  // Use passive listener — we only read scroll position, never block it
  window.addEventListener('scroll', checkReveal, { passive: true });
  // Also check on resize in case the container geometry changes
  window.addEventListener('resize', checkReveal, { passive: true });
  // Initial check for short pages where the bottom is already in view
  setTimeout(checkReveal, 500);

  // -----------------------------------------------------------------
  // Submit handler
  // -----------------------------------------------------------------
  let submitting = false;

  submit.addEventListener('click', async () => {
    if (submitting) return;
    const message = input.value.trim();
    if (!message) {
      input.focus();
      return;
    }

    submitting = true;
    submit.disabled = true;
    submit.textContent = 'Sending...';

    const sessionId = window.__deckSessionId || 'direct';

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message }),
      });
      if (!res.ok) throw new Error('Server rejected feedback');

      // Replace the form with a thank-you note
      root.innerHTML = `
        <p class="feedback-thanks">Thank you for the feedback &mdash; it genuinely helps.</p>
      `;
    } catch {
      submit.disabled = false;
      submit.textContent = 'Send feedback anonymously';
      submitting = false;

      // Surface a lightweight error inline
      const existing = document.getElementById('feedback-error');
      if (!existing) {
        const err = document.createElement('p');
        err.id = 'feedback-error';
        err.style.cssText = 'color:#f87171;font-size:0.75rem;margin-top:0.5rem;';
        err.textContent = 'Could not send feedback. Please try again.';
        submit.insertAdjacentElement('afterend', err);
      }
    }
  });
})();
