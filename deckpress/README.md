# Deckpress

The new pitch deck in interactive website format — built on a scroll-driven
cinematic canvas with live founder chat, per-section analytics, and an
optional ROI calculator. Designed to replace static PDFs and Keynote
exports with something investors actually engage with.

This repository is the flagship build for **Coder1 IDE's** own investor
deck. It is structured so the same template can host any deck by editing
a single config file.

## Architecture

Hybrid Next.js + vanilla HTML/CSS/JS:

- **`public/deck/`** — The cinematic investor-facing page. Pure vanilla
  HTML + CSS + JavaScript, loaded from CDN (Lenis, GSAP, ScrollTrigger).
  No bundler. Served at `/deck`.
- **`app/`** — Next.js App Router for the founder dashboard (`/dashboard`)
  and API routes (`/api/*`).
- **`lib/`** — Shared TypeScript helpers (Vercel KV, Telegram, auth).
- **`content/deck.config.ts`** — Single source of truth. Serialized to
  `public/deck/js/config.js` at build time.

## Quick start

### 1. Install

```bash
git clone <this-repo>
cd deckpress
npm install
cp .env.example .env.local
```

### 2. Configure environment variables

Edit `.env.local`:

```
KV_URL=                          # from Vercel KV dashboard
KV_REST_API_URL=                 # from Vercel KV dashboard
KV_REST_API_TOKEN=               # from Vercel KV dashboard
KV_REST_API_READ_ONLY_TOKEN=     # from Vercel KV dashboard
TELEGRAM_BOT_TOKEN=              # from @BotFather
TELEGRAM_CHAT_ID=                # from getUpdates after messaging the bot
DASHBOARD_PASSWORD=              # pick anything
NEXT_PUBLIC_DECK_URL=https://deckpress.vercel.app   # for link generator
```

### 3. Set up Vercel KV

```bash
npx vercel link
npx vercel env pull  # pulls KV env vars automatically
```

### 4. Set up the Telegram bot

1. Message `@BotFather` on Telegram → `/newbot` → follow prompts
2. Copy the token into `TELEGRAM_BOT_TOKEN`
3. Message your new bot once
4. Visit `https://api.telegram.org/bot<TOKEN>/getUpdates`
5. Find the `chat.id` field in the response and paste into `TELEGRAM_CHAT_ID`

### 5. Register the Telegram webhook (after first deploy)

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR-VERCEL-URL/api/telegram"}'
```

### 6. Extract product demo frames

```bash
./scripts/extract-frames.sh path/to/product-demo.mp4
```

The script chooses FPS based on video duration (30/12/8) and outputs
WebP frames to `public/deck/frames/`.

### 7. Add the founder cutout video

Record the founder giving a short pitch, remove the background in CapCut
(or use `rembg`), and export as **WebM with VP9 alpha channel**. Drop the
file at `public/deck/media/founder-cutout.webm`. Also drop a static
fallback JPG at `public/deck/media/founder-fallback.jpg` for Safari.

See `public/deck/media/README.md` for full details.

### 8. Customize your deck

Edit `content/deck.config.ts`:

- `company`, `tagline`, `hero.heading` — hero copy
- `sections[]` — the 8 pitch sections (problem, solution, why now, market,
  traction, GTM+team, ask, and optionally ROI calculator insertion point)
- `marquee.text` — the oversized scroll-bound text
- `founder.name`, `founder.title` — chat widget identity
- `features.*` — toggle the chat widget, analytics, feedback box, and
  ROI calculator on or off per deployment

Then rebuild:

```bash
npm run build:config
```

### 9. Deploy

```bash
npx vercel --prod
```

## Dev loop

```bash
npm run dev        # builds config, starts Next.js on port 3000
npm test           # runs the Vitest suite (32 tests covering KV, API
                   # routes, build-config)
npx tsc --noEmit   # type check the Next.js side
node --check public/deck/js/app.js   # syntax check the vanilla frontend
```

## Routes

| Route | Audience | Auth |
|-------|----------|------|
| `/deck` | Investor (shareable) | None — token in `?t=` for analytics |
| `/dashboard` | Founder | Password cookie set by `/dashboard/login` |
| `/dashboard/login` | Founder | Open |
| `/api/analytics` | Investor's browser | None |
| `/api/chat` | Investor's browser | None |
| `/api/chat/messages` | Investor's browser | None |
| `/api/feedback` | Investor's browser | None |
| `/api/telegram` | Telegram webhook | None (Telegram verifies) |
| `/api/dashboard-auth` | Login form | None, sets cookie on success |

## Sharing investor links

Format: `https://your-deck.vercel.app/deck?t=INVESTOR_NAME`

Examples:
- `/deck?t=a16z`
- `/deck?t=sequoia`
- `/deck?t=tiger`

The `t` parameter is the anonymous identifier that shows up in the
founder dashboard's "Deck Opens" list.

## Founder chat flow

When an investor sends a message from the chat widget, you get a
Telegram notification:

```
🔔 Deckpress message from investor `a16z`

"What's your GTM strategy?"

Reply with:
/reply a16z-ab12cd34 Bottom-up community growth through YouTube.
```

You reply in Telegram. Your response appears in the investor's chat
widget within 2 seconds via the polling loop.

## Out of scope (for now)

- Multi-founder / team accounts
- Multiple decks per deployment (one deployment = one deck)
- AI-assisted deck generation (deferred to v2 / productization)
- Email notifications (Telegram only)
- Custom domains per deck

## Spec & plan

Full design spec and task-by-task implementation plan:

- `docs/superpowers/specs/2026-04-09-deckpress-design.md`
  (in `coder1-ide-next` repo — supersedes the 2026-04-08 sidebar design)
- `docs/superpowers/plans/2026-04-09-deckpress.md`
