/**
 * Deckpress — Single source of truth for the deck content.
 *
 * This file is imported by:
 * 1. `scripts/build-deck-config.ts` at build time, which serializes it to
 *    `public/deck/js/config.js` (as `window.DECK_CONFIG`) for the vanilla
 *    cinematic frontend to consume.
 * 2. Future productization flows where multiple decks may live side-by-side.
 *
 * Everything the deck needs — content, animation choreography, feature flags —
 * lives in this file. Swapping companies is a config change, not a code change.
 */

export type AnimationType =
  | 'fade-up'
  | 'slide-left'
  | 'slide-right'
  | 'scale-up'
  | 'rotate-in'
  | 'stagger-up'
  | 'clip-reveal';

export interface StatDef {
  /** The final value the counter animates up to. */
  value: number;
  /** Optional unit shown next to the number (e.g. "M ARR", "%"). */
  suffix?: string;
  /** Descriptive label shown below the number. */
  label: string;
  /** Number of decimal places when formatting. 0 = integer. */
  decimals: number;
}

export interface SectionDef {
  /** Slug used for DOM id and ROI calculator insertion anchor. */
  id: string;
  /** Uppercased counter + framework test name, e.g. "001 / Pain Test". */
  label: string;
  heading: string;
  body: string;
  /** Which entrance animation to apply. Must not repeat with neighbor. */
  animation: AnimationType;
  /** Scroll progress (0-100) where the section begins fading in. */
  enter: number;
  /** Scroll progress (0-100) where the section finishes fading out. */
  leave: number;
  /** Optional counter stats rendered as a grid under the body. */
  stats?: StatDef[];
  /** If true, section remains visible after `leave` (e.g. final CTA). */
  persist?: boolean;
  /** Optional call-to-action button. */
  cta?: { label: string; action: 'openChat' };
}

export interface HeroCutoutConfig {
  enabled: boolean;
  /** Path to a WebM video with VP9 alpha channel (not supported in Safari). */
  videoPath: string;
  /** Static image shown in Safari as a fallback for the cutout. */
  fallbackImage: string;
  /** If true, video plays on load. If false, investor clicks to play. */
  playByDefault: boolean;
}

export interface DeckConfig {
  company: string;
  tagline: string;
  hero: {
    /** Each word becomes a span for staggered reveal animation. */
    heading: string[];
    founderCutout: HeroCutoutConfig;
  };
  sections: SectionDef[];
  marquee: {
    text: string;
    fontSize: string;
    /** xPercent target for the horizontal scroll-bound slide. Negative = left. */
    speed: number;
  };
  features: {
    roiCalculator: boolean;
    feedbackBox: boolean;
    chatWidget: boolean;
    analytics: boolean;
  };
  roiCalculator: {
    /** Section id to insert the pinned ROI section immediately after. */
    insertAfter: string;
    defaults: {
      developers: number;
      hoursSavedPerWeek: number;
      costPerHour: number;
    };
    /**
     * Formula stored as source so it can be serialized to the vanilla JS
     * frontend (functions don't JSON-serialize). Evaluated via `new Function`
     * in roi.js. Keep it a pure arrow function of (d, h, c) => number.
     */
    formulaSource: string;
  };
  founder: {
    name: string;
    title: string;
  };
  /** Count of frames in public/deck/frames/. Set by build-deck-config.ts. */
  productDemoFrames: number;
}

export const config: DeckConfig = {
  company: 'Coder1 IDE',
  tagline: 'The Agentic IDE for Claude Code Users',

  hero: {
    heading: ['The', 'IDE', 'Claude', 'Code', 'Deserves'],
    founderCutout: {
      enabled: true,
      videoPath: '/deck/media/founder-cutout.webm',
      fallbackImage: '/deck/media/founder-fallback.jpg',
      playByDefault: false,
    },
  },

  sections: [
    {
      id: 'problem',
      label: '001 / Pain Test',
      heading: 'TBD — Problem headline',
      body: 'TBD — Problem description (filled in Task 17).',
      animation: 'slide-left',
      enter: 18,
      leave: 32,
    },
    {
      id: 'solution',
      label: '002 / Clarity Test',
      heading: 'TBD — Solution headline',
      body: 'TBD — Solution description (filled in Task 17).',
      animation: 'slide-right',
      enter: 34,
      leave: 48,
    },
    {
      id: 'why-now',
      label: '003 / Timing Test',
      heading: 'TBD — Why now',
      body: 'TBD — Timing thesis (filled in Task 17).',
      animation: 'scale-up',
      enter: 50,
      leave: 60,
    },
    {
      id: 'market',
      label: '004 / Math Test',
      heading: 'TBD — Market headline',
      body: 'TBD — TAM/SAM/SOM description (filled in Task 17).',
      animation: 'clip-reveal',
      enter: 62,
      leave: 72,
      stats: [
        { value: 8.4, suffix: 'B', label: 'Dev tooling TAM', decimals: 1 },
        { value: 4.4, suffix: 'M', label: 'Claude Code users', decimals: 1 },
        { value: 264, suffix: 'M', label: 'SOM at 10% capture', decimals: 0 },
      ],
    },
    {
      id: 'traction',
      label: '005 / Evidence Test',
      heading: 'TBD — Traction headline',
      body: 'TBD — Traction narrative (filled in Task 17).',
      animation: 'stagger-up',
      enter: 74,
      leave: 82,
      stats: [
        { value: 12400, label: 'Active users', decimals: 0 },
        { value: 2, suffix: 'M ARR', label: 'Annual recurring revenue', decimals: 1 },
        { value: 340, suffix: '% YoY', label: 'Growth', decimals: 0 },
        { value: 94, suffix: '%', label: '30-day retention', decimals: 0 },
      ],
    },
    {
      id: 'gtm-team',
      label: '006 / Founder-Market Fit',
      heading: 'TBD — GTM + Team headline',
      body: 'TBD — GTM strategy and team strengths (filled in Task 17).',
      animation: 'rotate-in',
      enter: 84,
      leave: 90,
    },
    {
      id: 'ask',
      label: '007 / The Ask',
      heading: 'TBD — The Ask headline',
      body: 'TBD — Funding ask and use of funds (filled in Task 17).',
      animation: 'fade-up',
      enter: 92,
      leave: 100,
      persist: true,
      cta: { label: 'Chat with Mike', action: 'openChat' },
    },
  ],

  marquee: {
    text: 'BUILT · FOR · CLAUDE · CODE · USERS',
    fontSize: '14vw',
    speed: -25,
  },

  features: {
    roiCalculator: true,
    feedbackBox: true,
    chatWidget: true,
    analytics: true,
  },

  roiCalculator: {
    insertAfter: 'market',
    defaults: {
      developers: 12,
      hoursSavedPerWeek: 8,
      costPerHour: 150,
    },
    formulaSource: '(d, h, c) => d * h * c * 52',
  },

  founder: {
    name: 'Mike Kraft',
    title: 'Founder · Coder1 IDE',
  },

  productDemoFrames: 0,
};
