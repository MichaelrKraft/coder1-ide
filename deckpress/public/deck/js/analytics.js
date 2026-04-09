/**
 * Deckpress — analytics.js
 *
 * Privacy-preserving engagement tracking. Two signals:
 *
 *   1. Open event — fired once on page load with the `?t=` token.
 *      Appears in the founder dashboard's "Deck Opens" list.
 *
 *   2. Section time — how long each scroll section spends in viewport.
 *      Powers the per-section heatmap. Uses IntersectionObserver with
 *      threshold 0.5 (section is "active" when >=50% visible) so fast
 *      scrolls don't pollute the data with 0.1s blips.
 *
 * Reads window.__deckSessionId (set by chat.js). Waits for sections
 * to be rendered by app.js's __initDeckScene before starting the
 * observer — since sections are injected AFTER frame preload, we
 * retry-poll until they appear.
 *
 * All events are fired-and-forgotten; network errors are silent.
 * No cookies, no fingerprinting, no PII.
 */
(function () {
  'use strict';

  const CONFIG = window.DECK_CONFIG;
  if (!CONFIG || !CONFIG.features || !CONFIG.features.analytics) {
    return;
  }

  const token =
    new URLSearchParams(window.location.search).get('t') || 'direct';

  function getSessionId() {
    return window.__deckSessionId || `${token}-${Date.now().toString(36)}`;
  }

  // -----------------------------------------------------------------
  // 1. Open event — fire immediately on script load
  // -----------------------------------------------------------------
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'open', token }),
  }).catch(() => {});

  // -----------------------------------------------------------------
  // 2. Section time tracking
  // -----------------------------------------------------------------
  const MIN_SECONDS = 2; // Below this is almost certainly a fast scroll
  const enteredAt = new Map(); // sectionIndex -> timestamp

  function flushSection(index) {
    const start = enteredAt.get(index);
    if (start === undefined) return;
    enteredAt.delete(index);
    const seconds = Math.round((Date.now() - start) / 1000);
    if (seconds < MIN_SECONDS) return;

    const payload = {
      type: 'section-time',
      sessionId: getSessionId(),
      sectionIndex: index,
      seconds,
    };

    // Use sendBeacon on unload if available (fires even after tab close)
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

  // Sections are injected by app.js __initDeckScene AFTER frame preload.
  // Poll for them so we only attach the observer once they exist.
  const MAX_WAIT_MS = 60000; // give the preloader up to a minute
  const POLL_INTERVAL_MS = 500;
  let waited = 0;

  function setupObserver() {
    const sections = document.querySelectorAll('[data-section-index]');
    if (sections.length === 0) {
      if (waited >= MAX_WAIT_MS) {
        console.warn('[deckpress] analytics: no sections found after wait');
        return;
      }
      waited += POLL_INTERVAL_MS;
      setTimeout(setupObserver, POLL_INTERVAL_MS);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = entry.target;
          if (!(target instanceof HTMLElement)) continue;
          const idxStr = target.dataset.sectionIndex;
          if (idxStr === undefined) continue;
          const idx = Number(idxStr);
          if (Number.isNaN(idx)) continue;

          if (entry.isIntersecting) {
            enteredAt.set(idx, Date.now());
          } else {
            flushSection(idx);
          }
        }
      },
      { threshold: 0.5 }
    );

    sections.forEach((section) => observer.observe(section));
  }

  setupObserver();

  // Flush any still-active sections on unload
  window.addEventListener('beforeunload', () => {
    enteredAt.forEach((_, idx) => flushSection(idx));
  });

  // Also flush on tab hide — mobile browsers often don't fire beforeunload
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      enteredAt.forEach((_, idx) => flushSection(idx));
    }
  });
})();
