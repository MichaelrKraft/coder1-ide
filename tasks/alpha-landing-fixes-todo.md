# Alpha Landing Page Fixes - Todo

Based on QA report: `tasks/alpha-landing-page-qa-report.md`
File: `coder1-ide-next/app/alpha/page.tsx`

## Fixes

- [x] **1. Fix ScrollReveal for Pricing Cards & FAQ** (Critical #2 & #3)
  - Root cause: `ScrollReveal` uses IntersectionObserver with `threshold: 0.1` and `rootMargin: '-50px'`. Items with `delay` (100ms, 200ms for pricing; 50-550ms for FAQ) may not trigger if user hasn't scrolled far enough or the observer fires before delay completes.
  - Fix: Remove `ScrollReveal` wrappers from individual pricing cards and FAQ items. Keep `ScrollReveal` only on the section headings. The cards/FAQ items themselves don't need scroll-triggered entrance animations.

- [x] **2. Add `name`, `id`, and `aria-label` to form inputs** (Critical #1 partial)
  - The form uses React controlled state (`email`/`github`) and `handleSubmit` already POSTs to `/api/alpha/waitlist` via fetch. No need to change form method/action since JS handles it.
  - Add `name`, `id`, `aria-label` attributes to both inputs for accessibility and fallback.

- [x] **3. Add favicon** (Critical #4)
  - Add `icons` to the metadata export in `layout.tsx` pointing to the existing SVG logo.

- [x] **4. Wire pricing CTA buttons** (Medium #5)
  - "Get Started" already scrolls to #alpha - working.
  - "Start Pro Trial" already calls `handleProCheckout` - working.
  - "Contact Sales" already does `mailto:` - working.
  - These are all wired via `onClick` props. The QA report flagged them because they're `<button>` not `<a>`, but they do have handlers. No fix needed.

- [x] **5. Fix placeholder footer links** (Medium #6)
  - Replace `href="#"` with either real paths or remove the links.
  - For alpha launch: remove placeholder links that go nowhere.

- [x] **6. Align free plan messaging** (Medium #7)
  - Pricing card says "50 Johnny5 messages", FAQ says "5 tasks per day"
  - Update FAQ to match pricing card: "50 Johnny5 messages per month"

- [x] **7. Add aria-labels to social icons** (Medium #8)
  - Add `aria-label` to GitHub, Discord, and Twitter link elements.

## Review

All 7 fixes applied. Summary:
- Removed ScrollReveal wrappers from individual pricing cards and FAQ items so they're always visible when scrolled into view
- Added name/id/aria-label to form inputs for accessibility
- Added favicon via Next.js metadata icons config
- Simplified footer by removing dead placeholder links
- Aligned free plan messaging between pricing card and FAQ
- Added aria-labels to social media icons
