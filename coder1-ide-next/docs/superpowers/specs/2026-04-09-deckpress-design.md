# Deckpress — Design Spec

**Date**: 2026-04-09
**Status**: Awaiting approval
**Supersedes**: `2026-04-08-interactive-investor-deck-design.md`
**Product name**: Deckpress — the new pitch deck in interactive website format, replacing static PDF and Keynote
**Approach**: Option C — build Coder1's own deck first as the flagship. Code is configurable from day one so productization is a config change, not a rewrite.

---

## Why this rewrite

The previous spec designed a scrollable long-form page with a sidebar layout (progress nav + draggable founder video + chat widget). It worked, but it felt like a premium landing page, not a cinematic experience.

This rewrite pivots the visual system to the **Deckpress scroll-driven canvas pattern** (Lenis smooth scroll, GSAP choreography, scroll-bound canvas with frame-by-frame product video, circle-wipe hero reveal, massive typography, side-aligned text zones). The 13-section Billion $ Pitch Deck framework compresses to 8 sections to give each one enough scroll breathing room. Interactive elements (chat, ROI calculator, feedback) adapt to the cinematic flow rather than fighting it.

---

## Confirmed decisions

| # | Element | Decision |
|---|---|---|
| 1 | Canvas video | Coder1 product demo (~60s), frame-extracted to 150–300 WebP stills via ffmpeg, scroll-bound via GSAP ScrollTrigger |
| 2 | Founder cutout video | **Hero section only**, configurable on/off, with **play/pause control**. WebM-with-alpha (VP9). Fades out on scroll as canvas takes over. Safari fallback: static founder photo. |
| 3 | Chat widget | Small floating FAB, bottom-right. Expands on click into a chat panel. Persistent across scroll. Telegram-backed (polling, 2s interval). |
| 4 | ROI calculator | **Configurable on/off per deck.** When on, lives in a **pinned scroll section** that pauses canvas progression so the investor can interact. |
| 5 | Section count | **8 sections** compressed from the 13-section framework. Total scroll: ~1000vh. |
| 6 | AI deck generation | **Deferred to v2.** Coder1's own deck content is written manually. |
| 7 | Founder dashboard | **In MVP.** Opens, per-section heatmap, chat history, feedback. Password-gated. |
| 8 | Frontend stack | **Vanilla HTML/CSS/JS** (Lenis + GSAP + ScrollTrigger via CDN) per the Deckpress skill, served from Next.js `public/` or a thin Next.js page. No bundler for the cinematic layer. |
| 9 | Backend stack | **Next.js 14 App Router** API routes for chat, analytics, feedback, dashboard auth. Vercel KV for storage. |

---

## Architecture

```
deckpress/                            # Project root
├── public/
│   ├── deck/                         # Vanilla cinematic frontend (served at /deck)
│   │   ├── index.html                # Deckpress structure (loader, hero, canvas, sections)
│   │   ├── css/style.css             # Deckpress visual system
│   │   ├── js/
│   │   │   ├── app.js                # Lenis + GSAP + canvas + section animations
│   │   │   ├── config.js             # Deck-specific config (loaded by app.js)
│   │   │   ├── chat.js               # Chat widget (fetches /api/chat, /api/chat/messages)
│   │   │   ├── analytics.js          # Track open + section time (POSTs /api/analytics)
│   │   │   ├── feedback.js           # Feedback box (POSTs /api/feedback)
│   │   │   └── roi.js                # Optional ROI calculator
│   │   ├── frames/
│   │   │   └── frame_0001.webp …     # Product demo frames
│   │   └── media/
│   │       ├── founder-cutout.webm   # Hero cutout (alpha)
│   │       └── founder-fallback.jpg  # Safari fallback
│   └── favicon.ico
├── app/
│   ├── layout.tsx                    # Minimal root (dashboard uses this)
│   ├── page.tsx                      # Redirects → /deck
│   ├── deck/
│   │   └── route.ts                  # Rewrites /deck → public/deck/index.html
│   ├── dashboard/
│   │   ├── page.tsx                  # Founder analytics dashboard
│   │   └── login/page.tsx            # Password form
│   └── api/
│       ├── analytics/route.ts        # POST: open + section-time events
│       ├── chat/
│       │   ├── route.ts              # POST: investor → Telegram
│       │   └── messages/route.ts     # GET: poll messages
│       ├── feedback/route.ts         # POST: feedback
│       ├── telegram/route.ts         # POST: webhook → store founder reply
│       └── dashboard-auth/route.ts   # POST: set auth cookie
├── lib/
│   ├── kv.ts                         # Vercel KV typed helpers
│   ├── telegram.ts                   # Telegram Bot API helper
│   └── auth.ts                       # Dashboard password check
├── content/
│   ├── deck.config.ts                # Deck content + feature flags
│   └── sections.ts                   # 8-section mapping with animation choreography
├── scripts/
│   └── extract-frames.sh             # ffmpeg frame extraction helper
├── middleware.ts                     # Auth gate for /dashboard
├── next.config.ts                    # Rewrites /deck → /deck/index.html
├── tailwind.config.ts                # For dashboard only
├── tsconfig.json
├── package.json
├── .env.example
└── README.md
```

**Why this split**: The cinematic deck is vanilla HTML/CSS/JS (the skill mandates it — no bundler interference with GSAP/Lenis timing). It lives in `public/deck/` and is served as a static asset. The dashboard is a normal Next.js page (Tailwind, App Router, React). Both share the same origin so `fetch('/api/...')` works without CORS.

---

## The 8-Section Framework

Compressed from the 13-section Billion $ Pitch Deck Checklist. Each section preserves its "test" name.

| # | Section | Billion$ Framework Test | Deckpress Animation | Scroll Range |
|---|---|---|---|---|
| 0 | **Hero** — Coder1 IDE + tagline + optional founder cutout | Cover + Hook Test | Standalone 100vh, word-split heading, circle-wipe reveal | 0–15% |
| 1 | **Problem** | Pain Test | `slide-left`, align-left | 18–32% |
| 2 | **Solution** | Clarity Test | `slide-right`, align-right | 34–48% |
| 3 | **Why Now** | Timing Test | `scale-up`, align-left | 50–60% |
| 4 | **Market + Business Model** | Math Test + Unit Economics | `clip-reveal`, align-right, **dark overlay + counter stats** | 62–72% |
| 5 | **Traction + Competition** | Evidence Test + Positioning Test | `stagger-up`, align-left, **counter stats for traction metrics** | 74–82% |
| 6 | **GTM + Team** | Channel Test + Founder-Market Fit | `rotate-in`, align-right | 84–90% |
| 7 | **The Ask** (Financials folded in) | Reality Test + Use of Funds Test | `fade-up`, align-left, **`data-persist="true"` CTA with "Chat with Mike" button** | 92–100% |

**Marquee**: At least one oversized horizontal text marquee (12vw+) — "Built for Claude Code users" — slides horizontally across the full scroll range.

**ROI calculator** (optional): Inserted between sections 4 and 5 as its own pinned section if `config.features.roiCalculator === true`. Pauses canvas at its midpoint frame. Center-aligned (exception to side-alignment rule, since it needs input focus).

---

## Visual System — Deckpress Checklist

All 14 non-negotiables from the skill apply:

1. Lenis smooth scroll (mandatory)
2. 4+ animation types, never repeated consecutively
3. Staggered reveals (label → heading → body → CTA)
4. No glassmorphism — clean backgrounds, hierarchy via font size/weight/color
5. Direction variety — left, right, up, scale, clip
6. Dark overlay for stats sections (opacity 0.88–0.92)
7. At least one horizontal text marquee (12vw+ font)
8. Counter animations — all numbers count up from 0
9. Massive typography — hero 12rem+, section headings 4rem+, marquee 10vw+
10. CTA persists via `data-persist="true"`
11. Hero gets 15% scroll range, 1000vh total
12. Side-aligned text only (outer 40% zones)
13. Circle-wipe hero reveal via `clip-path: circle()`
14. Frame speed 2.0 — product animation completes ~55% scroll

**Design tokens**:
```
--bg-light:      #f5f3f0
--bg-dark:       #0a0a12
--text-on-light: #1a1a1a
--text-on-dark:  #f0ede8
--accent-violet: #7c3aed
--accent-cyan:   #06b6d4
--font-display:  "Instrument Serif", serif    (hero + marquee)
--font-body:     "Inter", sans-serif          (body copy)
```

---

## Content Model — `content/deck.config.ts`

Single source of truth for the deck. Separates content from presentation so productization is trivial.

```ts
export const config = {
  company: 'Coder1 IDE',
  tagline: 'The Agentic IDE for Claude Code Users',

  hero: {
    heading: ['The', 'IDE', 'Claude', 'Code', 'Deserves'],  // word-split for animation
    founderCutout: {
      enabled: true,
      videoPath: '/deck/media/founder-cutout.webm',
      fallbackImage: '/deck/media/founder-fallback.jpg',
      playByDefault: false,  // investor clicks to play
    },
  },

  sections: [
    { id: 'problem',     label: '001 / Pain Test',        heading: '…', body: '…', animation: 'slide-left',  enter: 18, leave: 32 },
    { id: 'solution',    label: '002 / Clarity Test',     heading: '…', body: '…', animation: 'slide-right', enter: 34, leave: 48 },
    { id: 'why-now',     label: '003 / Timing Test',      heading: '…', body: '…', animation: 'scale-up',    enter: 50, leave: 60 },
    { id: 'market',      label: '004 / Math Test',        heading: '…', body: '…', animation: 'clip-reveal', enter: 62, leave: 72,
      stats: [
        { value: 8.4, suffix: 'B', label: 'Dev tooling TAM', decimals: 1 },
        { value: 4.4, suffix: 'M', label: 'Claude Code users', decimals: 1 },
        { value: 264, suffix: 'M', label: 'SOM at 10% capture', decimals: 0 },
      ],
    },
    { id: 'traction',    label: '005 / Evidence Test',    heading: '…', body: '…', animation: 'stagger-up',  enter: 74, leave: 82,
      stats: [
        { value: 12400, label: 'Active users', decimals: 0 },
        { value: 2,     suffix: 'M ARR', label: 'Annual recurring revenue', decimals: 1 },
        { value: 340,   suffix: '% YoY', label: 'Growth', decimals: 0 },
        { value: 94,    suffix: '%', label: '30-day retention', decimals: 0 },
      ],
    },
    { id: 'gtm-team',    label: '006 / Founder-Market Fit', heading: '…', body: '…', animation: 'rotate-in', enter: 84, leave: 90 },
    { id: 'ask',         label: '007 / The Ask',          heading: '…', body: '…', animation: 'fade-up',     enter: 92, leave: 100, persist: true,
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
    defaults: { developers: 12, hoursSavedPerWeek: 8, costPerHour: 150 },
    formula: (d: number, h: number, c: number) => d * h * c * 52,
  },

  founder: {
    name: 'Mike Kraft',
    title: 'Founder · Coder1 IDE',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT_ID,
  },

  auth: {
    dashboardPassword: process.env.DASHBOARD_PASSWORD,
  },
};
```

---

## Interactive Elements — How They Fit the Cinematic Flow

### Hero cutout founder video (optional)
- WebM with VP9 alpha channel, positioned in hero section (not fixed).
- Default state: paused, showing first frame with a play button overlay.
- Investor clicks → plays with audio. Click again → pauses.
- Browser detection: if `video.canPlayType('video/webm; codecs="vp9"')` returns empty → swap to `fallbackImage` (Safari fallback).
- Fades out completely as canvas takes over (tied to the same circle-wipe scroll trigger).

### Chat widget (floating FAB)
- Fixed bottom-right, 56px circle, violet accent, pulsing dot to show founder online.
- Click → expands to 360×480 chat panel above the FAB.
- Messages polled every 2s via `/api/chat/messages?sessionId={id}`.
- Investor sends → `/api/chat` → Telegram notification to founder.
- Founder replies in Telegram with `/reply {sessionId} {text}` → stored in KV → investor sees reply in ≤2s.
- CTA button in the Ask section can trigger `openChat()` directly (`data-chat-open`).

### ROI Calculator (pinned section)
- Only rendered if `config.features.roiCalculator === true`.
- Inserted between Market and Traction sections via ScrollTrigger **pin**: when the investor scrolls into the ROI section, scroll progression pauses for the pin duration while they interact. After they scroll past the pin, normal progression resumes.
- Center-aligned (exception to side-alignment rule, since it needs input focus and visual balance).
- Default values from `config.roiCalculator.defaults`.
- Live recalculation on input change. Big result number with counter animation.

### Feedback box
- Below the Ask section, after scroll completes. Fades in when the investor reaches the bottom.
- Text area + submit button. Stored in KV, notifies founder via Telegram.

---

## Analytics

Tracked client-side, posted to `/api/analytics`. Same model as the previous spec.

**Events**:
- `open` — fired on page load with `token` from `?t=` query param
- `section-enter` — fired when a section's enter threshold is crossed (for heatmap)
- `section-time` — fired on section leave or page unload, includes duration

**KV keys**:
```
open:{token}          → list of OpenEvent
section-time:{sessionId} → list of SectionTimeEvent
chat:{sessionId}      → list of ChatMessage
feedback              → list of FeedbackEntry
```

---

## Routes

| Route | Audience | Auth | Served as |
|---|---|---|---|
| `/` | Any | — | Redirect to `/deck` |
| `/deck` | Investor | Unique token in `?t=` | Static HTML from `public/deck/index.html` |
| `/dashboard` | Founder | Password cookie | Next.js React page |
| `/dashboard/login` | Founder | — | Login form |

---

## Deployment

- **Platform**: Vercel
- **Database**: Vercel KV (Redis)
- **Static assets**: `public/deck/*` bundled with the app
- **Frame extraction**: run `./scripts/extract-frames.sh path/to/video.mp4` before deploy; frames written to `public/deck/frames/`
- **Founder video**: founder drops `founder-cutout.webm` + `founder-fallback.jpg` into `public/deck/media/`
- **Env vars**: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `DASHBOARD_PASSWORD`, `KV_URL`, `KV_REST_API_TOKEN`

---

## Out of Scope (MVP)

- AI deck generation (deferred to v2 / productization)
- Multi-deck hosting (one deployment = one deck)
- Multi-tenant founder accounts
- Custom domains per deck
- Email notifications (Telegram only)
- Video background-removal tooling (founder uses CapCut externally)
- Safari full alpha support (static image fallback is acceptable for MVP)

---

## Verification

Before marking the spec complete:

1. **Canvas frame rendering** — scroll the deck, watch the product demo play frame-by-frame smoothly, completing by ~55% scroll
2. **Circle-wipe hero reveal** — hero fades, canvas reveals from a growing circle at 1–7% scroll
3. **Section animations** — each section enters with a different animation from its neighbors
4. **ROI calculator pin** — scrolling into the ROI section pauses canvas, inputs recalculate live, scrolling past resumes canvas
5. **Chat widget round-trip** — send a test message from the deck, receive it on Telegram, reply with `/reply`, see the reply appear in the widget within 2s
6. **Feedback submission** — submit a test feedback, see it in `/dashboard` and as a Telegram notification
7. **Dashboard analytics** — open the deck with `?t=test`, scroll through, see the open event + per-section heatmap in `/dashboard`
8. **Safari fallback** — open in Safari, confirm static founder image shows instead of WebM
9. **Mobile** — responsive breakpoint under 768px collapses to centered text with dark overlays

---

## Open for implementation planning

- Exact section content copy (will be written when we fill `deck.config.ts`)
- Product demo video file location (pending Mike's new recording)
- Founder cutout video file location (pending CapCut export as WebM)
- Fallback image (pending founder photo)

These do not block spec approval — the template runs with placeholders and swaps content without code changes.
