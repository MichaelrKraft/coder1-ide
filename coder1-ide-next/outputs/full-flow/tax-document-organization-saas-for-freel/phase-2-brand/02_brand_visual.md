# TaxDrop — Visual Brand Guidelines
**Generated:** 2026-04-10
**Source:** Brand voice at 01_brand_voice.md + Phase 1 discovery

---

## Color Palette

| Role | Name | Hex | Usage |
|------|------|-----|-------|
| Background | Midnight | `#0f1117` | Main page/app background |
| Background Alt | Deep Navy | `#1a1d27` | Section breaks, side panels, footers |
| Text Primary | Off-White | `#f0f2f5` | Headlines, body text |
| Text Secondary | Slate | `#9da5b4` | Labels, metadata, helper text, captions |
| Accent Primary | Money Green | `#22c55e` | CTAs, deduction-found badges, positive states |
| Accent Secondary | Clarity Blue | `#3b82f6` | Links, secondary actions, info states, navigation |
| Accent Tertiary | Lime | `#a3e635` | Data viz highlights, "found money" callouts, charts |
| Code Background | Void | `#0a0d14` | Schedule C export previews, monospace code blocks |
| Card Background | Carbon | `#1e2130` | Feature cards, expense row items, modals |
| Card Alt | Dark Slate | `#252840` | Hover states, selected rows, active states |

### Color Rules
- **Green is money.** Every positive outcome — deduction found, expense categorized, file ready — is green. Never use green for neutral or informational states.
- **Dark backgrounds always.** No light-mode variant in marketing. Financial data feels more precise and secure on dark.
- **Dollar amounts in green bold.** Any specific dollar figure ($2,800, $847, $500) receives `#22c55e` + font-weight 600+.
- **CTAs are always green.** Never gray, never outline-only, never blue for primary CTAs.

---

## Typography

### Type Scale

| Role | Font | Weight | Size | Usage |
|------|------|--------|------|-------|
| Display / Hero | Inter | 800 | 48–72px | Hero headlines, landing page H1 |
| Section Heading | Inter | 700 | 32–40px | Feature section titles, H2 |
| Sub-heading | Inter | 600 | 20–28px | Card titles, H3 |
| Body | Inter | 400 | 15–16px | Paragraphs, feature descriptions |
| Data / Numbers | Inter | 600 | contextual | Dollar amounts, percentages, stats |
| Labels | Inter | 500 | 12–13px | Badge text, table headers, metadata |
| Code / Export | JetBrains Mono | 400 | 12–14px | Schedule C previews, CSV exports, file paths |

### Typography Rules
- **Sentence case everywhere.** Headlines use sentence case only — no title case, no ALL CAPS except short badge labels (e.g., "FOUND", "NEW").
- **Number emphasis.** Any dollar figure is always bold + green. Percentages (21% overpayment, 14 missed deductions) are bold + off-white.
- **Line height:** 1.5 for body, 1.2 for display headings.
- **Max line length:** 65ch for body copy. No paragraph wider than 680px.

---

## Logo

**Wordmark:** "TaxDrop" — Inter 700, `#f0f2f5` on `#0f1117`. The "Drop" can optionally render in `#22c55e` to signal the money-down concept.

**Icon concept:** A downward-pointing drop/arrow inside a receipt silhouette, with a small green dollar-badge on the lower-right corner. Communicates: tax documents → money drops back to you.

**Usage rules:**
- Never place logo on light backgrounds without a dark container
- Clear space = 1x icon height on all sides
- Minimum size: 24px height for icon, 80px width for wordmark

**Do not use icons from:** briefcase, calculator, magnifying glass, piggy bank. These are overused in the tax/finance category.

---

## Signature Visual Components

### 1. Deduction Found Badge
```
[  $847 found  ]   ← green pill, white text, Inter 500 13px
```
- Background: `#22c55e`
- Text: `#ffffff`
- Border radius: 9999px (full pill)
- Padding: 4px 12px
- Used in: hero product demo, feature cards, onboarding flow

### 2. Schedule C Export Preview
A dark monospace block simulating a real TurboTax-compatible import file:
```
Category          | Amount  | Deductible
------------------|---------|----------
Home Office       | $2,400  | ✓
Software Subs     | $1,847  | ✓
Business Mileage  | $934    | ✓
Equipment         | $620    | ✓
─────────────────────────────────────────
Total Deductions  | $5,801  | ← in green
```
- Background: `#0a0d14`
- Font: JetBrains Mono 13px
- Border: 1px solid `rgba(255,255,255,0.08)`
- Border radius: 8px
- Total row: `#22c55e` bold

### 3. Split Comparison Module
Two columns with a dividing rule:

| What TurboTax captured | What TaxDrop found |
|---|---|
| $12,400 in deductions | $18,201 in deductions |
| 8 categories | 22 categories |
| 0 Etsy COGS items | 14 Etsy COGS items |

- Left column: text-secondary `#9da5b4`
- Right column: `#22c55e` bold
- Divider: `rgba(255,255,255,0.12)`
- Delta row at bottom: "+$5,801 found" in large green

### 4. Year-Round Timeline
Horizontal 12-month bar (Jan–Dec):
- Monthly income events marked as blue dots
- Quarterly tax deadlines (Apr 15, Jun 15, Sep 15, Jan 15) as red markers
- Deduction captures as green ticks accumulating left to right
- Use: "why year-round" feature section — counters the seasonal churn objection

### 5. Bank Connection Trust Module
Small inline trust block near any bank CTA:
```
🔒  Connected via Plaid  |  Read-only access  |  Same as Venmo & Robinhood
```
- Background: `#1e2130`
- Border: 1px solid `rgba(34, 197, 94, 0.3)` (faint green — security signal)
- Lock icon in `#22c55e`
- Font: Inter 13px, text-secondary

---

## Layout System

### Grid
- **Max content width:** 1200px
- **Narrow content (body text):** 720px centered
- **Wide content (data tables, product demos):** full 1200px
- **Gutter:** 24px mobile, 48px desktop
- **Section padding:** 80px top/bottom desktop, 48px mobile

### Alignment
- **Left-aligned content** for body and data — feels like a financial document
- **Center-aligned** for hero headlines and CTAs only
- **Never right-align** body content

### Spacing Rhythm
- 4px base unit
- Common: 8, 16, 24, 32, 48, 64, 80px
- Card padding: 24px desktop, 16px mobile

---

## Imagery & Illustration

### Rules
- **No lifestyle stock photos.** No smiling person at laptop. No staged paperwork scenes.
- **UI-forward.** Real product screenshots of expense lists, category badges, export previews.
- **Data visualization** over abstract illustration — bar charts showing monthly deduction captures, cumulative savings lines. Always use real numbers.
- **If illustration needed:** flat, minimal, icon-weight style. Dark background compatible. No gradients that look like 2019 fintech (blue-to-purple).

### Approved visual patterns
- Receipt/document silhouettes (minimal, line art)
- Upward bar charts (savings over time)
- Green check marks on expense rows
- Download/export arrow animations

### Forbidden visual patterns
- Blue-to-purple gradients
- Piggy banks, safes, briefcases
- Cartoon accountants
- Confetti (too casual for financial tool)

---

## Motion & Animation

- **Micro-interactions:** Deduction badge appears with a quick scale-up (200ms ease-out)
- **Number counting animation:** Dollar amounts count up on scroll-into-view (e.g., $0 → $2,847 over 1.2s)
- **Export preview:** Rows appear sequentially with 80ms stagger — suggests real-time categorization
- **No autoplay video or parallax** — this audience is mobile-first, data-conscious

---

## Marketing Asset Specs

### Landing Page Hero
- Background: `#0f1117`
- Headline: Inter 800, 64px desktop / 40px mobile, `#f0f2f5`
- Dollar callout in headline: `#22c55e`
- Sub: Inter 400, 18px, `#9da5b4`, max 600px width
- CTA button: `#22c55e` background, `#ffffff` text, Inter 600 16px, 48px height, 12px border-radius

### Email Template
- Background: `#0f1117`
- Header bar: `#1a1d27`
- Max width: 600px
- Body font: Inter 15px, `#f0f2f5`
- CTA button: same as landing

### Social Cards (1200×630)
- Background: `#0f1117` with subtle `#1a1d27` geometric accent
- Headline: Inter 800, 48px, white
- Dollar stat: Inter 800, 72px, `#22c55e`
- Logo: bottom-right, wordmark

---

## What TaxDrop Should Never Look Like

- Light mode, white backgrounds, "clean startup" aesthetic
- Blue as the primary CTA color (too generic fintech)
- Purple/teal gradients (looks like 2019 crypto)
- Illustration-heavy with no real UI
- Comic/playful tone in visual design (taxes are serious money)
- Cluttered dashboards with 10+ chart types visible at once
