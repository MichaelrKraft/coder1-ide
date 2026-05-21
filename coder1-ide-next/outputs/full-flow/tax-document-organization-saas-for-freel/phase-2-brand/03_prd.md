# PRD: TaxDrop
## Tax Document Organization SaaS for Freelancers

**Version:** 1.0
**Date:** 2026-04-10
**Status:** Draft — ready for Phase 3 build
**Sources:** Phase 1 discovery report, target customer profile, brand voice, brand visual guidelines

---

## 1. Executive Summary

TaxDrop is a year-round tax document organization SaaS for US-based freelancers and 1099 contractors who file their own tax returns via TurboTax or FreeTaxUSA. It automatically categorizes expenses from bank/card feeds, captures receipts via OCR, computes quarterly estimated tax payments, and produces a Schedule C summary file ready to drag-and-drop import into TurboTax or FreeTaxUSA.

**Beachhead niche:** Etsy sellers (first 1,000 customers)
**Price:** $29/mo or $199/yr; founding member rate $19/mo locked in
**MVP strategy:** Productized service backed by Veryfi OCR + Plaid bank feeds — no proprietary ML required at launch
**Validation target:** 25 paying customers before proprietary code investment

---

## 2. Product Vision

### Problem
Freelancers earning $30K–$120K/yr via 1099 income overpay the IRS by an average of 21% (~$2,400–$6,000/yr) because they have no year-round system to capture deductible expenses. TurboTax only processes what users manually enter; everything forgotten between January and April is money left on the table.

### Solution
An always-on expense capture system that:
1. Pulls transactions automatically from bank/card accounts via Plaid (read-only)
2. Categorizes them into IRS Schedule C line items using Veryfi + rule-based AI
3. Lets users snap/upload receipts that get OCR'd and matched to transactions
4. Calculates quarterly estimated tax payments (Form 1040-ES)
5. Exports a TurboTax-compatible and FreeTaxUSA-compatible import file at tax time

### Strategic Differentiator
The only tool that produces a drag-and-drop import file for both TurboTax Self-Employed and FreeTaxUSA simultaneously — serving the price-conscious DIY segment that competitors ignore.

---

## 3. User Personas

### Primary: The Overwhelmed Etsy Seller (Beachhead)

| Attribute | Value |
|---|---|
| Name | Sarah, 32 |
| Income | $48,000/yr from Etsy shop |
| Tax behavior | Self-files via TurboTax Self-Employed |
| Current system | CSV export from Etsy + bank statement + guesswork |
| Biggest pain | COGS (materials, shipping, packaging) not cleanly tracked; home studio deduction uncertain |
| Trigger event | Received first 1099-K at $600 threshold; panicked |
| Budget | $29/mo comfortable if it saves her 4+ hours at tax time |
| Trust barrier | Doesn't want to connect bank account unless she understands exactly what read-only means |

### Secondary: The Upwork/Fiverr Freelancer

| Attribute | Value |
|---|---|
| Name | Marcus, 29 |
| Income | $72,000/yr from software consulting |
| Tax behavior | Self-files via FreeTaxUSA |
| Current system | Nothing; relies on bank export in April |
| Biggest pain | Software subscriptions (GitHub, Figma, AWS) not captured; home office deduction formula confused |
| Trigger event | Quarterly payment penalty triggered; wants to get organized |
| Budget | $19–$29/mo; responds strongly to founding member pricing |

### Tertiary: The Independent Real Estate Agent

| Attribute | Value |
|---|---|
| Income | $90,000–$140,000/yr in commissions |
| Tax behavior | Mix of self-file and occasional CPA |
| Biggest pain | Vehicle mileage, client entertainment, marketing spend — manual log |
| Trigger event | Income crossed $100K; CPA quoted $600 for Schedule C prep |
| Budget | $29–$49/mo; high ROI sensitivity due to income level |

---

## 4. Feature Requirements

### MVP Feature Set (Phase 3 Build Target)

#### F1: Bank & Card Feed Connection
- **What:** Connect up to 3 financial accounts via Plaid Link
- **Behavior:** Read-only transactions pulled daily; 12 months of history on first connect
- **Display:** Transaction list with date, amount, merchant name, raw category
- **Acceptance criteria:**
  - User completes Plaid Link OAuth in < 3 minutes
  - Transactions appear within 60 seconds of connection
  - Read-only badge + Plaid logo visible on connection screen
  - Disconnection removes all stored transaction data within 24h on request

#### F2: Auto-Categorization into Schedule C Lines
- **What:** Each transaction tagged to a Schedule C Part II line (e.g., Line 18: Office expenses, Line 22: Supplies)
- **Mechanism:** Veryfi API for receipt OCR; rule-based classifier for bank transactions (merchant name → IRS category)
- **User interaction:** One-click approve or reassign category; bulk approve supported
- **Acceptance criteria:**
  - 80%+ of transactions from top-20 freelance merchants auto-categorized correctly
  - User can reassign to any of the 22 Schedule C categories
  - Category rules save per-merchant for future auto-approval
  - "Uncategorized" queue always visible and drainable

#### F3: Receipt Capture (OCR)
- **What:** Upload photo or PDF of receipt; OCR extracts amount, date, vendor
- **Mechanism:** Veryfi OCR API
- **Matching:** System attempts to match to existing bank transaction; user confirms or creates standalone expense
- **Acceptance criteria:**
  - OCR returns result in < 10 seconds for standard receipt photo
  - Mobile camera upload works from iOS Safari and Android Chrome
  - Email forwarding address provided (receipts@[user].taxdrop.io → auto-ingested)
  - Unmatched receipts appear in a "needs review" queue

#### F4: Etsy-Specific COGS Tracking (Beachhead Feature)
- **What:** Dedicated COGS section for Etsy sellers — materials, packaging, shipping supplies, Etsy fees
- **Why:** Schedule C Line 4 (COGS) is the #1 missed category for product sellers; standard bank categorization does not separate COGS from other expenses
- **Acceptance criteria:**
  - Etsy sellers can tag any expense as COGS with one tap
  - Beginning/ending inventory inputs capture cost-of-goods-sold calculation
  - COGS total flows to Schedule C Line 4 in export

#### F5: Quarterly Tax Estimate Calculator
- **What:** Running estimate of Q1/Q2/Q3/Q4 estimated tax payment (Form 1040-ES)
- **Inputs:** YTD income (from bank feed or manual entry), filing status, prior year tax (optional)
- **Output:** Recommended payment amount + due date reminder
- **Acceptance criteria:**
  - Estimate recalculates within 5 seconds of new income/expense data
  - Due date push notification sent 14 days and 3 days before each quarterly deadline
  - "Safe harbor" mode (pay 100% of prior year tax) togglable
  - Disclaimer: "This is an estimate. Consult a tax professional for final amounts."

#### F6: Schedule C Export
- **What:** Generate export file ready to import into TurboTax Self-Employed or FreeTaxUSA
- **Format:** TurboTax: proprietary .tax2024 compatible CSV; FreeTaxUSA: Schedule C line-item CSV
- **Trigger:** User clicks "Export for TurboTax" or "Export for FreeTaxUSA"
- **Acceptance criteria:**
  - TurboTax import tested and verified against TurboTax Self-Employed 2024
  - FreeTaxUSA import tested and verified against FreeTaxUSA 2024 Schedule C form
  - Export includes all approved expenses, COGS, home office, mileage
  - Export generates in < 5 seconds
  - Previous exports downloadable from account for 7 years

#### F7: Home Office Deduction Wizard
- **What:** Guided flow to calculate the home office deduction (simplified method: $5/sq ft up to 300 sq ft)
- **Acceptance criteria:**
  - User inputs home sq footage and dedicated office sq footage
  - System calculates deduction using IRS simplified method
  - Output flows to Schedule C Line 30
  - Link to IRS Publication 587 provided for reference

#### F8: Mileage Log
- **What:** Manual mileage entry by trip (date, purpose, miles) with annual total for Schedule C Line 9
- **Nice-to-have:** GPS-based auto-tracking via mobile (Phase 2 feature, not MVP)
- **Acceptance criteria:**
  - Manual entry works on mobile and desktop
  - IRS standard mileage rate applied automatically (2024: $0.67/mi)
  - Deduction value displayed alongside mileage total
  - Exportable mileage log for audit documentation

#### F9: Onboarding Flow
- **What:** Guided 5-step setup: account type → connect bank → upload first receipt → review categories → see first deduction estimate
- **Acceptance criteria:**
  - Median time-to-first-deduction-estimate < 8 minutes from signup
  - "Skip" available for each step (no hard blocks)
  - Etsy sellers see Etsy-specific COGS prompt in step 3
  - Trust module (Plaid read-only explanation) shown before bank connect CTA

---

## 5. Technical Requirements

### Stack (MVP)

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Next.js 14 (App Router) | SSR for SEO on marketing pages; RSC for dashboard performance |
| Styling | Tailwind CSS | Fast iteration; matches brand dark-theme system |
| Backend | Next.js API routes + Supabase | Minimal ops; RLS for per-user data isolation |
| Database | Supabase Postgres | Row-level security; Plaid webhook storage; receipt metadata |
| Auth | Supabase Auth (magic link + Google) | No password management required |
| File storage | Supabase Storage | Receipt images, export files |
| Bank feeds | Plaid API (Transactions product) | Industry standard; Veryfi uses same |
| OCR | Veryfi API | Best-in-class receipt OCR; < 10s turnaround |
| Email | Resend | Receipt forwarding; transactional emails |
| Payments | Stripe | Subscription billing; annual discount |
| Hosting | Vercel | Zero-config Next.js deploy |

### Data Storage Rules
- Plaid access tokens: encrypted at rest in Supabase Vault
- Receipt images: user-isolated in Supabase Storage with signed URLs
- Transactions: stored in Supabase Postgres with RLS (users see only their own data)
- No transaction data shared between users or used for ML training without explicit opt-in consent

### Integrations (Ordered by Priority)
1. Plaid (bank feed) — required for MVP
2. Veryfi (OCR) — required for MVP
3. Stripe (billing) — required for MVP
4. TurboTax export format — required for MVP
5. FreeTaxUSA export format — required for MVP
6. HeyGen avatar (validation sprint DMs) — Phase 2
7. GPS mileage tracking — Phase 2

### Performance Requirements
- First contentful paint: < 1.5s on 4G mobile
- Categorization queue processes 100 transactions: < 3 seconds
- Export generation: < 5 seconds for a full tax year
- Uptime SLA: 99.5% (given seasonal peak in Jan–Apr)

### Security Requirements
- SOC 2 Type II certification roadmap (not required at MVP, required before $100K ARR)
- Plaid connections: read-only Transactions product only — no payment initiation
- All API keys in environment variables; none in client-side code
- HTTPS everywhere; HSTS headers
- Audit log of all data export events (who exported, when, what)

---

## 6. User Stories

### Core Journey

```
As an Etsy seller, I want to connect my bank account so that TaxDrop can
automatically find the business expenses I've been missing all year.
  Acceptance: Bank connects in < 3 min; 12 months of history loads; first
  categorized expenses visible within 60 seconds.

As a freelancer, I want to see my estimated quarterly tax payment so that
I never get hit with a penalty again.
  Acceptance: Estimate visible on dashboard within 5 steps of signup;
  recalculates in real-time as I add income/expenses.

As a TurboTax user, I want to export my Schedule C data so that I can
drag it into TurboTax and not have to re-enter everything manually.
  Acceptance: Export file imports into TurboTax Self-Employed 2024 without
  errors; all approved categories appear on correct Schedule C lines.
```

### Trust & Objection Stories

```
As a new user, I want to understand exactly what "read-only bank access"
means before I connect my account.
  Acceptance: Trust module with Plaid logo, read-only explanation, and
  "same as Venmo" analogy visible before connect CTA; no CTA without it.

As an existing user, I want to disconnect my bank account and delete my
data at any time.
  Acceptance: One-click disconnect removes Plaid token; data deletion
  request processed within 24h; confirmation email sent.
```

---

## 7. Success Metrics

### Activation
- Target: 60% of signups complete bank connection within 7 days
- Target: 80% of connected users see their first "deduction found" badge within session

### Retention
- Target: 70% monthly retention through May (post-tax-season test)
- Target: 40% annual plan conversion rate (reduces seasonal churn risk)
- North star: Quarterly estimate feature usage predicts year-round retention — track weekly

### Revenue
- Target: 25 paying customers before proprietary code investment
- Target: $1,000 MRR within 90 days of launch
- Target: $10K MRR by end of first tax season (Year 1)

### Product Quality
- Target: < 5% "wrong category" reports on auto-categorized transactions
- Target: NPS > 40 at 30 days post-signup
- Target: Export success rate (no import errors in TurboTax/FreeTaxUSA) > 98%

---

## 8. Timeline & Milestones

| Phase | Duration | Milestone |
|---|---|---|
| Pre-build validation | 2 weeks | 25 waitlist signups from r/Etsy + LinkedIn DMs |
| MVP build (Phase 3) | 4–6 weeks | Plaid connect + auto-categorize + Schedule C export working |
| Closed beta | 2 weeks | 10 founding members using live product |
| Public launch | Week 10 | ProductHunt + r/Etsy + LinkedIn post |
| Tax season peak | Jan–Apr Year 1 | Acquire 200+ paying customers |

---

## 9. Out of Scope (MVP)

The following are explicitly NOT included in the MVP build:

| Feature | Reason Deferred |
|---|---|
| Proprietary ML categorization engine | Use Veryfi API; build training data first |
| GPS mileage auto-tracking (mobile) | Manual log sufficient for MVP |
| CPA marketplace / filing service | Complexity; focus on DIY segment |
| State income tax calculation | Federal only for MVP; state varies too much |
| Multi-business / multi-EIN support | Single Schedule C per account in MVP |
| Payroll (W-2 + 1099 mix) | 1099-only for MVP |
| International / non-US users | Schedule C is US-specific |
| Audit defense service | Phase 2 premium tier |
| iOS/Android native app | PWA + mobile web first |
| Accountant portal / white-label | Phase 3 |

---

## 10. Pricing & Packaging

### Tiers

| Tier | Price | Limits | Target |
|---|---|---|---|
| Free Trial | $0 / 14 days | 1 bank account, 50 transactions | Activation |
| Monthly | $29/mo | Unlimited accounts, transactions, exports | Default |
| Annual | $199/yr ($16.58/mo) | Same as monthly | LTV optimization |
| Founding Member | $19/mo (locked) | Same as monthly; capped at 200 | Early traction |

### Guarantee
"Find $500 in missed deductions or your first 3 months are free." — No-questions refund, handled manually for founding cohort.

---

## 11. Grand Slam Offer (Hormozi Framework)

Per Phase 1 discovery:

- **Core:** AI expense categorization + Schedule C export
- **Bonus 1:** "47 Deductions Most Etsy Sellers Miss" PDF (perceived value $97)
- **Bonus 2:** Quarterly tax deadline reminder + payment calculator (perceived value $49)
- **Bonus 3:** First-year CPA review call — capped at 200 founding members (perceived value $200)
- **Guarantee:** Find $500 in missed deductions or first 3 months free
- **Urgency:** Founding member $19/mo locked in before [launch date]

---

## 12. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Seasonal churn (cancel after April) | High | High | Quarterly estimate feature drives year-round engagement; annual plan discount |
| Plaid connection friction (bank not supported) | Medium | Medium | Veryfi receipt-only fallback; manual CSV import |
| Veryfi OCR errors on hand-written receipts | Low | Low | Flag for manual review; don't auto-categorize low-confidence results |
| TurboTax export format change mid-season | Medium | High | Monitor TurboTax developer changelog; maintain test suite against export |
| FlyFin copies beachhead (Etsy) targeting | Medium | Medium | Build community moat first; Etsy seller Facebook groups + r/Etsy presence |
| 1099-K rule reversal by IRS | Low | Medium | Core product value is deduction finding, not compliance — still valuable either way |
