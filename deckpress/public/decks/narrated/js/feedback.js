/**
 * Deckpress — Keynote template feedback.js
 *
 * Centered modal that only appears on the final slide (the Ask).
 * Listens for `deckpress:slide-change` events from app.js and toggles
 * visibility based on whether the active slide is the last one.
 *
 * Uses the same POST /api/feedback backend as the cinematic template.
 */
(function () {
  'use strict';

  const CONFIG = window.DECK_CONFIG;
  if (!CONFIG || !CONFIG.features || !CONFIG.features.feedbackBox) return;

  const root = document.getElementById('feedback-root');
  if (!root) return;

  root.innerHTML = `
    <button class="feedback-close" id="feedback-close" type="button" aria-label="Close feedback">&times;</button>
    <h3 class="feedback-title">Not the right fit right now?</h3>
    <p class="feedback-subtitle">Your feedback helps us improve.</p>
    <textarea
      id="feedback-input"
      rows="4"
      placeholder="Thanks for sending this, but we're focused on..."
      maxlength="1000"
      aria-label="Feedback message"
    ></textarea>
    <div>
      <button id="feedback-submit" type="button">Send feedback anonymously</button>
    </div>
  `;

  const closeBtn = document.getElementById('feedback-close');
  const input = document.getElementById('feedback-input');
  const submit = document.getElementById('feedback-submit');

  // -----------------------------------------------------------------
  // Show / hide based on the active slide
  // -----------------------------------------------------------------
  let revealed = false;

  function showFeedback() {
    root.classList.add('visible');
  }
  function hideFeedback() {
    root.classList.remove('visible');
  }

  closeBtn.addEventListener('click', hideFeedback);

  document.addEventListener('deckpress:slide-change', (event) => {
    const detail = event.detail;
    if (!detail) return;
    if (detail.isLast && !revealed) {
      // First time we reach the final slide — reveal automatically.
      // Use a short delay so the slide transition finishes first.
      setTimeout(() => {
        if (!revealed) showFeedback();
        revealed = true;
      }, 800);
    } else if (!detail.isLast && root.classList.contains('visible')) {
      // Investor navigated away from the last slide — close the modal
      hideFeedback();
    }
  });

  // Allow the investor to press Esc to close the feedback modal
  // without triggering the grid overlay in app.js. We check if
  // feedback is visible FIRST and stop propagation.
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape' && root.classList.contains('visible')) {
        e.stopPropagation();
        hideFeedback();
      }
    },
    { capture: true }
  );

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

      root.innerHTML = `
        <button class="feedback-close" type="button" aria-label="Close">&times;</button>
        <p class="feedback-thanks">Thank you for the feedback &mdash; it genuinely helps.</p>
      `;
      root.querySelector('.feedback-close').addEventListener('click', hideFeedback);
    } catch {
      submit.disabled = false;
      submit.textContent = 'Send feedback anonymously';
      submitting = false;

      if (!document.getElementById('feedback-error')) {
        const err = document.createElement('p');
        err.id = 'feedback-error';
        err.style.cssText =
          'color:#f87171;font-size:0.8rem;margin-top:0.75rem;';
        err.textContent = 'Could not send feedback. Please try again.';
        submit.insertAdjacentElement('afterend', err);
      }
    }
  });
})();
