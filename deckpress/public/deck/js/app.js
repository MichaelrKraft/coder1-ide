/**
 * Deckpress — app.js
 *
 * The cinematic layer of the deck:
 *   - Lenis smooth scroll (mandatory per the visual checklist)
 *   - Two-phase frame preloader (priority 10 frames, then background)
 *   - Canvas renderer (padded cover at IMAGE_SCALE = 0.85)
 *   - Scene initialization hook (populated in Task 10: __initDeckScene)
 *
 * This file reads window.DECK_CONFIG (loaded from /deck/js/config.js)
 * and expects Lenis, GSAP, and ScrollTrigger to be available on window.
 *
 * Exposes:
 *   window.__deckCanvas = { drawFrame, FRAME_COUNT, FRAME_SPEED, currentFrame }
 *   window.__initDeckScene  (optional hook set by Task 10)
 */
(function () {
  'use strict';

  const CONFIG = window.DECK_CONFIG;
  if (!CONFIG) {
    console.error('[deckpress] DECK_CONFIG not loaded — did build:config run?');
    return;
  }

  // -----------------------------------------------------------------
  // Constants (see the Deckpress visual checklist in the design spec)
  // -----------------------------------------------------------------
  const FRAME_COUNT = CONFIG.productDemoFrames || 0;
  const FRAME_SPEED = 2.0;  // Product animation completes by ~50-55% scroll
  const IMAGE_SCALE = 0.85; // Padded cover — leaves breathing room
  const PRIORITY_FRAMES = 10;

  // -----------------------------------------------------------------
  // Lenis smooth scroll (non-negotiable)
  // Must be installed BEFORE ScrollTrigger timelines attach so their
  // update ticker is driven by Lenis rather than native scroll events.
  // -----------------------------------------------------------------
  if (typeof Lenis === 'undefined') {
    console.error('[deckpress] Lenis not loaded');
    return;
  }
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.error('[deckpress] GSAP or ScrollTrigger not loaded');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // -----------------------------------------------------------------
  // Canvas setup with devicePixelRatio scaling for crisp rendering
  // -----------------------------------------------------------------
  const canvas = document.getElementById('canvas');
  if (!canvas) {
    console.error('[deckpress] #canvas not found');
    return;
  }
  const ctx = canvas.getContext('2d');
  const bgColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--bg-light')
    .trim() || '#f5f3f0';

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    // Reset transform before scaling (context scale is multiplicative)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    // Re-draw the current frame after a resize so it doesn't go blank
    if (state.currentFrame >= 0) drawFrame(state.currentFrame);
  }

  // -----------------------------------------------------------------
  // Frame store (populated by preloader) + renderer state
  // -----------------------------------------------------------------
  const frames = new Array(FRAME_COUNT);
  const state = { currentFrame: -1 };

  function framePath(i) {
    const n = String(i + 1).padStart(4, '0');
    return `/deck/frames/frame_${n}.webp`;
  }

  function loadFrame(i) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        frames[i] = img;
        resolve();
      };
      img.onerror = () => {
        console.warn('[deckpress] Failed to load frame', i, framePath(i));
        resolve();
      };
      img.src = framePath(i);
    });
  }

  /**
   * Canvas renderer — padded cover mode.
   * Scales the frame to cover the viewport then shrinks by IMAGE_SCALE
   * so the product has breathing room from the edges and the site
   * header/marquee don't clip into it.
   */
  function drawFrame(index) {
    const img = frames[index];
    if (!img) return;
    const cw = window.innerWidth;
    const ch = window.innerHeight;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  // -----------------------------------------------------------------
  // Loader progress UI
  // -----------------------------------------------------------------
  const loader = document.getElementById('loader');
  const loaderBarFill = document.getElementById('loader-bar-fill');
  const loaderPercent = document.getElementById('loader-percent');
  let loadedCount = 0;

  function updateLoader() {
    const pct = FRAME_COUNT === 0 ? 100 : Math.round((loadedCount / FRAME_COUNT) * 100);
    if (loaderBarFill) loaderBarFill.style.width = pct + '%';
    if (loaderPercent) loaderPercent.textContent = pct + '%';
  }

  function hideLoader() {
    if (!loader) return;
    loader.classList.add('hidden');
  }

  // -----------------------------------------------------------------
  // Two-phase frame preloader
  //   Phase 1: first PRIORITY_FRAMES sequentially (blocking)
  //   Phase 2: remaining frames in parallel (background)
  // Loader hides only after all frames are ready so the investor never
  // sees a blank/flashing canvas mid-scroll.
  // -----------------------------------------------------------------
  async function preloadFrames() {
    if (FRAME_COUNT === 0) {
      // Dev-mode / pre-video-extraction path — skip straight to scene init
      updateLoader();
      hideLoader();
      initScene();
      return;
    }

    // Phase 1: priority frames
    const priority = Math.min(PRIORITY_FRAMES, FRAME_COUNT);
    for (let i = 0; i < priority; i++) {
      await loadFrame(i);
      loadedCount++;
      updateLoader();
    }

    // Phase 2: remaining frames in parallel
    const remaining = [];
    for (let i = priority; i < FRAME_COUNT; i++) {
      remaining.push(
        loadFrame(i).then(() => {
          loadedCount++;
          updateLoader();
        })
      );
    }
    await Promise.all(remaining);

    hideLoader();
    initScene();
  }

  function initScene() {
    // Size the canvas once DOM + frames are ready
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Draw the first frame so the canvas isn't blank during the hero
    if (FRAME_COUNT > 0 && frames[0]) {
      state.currentFrame = 0;
      drawFrame(0);
    }

    // Hand off to Task 10's scene initializer
    if (typeof window.__initDeckScene === 'function') {
      window.__initDeckScene();
    }
  }

  // -----------------------------------------------------------------
  // Expose hooks for later tasks (Task 10 scene, Task 14 ROI)
  // -----------------------------------------------------------------
  window.__deckCanvas = {
    drawFrame,
    get FRAME_COUNT() { return FRAME_COUNT; },
    get FRAME_SPEED() { return FRAME_SPEED; },
    get currentFrame() { return state.currentFrame; },
    set currentFrame(v) { state.currentFrame = v; },
  };
  window.__deckLenis = lenis;

  // -----------------------------------------------------------------
  // Kick off — deferred to a microtask so the rest of this script
  // file (specifically the `window.__initDeckScene` assignment below)
  // finishes executing before preloadFrames runs. Without this defer,
  // the FRAME_COUNT === 0 dev path synchronously calls initScene()
  // which tries to invoke window.__initDeckScene — but that global
  // is assigned AFTER the IIFE closes, so the scene never populates.
  // -----------------------------------------------------------------
  queueMicrotask(preloadFrames);
})();

/**
 * Scene initializer — runs after all frames are preloaded.
 *
 * Installed as `window.__initDeckScene` (a global) so the IIFE above
 * can invoke it without sharing a closure. This is the GSAP/ScrollTrigger
 * choreography layer:
 *
 *   1. Populate hero (word-split heading + tagline + marquee)
 *   2. Animate hero heading words in
 *   3. Render scroll sections from CONFIG.sections
 *   4. Frame-to-scroll binding (FRAME_SPEED accelerated progress)
 *   5. Circle-wipe hero reveal (clip-path radius → 75%)
 *   6. Section entrance animations (7 types, direction variety)
 *   7. Counter animations with Intl number formatting
 *   8. Horizontal marquee (xPercent scrub)
 *   9. Dark overlay for stats sections (piecewise fade)
 *
 * Task 15 appends an additional founder-cutout block to this same
 * function. Keep it as `window.__initDeckScene` so the append stays
 * scoped correctly.
 */
window.__initDeckScene = function initDeckScene() {
  const CONFIG = window.DECK_CONFIG;
  const { drawFrame, FRAME_COUNT, FRAME_SPEED } = window.__deckCanvas;

  const scrollContainer = document.getElementById('scroll-container');
  const heroSection = document.querySelector('.hero-standalone');
  const canvasWrap = document.querySelector('.canvas-wrap');
  const heroHeading = document.getElementById('hero-heading');
  const heroTagline = document.getElementById('hero-tagline');
  const marqueeText = document.getElementById('marquee-text');

  if (!scrollContainer || !heroSection || !canvasWrap) {
    console.error('[deckpress] scene: required DOM nodes missing');
    return;
  }

  // ----- 1. Populate hero (words split for stagger animation) -----
  heroHeading.innerHTML = CONFIG.hero.heading
    .map(
      (word) =>
        `<span class="word"><span class="word-inner">${escapeHtml(word)}&nbsp;</span></span>`
    )
    .join('');
  heroTagline.textContent = CONFIG.tagline;
  marqueeText.textContent = CONFIG.marquee.text;
  if (CONFIG.marquee.fontSize) {
    marqueeText.style.fontSize = CONFIG.marquee.fontSize;
  }

  // ----- 2. Animate hero heading words in on load -----
  gsap.from('.hero-heading .word-inner', {
    y: '100%',
    opacity: 0,
    stagger: 0.08,
    duration: 1.2,
    ease: 'power4.out',
    delay: 0.3,
  });

  // ----- 2b. Founder hero cutout video (optional, hero-only) -----
  // WebM with VP9 alpha channel for Chrome/Firefox/Edge. Safari
  // (which lacks VP9 alpha support) falls back to a static image.
  // Fades out via ScrollTrigger as the hero scrolls away so the
  // canvas can take over.
  if (CONFIG.hero && CONFIG.hero.founderCutout && CONFIG.hero.founderCutout.enabled) {
    const cutoutConfig = CONFIG.hero.founderCutout;
    const container = document.getElementById('founder-cutout');
    const video = document.getElementById('founder-video');
    const videoSource = document.getElementById('founder-video-source');
    const fallbackImg = document.getElementById('founder-fallback');
    const toggleBtn = document.getElementById('founder-play-toggle');

    if (container && video && videoSource && fallbackImg && toggleBtn) {
      const canPlayWebm = video.canPlayType('video/webm; codecs="vp9"');

      if (canPlayWebm) {
        // Modern browser — load the WebM cutout
        videoSource.src = cutoutConfig.videoPath;
        video.load();
        container.classList.remove('hidden');

        // If the video file can't be loaded (e.g. founder hasn't dropped
        // the file in public/deck/media yet), fall back to the static
        // image if one exists, otherwise hide the cutout entirely so
        // there's no empty box with a broken play button in the hero.
        const handleVideoError = () => {
          // Try the static image fallback first
          fetch(cutoutConfig.fallbackImage, { method: 'HEAD' })
            .then((res) => {
              if (res.ok) {
                video.style.display = 'none';
                fallbackImg.src = cutoutConfig.fallbackImage;
                fallbackImg.classList.remove('hidden');
                toggleBtn.style.display = 'none';
              } else {
                // No fallback either — hide the whole cutout container
                container.classList.add('hidden');
              }
            })
            .catch(() => {
              container.classList.add('hidden');
            });
        };
        video.addEventListener('error', handleVideoError);
        // The <source> element is where the real network error bubbles
        // from in some browsers, so listen on that too.
        videoSource.addEventListener('error', handleVideoError);

        const PLAY_ICON = '\u25B6';   // ▶
        const PAUSE_ICON = '\u275A\u275A'; // ❚❚

        toggleBtn.addEventListener('click', () => {
          if (video.paused || video.ended) {
            // Unmute when the user explicitly plays — autoplay policies
            // require muted=true on load, but the founder recording has
            // audio the investor should hear when they choose to.
            video.muted = false;
            video.play().catch(() => {
              // Autoplay was blocked or video failed to load — leave
              // the toggle in the play state so the user can retry.
              toggleBtn.textContent = PLAY_ICON;
            });
            toggleBtn.textContent = PAUSE_ICON;
            toggleBtn.setAttribute('aria-label', 'Pause founder video');
          } else {
            video.pause();
            toggleBtn.textContent = PLAY_ICON;
            toggleBtn.setAttribute('aria-label', 'Play founder video');
          }
        });

        // Reset toggle when the video finishes on its own
        video.addEventListener('ended', () => {
          toggleBtn.textContent = PLAY_ICON;
          toggleBtn.setAttribute('aria-label', 'Play founder video');
        });

        if (cutoutConfig.playByDefault) {
          video.muted = false;
          video.play().catch(() => {});
          toggleBtn.textContent = PAUSE_ICON;
          toggleBtn.setAttribute('aria-label', 'Pause founder video');
        }
      } else {
        // Safari fallback — static image, hide video + toggle
        video.style.display = 'none';
        fallbackImg.src = cutoutConfig.fallbackImage;
        fallbackImg.classList.remove('hidden');
        toggleBtn.style.display = 'none';
        container.classList.remove('hidden');
      }

      // Fade the cutout out as the hero scrolls away. Uses the same
      // scroll window as the circle-wipe so the two transitions align.
      ScrollTrigger.create({
        trigger: scrollContainer,
        start: 'top top',
        end: 'top+=10% top',
        scrub: true,
        onUpdate: (self) => {
          container.style.opacity = String(1 - self.progress);
          // Pause the video automatically once it's no longer visible
          // so audio doesn't leak into the rest of the deck.
          if (self.progress >= 0.9 && video && !video.paused) {
            video.pause();
            if (toggleBtn) toggleBtn.textContent = '\u25B6';
          }
        },
      });
    }
  }

  // ----- 3. Render scroll sections from CONFIG.sections -----
  scrollContainer.innerHTML = '';
  const renderedSections = [];

  CONFIG.sections.forEach((def, i) => {
    const section = document.createElement('section');
    const alignClass = i % 2 === 0 ? 'align-left' : 'align-right';
    const isStats = Array.isArray(def.stats) && def.stats.length > 0;
    const classes = ['scroll-section', 'section-content', alignClass];
    if (isStats) classes.push('section-stats', 'section-on-dark');
    if (def.id === 'ask') classes.push('section-ask');
    section.className = classes.join(' ');
    section.id = def.id;
    section.dataset.enter = String(def.enter);
    section.dataset.leave = String(def.leave);
    section.dataset.animation = def.animation;
    section.dataset.sectionIndex = String(i);
    if (def.persist) section.dataset.persist = 'true';

    const midPct = (def.enter + def.leave) / 2;
    section.style.top = midPct + '%';

    const inner = document.createElement('div');
    inner.className = 'section-inner';

    const labelEl = document.createElement('span');
    labelEl.className = 'section-label';
    labelEl.textContent = def.label;
    inner.appendChild(labelEl);

    const headingEl = document.createElement('h2');
    headingEl.className = 'section-heading';
    headingEl.textContent = def.heading;
    inner.appendChild(headingEl);

    const bodyEl = document.createElement('p');
    bodyEl.className = 'section-body';
    bodyEl.textContent = def.body;
    inner.appendChild(bodyEl);

    if (isStats) {
      const grid = document.createElement('div');
      grid.className = 'stats-grid';
      def.stats.forEach((s) => {
        const stat = document.createElement('div');
        stat.className = 'stat';

        const number = document.createElement('span');
        number.className = 'stat-number';
        number.dataset.value = String(s.value);
        number.dataset.decimals = String(s.decimals);
        number.textContent = '0';
        stat.appendChild(number);

        if (s.suffix) {
          const suffix = document.createElement('span');
          suffix.className = 'stat-suffix';
          suffix.textContent = s.suffix;
          stat.appendChild(suffix);
        }

        const label = document.createElement('span');
        label.className = 'stat-label';
        label.textContent = s.label;
        stat.appendChild(label);

        grid.appendChild(stat);
      });
      inner.appendChild(grid);
    }

    if (def.cta) {
      const btn = document.createElement('button');
      btn.className = 'cta-button';
      btn.type = 'button';
      btn.textContent = def.cta.label;
      if (def.cta.action === 'openChat') {
        btn.dataset.chatOpen = 'true';
      }
      inner.appendChild(btn);
    }

    section.appendChild(inner);
    scrollContainer.appendChild(section);
    renderedSections.push(section);
  });

  // Scroll container height scales with section count.
  // Default 1000vh for 8 sections ≈ 125vh per section (cinematic pacing).
  const totalVh = Math.max(1000, CONFIG.sections.length * 125);
  scrollContainer.style.minHeight = totalVh + 'vh';

  // ----- 4. Frame-to-scroll binding -----
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      if (FRAME_COUNT === 0) return;
      const accelerated = Math.min(self.progress * FRAME_SPEED, 1);
      const index = Math.min(
        Math.floor(accelerated * FRAME_COUNT),
        FRAME_COUNT - 1
      );
      if (index !== window.__deckCanvas.currentFrame) {
        window.__deckCanvas.currentFrame = index;
        requestAnimationFrame(() => drawFrame(index));
      }
    },
  });

  // ----- 5. Circle-wipe hero reveal -----
  // Hero fades out (opacity → 0) over the first ~7% of scroll.
  // Canvas reveals via clip-path circle() growing from 0% to 75%.
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      heroSection.style.opacity = String(Math.max(0, 1 - p * 15));
      const wipeProgress = Math.min(1, Math.max(0, (p - 0.01) / 0.06));
      const radius = wipeProgress * 75;
      canvasWrap.style.clipPath = `circle(${radius}% at 50% 50%)`;
    },
  });

  // ----- 6. Section entrance animations -----
  // Each section plays its own timeline when scroll enters its enter→leave
  // range. Sections fade out again when progress moves past (unless .persist).
  const animationDefs = {
    'fade-up':     { from: { y: 50, opacity: 0 }, duration: 0.9, ease: 'power3.out' },
    'slide-left':  { from: { x: -80, opacity: 0 }, duration: 0.9, ease: 'power3.out' },
    'slide-right': { from: { x: 80, opacity: 0 }, duration: 0.9, ease: 'power3.out' },
    'scale-up':    { from: { scale: 0.85, opacity: 0 }, duration: 1.0, ease: 'power2.out' },
    'rotate-in':   { from: { y: 40, rotation: 3, opacity: 0 }, duration: 0.9, ease: 'power3.out' },
    'stagger-up':  { from: { y: 60, opacity: 0 }, duration: 0.8, ease: 'power3.out' },
    'clip-reveal': { from: { clipPath: 'inset(100% 0 0 0)', opacity: 0 }, duration: 1.2, ease: 'power4.inOut' },
  };

  renderedSections.forEach((section) => {
    const type = section.dataset.animation;
    const persist = section.dataset.persist === 'true';
    const enter = parseFloat(section.dataset.enter) / 100;
    const leave = parseFloat(section.dataset.leave) / 100;
    const children = section.querySelectorAll(
      '.section-label, .section-heading, .section-body, .cta-button, .stat'
    );

    const def = animationDefs[type] || animationDefs['fade-up'];
    const tl = gsap.timeline({ paused: true });
    tl.from(children, {
      ...def.from,
      stagger: 0.12,
      duration: def.duration,
      ease: def.ease,
    });

    ScrollTrigger.create({
      trigger: scrollContainer,
      start: 'top top',
      end: 'bottom bottom',
      scrub: false,
      onUpdate: (self) => {
        const p = self.progress;
        if (p >= enter && p < leave) {
          section.style.opacity = '1';
          if (tl.progress() < 1 && !tl.isActive()) tl.play();
        } else if (p >= leave) {
          if (!persist) section.style.opacity = '0';
        } else {
          section.style.opacity = '0';
        }
      },
    });
  });

  // ----- 7. Counter animations -----
  document.querySelectorAll('.stat-number').forEach((el) => {
    const target = parseFloat(el.dataset.value);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    if (Number.isNaN(target)) return;

    const counter = { value: 0 };
    gsap.to(counter, {
      value: target,
      duration: 2,
      ease: 'power1.out',
      scrollTrigger: {
        trigger: el.closest('.scroll-section'),
        start: 'top 70%',
        toggleActions: 'play none none reverse',
      },
      onUpdate: () => {
        el.textContent = formatStatNumber(counter.value, decimals);
      },
      onComplete: () => {
        el.textContent = formatStatNumber(target, decimals);
      },
    });
  });

  // ----- 8. Horizontal marquee (xPercent scrub) -----
  const marqueeWrap = document.querySelector('.marquee-wrap');
  if (marqueeWrap) {
    const speed =
      parseFloat(marqueeWrap.dataset.scrollSpeed) || CONFIG.marquee.speed || -25;
    gsap.to(marqueeWrap.querySelector('.marquee-text'), {
      xPercent: speed,
      ease: 'none',
      scrollTrigger: {
        trigger: scrollContainer,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
      },
    });
  }

  // ----- 9. Dark overlay for stats sections (piecewise fade) -----
  const darkOverlay = document.getElementById('dark-overlay');
  if (darkOverlay) {
    ScrollTrigger.create({
      trigger: scrollContainer,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        const fade = 0.04;
        const peak = 0.9;
        let opacity = 0;
        for (const section of renderedSections) {
          if (!section.classList.contains('section-stats')) continue;
          const enter = parseFloat(section.dataset.enter) / 100;
          const leave = parseFloat(section.dataset.leave) / 100;
          let segOpacity = 0;
          if (p >= enter - fade && p <= enter) {
            segOpacity = ((p - (enter - fade)) / fade) * peak;
          } else if (p > enter && p < leave) {
            segOpacity = peak;
          } else if (p >= leave && p <= leave + fade) {
            segOpacity = peak * (1 - (p - leave) / fade);
          }
          if (segOpacity > opacity) opacity = segOpacity;
        }
        darkOverlay.style.opacity = String(opacity);
      },
    });
  }

  ScrollTrigger.refresh();
};

// ----------------------------------------------------------------------
// Helpers used by the scene initializer
// ----------------------------------------------------------------------

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function formatStatNumber(value, decimals) {
  if (decimals === 0) {
    return Math.round(value).toLocaleString('en-US');
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
