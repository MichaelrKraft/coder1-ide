# Interactive Investor Deck — Design Spec

**Date**: 2026-04-08  
**Status**: Approved for implementation  
**Approach**: Option C — self-hosted Next.js template, deployed to Vercel, built for Coder1's own investor deck first. Productize later.

---

## Overview

A standalone Next.js application that turns a Marp `.md` file into a live, interactive investor pitch deck hosted at a URL. It replaces static PDFs and Keynote exports with a scrollable web experience that includes real-time founder chat, an ROI calculator, scroll animations, live metrics, a draggable cutout founder video, and a feedback box — plus a separate founder dashboard for analytics.

The Marp file is the **content source** (slide text, bullets, speaker notes). The Next.js template provides the **interactive layer** (layout, animations, chat, analytics). Content and presentation are separated cleanly.

---

## Two Routes

| Route | Audience | Auth |
|---|---|---|
| `/deck` (or `/`) | Investor | None (link has unique token `?t=abc123`) |
| `/dashboard` | Founder | Password-protected (NextAuth or simple env-var secret) |

Each investor link is a unique token. The token identifies which investor opened the deck so the founder dashboard can show per-investor analytics.

---

## Architecture

```
Next.js 14 (App Router) on Vercel
├── app/deck/page.tsx          — Investor-facing scrollable deck
├── app/dashboard/page.tsx     — Founder analytics dashboard (auth-gated)
├── app/api/chat/route.ts      — Receive investor message → forward to Telegram
├── app/api/telegram/route.ts  — Telegram webhook → push reply to investor via SSE
├── app/api/analytics/route.ts — Track section time, open events
├── app/api/feedback/route.ts  — Receive end-of-deck feedback
├── content/deck.md            — Marp source file (the deck content)
├── content/deck.config.ts     — Live data, ROI calculator params, founder info
└── lib/
    ├── marp-parser.ts         — Extracts slides from Marp frontmatter + separators
    ├── analytics.ts           — Vercel KV read/write helpers
    └── telegram.ts            — Telegram Bot API helpers
```

**Database**: Vercel KV (Redis-compatible). Stores: open events, per-section time, chat messages, feedback. No SQL schema needed — simple key-value with JSON values.

**Real-time chat**: Server-Sent Events (SSE). Investor page opens a persistent `/api/chat/stream` SSE connection. When the Telegram webhook fires, it pushes the founder's reply into that stream. No WebSocket server needed — Vercel Edge Functions handle SSE.

---

## Content Model

The Marp `.md` file is parsed at build time (or request time for live data). Each slide separated by `---` becomes one page section. The parser extracts:

- **Slide number** → maps to the 13-section framework from the Billion $ Pitch Deck Checklist
- **Title** (first `#` heading in the slide)
- **Body** (remaining markdown content)
- **Speaker notes** (after `<!--` ... `-->`) → used as section subtitle or animation cue

The `deck.config.ts` file handles everything the Marp format can't express:
```ts
export const config = {
  company: "Coder1 IDE",
  tagline: "The First Agentic IDE for Claude Code Users",
  liveMetrics: {
    arr: 2_000_000,        // or a fetch from Stripe/Baremetrics
    users: 12_400,         // or a fetch from PostHog
    growth: "340% YoY",
  },
  roiCalculator: {
    defaults: { developers: 12, hoursSavedPerWeek: 8, costPerHour: 150 },
    formula: (devs, hrs, cost) => devs * hrs * cost * 52,
  },
  founder: {
    name: "Mike Kraft",
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT_ID,
    videoPath: "/founder-cutout.webm",   // WebM with alpha channel
  },
  auth: {
    dashboardPassword: process.env.DASHBOARD_PASSWORD,
  },
};
```

---

## Investor Page (`/deck`)

### Layout
- **Main column** (left, ~70% width): scrollable deck sections, one per slide, each min-height 100vh
- **Right overlay** (fixed, ~280px): progress nav + draggable founder video + chat widget

### Scroll Animations
Intersection Observer API. Each section starts at `opacity: 0, translateY: 24px`. When it enters the viewport (threshold 0.2), it transitions to `opacity: 1, translateY: 0` over 500ms. CSS-only transition, no animation library needed.

### Sections (mapped from 13-section framework)
1. Cover / Hero — company name, tagline, live metrics badges
2. Hook — the one-line story
3. Problem — with pain score indicators
4. Solution — feature highlights with icon grid
5. Why Now — timing context
6. Product Demo — embedded video or screenshot carousel
7. Market Size — TAM/SAM/SOM visualization
8. Business Model — unit economics table
9. Traction — key metrics (live data from config)
10. Competition — positioning matrix
11. Go-to-Market — channel strategy
12. Team — founder cards
13. The Ask — funding amount, use of funds, CTA

### ROI Calculator
A React component rendered inside the "Business Model" or a dedicated "Value" section. Uses `useState` for input values. No external library. Inputs: number of developers, hours saved/week, eng cost/hr. Output: annual savings. Pre-populated from `config.roiCalculator.defaults`. Updates in real time as investor adjusts sliders.

### Founder Video
- File format: WebM with alpha channel (transparent background). Produced once with a background-removal tool (Unscreen, CapCut, or `ffmpeg` + `rembg`).
- Positioned: `position: fixed`, bottom-right corner, z-index above content.
- Draggable: `pointer-events` + `mousedown`/`mousemove`/`mouseup` listeners. Position stored in `localStorage` so it persists if the investor refreshes.
- Can be minimized (click to toggle collapsed state).
- Different video clips can be specified per-section in config (optional).

### Live Chat Widget
- Fixed in right overlay, always visible.
- Investor types message → POST `/api/chat` with `{ sessionId, message }` → API sends to Telegram via Bot API.
- Founder replies in Telegram → Telegram hits `/api/telegram` webhook → API looks up the SSE stream for that `sessionId` → pushes reply event.
- Investor page has an open SSE connection to `/api/chat/stream?sessionId=xxx`.
- Messages stored in Vercel KV: `chat:{sessionId}` → array of `{ role, text, ts }`.
- "Online" indicator: shows founder as online if last activity < 5 min ago (env-var heartbeat or manual toggle).

### Feedback Box
Last section of the deck (after The Ask). Simple form: text area + submit button. Labeled "Not the right fit right now? Your feedback helps us." On submit: POST `/api/feedback` with `{ sessionId, message }`. Stored in KV, triggers a Telegram notification to founder.

---

## Founder Dashboard (`/dashboard`)

Auth: simple middleware check against `DASHBOARD_PASSWORD` env var. Single-founder use case — no user table needed.

### What it shows:
- **Open events**: list of investor tokens, when they opened the deck, how many times, last seen
- **Time heatmap**: per-investor, per-section time spent (bar chart, color-coded by engagement)
- **Chat history**: full transcript per investor session
- **Feedback**: collected responses from the feedback box
- **Link generator**: create a new investor-specific token URL to share

### Analytics data model (Vercel KV):
```
open:{token}:{date}          → { openedAt, userAgent, referrer }
section-time:{sessionId}     → { sectionIndex: seconds, ... }
chat:{sessionId}             → [{ role, text, ts }, ...]
feedback:{sessionId}         → { message, ts }
tokens                       → { token: { label, createdAt }, ... }
```

---

## Analytics Tracking (Investor Page)

Tracking happens client-side via `IntersectionObserver`:
- When a section enters viewport: record `{ sectionIndex, enteredAt }` in component state
- When it leaves viewport: compute `durationSeconds = now - enteredAt`, POST to `/api/analytics`
- On page unload (`beforeunload` event): flush any active section's time

First open: POST `/api/analytics/open` with `{ token }` immediately on page load.

All tracking is anonymous from the investor's perspective. The token in the URL is the only identifier — no cookies, no PII collected.

---

## Deployment

One-click Vercel deploy. The README will include a "Deploy to Vercel" button. Required env vars:
```
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
DASHBOARD_PASSWORD=
KV_URL=                  # auto-set by Vercel KV add-on
KV_REST_API_TOKEN=       # auto-set by Vercel KV add-on
```

Telegram webhook registration: one-time setup, documented in README.

---

## What's Out of Scope (MVP)

- Multi-founder / team accounts
- Custom domains per deck (Vercel handles `*.vercel.app`)
- Multiple decks per deployment (one deployment = one deck)
- Email notifications (Telegram only for MVP)
- Video background removal tooling — founder handles this externally, drops `.webm` file into `/public`
- AI-assisted deck generation (future: Claude generates the Marp .md from a brief)

---

## Scope Assessment

This is a contained, single-purpose Next.js app. The most complex piece is the real-time chat (SSE + Telegram webhook). Everything else is straightforward React + Vercel KV. The analytics tracking is pure client-side JS with a simple API write. The founder video is a file drop + CSS positioning.

No contradictions. No ambiguity. Ready for implementation planning.
