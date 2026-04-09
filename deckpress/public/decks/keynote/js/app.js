/**
 * Deckpress — Keynote template app.js
 *
 * Full-viewport slide deck. Opposite delivery from the cinematic
 * scroll template: one concept per slide, keyboard-driven navigation,
 * thumbnail grid overview.
 *
 * Consumes window.DECK_CONFIG (loaded from ./config.js). Content is
 * identical to the cinematic template — only the rendering differs.
 *
 * Responsibilities:
 *   - Build the slide DOM from CONFIG.sections (+ a hero slide at index 0)
 *   - Manage the active slide index as state
 *   - Key bindings: arrows, space, home/end, esc (grid), f (fullscreen)
 *   - Click handlers: prev/next nav buttons, dots, thumbnails
 *   - Counter animations on stats slides (when that slide becomes active)
 *   - Emits `deckpress:slide-change` custom event for analytics.js +
 *     feedback.js to listen to
 */
(function () {
  'use strict';

  const CONFIG = window.DECK_CONFIG;
  if (!CONFIG) {
    console.error('[deckpress] DECK_CONFIG not loaded');
    return;
  }

  // -----------------------------------------------------------------
  // Build the slide list
  // -----------------------------------------------------------------
  // The keynote template prepends a standalone HERO slide before the
  // content sections. Total = 1 hero + N sections.

  const HERO_SLIDE = {
    id: 'hero',
    label: 'Cover',
    kind: 'hero',
    heading: CONFIG.company,
    body: CONFIG.tagline,
  };

  /**
   * @typedef {Object} Slide
   * @property {string} id
   * @property {string} label
   * @property {'hero'|'content'|'stats'|'ask'} kind
   * @property {string} heading
   * @property {string} body
   * @property {Array<{value:number,suffix?:string,label:string,decimals:number}>} [stats]
   * @property {{label:string, action:string}} [cta]
   */
  /** @type {Slide[]} */
  const slides = [
    HERO_SLIDE,
    ...CONFIG.sections.map((s) => ({
      id: s.id,
      label: s.label,
      kind: Array.isArray(s.stats) && s.stats.length > 0
        ? 'stats'
        : s.id === 'ask'
        ? 'ask'
        : 'content',
      heading: s.heading,
      body: s.body,
      stats: s.stats,
      cta: s.cta,
    })),
  ];

  const TOTAL = slides.length;

  // -----------------------------------------------------------------
  // DOM references
  // -----------------------------------------------------------------
  const slidesContainer = document.getElementById('slides-container');
  const progressNumber = document.getElementById('progress-number');
  const progressLabel = document.getElementById('progress-label');
  const progressCounter = document.getElementById('progress-counter');
  const progressDotsEl = document.getElementById('progress-dots');
  const navPrev = document.getElementById('nav-prev');
  const navNext = document.getElementById('nav-next');
  const helpHint = document.getElementById('help-hint');
  const gridOverlay = document.getElementById('grid-overlay');
  const thumbnailGrid = document.getElementById('thumbnail-grid');

  if (!slidesContainer) {
    console.error('[deckpress] #slides-container missing');
    return;
  }

  // -----------------------------------------------------------------
  // State
  // -----------------------------------------------------------------
  const state = {
    currentIndex: 0,
    previousIndex: 0,
    visited: new Set([0]),
    gridOpen: false,
  };

  // Expose state for analytics.js + feedback.js
  window.__deckpressKeynote = {
    get currentIndex() { return state.currentIndex; },
    get totalSlides() { return TOTAL; },
    get currentSlide() { return slides[state.currentIndex]; },
    goTo,
    next,
    prev,
  };

  // -----------------------------------------------------------------
  // Render: build slide elements once
  // -----------------------------------------------------------------
  function padSlideNumber(n) {
    return String(n).padStart(2, '0');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  function buildSlideHTML(slide, index) {
    const slideNumber = padSlideNumber(index + 1);

    if (slide.kind === 'hero') {
      return `
        <div class="slide-hero-inner">
          <div class="hero-brand">Deckpress &middot; Investor Deck</div>
          <h1 class="hero-company">${escapeHtml(slide.heading)}</h1>
          <p class="hero-tagline">${escapeHtml(slide.body)}</p>
          <div class="hero-founder">
            ${escapeHtml(CONFIG.founder.name)} &middot; ${escapeHtml(CONFIG.founder.title)}
          </div>
        </div>
      `;
    }

    const header = `
      <header class="slide-header">
        <span class="slide-number">${slideNumber}</span>
        <span class="slide-label">${escapeHtml(slide.label)}</span>
      </header>
    `;

    const heading = `<h2 class="slide-heading">${escapeHtml(slide.heading)}</h2>`;
    const body = slide.body ? `<p class="slide-body">${escapeHtml(slide.body)}</p>` : '';

    if (slide.kind === 'stats') {
      const stats = slide.stats
        .map(
          (s) => `
        <div class="stat">
          <div class="stat-value-row">
            <span class="stat-number" data-value="${s.value}" data-decimals="${s.decimals}">0</span>
            ${s.suffix ? `<span class="stat-suffix">${escapeHtml(s.suffix)}</span>` : ''}
          </div>
          <span class="stat-label">${escapeHtml(s.label)}</span>
        </div>
      `
        )
        .join('');
      return `
        ${header}
        ${heading}
        ${body}
        <div class="stats-grid">${stats}</div>
      `;
    }

    if (slide.kind === 'ask') {
      const ctaHtml = slide.cta
        ? `<button type="button" class="cta-button" data-action="${escapeHtml(
            slide.cta.action
          )}">${escapeHtml(slide.cta.label)}</button>`
        : '';
      return `${header}${heading}${body}${ctaHtml}`;
    }

    // Default content slide
    return `${header}${heading}${body}`;
  }

  function renderSlides() {
    slidesContainer.innerHTML = '';
    slides.forEach((slide, i) => {
      const el = document.createElement('section');
      const kindClass =
        slide.kind === 'hero'
          ? 'slide-hero'
          : slide.kind === 'stats'
          ? 'slide-stats'
          : slide.kind === 'ask'
          ? 'slide-ask'
          : 'slide-content';
      el.className = `slide ${kindClass}`;
      el.id = `slide-${slide.id}`;
      el.dataset.slideIndex = String(i);
      el.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
      el.innerHTML = buildSlideHTML(slide, i);
      slidesContainer.appendChild(el);
    });
  }

  function renderDots() {
    progressDotsEl.innerHTML = '';
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'progress-dot';
      dot.type = 'button';
      dot.setAttribute('aria-label', `Jump to slide ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      progressDotsEl.appendChild(dot);
    });
  }

  function renderThumbnailGrid() {
    thumbnailGrid.innerHTML = '';
    slides.forEach((slide, i) => {
      const btn = document.createElement('button');
      btn.className = 'thumbnail';
      btn.type = 'button';
      btn.dataset.slideIndex = String(i);
      btn.innerHTML = `
        <span class="thumbnail-number">${padSlideNumber(i + 1)}</span>
        <span class="thumbnail-heading">${escapeHtml(slide.heading)}</span>
        <span class="thumbnail-label">${escapeHtml(slide.label)}</span>
      `;
      btn.addEventListener('click', () => {
        closeGrid();
        goTo(i);
      });
      thumbnailGrid.appendChild(btn);
    });
  }

  // -----------------------------------------------------------------
  // Active slide updates — visual state + side effects
  // -----------------------------------------------------------------
  function applyActiveState() {
    const slideEls = slidesContainer.querySelectorAll('.slide');
    slideEls.forEach((el, i) => {
      el.classList.remove('active', 'prev');
      if (i === state.currentIndex) {
        el.classList.add('active');
        el.setAttribute('aria-hidden', 'false');
      } else if (i < state.currentIndex) {
        el.classList.add('prev');
        el.setAttribute('aria-hidden', 'true');
      } else {
        el.setAttribute('aria-hidden', 'true');
      }
    });

    // Progress bar
    const slide = slides[state.currentIndex];
    progressNumber.textContent = padSlideNumber(state.currentIndex + 1);
    progressLabel.textContent = slide.label || '';
    progressCounter.textContent = `${state.currentIndex + 1} / ${TOTAL}`;

    // Dots
    const dots = progressDotsEl.querySelectorAll('.progress-dot');
    dots.forEach((dot, i) => {
      dot.classList.remove('active', 'visited');
      if (i === state.currentIndex) dot.classList.add('active');
      else if (state.visited.has(i)) dot.classList.add('visited');
    });

    // Thumbnail grid active state
    const thumbs = thumbnailGrid.querySelectorAll('.thumbnail');
    thumbs.forEach((t, i) => {
      t.classList.toggle('active', i === state.currentIndex);
    });

    // Prev/next button enabled state
    navPrev.disabled = state.currentIndex === 0;
    navNext.disabled = state.currentIndex === TOTAL - 1;
  }

  function fireSlideChangeEvent() {
    // Custom event for analytics.js + feedback.js to subscribe to
    const detail = {
      currentIndex: state.currentIndex,
      previousIndex: state.previousIndex,
      totalSlides: TOTAL,
      slideId: slides[state.currentIndex].id,
      slideLabel: slides[state.currentIndex].label,
      isLast: state.currentIndex === TOTAL - 1,
      isFirst: state.currentIndex === 0,
    };
    document.dispatchEvent(new CustomEvent('deckpress:slide-change', { detail }));
  }

  function runCounterAnimations() {
    // Only animate stats on the currently active slide, and only the
    // first time we visit it (don't re-run on every revisit).
    const activeEl = slidesContainer.querySelector('.slide.active');
    if (!activeEl) return;
    if (activeEl.dataset.countersPlayed === 'true') return;
    activeEl.dataset.countersPlayed = 'true';

    const numbers = activeEl.querySelectorAll('.stat-number');
    numbers.forEach((el) => {
      const target = parseFloat(el.dataset.value);
      const decimals = parseInt(el.dataset.decimals || '0', 10);
      if (Number.isNaN(target)) return;

      const duration = 1500; // ms
      const start = performance.now();
      const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

      function tick(now) {
        const elapsed = now - start;
        const t = Math.min(1, elapsed / duration);
        const eased = easeOutCubic(t);
        const value = eased * target;
        el.textContent = formatNumber(value, decimals);
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = formatNumber(target, decimals);
      }
      requestAnimationFrame(tick);
    });
  }

  function formatNumber(value, decimals) {
    if (decimals === 0) {
      return Math.round(value).toLocaleString('en-US');
    }
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  // -----------------------------------------------------------------
  // Navigation API
  // -----------------------------------------------------------------
  function goTo(index) {
    const clamped = Math.max(0, Math.min(TOTAL - 1, index));
    if (clamped === state.currentIndex) return;
    state.previousIndex = state.currentIndex;
    state.currentIndex = clamped;
    state.visited.add(clamped);
    applyActiveState();
    runCounterAnimations();
    fireSlideChangeEvent();
  }

  function next() { goTo(state.currentIndex + 1); }
  function prev() { goTo(state.currentIndex - 1); }
  function first() { goTo(0); }
  function last() { goTo(TOTAL - 1); }

  // -----------------------------------------------------------------
  // Grid overlay
  // -----------------------------------------------------------------
  function openGrid() {
    state.gridOpen = true;
    gridOverlay.classList.add('visible');
    gridOverlay.setAttribute('aria-hidden', 'false');
  }
  function closeGrid() {
    state.gridOpen = false;
    gridOverlay.classList.remove('visible');
    gridOverlay.setAttribute('aria-hidden', 'true');
  }

  // -----------------------------------------------------------------
  // Fullscreen
  // -----------------------------------------------------------------
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  // -----------------------------------------------------------------
  // Key bindings
  // -----------------------------------------------------------------
  function handleKeyDown(event) {
    // Ignore keys when focus is inside an input / textarea (e.g. chat)
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable)
    ) {
      if (event.key === 'Escape') target.blur(); // still allow escape to unfocus
      return;
    }

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
      case ' ':
        event.preventDefault();
        if (state.gridOpen) closeGrid();
        next();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        event.preventDefault();
        if (state.gridOpen) closeGrid();
        prev();
        break;
      case 'Home':
        event.preventDefault();
        first();
        break;
      case 'End':
        event.preventDefault();
        last();
        break;
      case 'Escape':
        event.preventDefault();
        if (state.gridOpen) closeGrid();
        else openGrid();
        break;
      case 'f':
      case 'F':
        event.preventDefault();
        toggleFullscreen();
        break;
    }
  }

  // -----------------------------------------------------------------
  // Init
  // -----------------------------------------------------------------
  function init() {
    renderSlides();
    renderDots();
    renderThumbnailGrid();
    applyActiveState();

    navPrev.addEventListener('click', prev);
    navNext.addEventListener('click', next);
    document.addEventListener('keydown', handleKeyDown);

    // Click outside grid overlay (not on a thumbnail) closes it
    gridOverlay.addEventListener('click', (e) => {
      if (e.target === gridOverlay) closeGrid();
    });

    // CTA buttons with data-action
    slidesContainer.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const trigger = target.closest('[data-action]');
      if (!trigger) return;
      const action = trigger.getAttribute('data-action');
      if (action === 'openChat' && typeof window.__deckOpenChat === 'function') {
        window.__deckOpenChat();
      }
    });

    // Help hint fades out after 6 seconds
    setTimeout(() => {
      helpHint.classList.add('hidden');
    }, 6000);

    // Fire initial slide-change so analytics picks up the first slide
    fireSlideChangeEvent();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
