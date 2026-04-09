# Deckpress — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build **Deckpress** — a standalone hybrid Next.js 14 + vanilla HTML/CSS/JS app at `/Users/michaelkraft/autonomous_vibe_interface/deckpress/` that renders an interactive, scroll-driven investor pitch deck using the Deckpress visual system (Lenis + GSAP + canvas frame rendering) over the 8-section compressed Billion $ Pitch Deck framework.

**Supersedes:** `2026-04-08-interactive-investor-deck.md`
**Spec:** `2026-04-09-deckpress-design.md`

**Architecture:** The cinematic deck frontend lives in `public/deck/` as vanilla HTML/CSS/JS with Lenis + GSAP + ScrollTrigger loaded from CDN (per the Deckpress skill — no bundler interference). The Next.js App Router provides `/dashboard` (password-gated founder analytics) and `/api/*` routes for chat (Telegram-backed polling), analytics, and feedback. Vercel KV stores all data. Single deployment, single origin.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS 3 (dashboard only), Vercel KV (`@vercel/kv`), Vitest + RTL + jsdom; Vanilla HTML/CSS/JS + CDN Lenis 1 + GSAP 3 + ScrollTrigger (deck frontend)

**Project root:** `/Users/michaelkraft/autonomous_vibe_interface/deckpress/`

---

## File Map

```
deckpress/
├── public/
│   ├── deck/                           — Cinematic vanilla frontend
│   │   ├── index.html
│   │   ├── css/style.css
│   │   ├── js/
│   │   │   ├── app.js                  — Lenis + canvas + section animations
│   │   │   ├── config.js               — Injected from deck.config.ts at build
│   │   │   ├── chat.js                 — Floating chat FAB
│   │   │   ├── analytics.js            — Open + section time tracking
│   │   │   ├── feedback.js             — Feedback box
│   │   │   └── roi.js                  — Optional ROI calculator
│   │   ├── frames/                     — Extracted product demo frames
│   │   │   └── frame_0001.webp ...
│   │   └── media/
│   │       ├── founder-cutout.webm     — Hero cutout (alpha, WebM VP9)
│   │       └── founder-fallback.jpg    — Safari fallback
│   └── favicon.ico
├── app/
│   ├── layout.tsx                      — Dashboard root layout
│   ├── page.tsx                        — Redirect → /deck
│   ├── dashboard/
│   │   ├── page.tsx                    — Analytics dashboard
│   │   └── login/page.tsx              — Password form
│   └── api/
│       ├── analytics/route.ts
│       ├── chat/
│       │   ├── route.ts                — POST investor message → Telegram
│       │   └── messages/route.ts       — GET poll messages
│       ├── feedback/route.ts
│       ├── telegram/route.ts           — Webhook: store founder /reply
│       └── dashboard-auth/route.ts
├── lib/
│   ├── kv.ts
│   ├── telegram.ts
│   ├── auth.ts
│   └── build-config.ts                 — Generates public/deck/js/config.js from deck.config.ts
├── content/
│   └── deck.config.ts                  — Single source of truth
├── scripts/
│   ├── extract-frames.sh
│   └── build-deck-config.ts            — Runs build-config.ts during prebuild
├── __tests__/
│   ├── kv.test.ts
│   ├── marp-parser.test.ts             — (removed, replaced by config)
│   ├── api.analytics.test.ts
│   ├── api.chat.test.ts
│   ├── api.feedback.test.ts
│   └── build-config.test.ts
├── middleware.ts
├── next.config.ts                      — Rewrites /deck → /deck/index.html
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── vitest.setup.ts
├── package.json
├── .env.example
├── vercel.json
└── README.md
```

---

## Build Order & Task Overview

| # | Task | Files touched | Tests |
|---|---|---|---|
| 1 | Scaffold Next.js + Vitest + deps | project root | — |
| 2 | KV helpers | `lib/kv.ts` | `__tests__/kv.test.ts` |
| 3 | Telegram + auth libs | `lib/telegram.ts`, `lib/auth.ts`, `middleware.ts` | — |
| 4 | API routes (analytics, chat, feedback, telegram, dashboard-auth) | `app/api/**` | `__tests__/api.*.test.ts` |
| 5 | Deck config + build-config script | `content/deck.config.ts`, `lib/build-config.ts`, `scripts/build-deck-config.ts` | `__tests__/build-config.test.ts` |
| 6 | Frame extraction script | `scripts/extract-frames.sh` | — |
| 7 | Deckpress HTML skeleton | `public/deck/index.html` | — |
| 8 | Deckpress CSS (design tokens, layout, responsive) | `public/deck/css/style.css` | — |
| 9 | app.js — Lenis, loader, canvas renderer, frame preloader | `public/deck/js/app.js` | manual |
| 10 | app.js — Section animations, counters, marquee, dark overlay, circle-wipe hero | `public/deck/js/app.js` | manual |
| 11 | Chat widget (vanilla FAB) | `public/deck/js/chat.js` | manual |
| 12 | Analytics tracker | `public/deck/js/analytics.js` | manual |
| 13 | Feedback box | `public/deck/js/feedback.js` | manual |
| 14 | ROI calculator (optional pinned section) | `public/deck/js/roi.js` | manual |
| 15 | Founder hero cutout + Safari fallback | `public/deck/index.html` + `public/deck/js/app.js` | manual |
| 16 | Dashboard pages | `app/dashboard/**` | manual |
| 17 | Coder1 deck content fill-in | `content/deck.config.ts` | — |
| 18 | Deployment setup + README | `vercel.json`, `README.md`, `.env.example` | — |

---

### Task 1: Scaffold

- [ ] **Step 1: Bootstrap Next.js app**

```bash
cd /Users/michaelkraft/autonomous_vibe_interface
npx create-next-app@14 deckpress \
  --typescript --tailwind --app --no-src-dir --import-alias "@/*" --no-eslint
cd deckpress
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @vercel/kv
npm install --save-dev vitest @vitejs/plugin-react \
  @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event jsdom
```

- [ ] **Step 3: Create `vitest.config.ts` + `vitest.setup.ts`**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: ['./vitest.setup.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
});
```

```ts
// vitest.setup.ts
import '@testing-library/jest-dom';
```

- [ ] **Step 4: Add scripts to `package.json`**

```json
"scripts": {
  "dev": "next dev",
  "build": "npm run build:config && next build",
  "build:config": "tsx scripts/build-deck-config.ts",
  "start": "next start",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

Install `tsx`:
```bash
npm install --save-dev tsx
```

- [ ] **Step 5: Create `.env.example`**

```
KV_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=
KV_REST_API_READ_ONLY_TOKEN=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
DASHBOARD_PASSWORD=changeme
NEXT_PUBLIC_DECK_URL=https://deckpress.vercel.app
```

- [ ] **Step 6: Configure `next.config.ts` rewrites**

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/deck', destination: '/deck/index.html' },
    ];
  },
  async redirects() {
    return [{ source: '/', destination: '/deck', permanent: false }];
  },
};

export default nextConfig;
```

- [ ] **Step 7: Commit**

```bash
cd /Users/michaelkraft/autonomous_vibe_interface
git add deckpress/
git commit -m "feat(deckpress): scaffold Next.js 14 + Vitest"
```

---

### Task 2: KV Helpers

**Files:** `lib/kv.ts`, `__tests__/kv.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/kv.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@vercel/kv', () => ({
  kv: { lpush: vi.fn(), lrange: vi.fn(), keys: vi.fn() },
}));

import { kv } from '@vercel/kv';
import {
  recordOpenEvent, recordSectionTime, appendChatMessage,
  getChatMessages, appendFeedback, getAllFeedback, type ChatMessage,
} from '@/lib/kv';

beforeEach(() => vi.clearAllMocks());

describe('recordOpenEvent', () => {
  it('stores under open:{token}', async () => {
    vi.mocked(kv.lpush).mockResolvedValue(1);
    await recordOpenEvent('tok1', 'UA', 'ref');
    expect(kv.lpush).toHaveBeenCalledWith(
      'open:tok1',
      expect.objectContaining({ token: 'tok1', userAgent: 'UA' })
    );
  });
});

describe('getChatMessages', () => {
  it('returns chronological order', async () => {
    vi.mocked(kv.lrange).mockResolvedValue([
      { role: 'founder', text: 'A', ts: 2 },
      { role: 'investor', text: 'Q', ts: 1 },
    ]);
    const msgs = await getChatMessages('s1');
    expect(msgs[0].ts).toBe(1);
    expect(msgs[1].ts).toBe(2);
  });
});

describe('appendFeedback + getAllFeedback', () => {
  it('stores and retrieves', async () => {
    vi.mocked(kv.lpush).mockResolvedValue(1);
    await appendFeedback('s1', 'great deck');
    expect(kv.lpush).toHaveBeenCalledWith(
      'feedback',
      expect.objectContaining({ sessionId: 's1', message: 'great deck' })
    );
  });
});
```

- [ ] **Step 2: Implement `lib/kv.ts`**

```ts
import { kv } from '@vercel/kv';

export interface OpenEvent { token: string; openedAt: number; userAgent: string; referrer: string; }
export interface SectionTimeEvent { sectionIndex: number; seconds: number; ts: number; }
export interface ChatMessage { role: 'investor' | 'founder'; text: string; ts: number; }
export interface FeedbackEntry { sessionId: string; message: string; ts: number; }

export async function recordOpenEvent(token: string, userAgent: string, referrer: string) {
  const event: OpenEvent = { token, openedAt: Date.now(), userAgent, referrer };
  await kv.lpush(`open:${token}`, event);
}

export async function recordSectionTime(sessionId: string, sectionIndex: number, seconds: number) {
  const event: SectionTimeEvent = { sectionIndex, seconds, ts: Date.now() };
  await kv.lpush(`section-time:${sessionId}`, event);
}

export async function appendChatMessage(sessionId: string, msg: Pick<ChatMessage, 'role' | 'text'>) {
  const full: ChatMessage = { ...msg, ts: Date.now() };
  await kv.lpush(`chat:${sessionId}`, full);
}

export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
  const msgs = await kv.lrange<ChatMessage>(`chat:${sessionId}`, 0, 99);
  return msgs.sort((a, b) => a.ts - b.ts);
}

export async function appendFeedback(sessionId: string, message: string) {
  const entry: FeedbackEntry = { sessionId, message, ts: Date.now() };
  await kv.lpush('feedback', entry);
}

export async function getAllFeedback(): Promise<FeedbackEntry[]> {
  return (await kv.lrange<FeedbackEntry>('feedback', 0, 99)).sort((a, b) => b.ts - a.ts);
}

export async function getAllOpenTokens(): Promise<string[]> {
  const keys = await kv.keys('open:*');
  return keys.map((k) => k.replace('open:', ''));
}

export async function getOpensForToken(token: string): Promise<OpenEvent[]> {
  return kv.lrange<OpenEvent>(`open:${token}`, 0, 49);
}
```

- [ ] **Step 3: Run tests — verify pass**

```bash
npx vitest run __tests__/kv.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add lib/kv.ts __tests__/kv.test.ts
git commit -m "feat(deckpress): add Vercel KV typed helpers"
```

---

### Task 3: Telegram + Auth + Middleware

**Files:** `lib/telegram.ts`, `lib/auth.ts`, `middleware.ts`

- [ ] **Step 1: Create `lib/telegram.ts`**

```ts
export async function sendTelegramMessage(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn('Telegram not configured — skipping');
    return;
  }
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
}

export function formatInvestorMessage(sessionId: string, token: string, message: string): string {
  return `🔔 *Deckpress message* from \`${token}\`\n\n"${message}"\n\nReply:\n\`/reply ${sessionId} your message\``;
}

export function parseTelegramReply(text: string): { sessionId: string; message: string } | null {
  const m = text.match(/^\/reply\s+(\S+)\s+([\s\S]+)$/);
  return m ? { sessionId: m[1], message: m[2].trim() } : null;
}
```

- [ ] **Step 2: Create `lib/auth.ts`**

```ts
export function checkDashboardAuth(password: string): boolean {
  const expected = process.env.DASHBOARD_PASSWORD;
  return !!expected && password === expected;
}
```

- [ ] **Step 3: Create `middleware.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/dashboard') || pathname === '/dashboard/login') {
    return NextResponse.next();
  }
  const cookie = request.cookies.get('dashboard-auth');
  if (cookie?.value === process.env.DASHBOARD_PASSWORD) return NextResponse.next();
  return NextResponse.redirect(new URL('/dashboard/login', request.url));
}

export const config = { matcher: ['/dashboard/:path*'] };
```

- [ ] **Step 4: Commit**

```bash
git add lib/telegram.ts lib/auth.ts middleware.ts
git commit -m "feat(deckpress): add Telegram, auth, and dashboard middleware"
```

---

### Task 4: API Routes

**Files:** `app/api/analytics/route.ts`, `app/api/chat/route.ts`, `app/api/chat/messages/route.ts`, `app/api/feedback/route.ts`, `app/api/telegram/route.ts`, `app/api/dashboard-auth/route.ts`

- [ ] **Step 1: Write failing tests** for analytics, chat, feedback (one file each). Skeleton for `api.analytics.test.ts`:

```ts
// __tests__/api.analytics.test.ts
import { describe, it, expect, vi } from 'vitest';
vi.mock('@/lib/kv', () => ({ recordOpenEvent: vi.fn(), recordSectionTime: vi.fn() }));

describe('/api/analytics', () => {
  it('rejects missing type', async () => {
    const { POST } = await import('@/app/api/analytics/route');
    const req = new Request('http://x/api/analytics', {
      method: 'POST', body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('records open event', async () => {
    const { recordOpenEvent } = await import('@/lib/kv');
    const { POST } = await import('@/app/api/analytics/route');
    const req = new Request('http://x/api/analytics', {
      method: 'POST', body: JSON.stringify({ type: 'open', token: 'a16z' }),
      headers: { 'Content-Type': 'application/json' },
    });
    await POST(req as any);
    expect(recordOpenEvent).toHaveBeenCalledWith('a16z', expect.any(String), expect.any(String));
  });
});
```

Repeat pattern for chat and feedback routes.

- [ ] **Step 2: Create `app/api/analytics/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { recordOpenEvent, recordSectionTime } from '@/lib/kv';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, token, sessionId, sectionIndex, seconds } = body;

  if (type === 'open') {
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }
    await recordOpenEvent(
      token,
      request.headers.get('user-agent') ?? '',
      request.headers.get('referer') ?? ''
    );
    return NextResponse.json({ ok: true });
  }

  if (type === 'section-time') {
    if (!sessionId || typeof sectionIndex !== 'number' || typeof seconds !== 'number') {
      return NextResponse.json({ error: 'invalid section-time payload' }, { status: 400 });
    }
    await recordSectionTime(sessionId, sectionIndex, seconds);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown event type' }, { status: 400 });
}
```

- [ ] **Step 3: Create `app/api/chat/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { appendChatMessage } from '@/lib/kv';
import { sendTelegramMessage, formatInvestorMessage } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  const { sessionId, message } = await request.json();
  if (!sessionId || !message) {
    return NextResponse.json({ error: 'sessionId and message required' }, { status: 400 });
  }
  const token = sessionId.split('-')[0] || sessionId.slice(0, 8);
  await appendChatMessage(sessionId, { role: 'investor', text: message.slice(0, 500) });
  await sendTelegramMessage(formatInvestorMessage(sessionId, token, message));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Create `app/api/chat/messages/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getChatMessages } from '@/lib/kv';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  return NextResponse.json({ messages: await getChatMessages(sessionId) });
}
```

- [ ] **Step 5: Create `app/api/telegram/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { appendChatMessage } from '@/lib/kv';
import { parseTelegramReply } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const text = body?.message?.text ?? '';
  const parsed = parseTelegramReply(text);
  if (!parsed) return NextResponse.json({ ok: true });
  await appendChatMessage(parsed.sessionId, { role: 'founder', text: parsed.message.slice(0, 500) });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Create `app/api/feedback/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { appendFeedback } from '@/lib/kv';
import { sendTelegramMessage } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  const { sessionId, message } = await request.json();
  if (!sessionId || !message) {
    return NextResponse.json({ error: 'sessionId and message required' }, { status: 400 });
  }
  await appendFeedback(sessionId, message.slice(0, 1000));
  await sendTelegramMessage(`📝 *Deckpress feedback* from \`${sessionId}\`:\n\n"${message}"`);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 7: Create `app/api/dashboard-auth/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { checkDashboardAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  if (!checkDashboardAuth(password)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('dashboard-auth', password, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
```

- [ ] **Step 8: Run tests**

```bash
npx vitest run __tests__/api.*.test.ts
```

- [ ] **Step 9: Commit**

```bash
git add app/api/ __tests__/api.*.test.ts
git commit -m "feat(deckpress): add API routes for analytics, chat, feedback, telegram, auth"
```

---

### Task 5: Deck Config + Build-Config Script

**Files:** `content/deck.config.ts`, `lib/build-config.ts`, `scripts/build-deck-config.ts`, `__tests__/build-config.test.ts`

The deck config is the single source of truth. A build-time script serializes it to `public/deck/js/config.js` so the vanilla frontend can consume it without a bundler.

- [ ] **Step 1: Create `content/deck.config.ts`** (placeholder content — filled in Task 17)

```ts
export interface StatDef {
  value: number;
  suffix?: string;
  label: string;
  decimals: number;
}

export interface SectionDef {
  id: string;
  label: string;              // "001 / Pain Test"
  heading: string;
  body: string;
  animation: 'fade-up' | 'slide-left' | 'slide-right' | 'scale-up' | 'rotate-in' | 'stagger-up' | 'clip-reveal';
  enter: number;              // scroll % (0-100)
  leave: number;              // scroll % (0-100)
  stats?: StatDef[];
  persist?: boolean;
  cta?: { label: string; action: 'openChat' };
}

export interface DeckConfig {
  company: string;
  tagline: string;
  hero: {
    heading: string[];        // word-split for animation
    founderCutout: {
      enabled: boolean;
      videoPath: string;
      fallbackImage: string;
      playByDefault: boolean;
    };
  };
  sections: SectionDef[];
  marquee: { text: string; fontSize: string; speed: number };
  features: { roiCalculator: boolean; feedbackBox: boolean; chatWidget: boolean; analytics: boolean };
  roiCalculator: {
    insertAfter: string;
    defaults: { developers: number; hoursSavedPerWeek: number; costPerHour: number };
    formulaSource: string;    // serialized as string since functions can't cross module boundaries
  };
  founder: { name: string; title: string };
  productDemoFrames: number;  // set by extract-frames.sh
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
    { id: 'problem', label: '001 / Pain Test', heading: 'TBD', body: 'TBD', animation: 'slide-left', enter: 18, leave: 32 },
    { id: 'solution', label: '002 / Clarity Test', heading: 'TBD', body: 'TBD', animation: 'slide-right', enter: 34, leave: 48 },
    { id: 'why-now', label: '003 / Timing Test', heading: 'TBD', body: 'TBD', animation: 'scale-up', enter: 50, leave: 60 },
    { id: 'market', label: '004 / Math Test', heading: 'TBD', body: 'TBD', animation: 'clip-reveal', enter: 62, leave: 72,
      stats: [
        { value: 8.4, suffix: 'B', label: 'Dev tooling TAM', decimals: 1 },
        { value: 4.4, suffix: 'M', label: 'Claude Code users', decimals: 1 },
        { value: 264, suffix: 'M', label: 'SOM at 10% capture', decimals: 0 },
      ],
    },
    { id: 'traction', label: '005 / Evidence Test', heading: 'TBD', body: 'TBD', animation: 'stagger-up', enter: 74, leave: 82,
      stats: [
        { value: 12400, label: 'Active users', decimals: 0 },
        { value: 2, suffix: 'M ARR', label: 'Annual recurring revenue', decimals: 1 },
        { value: 340, suffix: '% YoY', label: 'Growth', decimals: 0 },
        { value: 94, suffix: '%', label: '30-day retention', decimals: 0 },
      ],
    },
    { id: 'gtm-team', label: '006 / Founder-Market Fit', heading: 'TBD', body: 'TBD', animation: 'rotate-in', enter: 84, leave: 90 },
    { id: 'ask', label: '007 / The Ask', heading: 'TBD', body: 'TBD', animation: 'fade-up', enter: 92, leave: 100,
      persist: true, cta: { label: 'Chat with Mike', action: 'openChat' } },
  ],
  marquee: { text: 'BUILT · FOR · CLAUDE · CODE · USERS', fontSize: '14vw', speed: -25 },
  features: { roiCalculator: true, feedbackBox: true, chatWidget: true, analytics: true },
  roiCalculator: {
    insertAfter: 'market',
    defaults: { developers: 12, hoursSavedPerWeek: 8, costPerHour: 150 },
    formulaSource: '(d, h, c) => d * h * c * 52',
  },
  founder: { name: 'Mike Kraft', title: 'Founder · Coder1 IDE' },
  productDemoFrames: 0,
};
```

- [ ] **Step 2: Write test for `build-config.ts`**

```ts
// __tests__/build-config.test.ts
import { describe, it, expect } from 'vitest';
import { serializeConfigToJs } from '@/lib/build-config';

describe('serializeConfigToJs', () => {
  it('produces a valid window.DECK_CONFIG assignment', () => {
    const config = { company: 'Test', sections: [] };
    const output = serializeConfigToJs(config as any);
    expect(output).toContain('window.DECK_CONFIG');
    expect(output).toContain('"company": "Test"');
  });
});
```

- [ ] **Step 3: Implement `lib/build-config.ts`**

```ts
import type { DeckConfig } from '@/content/deck.config';

export function serializeConfigToJs(config: DeckConfig): string {
  return `window.DECK_CONFIG = ${JSON.stringify(config, null, 2)};\n`;
}
```

- [ ] **Step 4: Implement `scripts/build-deck-config.ts`**

```ts
import { writeFileSync, existsSync, readdirSync } from 'fs';
import path from 'path';
import { config } from '../content/deck.config';
import { serializeConfigToJs } from '../lib/build-config';

const framesDir = path.join(__dirname, '..', 'public', 'deck', 'frames');
if (existsSync(framesDir)) {
  config.productDemoFrames = readdirSync(framesDir).filter((f) => f.endsWith('.webp')).length;
}

const output = serializeConfigToJs(config);
const outPath = path.join(__dirname, '..', 'public', 'deck', 'js', 'config.js');
writeFileSync(outPath, output, 'utf-8');
console.log(`✓ Wrote ${outPath} (${config.productDemoFrames} frames)`);
```

- [ ] **Step 5: Run test + manual build**

```bash
npx vitest run __tests__/build-config.test.ts
npm run build:config  # should write public/deck/js/config.js
```

- [ ] **Step 6: Commit**

```bash
git add content/ lib/build-config.ts scripts/build-deck-config.ts __tests__/build-config.test.ts
git commit -m "feat(deckpress): add deck config and build-config script"
```

---

### Task 6: Frame Extraction Script

**Files:** `scripts/extract-frames.sh`

- [ ] **Step 1: Create the script**

```bash
#!/usr/bin/env bash
set -euo pipefail

VIDEO="${1:-}"
if [[ -z "$VIDEO" || ! -f "$VIDEO" ]]; then
  echo "Usage: ./scripts/extract-frames.sh path/to/product-demo.mp4"
  exit 1
fi

OUT="public/deck/frames"
mkdir -p "$OUT"
rm -f "$OUT"/*.webp

DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VIDEO")
WIDTH=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$VIDEO")
HEIGHT=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$VIDEO")

echo "Video: ${WIDTH}x${HEIGHT}, ${DURATION}s"

# Choose fps based on duration (targeting 150-300 frames)
if (( $(echo "$DURATION < 10" | bc -l) )); then
  FPS=30
elif (( $(echo "$DURATION < 30" | bc -l) )); then
  FPS=12
else
  FPS=8
fi

# Scale width to 1920 max
SCALE_WIDTH=$(( WIDTH > 1920 ? 1920 : WIDTH ))

ffmpeg -i "$VIDEO" -vf "fps=${FPS},scale=${SCALE_WIDTH}:-1" \
  -c:v libwebp -quality 80 "$OUT/frame_%04d.webp"

COUNT=$(ls "$OUT"/*.webp | wc -l | tr -d ' ')
echo "✓ Extracted $COUNT frames to $OUT"
echo "→ Run 'npm run build:config' to update deck config"
```

- [ ] **Step 2: Make executable + commit**

```bash
chmod +x scripts/extract-frames.sh
git add scripts/extract-frames.sh
git commit -m "feat(deckpress): add ffmpeg frame extraction script"
```

---

### Task 7: Deckpress HTML Skeleton

**Files:** `public/deck/index.html`

- [ ] **Step 1: Create the skeleton**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex">
  <title>Deckpress</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/deck/css/style.css">
</head>
<body>
  <!-- 1. Loader -->
  <div id="loader">
    <div class="loader-brand">DECKPRESS</div>
    <div id="loader-bar"><div id="loader-bar-fill"></div></div>
    <div id="loader-percent">0%</div>
  </div>

  <!-- 2. Fixed header -->
  <header class="site-header">
    <nav>
      <span class="logo">CODER1</span>
      <div class="nav-links">
        <a href="#problem">Problem</a>
        <a href="#solution">Solution</a>
        <a href="#traction">Traction</a>
        <a href="#ask">The Ask</a>
      </div>
    </nav>
  </header>

  <!-- 3. Hero (standalone 100vh) -->
  <section class="hero-standalone">
    <span class="section-label">DECKPRESS · INVESTOR DECK</span>
    <h1 class="hero-heading" id="hero-heading"><!-- populated from config --></h1>
    <p class="hero-tagline" id="hero-tagline"><!-- populated from config --></p>

    <!-- Optional founder cutout video -->
    <div id="founder-cutout" class="founder-cutout hidden">
      <video id="founder-video" preload="metadata" playsinline>
        <source src="" type="video/webm">
      </video>
      <img id="founder-fallback" class="hidden" alt="Founder" />
      <button id="founder-play-toggle" class="founder-play-toggle" aria-label="Play founder video">▶</button>
    </div>

    <div class="scroll-indicator">
      <span>Scroll to explore</span>
      <div class="arrow">↓</div>
    </div>
  </section>

  <!-- 4. Canvas (fixed, revealed via circle-wipe) -->
  <div class="canvas-wrap">
    <canvas id="canvas"></canvas>
  </div>

  <!-- 5. Dark overlay (fixed, for stats sections) -->
  <div id="dark-overlay"></div>

  <!-- 6. Marquee -->
  <div class="marquee-wrap" data-scroll-speed="-25">
    <div class="marquee-text" id="marquee-text"><!-- populated from config --></div>
  </div>

  <!-- 7. Scroll container (1000vh, sections injected by app.js) -->
  <div id="scroll-container"></div>

  <!-- Chat widget (injected by chat.js) -->
  <div id="chat-root"></div>

  <!-- Feedback box (injected by feedback.js after scroll completes) -->
  <div id="feedback-root"></div>

  <!-- CDN libs -->
  <script src="https://cdn.jsdelivr.net/npm/lenis@1/dist/lenis.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js"></script>

  <!-- Deck config (generated by build-config.ts) -->
  <script src="/deck/js/config.js"></script>

  <!-- App -->
  <script src="/deck/js/app.js"></script>
  <script src="/deck/js/chat.js"></script>
  <script src="/deck/js/analytics.js"></script>
  <script src="/deck/js/feedback.js"></script>
  <script src="/deck/js/roi.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add public/deck/index.html
git commit -m "feat(deckpress): add vanilla HTML skeleton"
```

---

### Task 8: Deckpress CSS

**Files:** `public/deck/css/style.css`

Implement the full Deckpress visual system. Non-negotiables from the skill checklist must all be satisfied.

- [ ] **Step 1: Create `public/deck/css/style.css`**

```css
/* === Design tokens === */
:root {
  --bg-light: #f5f3f0;
  --bg-dark: #0a0a12;
  --text-on-light: #1a1a1a;
  --text-on-dark: #f0ede8;
  --text-muted: #666;
  --accent-violet: #7c3aed;
  --accent-cyan: #06b6d4;
  --font-display: 'Instrument Serif', serif;
  --font-body: 'Inter', sans-serif;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  background: var(--bg-light);
  color: var(--text-on-light);
  font-family: var(--font-body);
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

/* === Loader === */
#loader {
  position: fixed;
  inset: 0;
  background: var(--bg-dark);
  color: var(--text-on-dark);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: opacity 0.8s ease;
}
#loader.hidden { opacity: 0; pointer-events: none; }
.loader-brand { font-family: var(--font-display); font-size: 3rem; letter-spacing: 0.3em; margin-bottom: 2rem; }
#loader-bar { width: 240px; height: 2px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
#loader-bar-fill { width: 0%; height: 100%; background: var(--text-on-dark); transition: width 0.2s ease; }
#loader-percent { margin-top: 1rem; font-size: 0.75rem; letter-spacing: 0.2em; color: var(--text-muted); }

/* === Header === */
.site-header {
  position: fixed; top: 0; left: 0; right: 0;
  z-index: 100; padding: 2rem 4vw;
  mix-blend-mode: difference;
}
.site-header nav { display: flex; justify-content: space-between; align-items: center; }
.logo { font-family: var(--font-display); font-size: 1.5rem; color: var(--text-on-dark); letter-spacing: 0.2em; }
.nav-links { display: flex; gap: 2rem; }
.nav-links a { color: var(--text-on-dark); text-decoration: none; font-size: 0.75rem; letter-spacing: 0.15em; text-transform: uppercase; }

/* === Hero (standalone 100vh) === */
.hero-standalone {
  position: relative;
  height: 100vh;
  width: 100vw;
  background: var(--bg-dark);
  color: var(--text-on-dark);
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 5vw;
  overflow: hidden;
}
.hero-standalone .section-label {
  font-size: 0.75rem;
  letter-spacing: 0.3em;
  color: var(--accent-violet);
  margin-bottom: 2rem;
  text-transform: uppercase;
}
.hero-heading {
  font-family: var(--font-display);
  font-size: 12rem;
  line-height: 0.95;
  font-weight: 400;
  max-width: 90vw;
}
.hero-heading .word { display: inline-block; overflow: hidden; }
.hero-heading .word-inner { display: inline-block; }
.hero-tagline {
  margin-top: 2rem;
  font-size: 1.25rem;
  color: var(--text-muted);
  max-width: 40ch;
}

/* Founder cutout */
.founder-cutout {
  position: absolute;
  bottom: 0;
  right: 5vw;
  width: 420px;
  height: 560px;
  pointer-events: auto;
}
.founder-cutout.hidden { display: none; }
.founder-cutout video,
.founder-cutout img { width: 100%; height: 100%; object-fit: cover; }
.founder-cutout img.hidden { display: none; }
.founder-play-toggle {
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(10, 10, 18, 0.85);
  color: var(--text-on-dark);
  border: 1px solid rgba(255,255,255,0.2);
  cursor: pointer;
  font-size: 1rem;
  backdrop-filter: blur(8px);
}

.scroll-indicator {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  color: var(--text-muted);
  text-align: center;
  text-transform: uppercase;
}
.scroll-indicator .arrow {
  margin-top: 0.5rem;
  animation: bob 2s ease-in-out infinite;
}
@keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(6px); } }

/* === Canvas === */
.canvas-wrap {
  position: fixed;
  inset: 0;
  z-index: 1;
  clip-path: circle(0% at 50% 50%); /* animated by JS */
}
#canvas { width: 100%; height: 100%; background: var(--bg-light); }

/* === Dark overlay === */
#dark-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg-dark);
  opacity: 0;
  pointer-events: none;
  z-index: 2;
}

/* === Marquee === */
.marquee-wrap {
  position: fixed;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  overflow: hidden;
  pointer-events: none;
  z-index: 3;
  mix-blend-mode: difference;
}
.marquee-text {
  font-family: var(--font-display);
  font-size: 14vw;
  color: var(--text-on-dark);
  white-space: nowrap;
  line-height: 1;
  opacity: 0.12;
}

/* === Scroll container + sections === */
#scroll-container {
  position: relative;
  z-index: 4;
  min-height: 1000vh; /* set dynamically by JS based on section count */
}
.scroll-section {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none; /* sections are visual only, no interaction except stats/CTA */
  opacity: 0; /* animated in by GSAP */
}
.section-inner {
  max-width: 40vw;
  pointer-events: auto;
}
.align-left {
  padding-left: 5vw;
  padding-right: 55vw;
}
.align-right {
  padding-left: 55vw;
  padding-right: 5vw;
}
.section-label {
  display: block;
  font-size: 0.75rem;
  letter-spacing: 0.3em;
  color: var(--accent-violet);
  text-transform: uppercase;
  margin-bottom: 1.5rem;
}
.section-heading {
  font-family: var(--font-display);
  font-size: 4.5rem;
  line-height: 1.05;
  font-weight: 400;
  margin-bottom: 1.5rem;
  color: var(--text-on-light);
}
.section-body {
  font-size: 1.125rem;
  line-height: 1.6;
  color: var(--text-muted);
  max-width: 38ch;
}

/* Dark overlay sections → text on dark */
.section-on-dark .section-heading { color: var(--text-on-dark); }
.section-on-dark .section-body { color: rgba(240, 237, 232, 0.75); }

/* === Stats section === */
.section-stats {
  padding: 0 5vw;
  text-align: center;
}
.section-stats .section-inner { max-width: 90vw; margin: 0 auto; }
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 3rem;
  margin-top: 3rem;
}
.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stat-number {
  font-family: var(--font-display);
  font-size: 6rem;
  line-height: 1;
  color: var(--text-on-dark);
  font-weight: 400;
}
.stat-suffix {
  font-size: 2rem;
  color: var(--accent-cyan);
  margin-top: 0.25rem;
}
.stat-label {
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(240, 237, 232, 0.6);
  margin-top: 0.75rem;
}

/* === CTA section (persists) === */
.section-ask .cta-button {
  display: inline-block;
  margin-top: 2rem;
  padding: 1rem 2.5rem;
  background: var(--accent-violet);
  color: var(--text-on-dark);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border: none;
  cursor: pointer;
  border-radius: 0;
}

/* === ROI Calculator section (pinned, centered exception) === */
.section-roi {
  padding: 0 5vw;
  text-align: center;
}
.section-roi .section-inner {
  max-width: 600px;
  margin: 0 auto;
  pointer-events: auto;
}
.roi-inputs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin: 2rem 0;
}
.roi-input { display: flex; flex-direction: column; }
.roi-input label {
  font-size: 0.7rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}
.roi-input input {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.15);
  color: var(--text-on-dark);
  padding: 0.75rem;
  font-size: 1.25rem;
  font-family: var(--font-display);
  text-align: center;
}
.roi-result {
  margin-top: 2rem;
  padding: 2rem;
  background: rgba(124, 58, 237, 0.15);
  border: 1px solid rgba(124, 58, 237, 0.4);
}
.roi-result-label {
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--accent-violet);
  margin-bottom: 0.5rem;
}
.roi-result-value {
  font-family: var(--font-display);
  font-size: 4rem;
  color: var(--text-on-dark);
}

/* === Chat FAB === */
#chat-root {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 200;
}
.chat-fab {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--accent-violet);
  color: white;
  border: none;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(124, 58, 237, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.chat-fab-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #10b981;
  border: 2px solid white;
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.chat-panel {
  position: absolute;
  bottom: 72px;
  right: 0;
  width: 360px;
  height: 480px;
  background: #0f0f1e;
  border: 1px solid #1e2035;
  border-radius: 16px;
  display: none;
  flex-direction: column;
  overflow: hidden;
}
.chat-panel.open { display: flex; }
/* Full chat panel styles in chat.js */

/* === Feedback box === */
#feedback-root {
  position: relative;
  z-index: 5;
  padding: 6rem 5vw;
  background: var(--bg-dark);
  color: var(--text-on-dark);
  text-align: center;
  display: none; /* shown by feedback.js when scroll reaches bottom */
}
#feedback-root.visible { display: block; }

/* === Responsive === */
@media (max-width: 768px) {
  .hero-heading { font-size: 5rem; }
  .section-heading { font-size: 2.5rem; }
  .align-left, .align-right { padding: 0 5vw; }
  .align-left .section-inner, .align-right .section-inner { max-width: 100%; }
  .founder-cutout { display: none; } /* hide cutout on mobile */
  #scroll-container { min-height: 550vh; }
  .marquee-text { font-size: 18vw; }
  .hero-standalone { padding: 0 5vw; }
}
```

- [ ] **Step 2: Commit**

```bash
git add public/deck/css/style.css
git commit -m "feat(deckpress): add Deckpress visual system CSS"
```

---

### Task 9: app.js — Lenis + Loader + Canvas + Frame Preloader

**Files:** `public/deck/js/app.js`

- [ ] **Step 1: Create the canvas + preloader foundation**

```js
// public/deck/js/app.js
(function () {
  'use strict';

  const CONFIG = window.DECK_CONFIG;
  if (!CONFIG) {
    console.error('DECK_CONFIG not loaded');
    return;
  }

  const FRAME_COUNT = CONFIG.productDemoFrames || 0;
  const FRAME_SPEED = 2.0;
  const IMAGE_SCALE = 0.85;

  // === Lenis smooth scroll ===
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // === Canvas setup ===
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  let bgColor = '#f5f3f0';

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // === Frame preloader (two-phase) ===
  const frames = new Array(FRAME_COUNT);
  let loadedCount = 0;
  const loaderBar = document.getElementById('loader-bar-fill');
  const loaderPercent = document.getElementById('loader-percent');
  const loader = document.getElementById('loader');

  function framePath(i) {
    return `/deck/frames/frame_${String(i + 1).padStart(4, '0')}.webp`;
  }

  function loadFrame(i) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { frames[i] = img; resolve(); };
      img.onerror = () => { console.warn('Failed frame', i); resolve(); };
      img.src = framePath(i);
    });
  }

  async function preloadFrames() {
    const PRIORITY = Math.min(10, FRAME_COUNT);
    // Phase 1: first 10 frames (blocking for loader)
    for (let i = 0; i < PRIORITY; i++) {
      await loadFrame(i);
      loadedCount++;
      updateLoader();
    }

    // Phase 2: remaining frames (background)
    const remaining = [];
    for (let i = PRIORITY; i < FRAME_COUNT; i++) {
      remaining.push(
        loadFrame(i).then(() => {
          loadedCount++;
          updateLoader();
        })
      );
    }
    await Promise.all(remaining);

    // Hide loader after all frames ready
    loader.classList.add('hidden');
    document.body.classList.add('loaded');
    initScene();
  }

  function updateLoader() {
    const pct = FRAME_COUNT === 0 ? 100 : Math.round((loadedCount / FRAME_COUNT) * 100);
    loaderBar.style.width = pct + '%';
    loaderPercent.textContent = pct + '%';
  }

  // === Canvas renderer (padded cover) ===
  let currentFrame = -1;
  function drawFrame(index) {
    const img = frames[index];
    if (!img) return;
    const cw = canvas.width / (window.devicePixelRatio || 1);
    const ch = canvas.height / (window.devicePixelRatio || 1);
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

  // Expose to scene init
  window.__deckCanvas = { drawFrame, FRAME_COUNT, FRAME_SPEED };

  // === Init scene (called after preload) ===
  function initScene() {
    // Delegated to Task 10
    if (window.__initDeckScene) window.__initDeckScene();
  }

  // === Start ===
  if (FRAME_COUNT === 0) {
    // No frames yet (dev mode) — skip preloader
    loader.classList.add('hidden');
    initScene();
  } else {
    preloadFrames();
  }
})();
```

- [ ] **Step 2: Verify no JS errors**

```bash
npm run dev
# Visit http://localhost:3000/deck — loader should show, then hide
```

- [ ] **Step 3: Commit**

```bash
git add public/deck/js/app.js
git commit -m "feat(deckpress): add Lenis + frame preloader + canvas renderer"
```

---

### Task 10: app.js — Scene (Sections + Hero + Marquee + Dark Overlay + Counters)

**Files:** append to `public/deck/js/app.js`

- [ ] **Step 1: Add the scene initialization function**

Append to `app.js`:

```js
// === Scene init: runs after all frames preloaded ===
window.__initDeckScene = function () {
  const CONFIG = window.DECK_CONFIG;
  const canvas = document.getElementById('canvas');
  const canvasWrap = document.querySelector('.canvas-wrap');
  const heroSection = document.querySelector('.hero-standalone');
  const scrollContainer = document.getElementById('scroll-container');
  const { drawFrame, FRAME_COUNT, FRAME_SPEED } = window.__deckCanvas;

  gsap.registerPlugin(ScrollTrigger);

  // === 1. Populate hero ===
  const heroHeading = document.getElementById('hero-heading');
  heroHeading.innerHTML = CONFIG.hero.heading
    .map((word) => `<span class="word"><span class="word-inner">${word}&nbsp;</span></span>`)
    .join('');
  document.getElementById('hero-tagline').textContent = CONFIG.tagline;
  document.getElementById('marquee-text').textContent = CONFIG.marquee.text;

  // Animate hero heading words in
  gsap.from('.hero-heading .word-inner', {
    y: '100%',
    opacity: 0,
    stagger: 0.08,
    duration: 1.2,
    ease: 'power4.out',
    delay: 0.3,
  });

  // === 2. Build scroll sections from config ===
  scrollContainer.innerHTML = '';

  const renderedSections = [];
  CONFIG.sections.forEach((def, i) => {
    const section = document.createElement('section');
    const alignClass = i % 2 === 0 ? 'align-left' : 'align-right';
    const onDark = def.stats && def.stats.length > 0;
    section.className = `scroll-section section-content ${alignClass}${onDark ? ' section-on-dark' : ''}${def.id === 'ask' ? ' section-ask' : ''}${def.stats ? ' section-stats' : ''}`;
    section.dataset.enter = def.enter;
    section.dataset.leave = def.leave;
    section.dataset.animation = def.animation;
    section.dataset.sectionIndex = i;
    section.id = def.id;
    if (def.persist) section.dataset.persist = 'true';

    const midPct = (def.enter + def.leave) / 2;
    section.style.top = `${midPct}%`;

    const inner = document.createElement('div');
    inner.className = 'section-inner';

    inner.innerHTML = `
      <span class="section-label">${def.label}</span>
      <h2 class="section-heading">${def.heading}</h2>
      <p class="section-body">${def.body}</p>
    `;

    if (def.stats) {
      const grid = document.createElement('div');
      grid.className = 'stats-grid';
      def.stats.forEach((s) => {
        const stat = document.createElement('div');
        stat.className = 'stat';
        stat.innerHTML = `
          <span class="stat-number" data-value="${s.value}" data-decimals="${s.decimals}">0</span>
          ${s.suffix ? `<span class="stat-suffix">${s.suffix}</span>` : ''}
          <span class="stat-label">${s.label}</span>
        `;
        grid.appendChild(stat);
      });
      inner.appendChild(grid);
    }

    if (def.cta) {
      const btn = document.createElement('button');
      btn.className = 'cta-button';
      btn.textContent = def.cta.label;
      btn.dataset.chatOpen = '';
      inner.appendChild(btn);
    }

    section.appendChild(inner);
    scrollContainer.appendChild(section);
    renderedSections.push(section);
  });

  // === 3. Scroll container height ===
  // 1000vh default for 8 sections (roughly 125vh each)
  const totalVh = Math.max(1000, CONFIG.sections.length * 120);
  scrollContainer.style.minHeight = `${totalVh}vh`;

  // === 4. Frame-to-scroll binding ===
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      if (FRAME_COUNT === 0) return;
      const accelerated = Math.min(self.progress * FRAME_SPEED, 1);
      const index = Math.min(Math.floor(accelerated * FRAME_COUNT), FRAME_COUNT - 1);
      if (index !== window.__deckCanvas.currentFrame) {
        window.__deckCanvas.currentFrame = index;
        requestAnimationFrame(() => drawFrame(index));
      }
    },
  });

  // === 5. Circle-wipe hero reveal ===
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      heroSection.style.opacity = Math.max(0, 1 - p * 15);
      const wipeProgress = Math.min(1, Math.max(0, (p - 0.01) / 0.06));
      const radius = wipeProgress * 75;
      canvasWrap.style.clipPath = `circle(${radius}% at 50% 50%)`;
    },
  });

  // === 6. Section entrance animations ===
  renderedSections.forEach((section) => {
    const type = section.dataset.animation;
    const persist = section.dataset.persist === 'true';
    const enter = parseFloat(section.dataset.enter) / 100;
    const leave = parseFloat(section.dataset.leave) / 100;
    const children = section.querySelectorAll(
      '.section-label, .section-heading, .section-body, .cta-button, .stat'
    );

    const animations = {
      'fade-up':     { y: 50, opacity: 0, duration: 0.9, ease: 'power3.out' },
      'slide-left':  { x: -80, opacity: 0, duration: 0.9, ease: 'power3.out' },
      'slide-right': { x: 80, opacity: 0, duration: 0.9, ease: 'power3.out' },
      'scale-up':    { scale: 0.85, opacity: 0, duration: 1.0, ease: 'power2.out' },
      'rotate-in':   { y: 40, rotation: 3, opacity: 0, duration: 0.9, ease: 'power3.out' },
      'stagger-up':  { y: 60, opacity: 0, duration: 0.8, ease: 'power3.out' },
      'clip-reveal': { clipPath: 'inset(100% 0 0 0)', opacity: 0, duration: 1.2, ease: 'power4.inOut' },
    };
    const animProps = { ...animations[type], stagger: 0.12 };

    const tl = gsap.timeline({ paused: true });
    tl.from(children, animProps);

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

  // === 7. Counter animations ===
  document.querySelectorAll('.stat-number').forEach((el) => {
    const target = parseFloat(el.dataset.value);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    gsap.to(el, {
      textContent: target,
      duration: 2,
      ease: 'power1.out',
      snap: { textContent: decimals === 0 ? 1 : Math.pow(10, -decimals) },
      scrollTrigger: {
        trigger: el.closest('.scroll-section'),
        start: 'top 70%',
        toggleActions: 'play none none reverse',
      },
      onUpdate: function () {
        const val = parseFloat(el.textContent);
        el.textContent = decimals === 0
          ? Math.round(val).toLocaleString()
          : val.toFixed(decimals);
      },
    });
  });

  // === 8. Marquee ===
  const marqueeWrap = document.querySelector('.marquee-wrap');
  const speed = parseFloat(marqueeWrap.dataset.scrollSpeed) || -25;
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

  // === 9. Dark overlay for stats sections ===
  const darkOverlay = document.getElementById('dark-overlay');
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      // Find any section with stats that's currently in range
      let opacity = 0;
      for (const section of renderedSections) {
        if (!section.classList.contains('section-stats')) continue;
        const enter = parseFloat(section.dataset.enter) / 100;
        const leave = parseFloat(section.dataset.leave) / 100;
        const fade = 0.04;
        if (p >= enter - fade && p <= enter) opacity = Math.max(opacity, ((p - (enter - fade)) / fade) * 0.9);
        else if (p > enter && p < leave) opacity = Math.max(opacity, 0.9);
        else if (p >= leave && p <= leave + fade) opacity = Math.max(opacity, 0.9 * (1 - (p - leave) / fade));
      }
      darkOverlay.style.opacity = opacity;
    },
  });

  ScrollTrigger.refresh();
};
```

- [ ] **Step 2: Manual verification**

```bash
npm run dev
# Open http://localhost:3000/deck
# Verify: hero words animate in, scroll down to see circle-wipe, canvas reveals,
# sections fade in as you scroll, counters animate, marquee slides, dark overlay
# appears on stats sections.
```

- [ ] **Step 3: Commit**

```bash
git add public/deck/js/app.js
git commit -m "feat(deckpress): add section animations, counters, marquee, hero reveal"
```

---

### Task 11: Chat Widget (Vanilla FAB)

**Files:** `public/deck/js/chat.js`

- [ ] **Step 1: Create `public/deck/js/chat.js`**

```js
// public/deck/js/chat.js
(function () {
  'use strict';
  const CONFIG = window.DECK_CONFIG;
  if (!CONFIG.features.chatWidget) return;

  // Generate or get session ID
  const urlToken = new URLSearchParams(window.location.search).get('t') || 'direct';
  const sessionKey = 'deckpress-session';
  let sessionId = sessionStorage.getItem(sessionKey);
  if (!sessionId) {
    sessionId = `${urlToken}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    sessionStorage.setItem(sessionKey, sessionId);
  }
  window.__deckSessionId = sessionId;

  const root = document.getElementById('chat-root');
  root.innerHTML = `
    <div class="chat-panel" id="chat-panel">
      <div class="chat-header">
        <div class="chat-avatar">${CONFIG.founder.name.charAt(0)}</div>
        <div>
          <div class="chat-founder-name">${CONFIG.founder.name}</div>
          <div class="chat-status">● online</div>
        </div>
        <button class="chat-close" id="chat-close">×</button>
      </div>
      <div class="chat-messages" id="chat-messages"></div>
      <form class="chat-form" id="chat-form">
        <input type="text" id="chat-input" placeholder="Ask a question..." autocomplete="off" />
        <button type="submit">↑</button>
      </form>
    </div>
    <button class="chat-fab" id="chat-fab" aria-label="Chat with founder">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span class="chat-fab-dot"></span>
    </button>
  `;

  const fab = document.getElementById('chat-fab');
  const panel = document.getElementById('chat-panel');
  const closeBtn = document.getElementById('chat-close');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const messages = document.getElementById('chat-messages');

  function openChat() { panel.classList.add('open'); input.focus(); }
  function closeChat() { panel.classList.remove('open'); }

  fab.addEventListener('click', () => panel.classList.toggle('open'));
  closeBtn.addEventListener('click', closeChat);

  // Expose for CTA button
  window.__deckOpenChat = openChat;
  document.addEventListener('click', (e) => {
    if ((e.target).dataset && 'chatOpen' in (e.target).dataset) openChat();
  });

  // Poll messages every 2s
  async function pollMessages() {
    try {
      const res = await fetch(`/api/chat/messages?sessionId=${sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      renderMessages(data.messages || []);
    } catch (e) { /* ignore */ }
  }

  function renderMessages(msgs) {
    messages.innerHTML = msgs.map((m) => `
      <div class="chat-msg chat-msg-${m.role}">${escapeHtml(m.text)}</div>
    `).join('');
    messages.scrollTop = messages.scrollHeight;
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  pollMessages();
  setInterval(pollMessages, 2000);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    // Optimistic render
    const optimistic = [...(document.querySelectorAll('.chat-msg')), 0];
    messages.insertAdjacentHTML('beforeend', `<div class="chat-msg chat-msg-investor">${escapeHtml(text)}</div>`);
    messages.scrollTop = messages.scrollHeight;
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message: text }),
    });
  });
})();
```

- [ ] **Step 2: Add chat panel styles to `style.css`**

Append:
```css
.chat-panel {
  font-family: var(--font-body);
}
.chat-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-bottom: 1px solid #1e2035;
}
.chat-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-violet), var(--accent-cyan));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}
.chat-founder-name { font-size: 0.8rem; color: white; font-weight: 600; }
.chat-status { font-size: 0.7rem; color: #10b981; }
.chat-close {
  margin-left: auto;
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 1.5rem;
  cursor: pointer;
}
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.chat-msg {
  max-width: 80%;
  padding: 0.5rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  line-height: 1.4;
}
.chat-msg-investor { align-self: flex-end; background: #1e2035; color: #cbd5e1; }
.chat-msg-founder { align-self: flex-start; background: rgba(124,58,237,0.2); color: #c4b5fd; border: 1px solid rgba(124,58,237,0.4); }
.chat-form {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  border-top: 1px solid #1e2035;
}
.chat-form input {
  flex: 1;
  background: #1a1a2e;
  border: 1px solid #2d2d4a;
  border-radius: 20px;
  padding: 0.5rem 0.75rem;
  color: #cbd5e1;
  font-size: 0.8rem;
  outline: none;
}
.chat-form button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent-violet);
  color: white;
  border: none;
  cursor: pointer;
}
```

- [ ] **Step 3: Commit**

```bash
git add public/deck/js/chat.js public/deck/css/style.css
git commit -m "feat(deckpress): add vanilla chat FAB widget"
```

---

### Task 12: Analytics Tracker

**Files:** `public/deck/js/analytics.js`

- [ ] **Step 1: Create the tracker**

```js
// public/deck/js/analytics.js
(function () {
  'use strict';
  const CONFIG = window.DECK_CONFIG;
  if (!CONFIG.features.analytics) return;

  const token = new URLSearchParams(window.location.search).get('t') || 'direct';
  const sessionId = window.__deckSessionId || `${token}-${Date.now()}`;

  // Fire open event
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'open', token }),
  }).catch(() => {});

  // Track section time via IntersectionObserver
  const enteredAt = new Map();

  function flushSection(index) {
    const start = enteredAt.get(index);
    if (start === undefined) return;
    const seconds = Math.round((Date.now() - start) / 1000);
    enteredAt.delete(index);
    if (seconds < 2) return;
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'section-time', sessionId, sectionIndex: index, seconds }),
    }).catch(() => {});
  }

  // Wait for sections to be rendered
  const setupObserver = () => {
    const sections = document.querySelectorAll('[data-section-index]');
    if (sections.length === 0) {
      setTimeout(setupObserver, 500);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = Number(entry.target.dataset.sectionIndex);
          if (entry.isIntersecting) {
            enteredAt.set(idx, Date.now());
          } else {
            flushSection(idx);
          }
        });
      },
      { threshold: 0.5 }
    );
    sections.forEach((s) => observer.observe(s));
  };
  setupObserver();

  window.addEventListener('beforeunload', () => {
    enteredAt.forEach((_, idx) => flushSection(idx));
  });
})();
```

- [ ] **Step 2: Commit**

```bash
git add public/deck/js/analytics.js
git commit -m "feat(deckpress): add analytics tracker (open + section time)"
```

---

### Task 13: Feedback Box

**Files:** `public/deck/js/feedback.js`

- [ ] **Step 1: Create `public/deck/js/feedback.js`**

```js
// public/deck/js/feedback.js
(function () {
  'use strict';
  const CONFIG = window.DECK_CONFIG;
  if (!CONFIG.features.feedbackBox) return;

  const sessionId = window.__deckSessionId;
  const root = document.getElementById('feedback-root');
  root.innerHTML = `
    <h3 class="feedback-title">Not the right fit right now?</h3>
    <p class="feedback-subtitle">Your feedback helps us improve.</p>
    <textarea id="feedback-input" rows="3" placeholder='"Thanks for sending this, but we&apos;re focused on..."'></textarea>
    <button id="feedback-submit">Send feedback anonymously</button>
  `;

  // Show feedback box when user reaches bottom of scroll container
  const scrollContainer = document.getElementById('scroll-container');
  window.addEventListener('scroll', () => {
    const rect = scrollContainer.getBoundingClientRect();
    if (rect.bottom <= window.innerHeight + 200) {
      root.classList.add('visible');
    }
  });

  const submit = document.getElementById('feedback-submit');
  const input = document.getElementById('feedback-input');

  submit.addEventListener('click', async () => {
    const message = input.value.trim();
    if (!message) return;
    submit.disabled = true;
    submit.textContent = 'Sending...';
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message }),
    });
    root.innerHTML = '<p class="feedback-thanks">Thank you for the feedback — it genuinely helps.</p>';
  });
})();
```

- [ ] **Step 2: Add feedback styles to `style.css`**

```css
.feedback-title { font-family: var(--font-display); font-size: 2rem; margin-bottom: 0.5rem; }
.feedback-subtitle { font-size: 0.875rem; color: rgba(240,237,232,0.6); margin-bottom: 2rem; }
#feedback-input {
  width: 100%;
  max-width: 500px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.15);
  color: var(--text-on-dark);
  padding: 1rem;
  font-family: var(--font-body);
  font-size: 0.875rem;
  resize: none;
  margin-bottom: 1rem;
}
#feedback-submit {
  background: transparent;
  border: 1px solid rgba(240,237,232,0.3);
  color: var(--text-on-dark);
  padding: 0.75rem 1.5rem;
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}
#feedback-submit:disabled { opacity: 0.4; }
.feedback-thanks { font-size: 1rem; color: rgba(240,237,232,0.7); }
```

- [ ] **Step 3: Commit**

```bash
git add public/deck/js/feedback.js public/deck/css/style.css
git commit -m "feat(deckpress): add feedback box at end of scroll"
```

---

### Task 14: ROI Calculator (Pinned Section)

**Files:** `public/deck/js/roi.js`

- [ ] **Step 1: Create `public/deck/js/roi.js`**

```js
// public/deck/js/roi.js
(function () {
  'use strict';
  const CONFIG = window.DECK_CONFIG;
  if (!CONFIG.features.roiCalculator) return;

  // eslint-disable-next-line no-new-func
  const formula = new Function('d', 'h', 'c', `return (${CONFIG.roiCalculator.formulaSource})(d, h, c);`);

  // Find the section this should be inserted after
  const afterId = CONFIG.roiCalculator.insertAfter;
  const targetSection = document.getElementById(afterId);
  if (!targetSection) { console.warn('ROI target section not found:', afterId); return; }

  // Create pinned ROI section
  const section = document.createElement('section');
  section.className = 'scroll-section section-roi section-on-dark';
  section.id = 'roi-calculator';
  // Place it right after the target section's scroll range
  const targetLeave = parseFloat(targetSection.dataset.leave);
  const roiEnter = targetLeave + 1;
  const roiLeave = roiEnter + 8; // 8% scroll range for pinned interaction
  section.dataset.enter = roiEnter;
  section.dataset.leave = roiLeave;
  section.style.top = `${(roiEnter + roiLeave) / 2}%`;

  const { developers, hoursSavedPerWeek, costPerHour } = CONFIG.roiCalculator.defaults;
  section.innerHTML = `
    <div class="section-inner">
      <span class="section-label">ROI Calculator · Try it yourself</span>
      <h2 class="section-heading">What Coder1 saves your team</h2>
      <div class="roi-inputs">
        <div class="roi-input">
          <label for="roi-devs">Developers</label>
          <input type="number" id="roi-devs" value="${developers}" min="1">
        </div>
        <div class="roi-input">
          <label for="roi-hrs">Hrs saved / week</label>
          <input type="number" id="roi-hrs" value="${hoursSavedPerWeek}" min="1">
        </div>
        <div class="roi-input">
          <label for="roi-cost">Cost / hr ($)</label>
          <input type="number" id="roi-cost" value="${costPerHour}" min="1">
        </div>
      </div>
      <div class="roi-result">
        <div class="roi-result-label">Annual savings for your team</div>
        <div class="roi-result-value" id="roi-result">$0</div>
      </div>
    </div>
  `;

  document.getElementById('scroll-container').appendChild(section);

  const devs = document.getElementById('roi-devs');
  const hrs = document.getElementById('roi-hrs');
  const cost = document.getElementById('roi-cost');
  const result = document.getElementById('roi-result');

  function recalc() {
    const val = formula(Number(devs.value), Number(hrs.value), Number(cost.value));
    result.textContent = '$' + new Intl.NumberFormat('en-US').format(val);
  }

  devs.addEventListener('input', recalc);
  hrs.addEventListener('input', recalc);
  cost.addEventListener('input', recalc);
  recalc();

  // Pin the section while user interacts
  // Register with GSAP after scene is set up (wait for it)
  const pinSetup = () => {
    if (!window.gsap || !window.ScrollTrigger) { setTimeout(pinSetup, 200); return; }
    ScrollTrigger.create({
      trigger: document.getElementById('scroll-container'),
      start: `${roiEnter}% top`,
      end: `${roiLeave}% top`,
      pin: false, // Section is already absolute-positioned; we just hold the canvas frame
      onEnter: () => section.style.opacity = '1',
      onLeaveBack: () => section.style.opacity = '0',
      onLeave: () => section.style.opacity = '0',
    });
    // Hold canvas frame during ROI interaction
    ScrollTrigger.create({
      trigger: document.getElementById('scroll-container'),
      start: `${roiEnter}% top`,
      end: `${roiLeave}% top`,
      onUpdate: (self) => {
        // Freeze canvas at the midpoint frame during ROI section
        const FRAME_COUNT = window.__deckCanvas.FRAME_COUNT;
        if (FRAME_COUNT > 0) {
          const frozen = Math.floor(FRAME_COUNT * ((roiEnter / 100) * 2));
          window.__deckCanvas.drawFrame(Math.min(frozen, FRAME_COUNT - 1));
        }
      },
    });
  };
  pinSetup();
})();
```

- [ ] **Step 2: Commit**

```bash
git add public/deck/js/roi.js
git commit -m "feat(deckpress): add optional pinned ROI calculator section"
```

---

### Task 15: Founder Hero Cutout + Safari Fallback

**Files:** `public/deck/js/app.js` (append to hero init), already referenced `public/deck/media/founder-*`

- [ ] **Step 1: Add founder cutout init to `app.js`**

Append inside the `__initDeckScene` function, after hero heading animation:

```js
// === Founder cutout (hero only) ===
if (CONFIG.hero.founderCutout.enabled) {
  const container = document.getElementById('founder-cutout');
  const video = document.getElementById('founder-video');
  const fallback = document.getElementById('founder-fallback');
  const toggle = document.getElementById('founder-play-toggle');

  const canPlayWebm = video.canPlayType('video/webm; codecs="vp9"');
  if (canPlayWebm) {
    video.querySelector('source').src = CONFIG.hero.founderCutout.videoPath;
    video.load();
    container.classList.remove('hidden');

    toggle.addEventListener('click', () => {
      if (video.paused) {
        video.play();
        toggle.textContent = '❚❚';
      } else {
        video.pause();
        toggle.textContent = '▶';
      }
    });

    if (CONFIG.hero.founderCutout.playByDefault) {
      video.play();
      toggle.textContent = '❚❚';
    }
  } else {
    // Safari fallback → static image
    video.classList.add('hidden');
    fallback.src = CONFIG.hero.founderCutout.fallbackImage;
    fallback.classList.remove('hidden');
    toggle.style.display = 'none';
    container.classList.remove('hidden');
  }

  // Fade out cutout as hero scrolls away
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'top+=10% top',
    scrub: true,
    onUpdate: (self) => {
      container.style.opacity = 1 - self.progress;
    },
  });
}
```

- [ ] **Step 2: Create media placeholder files**

```bash
mkdir -p public/deck/media
touch public/deck/media/founder-cutout.webm
touch public/deck/media/founder-fallback.jpg
echo "PLACEHOLDER — replace with real WebM (VP9 alpha)" > public/deck/media/README.txt
```

- [ ] **Step 3: Commit**

```bash
git add public/deck/js/app.js public/deck/media/
git commit -m "feat(deckpress): add founder hero cutout with Safari fallback"
```

---

### Task 16: Founder Dashboard

**Files:** `app/layout.tsx`, `app/dashboard/page.tsx`, `app/dashboard/login/page.tsx`, `app/globals.css`

- [ ] **Step 1: Create `app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'Deckpress', robots: 'noindex' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Create `app/dashboard/login/page.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/dashboard-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) router.push('/dashboard');
    else setError('Incorrect password');
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-700 rounded-xl p-8 w-80">
        <h1 className="text-lg font-bold mb-6">Deckpress Dashboard</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 mb-3"
        />
        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
        <button type="submit" className="w-full bg-violet-600 rounded px-4 py-2 text-sm hover:bg-violet-500">
          Sign in
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Create `app/dashboard/page.tsx`**

```tsx
import { getAllFeedback, getAllOpenTokens, getOpensForToken } from '@/lib/kv';

async function getData() {
  const tokens = await getAllOpenTokens();
  const opens = await Promise.all(tokens.map(async (t) => ({ token: t, events: await getOpensForToken(t) })));
  const feedback = await getAllFeedback();
  return { opens, feedback };
}

export default async function DashboardPage() {
  const { opens, feedback } = await getData();
  const deckUrl = process.env.NEXT_PUBLIC_DECK_URL ?? 'https://deckpress.vercel.app';

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Deckpress — Founder Dashboard</h1>

      <section className="mb-10">
        <h2 className="text-xs font-bold tracking-widest text-violet-400 uppercase mb-4">Deck Opens</h2>
        {opens.length === 0 ? (
          <p className="text-slate-500 text-sm">No opens yet.</p>
        ) : (
          <div className="space-y-2">
            {opens.map(({ token, events }) => (
              <div key={token} className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm">{token}</span>
                  <span className="text-xs text-slate-500">
                    {events.length} open{events.length !== 1 ? 's' : ''} · last {new Date(events[0]?.openedAt ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-xs font-bold tracking-widest text-violet-400 uppercase mb-4">Investor Link</h2>
        <div className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-cyan-300">
          {deckUrl}/deck?t=INVESTOR_NAME
        </div>
        <p className="text-xs text-slate-500 mt-2">Replace INVESTOR_NAME with a label (e.g., a16z, sequoia).</p>
      </section>

      <section>
        <h2 className="text-xs font-bold tracking-widest text-violet-400 uppercase mb-4">Feedback</h2>
        {feedback.length === 0 ? (
          <p className="text-slate-500 text-sm">No feedback yet.</p>
        ) : (
          <div className="space-y-2">
            {feedback.map((fb, i) => (
              <div key={i} className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3">
                <p className="text-sm mb-1">"{fb.message}"</p>
                <p className="text-xs text-slate-500">{new Date(fb.ts).toLocaleString()} · {fb.sessionId}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Create `app/page.tsx`** (redirect)

Already handled via `next.config.ts` redirects. Create a fallback file:
```tsx
export default function HomePage() { return null; }
```

- [ ] **Step 5: Commit**

```bash
git add app/
git commit -m "feat(deckpress): add founder dashboard with opens + feedback"
```

---

### Task 17: Fill in Coder1 Deck Content

**Files:** `content/deck.config.ts`

- [ ] **Step 1: Replace TBD headings and body copy** with the actual Coder1 pitch content.

The structure is fixed; only the string values change. Reference the Billion $ Pitch Deck Checklist PDF at `/Users/michaelkraft/Desktop/Billion $ Pitch Deck Checklist.pdf` for the framework tests each section should pass.

- [ ] **Step 2: Rebuild config**

```bash
npm run build:config
```

- [ ] **Step 3: Commit**

```bash
git add content/deck.config.ts
git commit -m "content(deckpress): fill in Coder1 IDE pitch content"
```

---

### Task 18: Deployment Setup

**Files:** `vercel.json`, `README.md`

- [ ] **Step 1: Create `vercel.json`**

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install"
}
```

- [ ] **Step 2: Create `README.md`** covering setup, env vars, frame extraction, Telegram webhook registration, and deploy.

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

- [ ] **Step 4: Manual end-to-end check**

```bash
npm run build:config
npm run dev
```

Open http://localhost:3000/deck — verify:
- Loader shows, then hides
- Hero heading animates in
- Scroll: circle-wipe reveals canvas (even without real frames, placeholder bg)
- Sections fade in as you scroll
- Marquee slides across
- Counter animations trigger on stats sections
- Chat FAB opens panel, can send message
- Feedback box appears at bottom

Open http://localhost:3000/dashboard/login — sign in with `DASHBOARD_PASSWORD`.

- [ ] **Step 5: Final commit**

```bash
git add vercel.json README.md
git commit -m "feat(deckpress): add deployment config and README"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Deckpress scroll-driven canvas | Tasks 7–10 |
| Lenis smooth scroll | Task 9 |
| Frame-bound product demo | Tasks 6, 9, 10 |
| Circle-wipe hero reveal | Task 10 |
| 8-section compressed framework | Tasks 5, 10, 17 |
| Marquee (oversized, scroll-bound) | Tasks 7, 10 |
| Counter animations | Task 10 |
| Dark overlay for stats | Task 10 |
| Persistent CTA | Tasks 5, 10 |
| Side-aligned text zones | Task 8 |
| Founder cutout (hero only, WebM alpha, play/pause, Safari fallback) | Task 15 |
| Chat widget (floating FAB) | Task 11 |
| ROI calculator (optional, pinned section) | Task 14 |
| Feedback box | Task 13 |
| Analytics (open + section time) | Tasks 4, 12 |
| Telegram chat backend (polling) | Tasks 3, 4 |
| Founder dashboard (password-gated) | Tasks 3, 4, 16 |
| Per-investor tokens via ?t= | Tasks 11, 12 |
| Vercel KV storage | Tasks 2, 4 |
| Deployment to Vercel | Task 18 |

**Deferred to v2:** AI deck generation (dropped from MVP per spec).

**Placeholder scan:** The only TBD values are deck content strings in `content/deck.config.ts` (Task 17 fills them) and the founder video files (drops in `public/deck/media/`). No code TODOs.

**Type consistency:** `DeckConfig` interface (Task 5) is the single source; `serializeConfigToJs` (Task 5) produces `window.DECK_CONFIG` in the vanilla frontend; all JS files consume it. API routes use KV types from `lib/kv.ts` (Task 2).

Ready for execution.
