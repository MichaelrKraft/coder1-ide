/**
 * Deckpress — roi.js
 *
 * Optional ROI calculator that lives as its own pinned scroll section
 * between two regular content sections. When enabled, inserts itself
 * after the section identified by CONFIG.roiCalculator.insertAfter.
 *
 * The ROI section is an exception to Deckpress's "side-aligned text only"
 * rule because interactive inputs need visual focus — it uses the
 * .section-roi class which is center-aligned in style.css.
 *
 * Also an exception to the frame-to-scroll binding: while the investor
 * is inside the ROI section's scroll range, the canvas is held at a
 * fixed frame so the product demo doesn't distract from the calculator.
 *
 * Formula is stored in CONFIG as source string (functions can't be
 * serialized to JSON) and deserialized here via the Function constructor.
 */
(function () {
  'use strict';

  const CONFIG = window.DECK_CONFIG;
  if (!CONFIG || !CONFIG.features || !CONFIG.features.roiCalculator) {
    return;
  }

  // The calculator depends on __initDeckScene having rendered the sections.
  // Poll until the target section is in the DOM, then inject our pinned
  // ROI section and register the ScrollTriggers.
  const MAX_WAIT_MS = 60000;
  const POLL_INTERVAL_MS = 500;
  let waited = 0;

  function setup() {
    const afterId = CONFIG.roiCalculator.insertAfter;
    const targetSection = document.getElementById(afterId);
    const scrollContainer = document.getElementById('scroll-container');

    if (!targetSection || !scrollContainer || !window.__deckCanvas || typeof ScrollTrigger === 'undefined') {
      if (waited >= MAX_WAIT_MS) {
        console.warn('[deckpress] roi: setup preconditions not met; aborting');
        return;
      }
      waited += POLL_INTERVAL_MS;
      setTimeout(setup, POLL_INTERVAL_MS);
      return;
    }

    // Deserialize formula from source string. We trust this string
    // because it comes from deck.config.ts (author-controlled at build).
    let formula;
    try {
      // eslint-disable-next-line no-new-func
      formula = new Function(
        'd',
        'h',
        'c',
        `return (${CONFIG.roiCalculator.formulaSource})(d, h, c);`
      );
    } catch (err) {
      console.error('[deckpress] roi: invalid formulaSource', err);
      return;
    }

    // -----------------------------------------------------------------
    // Build the ROI section
    // -----------------------------------------------------------------
    const targetLeave = parseFloat(targetSection.dataset.leave);
    if (Number.isNaN(targetLeave)) {
      console.warn('[deckpress] roi: target section missing data-leave');
      return;
    }
    const roiEnter = targetLeave + 1;
    const roiLeave = roiEnter + 8; // 8% scroll range for pinned interaction

    const section = document.createElement('section');
    section.className = 'scroll-section section-roi section-on-dark';
    section.id = 'roi-calculator';
    section.dataset.enter = String(roiEnter);
    section.dataset.leave = String(roiLeave);
    section.style.top = (roiEnter + roiLeave) / 2 + '%';
    section.style.opacity = '0';

    const defaults = CONFIG.roiCalculator.defaults;

    section.innerHTML = `
      <div class="section-inner">
        <span class="section-label">ROI Calculator &middot; Try it yourself</span>
        <h2 class="section-heading">What Coder1 saves your team</h2>
        <div class="roi-inputs">
          <div class="roi-input">
            <label for="roi-devs">Developers</label>
            <input type="number" id="roi-devs" value="${defaults.developers}" min="1" inputmode="numeric">
          </div>
          <div class="roi-input">
            <label for="roi-hrs">Hrs saved / week</label>
            <input type="number" id="roi-hrs" value="${defaults.hoursSavedPerWeek}" min="1" inputmode="numeric">
          </div>
          <div class="roi-input">
            <label for="roi-cost">Cost / hr ($)</label>
            <input type="number" id="roi-cost" value="${defaults.costPerHour}" min="1" inputmode="numeric">
          </div>
        </div>
        <div class="roi-result">
          <div class="roi-result-label">Annual savings for your team</div>
          <div class="roi-result-value" id="roi-result">$0</div>
        </div>
      </div>
    `;

    scrollContainer.appendChild(section);

    // -----------------------------------------------------------------
    // Wire inputs to formula
    // -----------------------------------------------------------------
    const devsInput = document.getElementById('roi-devs');
    const hrsInput = document.getElementById('roi-hrs');
    const costInput = document.getElementById('roi-cost');
    const resultEl = document.getElementById('roi-result');

    function recalc() {
      const d = Number(devsInput.value) || 0;
      const h = Number(hrsInput.value) || 0;
      const c = Number(costInput.value) || 0;
      try {
        const val = formula(d, h, c);
        const safeVal = Number.isFinite(val) ? val : 0;
        resultEl.textContent =
          '$' + new Intl.NumberFormat('en-US').format(Math.round(safeVal));
      } catch {
        resultEl.textContent = '—';
      }
    }

    devsInput.addEventListener('input', recalc);
    hrsInput.addEventListener('input', recalc);
    costInput.addEventListener('input', recalc);
    recalc();

    // -----------------------------------------------------------------
    // ScrollTrigger: show/hide the ROI section as we enter/leave its range
    // -----------------------------------------------------------------
    const enterPct = roiEnter / 100;
    const leavePct = roiLeave / 100;

    ScrollTrigger.create({
      trigger: scrollContainer,
      start: 'top top',
      end: 'bottom bottom',
      scrub: false,
      onUpdate: (self) => {
        const p = self.progress;
        if (p >= enterPct && p < leavePct) {
          section.style.opacity = '1';
          section.style.pointerEvents = 'auto';
        } else {
          section.style.opacity = '0';
          section.style.pointerEvents = 'none';
        }
      },
    });

    // -----------------------------------------------------------------
    // Freeze canvas to a specific frame while the ROI section is active.
    // Without this, the scroll-bound product video keeps progressing
    // behind the calculator, which is distracting.
    // -----------------------------------------------------------------
    const { FRAME_COUNT } = window.__deckCanvas;
    // Pick the frame that matches the scroll position where ROI starts
    const acceleratedAtEnter = Math.min(enterPct * window.__deckCanvas.FRAME_SPEED, 1);
    const frozenFrameIndex = Math.min(
      Math.floor(acceleratedAtEnter * FRAME_COUNT),
      FRAME_COUNT - 1
    );

    ScrollTrigger.create({
      trigger: scrollContainer,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        if (p >= enterPct && p < leavePct && FRAME_COUNT > 0) {
          // Override whatever frame the main scrub wants with the frozen one.
          // The main scrub will re-claim control the moment we leave.
          if (window.__deckCanvas.currentFrame !== frozenFrameIndex) {
            window.__deckCanvas.currentFrame = frozenFrameIndex;
            requestAnimationFrame(() =>
              window.__deckCanvas.drawFrame(frozenFrameIndex)
            );
          }
        }
      },
    });

    ScrollTrigger.refresh();
  }

  setup();
})();
