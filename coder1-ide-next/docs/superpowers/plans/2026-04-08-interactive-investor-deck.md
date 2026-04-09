# Interactive Investor Deck — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Next.js 14 app at `/Users/michaelkraft/autonomous_vibe_interface/pitch-deck/` that renders a Marp `.md` file as a scrollable, interactive investor pitch deck with live chat (Telegram), section analytics, draggable founder video, an ROI calculator, and AI-assisted deck generation via Claude.

**Architecture:** Next.js 14 App Router on Vercel. Marp `.md` parsed at request time into slide objects. Sections render with scroll-in animations via IntersectionObserver. Vercel KV (Redis) stores analytics, chat, and feedback. Investor chat uses 2-second polling (serverless-compatible). Founder receives messages on Telegram; replies via `/reply {sessionId} {text}` command. Dashboard (`/dashboard`) is password-protected via middleware. AI generation calls `claude-sonnet-4-6` with the 13-section pitch framework as system prompt.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS 3, Vercel KV (`@vercel/kv`), Anthropic SDK (`@anthropic-ai/sdk`), Telegram Bot API (fetch), Vitest + React Testing Library + jsdom

**Project root:** `/Users/michaelkraft/autonomous_vibe_interface/pitch-deck/`

---

## File Map

```
pitch-deck/
├── app/
│   ├── layout.tsx                     — Root layout, global styles
│   ├── deck/
│   │   └── page.tsx                   — Investor page (scrollable deck + overlays)
│   ├── dashboard/
│   │   └── page.tsx                   — Founder analytics dashboard
│   ├── generate/
│   │   └── page.tsx                   — AI deck generation form (founder-auth)
│   └── api/
│       ├── analytics/route.ts         — POST: store open event + section time
│       ├── chat/
│       │   ├── route.ts               — POST: investor sends message → Telegram
│       │   └── messages/route.ts      — GET: investor polls for new messages
│       ├── feedback/route.ts          — POST: end-of-deck feedback
│       ├── generate/route.ts          — POST: Claude generates deck.md from brief
│       └── telegram/route.ts          — POST: Telegram webhook → store reply in KV
├── components/
│   ├── DeckSection.tsx                — Section wrapper with scroll animation + tracker
│   ├── ProgressNav.tsx                — Fixed right-side section progress bar
│   ├── FounderVideo.tsx               — Draggable cutout video (fixed bottom-right)
│   ├── ChatWidget.tsx                 — Live chat panel (polls messages)
│   ├── RoiCalculator.tsx              — Interactive ROI calculator
│   └── FeedbackBox.tsx               — End-of-deck feedback form
├── content/
│   ├── deck.md                        — Marp source (13-section template)
│   └── deck.config.ts                 — Live metrics, ROI defaults, founder info
├── lib/
│   ├── marp-parser.ts                 — Parse Marp .md → Slide[]
│   ├── kv.ts                          — Vercel KV client + typed helpers
│   ├── telegram.ts                    — Send Telegram message helper
│   └── auth.ts                        — Dashboard password check
├── middleware.ts                       — Auth gate for /dashboard and /generate
├── public/
│   └── founder-cutout.webm            — (placeholder — founder drops real file here)
├── __tests__/
│   ├── marp-parser.test.ts
│   ├── kv.test.ts
│   ├── RoiCalculator.test.tsx
│   ├── ChatWidget.test.tsx
│   ├── FeedbackBox.test.tsx
│   ├── DeckSection.test.tsx
│   ├── api.analytics.test.ts
│   ├── api.chat.test.ts
│   └── api.generate.test.ts
├── vitest.config.ts
├── vitest.setup.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── .env.example
├── vercel.json
└── README.md
```

---

### Task 1: Project Scaffold

**Files:**
- Create: `pitch-deck/` (entire project)

- [ ] **Step 1: Bootstrap Next.js app**

```bash
cd /Users/michaelkraft/autonomous_vibe_interface
npx create-next-app@14 pitch-deck \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --no-eslint
cd pitch-deck
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @vercel/kv @anthropic-ai/sdk
npm install --save-dev vitest @vitejs/plugin-react \
  @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event jsdom
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

- [ ] **Step 4: Create `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 5: Add test script to `package.json`**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Create `.env.example`**

```
# Vercel KV (auto-set by Vercel KV add-on, or set manually for local dev)
KV_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=
KV_REST_API_READ_ONLY_TOKEN=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Founder dashboard password
DASHBOARD_PASSWORD=changeme

# Anthropic (for AI generation)
ANTHROPIC_API_KEY=
```

Copy to `.env.local` for local dev.

- [ ] **Step 7: Create `next.config.ts`**

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {},
};

export default nextConfig;
```

- [ ] **Step 8: Verify test runner works**

```bash
npx vitest run
```
Expected: "No test files found" (0 tests, no failures)

- [ ] **Step 9: Commit**

```bash
cd /Users/michaelkraft/autonomous_vibe_interface
git add pitch-deck/
git commit -m "feat(pitch-deck): scaffold Next.js 14 app with Vitest"
```

---

### Task 2: Marp Parser

**Files:**
- Create: `lib/marp-parser.ts`
- Create: `__tests__/marp-parser.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/marp-parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseSlides } from '@/lib/marp-parser';

const SAMPLE = `---
marp: true
title: Test Deck
---

# Cover Slide
The hook goes here.

<!-- Speaker notes -->

---

# Problem
Pain point description.

---

# Solution
How we fix it.
`;

describe('parseSlides', () => {
  it('extracts correct number of slides', () => {
    const slides = parseSlides(SAMPLE);
    expect(slides).toHaveLength(3);
  });

  it('extracts title from first heading', () => {
    const slides = parseSlides(SAMPLE);
    expect(slides[0].title).toBe('Cover Slide');
    expect(slides[1].title).toBe('Problem');
  });

  it('extracts body text excluding the title line', () => {
    const slides = parseSlides(SAMPLE);
    expect(slides[0].body).toContain('The hook goes here.');
    expect(slides[0].body).not.toContain('# Cover Slide');
  });

  it('extracts speaker notes from HTML comments', () => {
    const slides = parseSlides(SAMPLE);
    expect(slides[0].speakerNotes).toBe('Speaker notes');
  });

  it('assigns 0-based index', () => {
    const slides = parseSlides(SAMPLE);
    expect(slides[0].index).toBe(0);
    expect(slides[2].index).toBe(2);
  });

  it('returns empty array for non-marp content', () => {
    expect(parseSlides('# just markdown')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run __tests__/marp-parser.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/marp-parser'`

- [ ] **Step 3: Implement `lib/marp-parser.ts`**

```ts
export interface Slide {
  index: number;
  title: string;
  body: string;
  speakerNotes: string;
}

export function parseSlides(markdown: string): Slide[] {
  // Must have marp: true frontmatter
  if (!/^---[\s\S]*?marp:\s*true[\s\S]*?---/m.test(markdown)) {
    return [];
  }

  // Remove frontmatter block
  const withoutFrontmatter = markdown.replace(/^---[\s\S]*?---\n?/, '');

  // Split on slide separators (--- on its own line)
  const rawSlides = withoutFrontmatter.split(/\n---\n/);

  return rawSlides.map((raw, index) => {
    const trimmed = raw.trim();

    // Extract speaker notes from HTML comments <!-- ... -->
    const notesMatch = trimmed.match(/<!--([\s\S]*?)-->/);
    const speakerNotes = notesMatch ? notesMatch[1].trim() : '';

    // Remove comments from body
    const withoutNotes = trimmed.replace(/<!--[\s\S]*?-->/g, '').trim();

    // Extract title from first # heading
    const titleMatch = withoutNotes.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : `Slide ${index + 1}`;

    // Body is everything after the title line
    const body = withoutNotes
      .replace(/^#\s+.+$/m, '')
      .trim();

    return { index, title, body, speakerNotes };
  });
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run __tests__/marp-parser.test.ts
```
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/marp-parser.ts __tests__/marp-parser.test.ts
git commit -m "feat(pitch-deck): add Marp slide parser"
```

---

### Task 3: KV Client + Typed Helpers

**Files:**
- Create: `lib/kv.ts`
- Create: `__tests__/kv.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/kv.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @vercel/kv before importing lib/kv
vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
    lpush: vi.fn(),
    lrange: vi.fn(),
  },
}));

import { kv } from '@vercel/kv';
import {
  recordOpenEvent,
  recordSectionTime,
  appendChatMessage,
  getChatMessages,
  appendFeedback,
  type ChatMessage,
  type OpenEvent,
} from '@/lib/kv';

beforeEach(() => vi.clearAllMocks());

describe('recordOpenEvent', () => {
  it('stores open event under open:{token} key', async () => {
    vi.mocked(kv.lpush).mockResolvedValue(1);
    await recordOpenEvent('tok123', 'Mozilla/5.0', 'https://example.com');
    expect(kv.lpush).toHaveBeenCalledWith(
      'open:tok123',
      expect.objectContaining({ token: 'tok123', userAgent: 'Mozilla/5.0' })
    );
  });
});

describe('recordSectionTime', () => {
  it('stores section time in hash', async () => {
    vi.mocked(kv.lpush).mockResolvedValue(1);
    await recordSectionTime('sess1', 2, 45);
    expect(kv.lpush).toHaveBeenCalledWith(
      'section-time:sess1',
      expect.objectContaining({ sectionIndex: 2, seconds: 45 })
    );
  });
});

describe('appendChatMessage', () => {
  it('pushes message to chat list', async () => {
    vi.mocked(kv.lpush).mockResolvedValue(1);
    await appendChatMessage('sess1', { role: 'investor', text: 'Hello?' });
    expect(kv.lpush).toHaveBeenCalledWith(
      'chat:sess1',
      expect.objectContaining({ role: 'investor', text: 'Hello?' })
    );
  });
});

describe('getChatMessages', () => {
  it('returns messages in chronological order', async () => {
    const stored = [
      { role: 'investor', text: 'Q?', ts: 2000 },
      { role: 'founder', text: 'A!', ts: 1000 },
    ];
    vi.mocked(kv.lrange).mockResolvedValue(stored);
    const msgs = await getChatMessages('sess1');
    expect(msgs[0].ts).toBe(2000); // lrange returns newest first, we reverse
    expect(msgs[1].ts).toBe(1000);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run __tests__/kv.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/kv'`

- [ ] **Step 3: Implement `lib/kv.ts`**

```ts
import { kv } from '@vercel/kv';

export interface OpenEvent {
  token: string;
  openedAt: number;
  userAgent: string;
  referrer: string;
}

export interface SectionTimeEvent {
  sectionIndex: number;
  seconds: number;
  ts: number;
}

export interface ChatMessage {
  role: 'investor' | 'founder';
  text: string;
  ts: number;
}

export interface FeedbackEntry {
  sessionId: string;
  message: string;
  ts: number;
}

export async function recordOpenEvent(
  token: string,
  userAgent: string,
  referrer: string
): Promise<void> {
  const event: OpenEvent = { token, openedAt: Date.now(), userAgent, referrer };
  await kv.lpush(`open:${token}`, event);
}

export async function recordSectionTime(
  sessionId: string,
  sectionIndex: number,
  seconds: number
): Promise<void> {
  const event: SectionTimeEvent = { sectionIndex, seconds, ts: Date.now() };
  await kv.lpush(`section-time:${sessionId}`, event);
}

export async function appendChatMessage(
  sessionId: string,
  message: Pick<ChatMessage, 'role' | 'text'>
): Promise<void> {
  const msg: ChatMessage = { ...message, ts: Date.now() };
  await kv.lpush(`chat:${sessionId}`, msg);
}

export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
  const msgs = await kv.lrange<ChatMessage>(`chat:${sessionId}`, 0, 99);
  return msgs.reverse(); // lrange newest-first → reverse to chronological
}

export async function appendFeedback(
  sessionId: string,
  message: string
): Promise<void> {
  const entry: FeedbackEntry = { sessionId, message, ts: Date.now() };
  await kv.lpush('feedback', entry);
}

export async function getAllOpenEvents(): Promise<OpenEvent[]> {
  return kv.lrange<OpenEvent>('open:*', 0, -1).catch(() => []);
}

export async function getAllFeedback(): Promise<FeedbackEntry[]> {
  return kv.lrange<FeedbackEntry>('feedback', 0, 99);
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run __tests__/kv.test.ts
```
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/kv.ts __tests__/kv.test.ts
git commit -m "feat(pitch-deck): add Vercel KV typed helpers"
```

---

### Task 4: Telegram Helper + Auth

**Files:**
- Create: `lib/telegram.ts`
- Create: `lib/auth.ts`

- [ ] **Step 1: Create `lib/telegram.ts`**

```ts
export async function sendTelegramMessage(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn('Telegram not configured — skipping notification');
    return;
  }
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
}

export function formatInvestorMessage(
  sessionId: string,
  token: string,
  message: string
): string {
  return (
    `🔔 *Deck message* from investor \`${token}\`\n\n` +
    `"${message}"\n\n` +
    `Reply with:\n\`/reply ${sessionId} your message here\``
  );
}

export function parseTelegramReply(
  text: string
): { sessionId: string; message: string } | null {
  const match = text.match(/^\/reply\s+(\S+)\s+([\s\S]+)$/);
  if (!match) return null;
  return { sessionId: match[1], message: match[2].trim() };
}
```

- [ ] **Step 2: Create `lib/auth.ts`**

```ts
export function checkDashboardAuth(password: string): boolean {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) return false;
  return password === expected;
}
```

- [ ] **Step 3: Create `middleware.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';

const PROTECTED = ['/dashboard', '/generate'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!PROTECTED.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get('dashboard-auth');
  if (cookie?.value === process.env.DASHBOARD_PASSWORD) {
    return NextResponse.next();
  }

  // Redirect to login (simple password form served from /dashboard itself)
  const loginUrl = new URL('/dashboard/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/dashboard/:path*', '/generate/:path*'],
};
```

- [ ] **Step 4: Commit**

```bash
git add lib/telegram.ts lib/auth.ts middleware.ts
git commit -m "feat(pitch-deck): add Telegram helper, auth, and middleware"
```

---

### Task 5: Deck Content — Marp Template + Config

**Files:**
- Create: `content/deck.md`
- Create: `content/deck.config.ts`

- [ ] **Step 1: Create `content/deck.md`**

Use this as the starter template following the 13-section framework. Replace placeholder text with real company content before deploying.

```markdown
---
marp: true
title: Coder1 IDE — Investor Deck
theme: default
paginate: true
---

# Coder1 IDE
The First Agentic IDE Built for Claude Code Users

<!-- Replace with your one-line hook that passes the Hook Test -->

---

# The Hook
Claude Code is the most powerful AI coding tool ever built — and it has no home.

<!-- Hook Test: Can you say what you do in one sentence? -->

---

# The Problem
Developers using Claude Code are forced to improvise in VS Code hacks, disconnected terminals, and fragmented workflows. There's no purpose-built environment for agentic AI development.

<!-- Pain Test: Does this resonate with your target customer? -->

---

# The Solution
Coder1 IDE: a web-based development environment designed from the ground up for Claude Code users. Team collaboration, persistent session memory, live preview, and an agent hub — all in one place.

<!-- Clarity Test: Can a 10-year-old understand this? -->

---

# Why Now
Claude Code hit 4.4M users in 18 months. Anthropic just launched enterprise tiers. The agentic IDE category is forming right now — there is no incumbent.

<!-- Timing Test: Why is this the right moment? -->

---

# Product Demo
[Embed product video URL or screenshot carousel here]

<!-- Show Test: Show don't tell -->

---

# Market Size
$8.4B developer tooling TAM. 4.4M Claude Code users (SAM: power users willing to pay). $240 ARPU target → $264M serviceable obtainable market at 10% capture.

<!-- Math Test: Is the math credible? -->

---

# Business Model
$20/month per seat (Individual) · $49/seat/month (Team) · $199/month (Studio)
LTV/CAC target: 5:1. Payback period: 4 months at current CAC of $40.

<!-- Unit Economics Test: Does the business model make sense? -->

---

# Traction
12,400 active users · $2M ARR · 340% YoY growth · 94% 30-day retention · NPS 72

<!-- Evidence Test: What proof do you have this works? -->

---

# Competition
Cursor, Windsurf: general-purpose AI IDEs. Coder1: Claude Code-specific, agentic, team-first, and local-first. No competitor has native team collaboration or persistent cross-session memory.

<!-- Positioning Test: Where do you win? -->

---

# Go-to-Market
Bottom-up: Claude Code community (YouTube, Discord, X). Top-down: Anthropic partnership track. Channel: content marketing (YouTube tutorials), affiliate with Claude Code educators.

<!-- Channel Test: How do you reach customers at scale? -->

---

# Team
**Mike Kraft** — Founder & CEO. Serial SaaS founder, Claude Code power user, built and sold 2 prior products. Domain expert in developer tooling.

<!-- Founder-Market Fit Test: Why you? -->

---

# Financial Projections
2026: $3.2M ARR (60% growth). 2027: $8.1M ARR. 2028: $18.5M ARR.
Assumptions: 5% monthly user growth, 12% free-to-paid conversion, 3% monthly churn.

<!-- Reality Test: Are these numbers defensible? -->

---

# The Ask
Raising $2.5M Seed at $12M pre-money.

Use of funds: 60% engineering (3 hires), 25% GTM, 15% ops/legal.

Contact: mike@coder1.io · [Schedule a call](https://cal.com/mike-kraft)

<!-- Use of Funds Test: Is the ask reasonable? -->
```

- [ ] **Step 2: Create `content/deck.config.ts`**

```ts
export const config = {
  company: 'Coder1 IDE',
  tagline: 'The First Agentic IDE Built for Claude Code Users',

  liveMetrics: {
    arr: 2_000_000,
    users: 12_400,
    growth: '340% YoY',
    retention: '94%',
    nps: 72,
  },

  roiCalculator: {
    defaults: {
      developers: 12,
      hoursSavedPerWeek: 8,
      costPerHour: 150,
    },
    formula: (developers: number, hoursSaved: number, costPerHour: number) =>
      developers * hoursSaved * costPerHour * 52,
  },

  founder: {
    name: 'Mike Kraft',
    title: 'Founder & CEO',
    videoPath: '/founder-cutout.webm',
    avatarInitials: 'MK',
  },

  sectionLabels: [
    { index: 0, label: 'Cover', framework: 'Cover' },
    { index: 1, label: 'Hook', framework: 'Hook Test' },
    { index: 2, label: 'Problem', framework: 'Pain Test' },
    { index: 3, label: 'Solution', framework: 'Clarity Test' },
    { index: 4, label: 'Why Now', framework: 'Timing Test' },
    { index: 5, label: 'Demo', framework: 'Show Test' },
    { index: 6, label: 'Market', framework: 'Math Test' },
    { index: 7, label: 'Model', framework: 'Unit Economics' },
    { index: 8, label: 'Traction', framework: 'Evidence Test' },
    { index: 9, label: 'Competition', framework: 'Positioning Test' },
    { index: 10, label: 'GTM', framework: 'Channel Test' },
    { index: 11, label: 'Team', framework: 'Founder-Market Fit' },
    { index: 12, label: 'Financials', framework: 'Reality Test' },
    { index: 13, label: 'The Ask', framework: 'Use of Funds Test' },
  ],
};
```

- [ ] **Step 3: Commit**

```bash
git add content/
git commit -m "feat(pitch-deck): add Marp deck template and config"
```

---

### Task 6: DeckSection Component

**Files:**
- Create: `components/DeckSection.tsx`
- Create: `__tests__/DeckSection.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/DeckSection.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DeckSection from '@/components/DeckSection';

describe('DeckSection', () => {
  it('renders title and body content', () => {
    render(
      <DeckSection
        index={0}
        title="The Problem"
        body="Pain point text"
        sessionId="test-session"
        onTimeSpent={vi.fn()}
      />
    );
    expect(screen.getByText('The Problem')).toBeInTheDocument();
    expect(screen.getByText('Pain point text')).toBeInTheDocument();
  });

  it('renders children (slot for custom components)', () => {
    render(
      <DeckSection
        index={2}
        title="Model"
        body=""
        sessionId="s"
        onTimeSpent={vi.fn()}
      >
        <div data-testid="custom-child">ROI Calculator</div>
      </DeckSection>
    );
    expect(screen.getByTestId('custom-child')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run __tests__/DeckSection.test.tsx
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement `components/DeckSection.tsx`**

```tsx
'use client';

import { useRef, useEffect, useCallback } from 'react';

interface DeckSectionProps {
  index: number;
  title: string;
  body: string;
  sessionId: string;
  onTimeSpent: (index: number, seconds: number) => void;
  children?: React.ReactNode;
  sectionLabel?: string;
}

export default function DeckSection({
  index,
  title,
  body,
  sessionId,
  onTimeSpent,
  children,
  sectionLabel,
}: DeckSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const enteredAt = useRef<number | null>(null);

  const handleLeave = useCallback(() => {
    if (enteredAt.current !== null) {
      const seconds = Math.round((Date.now() - enteredAt.current) / 1000);
      onTimeSpent(index, seconds);
      enteredAt.current = null;
    }
  }, [index, onTimeSpent]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Animate in
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
          enteredAt.current = Date.now();
        } else {
          handleLeave();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      handleLeave();
    };
  }, [handleLeave]);

  return (
    <section
      ref={ref}
      id={`section-${index}`}
      data-section-index={index}
      className="min-h-screen flex flex-col justify-center px-8 md:px-16 lg:px-24 py-20"
      style={{
        opacity: 0,
        transform: 'translateY(24px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}
    >
      {sectionLabel && (
        <p className="text-xs font-bold tracking-widest text-violet-400 uppercase mb-3">
          {sectionLabel}
        </p>
      )}
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
        {title}
      </h2>
      {body && (
        <p className="text-lg text-slate-300 leading-relaxed max-w-3xl whitespace-pre-line">
          {body}
        </p>
      )}
      {children}
    </section>
  );
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run __tests__/DeckSection.test.tsx
```
Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add components/DeckSection.tsx __tests__/DeckSection.test.tsx
git commit -m "feat(pitch-deck): add DeckSection with scroll animation and time tracking"
```

---

### Task 7: ROI Calculator Component

**Files:**
- Create: `components/RoiCalculator.tsx`
- Create: `__tests__/RoiCalculator.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/RoiCalculator.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RoiCalculator from '@/components/RoiCalculator';

const defaults = { developers: 12, hoursSavedPerWeek: 8, costPerHour: 150 };
const formula = (d: number, h: number, c: number) => d * h * c * 52;

describe('RoiCalculator', () => {
  it('renders with default values', () => {
    render(<RoiCalculator defaults={defaults} formula={formula} />);
    // 12 * 8 * 150 * 52 = 748,800
    expect(screen.getByText(/748,800/)).toBeInTheDocument();
  });

  it('updates result when developer count changes', () => {
    render(<RoiCalculator defaults={defaults} formula={formula} />);
    const devInput = screen.getByLabelText(/developers/i);
    fireEvent.change(devInput, { target: { value: '24' } });
    // 24 * 8 * 150 * 52 = 1,497,600
    expect(screen.getByText(/1,497,600/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run __tests__/RoiCalculator.test.tsx
```

- [ ] **Step 3: Implement `components/RoiCalculator.tsx`**

```tsx
'use client';

import { useState } from 'react';

interface RoiCalculatorProps {
  defaults: {
    developers: number;
    hoursSavedPerWeek: number;
    costPerHour: number;
  };
  formula: (developers: number, hoursSaved: number, costPerHour: number) => number;
}

export default function RoiCalculator({ defaults, formula }: RoiCalculatorProps) {
  const [developers, setDevelopers] = useState(defaults.developers);
  const [hoursSaved, setHoursSaved] = useState(defaults.hoursSavedPerWeek);
  const [costPerHour, setCostPerHour] = useState(defaults.costPerHour);

  const annualSavings = formula(developers, hoursSaved, costPerHour);
  const formatted = new Intl.NumberFormat('en-US').format(annualSavings);

  return (
    <div className="mt-8 bg-slate-800/60 border border-violet-500/30 rounded-xl p-6 max-w-xl">
      <p className="text-xs font-bold tracking-widest text-violet-400 uppercase mb-4">
        ROI Calculator
      </p>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label htmlFor="roi-devs" className="block text-xs text-slate-400 mb-1">
            Developers
          </label>
          <input
            id="roi-devs"
            type="number"
            min="1"
            value={developers}
            onChange={(e) => setDevelopers(Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm"
            aria-label="Developers"
          />
        </div>
        <div>
          <label htmlFor="roi-hrs" className="block text-xs text-slate-400 mb-1">
            Hrs saved/week
          </label>
          <input
            id="roi-hrs"
            type="number"
            min="1"
            value={hoursSaved}
            onChange={(e) => setHoursSaved(Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm"
            aria-label="Hours saved per week"
          />
        </div>
        <div>
          <label htmlFor="roi-cost" className="block text-xs text-slate-400 mb-1">
            Cost/hr ($)
          </label>
          <input
            id="roi-cost"
            type="number"
            min="1"
            value={costPerHour}
            onChange={(e) => setCostPerHour(Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm"
            aria-label="Cost per hour"
          />
        </div>
      </div>
      <div className="flex items-center justify-between bg-violet-950/50 border border-violet-500/40 rounded-lg px-5 py-4">
        <span className="text-sm text-violet-300">Annual savings for your team</span>
        <span className="text-2xl font-bold text-violet-200">${formatted}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run __tests__/RoiCalculator.test.tsx
```
Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add components/RoiCalculator.tsx __tests__/RoiCalculator.test.tsx
git commit -m "feat(pitch-deck): add interactive ROI calculator"
```

---

### Task 8: ProgressNav + FounderVideo Components

**Files:**
- Create: `components/ProgressNav.tsx`
- Create: `components/FounderVideo.tsx`

- [ ] **Step 1: Create `components/ProgressNav.tsx`**

```tsx
'use client';

interface ProgressNavProps {
  sections: { label: string }[];
  activeIndex: number;
  onNavigate: (index: number) => void;
}

export default function ProgressNav({ sections, activeIndex, onNavigate }: ProgressNavProps) {
  return (
    <nav className="flex flex-col gap-1 py-4">
      {sections.map((section, i) => (
        <button
          key={i}
          onClick={() => onNavigate(i)}
          className="flex items-center gap-2 text-left group"
          aria-label={`Go to ${section.label}`}
        >
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${
              i <= activeIndex ? 'bg-violet-500' : 'bg-slate-700'
            }`}
          />
          <span
            className={`text-xs transition-colors ${
              i === activeIndex
                ? 'text-violet-300 font-semibold'
                : 'text-slate-500 group-hover:text-slate-300'
            }`}
          >
            {section.label}
          </span>
        </button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Create `components/FounderVideo.tsx`**

```tsx
'use client';

import { useRef, useState, useEffect } from 'react';

interface FounderVideoProps {
  videoPath: string;
  founderName: string;
  initials: string;
}

export default function FounderVideo({ videoPath, founderName, initials }: FounderVideoProps) {
  const [position, setPosition] = useState(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    const saved = localStorage.getItem('founder-video-pos');
    return saved ? JSON.parse(saved) : { x: 0, y: 0 };
  });
  const [minimized, setMinimized] = useState(false);
  const isDragging = useRef(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });

  useEffect(() => {
    localStorage.setItem('founder-video-pos', JSON.stringify(position));
  }, [position]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.mouseX;
    const dy = e.clientY - dragStart.current.mouseY;
    setPosition({ x: dragStart.current.posX + dx, y: dragStart.current.posY + dy });
  };

  const onPointerUp = () => { isDragging.current = false; };

  return (
    <div
      className="fixed bottom-6 right-6 z-50 cursor-move select-none"
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <button
        onClick={() => setMinimized(!minimized)}
        className="absolute top-1 right-1 z-10 w-5 h-5 bg-slate-800/80 rounded-full text-xs text-slate-400 flex items-center justify-center hover:bg-slate-700"
        aria-label={minimized ? 'Expand video' : 'Minimize video'}
      >
        {minimized ? '+' : '−'}
      </button>

      {minimized ? (
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
          {initials}
        </div>
      ) : (
        <div className="w-40 h-52 relative">
          <video
            src={videoPath}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ mixBlendMode: 'normal' }}
            onError={(e) => { (e.currentTarget as HTMLVideoElement).style.display = 'none'; }}
          />
          <div className="absolute bottom-0 left-0 right-0 text-center">
            <span className="text-xs text-slate-300 bg-slate-900/60 px-2 py-0.5 rounded">
              {founderName}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/ProgressNav.tsx components/FounderVideo.tsx
git commit -m "feat(pitch-deck): add ProgressNav and draggable FounderVideo"
```

---

### Task 9: FeedbackBox Component + API Route

**Files:**
- Create: `components/FeedbackBox.tsx`
- Create: `app/api/feedback/route.ts`
- Create: `__tests__/FeedbackBox.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/FeedbackBox.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FeedbackBox from '@/components/FeedbackBox';

global.fetch = vi.fn().mockResolvedValue({ ok: true });

describe('FeedbackBox', () => {
  it('renders feedback form', () => {
    render(<FeedbackBox sessionId="sess1" />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByText(/not the right fit/i)).toBeInTheDocument();
  });

  it('submits feedback via POST', async () => {
    render(<FeedbackBox sessionId="sess1" />);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Too early stage for us.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/feedback',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('shows thank you message after submission', async () => {
    render(<FeedbackBox sessionId="sess1" />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Too early' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => {
      expect(screen.getByText(/thank you/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run __tests__/FeedbackBox.test.tsx
```

- [ ] **Step 3: Implement `components/FeedbackBox.tsx`**

```tsx
'use client';

import { useState } from 'react';

interface FeedbackBoxProps {
  sessionId: string;
}

export default function FeedbackBox({ sessionId }: FeedbackBoxProps) {
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message }),
    });
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="text-center py-8 text-slate-400">
        Thank you for the feedback — it genuinely helps.
      </div>
    );
  }

  return (
    <div className="mt-12 border border-dashed border-slate-700 rounded-xl p-8 text-center max-w-xl mx-auto">
      <p className="text-slate-400 text-sm mb-4">
        Not the right fit right now? Your feedback helps us improve.
      </p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={`"Thanks for sending this, but we're focused on..."`}
        rows={3}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-300 text-sm mb-3 resize-none"
      />
      <button
        onClick={handleSubmit}
        disabled={submitting || !message.trim()}
        className="px-6 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-40"
      >
        {submitting ? 'Sending...' : 'Send feedback anonymously'}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Create `app/api/feedback/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { appendFeedback } from '@/lib/kv';
import { sendTelegramMessage } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { sessionId, message } = body;

  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }
  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  await appendFeedback(sessionId, message.slice(0, 1000));
  await sendTelegramMessage(`📝 *Deck feedback* from \`${sessionId}\`:\n\n"${message}"`);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Run test — verify it passes**

```bash
npx vitest run __tests__/FeedbackBox.test.tsx
```
Expected: 3 tests PASS

- [ ] **Step 6: Commit**

```bash
git add components/FeedbackBox.tsx app/api/feedback/route.ts __tests__/FeedbackBox.test.tsx
git commit -m "feat(pitch-deck): add feedback box and /api/feedback route"
```

---

### Task 10: Analytics API Route

**Files:**
- Create: `app/api/analytics/route.ts`

- [ ] **Step 1: Create `app/api/analytics/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { recordOpenEvent, recordSectionTime } from '@/lib/kv';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, token, sessionId, sectionIndex, seconds } = body;

  if (type === 'open') {
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'token is required for open events' }, { status: 400 });
    }
    const userAgent = request.headers.get('user-agent') ?? '';
    const referrer = request.headers.get('referer') ?? '';
    await recordOpenEvent(token, userAgent, referrer);
    return NextResponse.json({ ok: true });
  }

  if (type === 'section-time') {
    if (!sessionId || typeof sectionIndex !== 'number' || typeof seconds !== 'number') {
      return NextResponse.json(
        { error: 'sessionId, sectionIndex, and seconds are required' },
        { status: 400 }
      );
    }
    await recordSectionTime(sessionId, sectionIndex, seconds);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown event type' }, { status: 400 });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/analytics/route.ts
git commit -m "feat(pitch-deck): add /api/analytics route"
```

---

### Task 11: Live Chat — Widget + API Routes

**Files:**
- Create: `components/ChatWidget.tsx`
- Create: `app/api/chat/route.ts`
- Create: `app/api/chat/messages/route.ts`
- Create: `app/api/telegram/route.ts`

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/ChatWidget.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatWidget from '@/components/ChatWidget';

global.fetch = vi.fn();

const mockMessages = [
  { role: 'investor', text: 'What is your GTM?', ts: 1000 },
  { role: 'founder', text: 'Bottom-up community growth.', ts: 2000 },
];

beforeEach(() => {
  vi.mocked(fetch).mockImplementation((url) => {
    if (String(url).includes('/messages')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ messages: mockMessages }),
      } as Response);
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
  });
});

describe('ChatWidget', () => {
  it('renders chat messages after polling', async () => {
    render(<ChatWidget sessionId="s1" founderName="Mike Kraft" />);
    await waitFor(() => {
      expect(screen.getByText('What is your GTM?')).toBeInTheDocument();
      expect(screen.getByText('Bottom-up community growth.')).toBeInTheDocument();
    });
  });

  it('sends message on form submit', async () => {
    render(<ChatWidget sessionId="s1" founderName="Mike Kraft" />);
    const input = screen.getByPlaceholderText(/ask/i);
    fireEvent.change(input, { target: { value: 'What is your runway?' } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/chat',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run __tests__/ChatWidget.test.tsx
```

- [ ] **Step 3: Implement `components/ChatWidget.tsx`**

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '@/lib/kv';

interface ChatWidgetProps {
  sessionId: string;
  founderName: string;
}

export default function ChatWidget({ sessionId, founderName }: ChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Poll for new messages every 2 seconds
  useEffect(() => {
    const poll = async () => {
      const res = await fetch(`/api/chat/messages?sessionId=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
      }
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const text = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'investor', text, ts: Date.now() }]);
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message: text }),
    });
    setSending(false);
  };

  return (
    <div className="flex flex-col h-64 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-3 py-2 bg-slate-800 flex items-center gap-2 shrink-0">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-xs font-semibold text-slate-200">{founderName}</span>
        <span className="text-xs text-emerald-400 ml-auto">online</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {messages.length === 0 && (
          <p className="text-xs text-slate-500 text-center mt-4">
            Ask the founder a question
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-[80%] px-3 py-2 rounded-xl text-xs ${
              msg.role === 'investor'
                ? 'self-end bg-slate-700 text-slate-200'
                : 'self-start bg-violet-950 text-violet-200 border border-violet-800'
            }`}
          >
            {msg.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 p-2 border-t border-slate-700 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 bg-slate-800 border border-slate-600 rounded-full px-3 py-1.5 text-xs text-slate-200 outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center text-white text-sm disabled:opacity-40 hover:bg-violet-500"
        >
          ↑
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Create `app/api/chat/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { appendChatMessage } from '@/lib/kv';
import { sendTelegramMessage, formatInvestorMessage } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { sessionId, message } = body;

  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }
  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  // Derive token from sessionId (first 8 chars) for display in Telegram
  const token = sessionId.slice(0, 8);

  await appendChatMessage(sessionId, { role: 'investor', text: message.slice(0, 500) });
  await sendTelegramMessage(formatInvestorMessage(sessionId, token, message));

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Create `app/api/chat/messages/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getChatMessages } from '@/lib/kv';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }
  const messages = await getChatMessages(sessionId);
  return NextResponse.json({ messages });
}
```

- [ ] **Step 6: Create `app/api/telegram/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { appendChatMessage } from '@/lib/kv';
import { parseTelegramReply } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const text = body?.message?.text ?? '';

  const parsed = parseTelegramReply(text);
  if (!parsed) {
    // Not a /reply command — ignore silently
    return NextResponse.json({ ok: true });
  }

  await appendChatMessage(parsed.sessionId, {
    role: 'founder',
    text: parsed.message.slice(0, 500),
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 7: Run test — verify it passes**

```bash
npx vitest run __tests__/ChatWidget.test.tsx
```
Expected: 2 tests PASS

- [ ] **Step 8: Commit**

```bash
git add components/ChatWidget.tsx app/api/chat/ app/api/telegram/route.ts __tests__/ChatWidget.test.tsx
git commit -m "feat(pitch-deck): add live chat with Telegram integration"
```

---

### Task 12: Investor Deck Page

**Files:**
- Create: `app/deck/page.tsx`
- Create: `app/layout.tsx`

- [ ] **Step 1: Create `app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Coder1 IDE — Investor Deck',
  description: 'Interactive investor pitch deck',
  robots: 'noindex', // Don't let search engines index investor decks
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Create `app/deck/page.tsx`**

This page parses the Marp file, renders sections, and wires up all overlays. The `t` query param is the investor token (for analytics). If absent, a random session ID is generated client-side.

```tsx
import { readFile } from 'fs/promises';
import path from 'path';
import { parseSlides } from '@/lib/marp-parser';
import { config } from '@/content/deck.config';
import DeckPageClient from './DeckPageClient';

export default async function DeckPage() {
  const mdPath = path.join(process.cwd(), 'content', 'deck.md');
  const markdown = await readFile(mdPath, 'utf-8');
  const slides = parseSlides(markdown);

  return (
    <DeckPageClient
      slides={slides}
      config={config}
    />
  );
}
```

- [ ] **Step 3: Create `app/deck/DeckPageClient.tsx`**

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Slide } from '@/lib/marp-parser';
import DeckSection from '@/components/DeckSection';
import ProgressNav from '@/components/ProgressNav';
import FounderVideo from '@/components/FounderVideo';
import ChatWidget from '@/components/ChatWidget';
import RoiCalculator from '@/components/RoiCalculator';
import FeedbackBox from '@/components/FeedbackBox';

interface DeckPageClientProps {
  slides: Slide[];
  config: typeof import('@/content/deck.config').config;
}

function generateSessionId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export default function DeckPageClient({ slides, config }: DeckPageClientProps) {
  const params = useSearchParams();
  const token = params.get('t') ?? 'direct';
  const [sessionId] = useState(() => `${token}-${generateSessionId()}`);
  const [activeIndex, setActiveIndex] = useState(0);

  // Track deck open
  useEffect(() => {
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'open', token }),
    }).catch(() => {});
  }, [token]);

  const handleTimeSpent = useCallback((index: number, seconds: number) => {
    if (seconds < 2) return; // ignore accidental blips
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'section-time', sessionId, sectionIndex: index, seconds }),
    }).catch(() => {});
  }, [sessionId]);

  const navigateTo = (index: number) => {
    const el = document.getElementById(`section-${index}`);
    el?.scrollIntoView({ behavior: 'smooth' });
    setActiveIndex(index);
  };

  // Track active section via scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.sectionIndex);
            if (!isNaN(idx)) setActiveIndex(idx);
          }
        });
      },
      { threshold: 0.5 }
    );
    document.querySelectorAll('[data-section-index]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [slides]);

  // ROI calculator section index (7 = Business Model)
  const roiSectionIndex = 7;

  return (
    <div className="relative">
      {/* Fixed right sidebar */}
      <div className="fixed right-0 top-0 h-full w-52 flex flex-col justify-center pr-6 z-40 pointer-events-none">
        <div className="pointer-events-auto">
          <ProgressNav
            sections={config.sectionLabels}
            activeIndex={activeIndex}
            onNavigate={navigateTo}
          />
          <div className="mt-6">
            <ChatWidget sessionId={sessionId} founderName={config.founder.name} />
          </div>
        </div>
      </div>

      {/* Main scrollable content */}
      <main className="mr-56">
        {slides.map((slide, i) => {
          const label = config.sectionLabels[i]?.label;
          return (
            <DeckSection
              key={i}
              index={i}
              title={slide.title}
              body={slide.body}
              sessionId={sessionId}
              onTimeSpent={handleTimeSpent}
              sectionLabel={label}
            >
              {i === roiSectionIndex && (
                <RoiCalculator
                  defaults={config.roiCalculator.defaults}
                  formula={config.roiCalculator.formula}
                />
              )}
            </DeckSection>
          );
        })}

        <div className="mr-56 px-8 md:px-16 lg:px-24 py-12">
          <FeedbackBox sessionId={sessionId} />
        </div>
      </main>

      {/* Draggable founder video */}
      <FounderVideo
        videoPath={config.founder.videoPath}
        founderName={config.founder.name}
        initials={config.founder.avatarInitials}
      />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/deck/ app/layout.tsx
git commit -m "feat(pitch-deck): add investor deck page with all components wired"
```

---

### Task 13: Founder Dashboard

**Files:**
- Create: `app/dashboard/page.tsx`
- Create: `app/dashboard/login/page.tsx`

- [ ] **Step 1: Create `app/dashboard/login/page.tsx`**

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
    if (res.ok) {
      router.push('/dashboard');
    } else {
      setError('Incorrect password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-700 rounded-xl p-8 w-80">
        <h1 className="text-lg font-bold mb-6 text-white">Founder Dashboard</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white mb-3"
        />
        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
        <button type="submit" className="w-full bg-violet-600 rounded px-4 py-2 text-white text-sm hover:bg-violet-500">
          Sign in
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/api/dashboard-auth/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { checkDashboardAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  if (!checkDashboardAuth(password)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set('dashboard-auth', password, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });
  return response;
}
```

- [ ] **Step 3: Create `app/dashboard/page.tsx`**

```tsx
import { kv } from '@vercel/kv';
import type { OpenEvent, ChatMessage, FeedbackEntry } from '@/lib/kv';

async function getDashboardData() {
  const [openEvents, feedback] = await Promise.all([
    kv.lrange<OpenEvent>('open:*', 0, 49).catch(() => [] as OpenEvent[]),
    kv.lrange<FeedbackEntry>('feedback', 0, 49).catch(() => [] as FeedbackEntry[]),
  ]);
  return { openEvents, feedback };
}

export default async function DashboardPage() {
  const { openEvents, feedback } = await getDashboardData();

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-8">Founder Dashboard</h1>

      {/* Open Events */}
      <section className="mb-8">
        <h2 className="text-sm font-bold tracking-widest text-violet-400 uppercase mb-4">
          Deck Opens
        </h2>
        {openEvents.length === 0 ? (
          <p className="text-slate-500 text-sm">No opens yet.</p>
        ) : (
          <div className="space-y-2">
            {openEvents.map((ev, i) => (
              <div key={i} className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-slate-300 font-mono">{ev.token}</span>
                <span className="text-xs text-slate-500">
                  {new Date(ev.openedAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Link Generator */}
      <section className="mb-8">
        <h2 className="text-sm font-bold tracking-widest text-violet-400 uppercase mb-4">
          Generate Investor Link
        </h2>
        <p className="text-slate-400 text-sm mb-3">
          Each investor gets a unique token. Share:
        </p>
        <div className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-cyan-300">
          {`${process.env.NEXT_PUBLIC_DECK_URL ?? 'https://your-deck.vercel.app'}/deck?t=INVESTOR_NAME`}
        </div>
        <p className="text-xs text-slate-500 mt-2">Replace INVESTOR_NAME with a recognizable label (e.g., a16z, sequoia, tiger).</p>
      </section>

      {/* Feedback */}
      <section>
        <h2 className="text-sm font-bold tracking-widest text-violet-400 uppercase mb-4">
          Investor Feedback
        </h2>
        {feedback.length === 0 ? (
          <p className="text-slate-500 text-sm">No feedback yet.</p>
        ) : (
          <div className="space-y-2">
            {feedback.map((fb, i) => (
              <div key={i} className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3">
                <p className="text-sm text-slate-300 mb-1">"{fb.message}"</p>
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

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/ app/api/dashboard-auth/
git commit -m "feat(pitch-deck): add founder dashboard with auth"
```

---

### Task 14: AI Deck Generation

**Files:**
- Create: `app/api/generate/route.ts`
- Create: `app/generate/page.tsx`

- [ ] **Step 1: Write the failing API test**

```ts
// __tests__/api.generate.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '---\nmarp: true\n---\n\n# Cover\nTest deck\n' }],
      }),
    };
  },
}));

describe('/api/generate', () => {
  it('requires brief field', async () => {
    const { POST } = await import('@/app/api/generate/route');
    const req = new Request('http://localhost/api/generate', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run __tests__/api.generate.test.ts
```

- [ ] **Step 3: Create `app/api/generate/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are an expert pitch deck writer. Generate a complete Marp presentation following the 13-section "Billion Dollar Pitch Deck" framework.

The 13 sections and their purpose:
1. Cover — Company name + tagline (Hook Test: one-line hook)
2. Hook — The one-sentence story (Hook Test)
3. Problem — The pain point (Pain Test: resonates with target customer)
4. Solution — How you fix it (Clarity Test: simple enough for anyone)
5. Why Now — Timing thesis (Timing Test: why this moment)
6. Product Demo — Show the product (Show Test: show don't tell)
7. Market Size — TAM/SAM/SOM (Math Test: credible numbers)
8. Business Model — Unit economics (Unit Economics Test: makes sense)
9. Traction — Evidence of demand (Evidence Test: proof it works)
10. Competition — Positioning (Positioning Test: where do you win)
11. Go-to-Market — Channel strategy (Channel Test: scalable reach)
12. Team — Founder-market fit (Founder-Market Fit Test: why you)
13. Financial Projections — 3-year model (Reality Test: defensible)
14. The Ask — Funding amount + use of funds (Use of Funds Test: reasonable)

Output ONLY valid Marp markdown. Start with:
---
marp: true
title: [Company] Investor Deck
theme: default
paginate: true
---

Each slide separated by ---. Include speaker notes in HTML comments <!-- like this --> after each slide's content.`;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { brief } = body;

  if (!brief || typeof brief !== 'string' || brief.trim().length < 20) {
    return NextResponse.json(
      { error: 'brief is required (minimum 20 characters)' },
      { status: 400 }
    );
  }

  const client = new Anthropic();
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Generate a complete investor deck for this company:\n\n${brief}`,
      },
    ],
  });

  const markdown = message.content[0].type === 'text' ? message.content[0].text : '';

  return NextResponse.json({ markdown });
}
```

- [ ] **Step 4: Create `app/generate/page.tsx`**

```tsx
'use client';

import { useState } from 'react';

export default function GeneratePage() {
  const [brief, setBrief] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (brief.trim().length < 20) {
      setError('Brief must be at least 20 characters');
      return;
    }
    setLoading(true);
    setError('');
    setResult('');

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief }),
    });

    if (!res.ok) {
      setError('Generation failed. Check your ANTHROPIC_API_KEY.');
      setLoading(false);
      return;
    }

    const data = await res.json();
    setResult(data.markdown);
    setLoading(false);
  };

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">AI Deck Generator</h1>
      <p className="text-slate-400 text-sm mb-8">
        Describe your company and Claude will generate a complete 13-section Marp investor deck.
      </p>

      <div className="mb-4">
        <label className="block text-xs font-bold tracking-widest text-violet-400 uppercase mb-2">
          Company Brief
        </label>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={8}
          placeholder={`Company: Acme AI\nWhat you do: AI-powered contract review for law firms\nProblem: Lawyers spend 40% of time on contract review\nKey metrics: 500 customers, $1.2M ARR, 180% NRR\nTeam: Former BigLaw partner + ex-Google engineer\nAsk: $3M Seed at $15M pre-money`}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-sm resize-none font-mono"
        />
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <button
        onClick={handleGenerate}
        disabled={loading || brief.trim().length < 20}
        className="px-6 py-2.5 bg-violet-600 rounded-lg text-white text-sm font-semibold hover:bg-violet-500 disabled:opacity-40 mb-8"
      >
        {loading ? 'Generating with Claude...' : 'Generate Deck'}
      </button>

      {result && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold tracking-widest text-violet-400 uppercase">
              Generated deck.md
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(result)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Copy to clipboard
            </button>
          </div>
          <pre className="bg-slate-900 border border-slate-700 rounded-xl p-4 text-xs text-slate-300 overflow-auto max-h-96 whitespace-pre-wrap">
            {result}
          </pre>
          <p className="text-xs text-slate-500 mt-2">
            Copy this into <code>content/deck.md</code>, update <code>content/deck.config.ts</code>, then redeploy.
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run test — verify it passes**

```bash
npx vitest run __tests__/api.generate.test.ts
```
Expected: 1 test PASS

- [ ] **Step 6: Commit**

```bash
git add app/api/generate/ app/generate/ __tests__/api.generate.test.ts
git commit -m "feat(pitch-deck): add AI deck generation with Claude Sonnet 4.6"
```

---

### Task 15: Deployment Setup

**Files:**
- Create: `vercel.json`
- Create: `README.md`
- Create: `public/founder-cutout.webm` (placeholder)

- [ ] **Step 1: Create `vercel.json`**

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install"
}
```

- [ ] **Step 2: Create `README.md`**

```markdown
# Interactive Investor Deck

A live, interactive investor pitch deck built with Next.js 14.

## Quick Start

### 1. Clone and install
\`\`\`bash
git clone <this-repo>
cd pitch-deck
npm install
cp .env.example .env.local
\`\`\`

### 2. Configure environment variables
Edit `.env.local` with your values (see `.env.example`).

### 3. Set up Vercel KV
\`\`\`bash
npx vercel link
npx vercel env pull  # pulls KV env vars automatically
\`\`\`

### 4. Set up Telegram Bot
1. Message @BotFather on Telegram → `/newbot`
2. Copy the token → set `TELEGRAM_BOT_TOKEN` in `.env.local`
3. Get your chat ID: message the bot once, then visit:
   `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Set `TELEGRAM_CHAT_ID` to the `chat.id` value

### 5. Register Telegram webhook (after deploying)
\`\`\`bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR-VERCEL-URL/api/telegram"}'
\`\`\`

### 6. Add founder video
Record yourself talking, remove the background (use [unscreen.com](https://unscreen.com) or CapCut).
Export as WebM with alpha channel. Save to `public/founder-cutout.webm`.

### 7. Customize your deck
- Edit `content/deck.md` — or use `/generate` to create with AI
- Edit `content/deck.config.ts` — update company name, metrics, ROI defaults

### 8. Deploy
\`\`\`bash
npx vercel --prod
\`\`\`

## Sharing Investor Links

Format: `https://your-deck.vercel.app/deck?t=INVESTOR_NAME`

Example: `/deck?t=a16z` for Andreessen Horowitz. The dashboard shows opens per token.

## Routes

| Route | Audience |
|-------|----------|
| `/deck` | Investor (shareable link) |
| `/dashboard` | Founder (analytics, password-protected) |
| `/generate` | Founder (AI deck generation, password-protected) |

## Founder Chat

When an investor sends a chat message, you get a Telegram notification:

> 🔔 Deck message from investor `a16z-abc123`
> "What's your GTM strategy?"
>
> Reply with:
> `/reply a16z-abc12345 Your reply text here`

The investor sees your reply appear in the chat widget within 2 seconds.
```

- [ ] **Step 3: Create placeholder video file**

```bash
# Create an empty placeholder so the path exists
touch /Users/michaelkraft/autonomous_vibe_interface/pitch-deck/public/founder-cutout.webm
echo "PLACEHOLDER - replace with real WebM video with alpha channel" > \
  /Users/michaelkraft/autonomous_vibe_interface/pitch-deck/public/FOUNDER_VIDEO_README.txt
```

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```
Expected: All tests PASS (no failures)

- [ ] **Step 5: Verify dev server starts**

```bash
npm run dev
```
Expected: Server starts on port 3000 (or next available). Open http://localhost:3000/deck to see the deck.

- [ ] **Step 6: Final commit**

```bash
cd /Users/michaelkraft/autonomous_vibe_interface
git add pitch-deck/
git commit -m "feat(pitch-deck): complete investor deck app — ready for Vercel deploy"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by task |
|---|---|
| Scrollable long-form page | Task 12 (DeckPageClient) |
| Scroll animations | Task 6 (DeckSection IntersectionObserver) |
| Live data (metrics) | Task 5 (deck.config.ts liveMetrics) |
| ROI calculator | Task 7 (RoiCalculator) |
| Live chat → Telegram | Task 11 (ChatWidget + /api/chat + /api/telegram) |
| Cutout founder video (draggable) | Task 8 (FounderVideo) |
| Open analytics | Task 10 (/api/analytics) + Task 13 (dashboard) |
| Section time heatmap | Task 6 (DeckSection onTimeSpent) + Task 10 + Task 13 |
| Feedback box | Task 9 (FeedbackBox + /api/feedback) |
| Founder dashboard (separate login) | Task 13 |
| AI deck generation | Task 14 |
| Deployment to Vercel | Task 15 |
| Marp as content source | Task 2 (marp-parser) + Task 5 (deck.md) |
| Unique investor tokens | Task 12 (?t= param) |

**Placeholder scan:** No TBDs, TODOs, or "implement later" found.

**Type consistency check:**
- `Slide` interface (Task 2) used in Task 12 ✓
- `ChatMessage` interface (Task 3) used in Tasks 11 and 13 ✓
- `config` from `deck.config.ts` (Task 5) used in Task 12 ✓
- `recordOpenEvent`, `appendChatMessage`, `getChatMessages` (Task 3) used in Tasks 10–11 ✓
- `parseTelegramReply` and `formatInvestorMessage` (Task 4) used in Task 11 ✓

All clean.
