# Coder1.ai/alpha Landing Page - QA Test Report

**Tested:** 2026-02-06
**URL:** https://coder1.ai/alpha
**Page Title:** Coder1 IDE - AI-Powered Development Environment

---

## CRITICAL BUGS (Fix Before Launch)

### 1. Alpha Signup Form is Non-Functional
- Form inputs have NO `name` attributes - email and GitHub username fields both have `name=""`. Server receives empty field names.
- Form method is `GET` - exposes user email in URL parameters. Should be `POST`.
- Form action is the same page (`/alpha`) - no API endpoint for form submission. The form just reloads the page.
- No `id` or `aria-label` on any input - accessibility failure.
- **Impact:** No alpha signups can be collected. This is the primary conversion action.

### 2. Pricing Cards Not Visible (Pro and Team)
- Only the "Free Forever" card renders visually. The Pro ($29/mo) and Team (Custom) cards exist in the DOM at correct positions (left=396 and left=735) with opacity=1, but are invisible on screen.
- Likely a CSS/animation render issue where scroll-triggered entrance animations fail to fire.
- **Impact:** Users cannot see paid plans.

### 3. FAQ Section Shows Only 1 Question
- "Frequently Asked Questions" heading is visible, but only the first question renders. The remaining ~10 questions are invisible.
- Same scroll-animation rendering issue as pricing cards.
- **Impact:** Users cannot get answers to common questions.

### 4. Missing Favicon
- No `<link rel="icon">` element detected. Browser shows default blank/globe icon in tab.
- **Impact:** Looks unpolished; hurts brand recognition.

---

## MEDIUM BUGS

### 5. CTA Buttons in Pricing Section Do Nothing
- "Get Started", "Start Pro Trial", and "Contact Sales" are `<button type="submit">` elements with no `href` and no parent form.
- Clicking them has no effect. Should link to `#alpha` or trigger a signup action.

### 6. Footer Placeholder Links (7 dead links)
- These footer links point to `#` (just scroll to top):
  - Changelog, Roadmap, Blog, Tutorials, API Reference, About, Careers, Press
- Working footer links: Features, Pricing, Documentation (`/documentation`), Contact (`mailto:alpha@coder1.ai`)

### 7. Content Inconsistency - Free Plan Description
- Pricing card says: "50 Johnny5 messages"
- FAQ section says: "5 tasks per day"
- These describe the free tier differently.

### 8. Social Links Need Verification
- GitHub: https://github.com/coder1-ide
- Discord: https://discord.gg/coder1
- Twitter: https://twitter.com/coder1ide
- Social link icons have no `aria-label` attributes.
- Verify these profiles actually exist before launch.

---

## MINOR ISSUES

### 9. Memory Demo Shows Empty Panels
- "Watch Claude Remember Everything" section shows two empty dark panels until "Start Demo" is clicked.
- May look broken to users. Consider placeholder content.

### 10. Logo Links to Root Domain
- The Coder1 logo links to `coder1.ai/` not `/alpha`. If root is empty, this could 404.

### 11. Static Urgency Counter
- "Only 47 Alpha spots remaining" appears hardcoded and static.

### 12. Mobile Testing Needed
- Browser resize was blocked during testing. Manual mobile QA is required before launch.

---

## WHAT IS WORKING WELL

- Page loads with no console errors, no failed resources
- All CSS and fonts load correctly (Inter font)
- Navigation anchor links work (#features, #johnny5, #pricing, #alpha, #demo)
- Smooth scroll to sections works
- Hero section renders cleanly with animated counter (8,000+)
- Johnny5 feature cards render well
- Johnny5 vs OpenClaw comparison table is correct
- Terminal demo simulation looks professional
- "Wake Up to This" morning briefing with interactive reveal
- Security transparency section renders
- "Why Developers Are Switching" comparison table is correct
- Alpha signup form is visually clean (just needs backend wiring)
- Footer layout is clean
- Contact email works (mailto:alpha@coder1.ai)
- Page title and meta description are set

---

## PRIORITY FIX ORDER

1. Fix the alpha signup form (Critical #1) - Add name attrs, change to POST, wire to API
2. Fix pricing card visibility (Critical #2) - Debug CSS animation/scroll trigger
3. Fix FAQ visibility (Critical #3) - Same animation issue as pricing
4. Add favicon (Critical #4) - Quick win
5. Wire CTA buttons (Medium #5) - Link pricing buttons to #alpha
6. Remove or fix placeholder footer links (Medium #6)
7. Align free plan messaging (Medium #7)
8. Test on mobile (Medium #12)
