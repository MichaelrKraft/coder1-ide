/**
 * Deckpress — Narrated template app.js
 *
 * Video-synced pitch deck. The founder's cutout narration is the primary
 * experience. Slides auto-advance as the founder speaks, driven by cue
 * points defined in DECK_CONFIG.cuePoints[]. Manual navigation (arrows,
 * dots, timeline clicks) still works and seeks the video to match.
 *
 * Responsibilities:
 *   - Build slides from CONFIG.sections (reuses keynote pattern)
 *   - Initialize the PIP video (WebM + MP4 fallback, draggable, minimize)
 *   - Cue sync engine: video.timeupdate → find active cue → switch slide
 *   - Timeline bar: progress, cue markers, play/pause
 *   - Manual navigation: arrows seek video, dots jump to cues
 *   - Counter animations on stats slides
 *   - Emit deckpress:slide-change for analytics + feedback
 */
(function () {
  'use strict';

  const CONFIG = window.DECK_CONFIG;
  if (!CONFIG) {
    console.error('[deckpress] DECK_CONFIG not loaded');
    return;
  }

  const cuePoints = CONFIG.cuePoints || [];
  if (cuePoints.length === 0) {
    console.warn('[deckpress] No cuePoints defined — narrated template needs them');
  }

  // -----------------------------------------------------------------
  // Slide data model (hero + sections, same as keynote)
  // -----------------------------------------------------------------
  const HERO_SLIDE = {
    id: 'hero',
    label: 'Cover',
    kind: 'hero',
    heading: CONFIG.company,
    body: CONFIG.tagline,
  };

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
  const pipContainer = document.getElementById('pip-video');
  const video = document.getElementById('narration-video');
  const webmSource = document.getElementById('narration-source-webm');
  const mp4Source = document.getElementById('narration-source-mp4');
  const pipPlayOverlay = document.getElementById('pip-play-overlay');
  const pipPauseBtn = document.getElementById('pip-pause');
  const pipMinimizeBtn = document.getElementById('pip-minimize');
  const pipMinimizedBtn = document.getElementById('pip-minimized');
  const pipControls = document.getElementById('pip-controls');
  const timelinePlayBtn = document.getElementById('timeline-play');
  const timelineTrack = document.getElementById('timeline-track');
  const timelineProgress = document.getElementById('timeline-progress');
  const timelineTime = document.getElementById('timeline-time');
  const timelineDots = document.getElementById('timeline-dots');

  // -----------------------------------------------------------------
  // State
  // -----------------------------------------------------------------
  const state = {
    currentSlideId: '',
    currentSlideIndex: -1,
    previousSlideIndex: -1,
    isPlaying: false,
    videoReady: false,
    pipMinimized: false,
    visited: new Set(),
  };

  // Expose for analytics + feedback
  window.__deckpressNarrated = {
    get currentIndex() { return state.currentSlideIndex; },
    get totalSlides() { return TOTAL; },
    goToSlide,
  };

  // -----------------------------------------------------------------
  // Slide rendering (reuses keynote patterns)
  // -----------------------------------------------------------------
  function pad(n) { return String(n).padStart(2, '0'); }
  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
  }

  function buildSlideHTML(slide, index) {
    const num = pad(index + 1);

    if (slide.kind === 'hero') {
      return `
        <div class="slide-hero-inner">
          <div class="hero-brand">Deckpress &middot; Narrated Pitch</div>
          <h1 class="hero-company">${escapeHtml(slide.heading)}</h1>
          <p class="hero-tagline">${escapeHtml(slide.body)}</p>
          <div class="hero-founder">${escapeHtml(CONFIG.founder.name)} &middot; ${escapeHtml(CONFIG.founder.title)}</div>
        </div>
      `;
    }

    const header = `<header class="slide-header"><span class="slide-number">${num}</span><span class="slide-label">${escapeHtml(slide.label)}</span></header>`;
    const heading = `<h2 class="slide-heading">${escapeHtml(slide.heading)}</h2>`;
    const body = slide.body ? `<p class="slide-body">${escapeHtml(slide.body)}</p>` : '';

    if (slide.kind === 'stats') {
      const statsHTML = slide.stats.map((s) => `
        <div class="stat">
          <div class="stat-value-row">
            <span class="stat-number" data-value="${s.value}" data-decimals="${s.decimals}">0</span>
            ${s.suffix ? `<span class="stat-suffix">${escapeHtml(s.suffix)}</span>` : ''}
          </div>
          <span class="stat-label">${escapeHtml(s.label)}</span>
        </div>
      `).join('');
      return `${header}${heading}${body}<div class="stats-grid">${statsHTML}</div>`;
    }

    if (slide.kind === 'ask') {
      const ctaHTML = slide.cta
        ? `<button type="button" class="cta-button" data-action="${escapeHtml(slide.cta.action)}">${escapeHtml(slide.cta.label)}</button>`
        : '';
      return `${header}${heading}${body}${ctaHTML}`;
    }

    return `${header}${heading}${body}`;
  }

  function renderSlides() {
    slidesContainer.innerHTML = '';
    slides.forEach((slide, i) => {
      const el = document.createElement('section');
      const kindClass = slide.kind === 'hero' ? 'slide-hero'
        : slide.kind === 'stats' ? 'slide-stats'
        : slide.kind === 'ask' ? 'slide-ask'
        : 'slide-content';
      el.className = `slide ${kindClass}`;
      el.id = `slide-${slide.id}`;
      el.dataset.slideIndex = String(i);
      el.innerHTML = buildSlideHTML(slide, i);
      slidesContainer.appendChild(el);
    });
  }

  function renderTimelineDots() {
    timelineDots.innerHTML = '';
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'timeline-dot';
      dot.type = 'button';
      dot.setAttribute('aria-label', `Slide ${i + 1}`);
      dot.addEventListener('click', () => goToSlideByIndex(i));
      timelineDots.appendChild(dot);
    });
  }

  function renderCueMarkers() {
    // Remove old markers
    timelineTrack.querySelectorAll('.cue-marker').forEach((m) => m.remove());

    if (!video || !video.duration || !isFinite(video.duration)) return;
    const duration = video.duration;

    cuePoints.forEach((cue) => {
      const pct = (cue.time / duration) * 100;
      const marker = document.createElement('button');
      marker.className = 'cue-marker';
      marker.type = 'button';
      marker.style.left = pct + '%';
      marker.setAttribute('aria-label', `Jump to ${cue.slideId}`);

      const label = document.createElement('span');
      label.className = 'cue-marker-label';
      const slide = slides.find((s) => s.id === cue.slideId);
      label.textContent = slide ? slide.label || slide.id : cue.slideId;
      marker.appendChild(label);

      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        goToSlide(cue.slideId);
      });

      timelineTrack.appendChild(marker);
    });
  }

  // -----------------------------------------------------------------
  // Slide switching (crossfade)
  // -----------------------------------------------------------------
  function switchSlide(slideId) {
    const slideIndex = slides.findIndex((s) => s.id === slideId);
    if (slideIndex < 0 || slideIndex === state.currentSlideIndex) return;

    state.previousSlideIndex = state.currentSlideIndex;
    state.currentSlideIndex = slideIndex;
    state.currentSlideId = slideId;
    state.visited.add(slideIndex);

    // DOM update
    const els = slidesContainer.querySelectorAll('.slide');
    els.forEach((el, i) => {
      el.classList.toggle('active', i === slideIndex);
    });

    // Timeline dots
    const dots = timelineDots.querySelectorAll('.timeline-dot');
    dots.forEach((d, i) => {
      d.classList.toggle('active', i === slideIndex);
    });

    // Cue markers
    timelineTrack.querySelectorAll('.cue-marker').forEach((m) => m.classList.remove('active'));
    const activeCue = cuePoints.find((c) => c.slideId === slideId);
    if (activeCue && video.duration) {
      const pct = (activeCue.time / video.duration) * 100;
      timelineTrack.querySelectorAll('.cue-marker').forEach((m) => {
        if (Math.abs(parseFloat(m.style.left) - pct) < 0.5) {
          m.classList.add('active');
        }
      });
    }

    // Counter animations (first visit only)
    runCounters(slideIndex);

    // Fire event for analytics + feedback
    document.dispatchEvent(new CustomEvent('deckpress:slide-change', {
      detail: {
        currentIndex: slideIndex,
        previousIndex: state.previousSlideIndex,
        totalSlides: TOTAL,
        slideId,
        slideLabel: slides[slideIndex].label,
        isLast: slideIndex === TOTAL - 1,
        isFirst: slideIndex === 0,
      },
    }));
  }

  // -----------------------------------------------------------------
  // Counter animations (reuse keynote easeOutCubic pattern)
  // -----------------------------------------------------------------
  function runCounters(slideIndex) {
    const slideEl = slidesContainer.querySelector(`[data-slide-index="${slideIndex}"]`);
    if (!slideEl || slideEl.dataset.countersPlayed === 'true') return;
    slideEl.dataset.countersPlayed = 'true';

    slideEl.querySelectorAll('.stat-number').forEach((el) => {
      const target = parseFloat(el.dataset.value);
      const decimals = parseInt(el.dataset.decimals || '0', 10);
      if (Number.isNaN(target)) return;

      const duration = 1500;
      const start = performance.now();
      const ease = (t) => 1 - Math.pow(1 - t, 3);

      function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        el.textContent = fmtNum(ease(t) * target, decimals);
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = fmtNum(target, decimals);
      }
      requestAnimationFrame(tick);
    });
  }

  function fmtNum(v, d) {
    if (d === 0) return Math.round(v).toLocaleString('en-US');
    return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  // -----------------------------------------------------------------
  // Navigation API
  // -----------------------------------------------------------------
  function goToSlide(slideId) {
    const cue = cuePoints.find((c) => c.slideId === slideId);
    if (cue && video && state.videoReady) {
      video.currentTime = cue.time;
    }
    switchSlide(slideId);
  }

  function goToSlideByIndex(index) {
    if (index < 0 || index >= TOTAL) return;
    goToSlide(slides[index].id);
  }

  function nextCue() {
    if (state.currentSlideIndex < TOTAL - 1) {
      goToSlideByIndex(state.currentSlideIndex + 1);
    }
  }

  function prevCue() {
    if (state.currentSlideIndex > 0) {
      goToSlideByIndex(state.currentSlideIndex - 1);
    }
  }

  // -----------------------------------------------------------------
  // Cue sync engine — watches video.timeupdate
  // -----------------------------------------------------------------
  function syncCues() {
    if (!video || !state.videoReady) return;
    const t = video.currentTime;
    let activeId = cuePoints.length > 0 ? cuePoints[0].slideId : slides[0].id;

    for (const cue of cuePoints) {
      if (t >= cue.time) activeId = cue.slideId;
      else break;
    }

    if (activeId !== state.currentSlideId) {
      switchSlide(activeId);
    }
  }

  // -----------------------------------------------------------------
  // Timeline progress + time display
  // -----------------------------------------------------------------
  function updateTimeline() {
    if (!video || !video.duration || !isFinite(video.duration)) return;
    const pct = (video.currentTime / video.duration) * 100;
    timelineProgress.style.width = pct + '%';
    timelineTime.textContent = `${fmtTime(video.currentTime)} / ${fmtTime(video.duration)}`;
  }

  function fmtTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  // -----------------------------------------------------------------
  // Play / pause controls
  // -----------------------------------------------------------------
  function play() {
    if (!video || !state.videoReady) return;
    video.play().catch(() => {});
    state.isPlaying = true;
    updatePlayUI();
  }

  function pause() {
    if (!video) return;
    video.pause();
    state.isPlaying = false;
    updatePlayUI();
  }

  function togglePlay() {
    if (state.isPlaying) pause();
    else play();
  }

  function updatePlayUI() {
    const PLAY = '\u25B6';
    const PAUSE = '\u275A\u275A';
    if (pipPlayOverlay) {
      pipPlayOverlay.classList.toggle('hidden', state.isPlaying);
    }
    if (pipPauseBtn) {
      pipPauseBtn.innerHTML = state.isPlaying ? PAUSE : PLAY;
      pipPauseBtn.setAttribute('aria-label', state.isPlaying ? 'Pause' : 'Play');
    }
    if (timelinePlayBtn) {
      timelinePlayBtn.innerHTML = state.isPlaying ? PAUSE : PLAY;
      timelinePlayBtn.classList.toggle('playing', state.isPlaying);
      timelinePlayBtn.setAttribute('aria-label', state.isPlaying ? 'Pause' : 'Play');
    }
  }

  // -----------------------------------------------------------------
  // PIP — drag + minimize
  // -----------------------------------------------------------------
  function initPIPDrag() {
    if (!pipContainer) return;
    let isDragging = false;
    let startMouse = { x: 0, y: 0 };
    let startPos = { x: 0, y: 0 };

    // Restore saved position
    const saved = localStorage.getItem('deckpress-pip-pos');
    if (saved) {
      try {
        const pos = JSON.parse(saved);
        pipContainer.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      } catch { /* ignore */ }
    }

    pipContainer.addEventListener('pointerdown', (e) => {
      // Don't drag when clicking buttons
      if (e.target.closest('button')) return;
      isDragging = true;
      pipContainer.classList.add('dragging');
      startMouse = { x: e.clientX, y: e.clientY };
      const current = pipContainer.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
      startPos = current ? { x: parseFloat(current[1]), y: parseFloat(current[2]) } : { x: 0, y: 0 };
      pipContainer.setPointerCapture(e.pointerId);
    });

    pipContainer.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startMouse.x;
      const dy = e.clientY - startMouse.y;
      const newX = startPos.x + dx;
      const newY = startPos.y + dy;
      pipContainer.style.transform = `translate(${newX}px, ${newY}px)`;
    });

    pipContainer.addEventListener('pointerup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      pipContainer.classList.remove('dragging');
      const match = pipContainer.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
      if (match) {
        localStorage.setItem('deckpress-pip-pos', JSON.stringify({ x: parseFloat(match[1]), y: parseFloat(match[2]) }));
      }
    });
  }

  function minimizePIP() {
    state.pipMinimized = true;
    pipContainer.classList.add('hidden');
    pipMinimizedBtn.classList.remove('hidden');
  }

  function expandPIP() {
    state.pipMinimized = false;
    pipContainer.classList.remove('hidden');
    pipMinimizedBtn.classList.add('hidden');
  }

  // -----------------------------------------------------------------
  // Video initialization
  // -----------------------------------------------------------------
  function initVideo() {
    if (!video || !webmSource) return;

    const narrationPath = CONFIG.narrationVideoPath || '/deck/media/founder-cutout.webm';
    const fallbackPath = CONFIG.narrationVideoFallback || '';

    webmSource.src = narrationPath;
    if (mp4Source && fallbackPath) {
      mp4Source.src = fallbackPath;
    }
    video.load();

    video.addEventListener('loadedmetadata', () => {
      state.videoReady = true;
      renderCueMarkers();
      updateTimeline();
      // Switch to the first cue's slide
      if (cuePoints.length > 0) {
        switchSlide(cuePoints[0].slideId);
      }
    });

    video.addEventListener('timeupdate', () => {
      syncCues();
      updateTimeline();
    });

    video.addEventListener('play', () => {
      state.isPlaying = true;
      updatePlayUI();
    });

    video.addEventListener('pause', () => {
      state.isPlaying = false;
      updatePlayUI();
    });

    video.addEventListener('ended', () => {
      state.isPlaying = false;
      updatePlayUI();
    });

    // Error fallback: if video can't load, hide PIP and run in
    // keynote-style manual mode (arrows work, no video sync).
    const handleVideoError = () => {
      console.warn('[deckpress] Narration video not available — running in manual mode');
      pipContainer.classList.add('hidden');
      pipMinimizedBtn.classList.add('hidden');
      state.videoReady = false;
      // Show first slide
      if (slides.length > 0) switchSlide(slides[0].id);
    };
    video.addEventListener('error', handleVideoError);
    if (webmSource) webmSource.addEventListener('error', () => {
      // WebM failed — if there's an MP4 fallback, wait for it. Otherwise fail.
      if (!mp4Source || !mp4Source.src) handleVideoError();
    });
    if (mp4Source) mp4Source.addEventListener('error', handleVideoError);
  }

  // -----------------------------------------------------------------
  // Key bindings
  // -----------------------------------------------------------------
  function handleKeyDown(e) {
    const t = e.target;
    if (t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON' || t.isContentEditable)) {
      return;
    }

    switch (e.key) {
      case ' ':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        nextCue();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        prevCue();
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        if (state.pipMinimized) expandPIP();
        else minimizePIP();
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
        else document.exitFullscreen?.().catch(() => {});
        break;
    }
  }

  // -----------------------------------------------------------------
  // Timeline click-to-seek
  // -----------------------------------------------------------------
  function initTimelineClick() {
    if (!timelineTrack || !video) return;
    timelineTrack.addEventListener('click', (e) => {
      if (e.target.closest('.cue-marker')) return; // markers handle their own clicks
      if (!state.videoReady || !video.duration) return;
      const rect = timelineTrack.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      video.currentTime = pct * video.duration;
      syncCues();
    });
  }

  // -----------------------------------------------------------------
  // Init
  // -----------------------------------------------------------------
  function init() {
    renderSlides();
    renderTimelineDots();
    initVideo();
    initPIPDrag();
    initTimelineClick();

    // Founder initials for minimized PIP
    const initials = (CONFIG.founder?.name || 'F')
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
    if (pipMinimizedBtn) pipMinimizedBtn.textContent = initials;

    // Wire up controls
    if (pipPlayOverlay) pipPlayOverlay.addEventListener('click', play);
    if (pipPauseBtn) pipPauseBtn.addEventListener('click', togglePlay);
    if (pipMinimizeBtn) pipMinimizeBtn.addEventListener('click', minimizePIP);
    if (pipMinimizedBtn) pipMinimizedBtn.addEventListener('click', expandPIP);
    if (timelinePlayBtn) timelinePlayBtn.addEventListener('click', togglePlay);

    document.addEventListener('keydown', handleKeyDown);

    // CTA buttons (data-action="openChat")
    slidesContainer.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-action]');
      if (!trigger) return;
      if (trigger.getAttribute('data-action') === 'openChat' && typeof window.__deckOpenChat === 'function') {
        window.__deckOpenChat();
      }
    });

    // Show first slide immediately (before video loads)
    if (slides.length > 0) {
      switchSlide(slides[0].id);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
