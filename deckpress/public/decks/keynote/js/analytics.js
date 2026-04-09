/**
 * Deckpress — Keynote template analytics.js
 *
 * Same API contract as the cinematic template (same /api/analytics
 * route, same event shapes), so the founder dashboard sees opens and
 * section-time events regardless of which template the investor used.
 *
 * Differences from the cinematic version:
 *   - No IntersectionObserver (there's no scroll)
 *   - Listens for the `deckpress:slide-change` custom event fired by
 *     app.js and tracks time-per-slide via entered/leave timestamps
 *   - Flushes the current slide on visibilitychange + beforeunload
 */
(function () {
  'use strict';

  const CONFIG = window.DECK_CONFIG;
  if (!CONFIG || !CONFIG.features || !CONFIG.features.analytics) return;

  const token = new URLSearchParams(window.location.search).get('t') || 'direct';

  function getSessionId() {
    return window.__deckSessionId || `${token}-${Date.now().toString(36)}`;
  }

  // -----------------------------------------------------------------
  // 1. Open event
  // -----------------------------------------------------------------
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'open', token }),
  }).catch(() => {});

  // -----------------------------------------------------------------
  // 2. Per-slide time tracking via deckpress:slide-change event
  // -----------------------------------------------------------------
  const MIN_SECONDS = 2;
  let currentSlideIndex = -1;
  let enteredAt = 0;

  function flushCurrentSlide() {
    if (currentSlideIndex < 0 || enteredAt === 0) return;
    const seconds = Math.round((Date.now() - enteredAt) / 1000);
    const index = currentSlideIndex;
    currentSlideIndex = -1;
    enteredAt = 0;
    if (seconds < MIN_SECONDS) return;

    const payload = {
      type: 'section-time',
      sessionId: getSessionId(),
      sectionIndex: index,
      seconds,
    };

    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics', blob);
    } else {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }
  }

  document.addEventListener('deckpress:slide-change', (event) => {
    const detail = event.detail;
    if (!detail) return;

    // Flush the previous slide before tracking the new one
    flushCurrentSlide();

    currentSlideIndex = detail.currentIndex;
    enteredAt = Date.now();
  });

  window.addEventListener('beforeunload', flushCurrentSlide);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushCurrentSlide();
  });
})();
