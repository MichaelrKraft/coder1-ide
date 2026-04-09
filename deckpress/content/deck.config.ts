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
      heading: 'Claude Code is the most powerful AI coding tool ever built — and it has no home.',
      body:
        'Millions of developers use Claude Code every day. They run it in terminal windows, ' +
        'hack it into VS Code, and lose context between sessions. The most capable agentic ' +
        'coding model on earth is still living in someone else\u2019s IDE. No purpose-built ' +
        'environment. No team collaboration. No persistent memory. No local-first security.',
      animation: 'slide-left',
      enter: 18,
      leave: 32,
    },
    {
      id: 'solution',
      label: '002 / Clarity Test',
      heading: 'Coder1 is the first agentic IDE built for Claude Code users.',
      body:
        'Purpose-built from day one for how Claude Code actually works. A live preview that ' +
        'stays in sync with what the agent is building. A multi-user editing model like Google ' +
        'Docs. An agent hub that orchestrates background work on your machine. Cross-session ' +
        'memory that carries context forward. And it runs locally — bridging into your own ' +
        'Claude Code subscription instead of routing through somebody else\u2019s cloud.',
      animation: 'slide-right',
      enter: 34,
      leave: 48,
    },
    {
      id: 'why-now',
      label: '003 / Timing Test',
      heading: 'The agentic IDE category is forming right now. There is no incumbent.',
      body:
        'Claude Code crossed 4.4M users in 18 months. Anthropic just launched enterprise tiers. ' +
        'Cursor and Windsurf are general-purpose AI IDEs chasing autocomplete. Nobody is ' +
        'building specifically for the agentic workflow — the one where the AI runs the loop ' +
        'and the human steers. First-mover advantage is measured in weeks, not quarters.',
      animation: 'scale-up',
      enter: 50,
      leave: 60,
    },
    {
      id: 'market',
      label: '004 / Math Test',
      heading: 'A multi-billion-dollar tooling market at an inflection point.',
      body:
        '$8.4B developer tooling TAM. 4.4M Claude Code users as our SAM — power users ' +
        'willing to pay for the right workflow. At a $240 ARPU target and a conservative ' +
        '10% penetration, that\u2019s a $264M serviceable obtainable market we can reach ' +
        'without leaving the Claude Code community.',
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
      heading: 'Users are showing up organically — and they\u2019re staying.',
      body:
        'Growth is 100% community-driven. No paid acquisition, no outbound, no SEO. Just ' +
        'Claude Code power users finding Coder1 on YouTube and Twitter and telling their ' +
        'teams. 94% of users who sign up are still active at 30 days. NPS is 72. The signal ' +
        'is clear: once developers feel the agentic IDE, going back to a static editor feels ' +
        'like a downgrade.',
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
      heading: 'Built by a founder who lives inside Claude Code every day.',
      body:
        'Mike Kraft has shipped three SaaS products in the last 24 months using Claude Code ' +
        'as his primary developer. He built Coder1 to solve his own workflow first — every ' +
        'feature is the answer to a frustration he hit before it was a roadmap item. GTM is ' +
        'a continuation of that: bottom-up through the Claude Code YouTube community, a ' +
        'co-marketing track with Anthropic, and an affiliate program with power-user educators.',
      animation: 'rotate-in',
      enter: 84,
      leave: 90,
    },
    {
      id: 'ask',
      label: '007 / The Ask',
      heading: 'Raising $2.5M Seed to own the agentic IDE category.',
      body:
        '60% engineering (3 hires: a senior full-stack engineer, a DX specialist, and a ' +
        'developer advocate). 25% go-to-market (content production, affiliate ops, ' +
        'community events). 15% runway and operations. The goal for the round: 50K active ' +
        'users and $8M ARR within 18 months, setting up a Series A led by a category ' +
        'defining infrastructure fund.',
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
