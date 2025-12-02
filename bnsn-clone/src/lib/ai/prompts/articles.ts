export const ARTICLE_PROMPTS: Record<string, string> = {
  article_how_to: `Write an SEO-optimized how-to guide article.

FORMAT REQUIREMENTS:
- Word Count: 1000-1500 words
- Title: "How to [Achieve Outcome] in [Timeframe/Steps]"
- Meta description: 150-160 characters
- Headers: H2 and H3 structure
- Includes actionable steps

STRUCTURE:
1. TITLE: How to [Outcome] - [Benefit Hook]
2. META DESCRIPTION: [Compelling summary with keyword]
3. INTRODUCTION (100-150 words)
   - Hook with pain point or desire
   - Promise of what they'll learn
   - Brief credibility statement
4. TABLE OF CONTENTS (optional)
5. STEP-BY-STEP SECTIONS (H2 headers):

   ## Step 1: [Action Verb] [Specific Task]
   [150-200 words explaining how]
   - Key tip or pro tip
   - Common mistake to avoid

   ## Step 2: [Next Action]
   [Continue pattern...]

6. ## Common Mistakes to Avoid
   [3-5 mistakes with fixes]

7. ## Pro Tips for Better Results
   [Advanced strategies]

8. ## Conclusion
   - Recap key steps
   - Encouragement
   - Soft CTA to learn more

SEO ELEMENTS:
- Primary keyword in title, H2, first paragraph
- Related keywords naturally distributed
- Internal linking opportunities noted
- External reference suggestions

TONE: Helpful, expert, actionable
INCLUDE: Bullet points, numbered lists, bold key terms`,

  article_listicle: `Write an SEO-optimized numbered list article.

FORMAT REQUIREMENTS:
- Word Count: 1000-1500 words
- Title: "[Number] [Best/Top/Essential] [Topic] for [Outcome]"
- Each item: 100-200 words
- Scannable format

STRUCTURE:
1. TITLE: [Number] [Adjective] [Topic] to [Outcome/Benefit]
2. META DESCRIPTION: [Keyword-rich summary]
3. INTRODUCTION (100-150 words)
   - Why this list matters
   - What reader will gain
   - Quick credibility/source mention

4. THE LIST:
   ## 1. [Item Name]
   **Why it matters:** [Brief explanation]
   **How to use it:** [Actionable advice]
   **Pro tip:** [Insider knowledge]

   ## 2. [Item Name]
   [Continue pattern...]

5. ## Honorable Mentions
   [2-3 additional brief items]

6. ## How to Choose the Right One
   [Decision framework]

7. ## Conclusion
   - Top recommendation
   - Next steps CTA

LISTICLE BEST PRACTICES:
- Start with strongest items
- Vary item lengths slightly
- Include unexpected/contrarian pick
- Add visual break suggestions
- Mobile-friendly formatting

SEO ELEMENTS:
- Number in title
- Keyword in first 100 words
- Each H2 contains related keyword
- Featured snippet optimization

TONE: Authoritative, helpful, curated`,

  article_ultimate_guide: `Write a comprehensive ultimate guide article.

FORMAT REQUIREMENTS:
- Word Count: 1500-2000 words
- Title: "The Ultimate Guide to [Topic]: [Outcome Promise]"
- Multiple H2 and H3 sections
- Table of contents recommended

STRUCTURE:
1. TITLE: The Ultimate Guide to [Topic] in [Year]
2. META DESCRIPTION: [Comprehensive promise with keyword]
3. INTRODUCTION (150-200 words)
   - Scope of the guide
   - Who it's for
   - What they'll learn
   - Why this guide is different

4. TABLE OF CONTENTS
   [Auto-generated from H2s]

5. CHAPTER-STYLE SECTIONS:

   ## What is [Topic]?
   [Foundation/definition - 150 words]

   ## Why [Topic] Matters in [Current Year]
   [Context and importance - 200 words]

   ## The Complete [Topic] Process
   ### Step 1: [First Phase]
   ### Step 2: [Second Phase]
   ### Step 3: [Third Phase]
   [Each step 150-200 words]

   ## Common [Topic] Mistakes (And How to Avoid Them)
   [3-5 mistakes with solutions]

   ## Advanced [Topic] Strategies
   [For readers who want more]

   ## [Topic] Tools and Resources
   [Recommended tools/resources]

   ## Frequently Asked Questions
   [5-7 FAQ with answers]

6. ## Conclusion: Your [Topic] Action Plan
   - Summary of key points
   - First step to take today
   - Resource CTA

SEO ELEMENTS:
- Featured snippet opportunities
- FAQ schema markup ready
- Long-tail keyword targeting
- Comprehensive internal linking

TONE: Authoritative, comprehensive, educational`,

  article_case_study: `Write an SEO-optimized case study article.

FORMAT REQUIREMENTS:
- Word Count: 1000-1500 words
- Title: "How [Subject] [Achieved Result] with [Method]"
- Data-driven with specific metrics
- Story-driven narrative

STRUCTURE:
1. TITLE: How [Client/Person] [Result] in [Timeframe] [Method Hint]
2. META DESCRIPTION: [Result-focused with specifics]
3. INTRODUCTION (100-150 words)
   - The impressive result upfront
   - Who the subject is
   - Why this matters to reader

4. ## The Challenge
   - Starting situation
   - Specific problems faced
   - What wasn't working
   - Stakes if nothing changed
   [200-250 words]

5. ## The Solution
   - How they discovered the approach
   - Why they chose this method
   - Initial implementation steps
   - Key decisions made
   [200-250 words]

6. ## The Implementation
   - Step-by-step what they did
   - Timeline of actions
   - Obstacles encountered
   - Adjustments made
   [200-300 words]

7. ## The Results
   - Specific metrics and numbers
   - Before vs. after comparison
   - Timeline to results
   - Unexpected benefits
   [150-200 words]

8. ## Key Takeaways
   - 3-5 lessons anyone can apply
   - What they'd do differently
   - Advice for others
   [100-150 words]

9. ## Your Turn: How to Get Started
   - First step to replicate
   - Resources needed
   - CTA to learn more

CREDIBILITY ELEMENTS:
- Specific numbers and dates
- Direct quotes (real or created)
- Before/after metrics
- Third-party validation

TONE: Inspiring, proof-driven, actionable`,

  article_comparison: `Write an SEO-optimized comparison article.

FORMAT REQUIREMENTS:
- Word Count: 1000-1500 words
- Title: "[Option A] vs [Option B]: [Decision Help]"
- Balanced analysis with clear recommendation
- Comparison tables recommended

STRUCTURE:
1. TITLE: [Option A] vs [Option B]: Which is Best for [Audience/Goal]?
2. META DESCRIPTION: [Comparison hook with keyword]
3. INTRODUCTION (100-150 words)
   - The decision readers face
   - Why this comparison matters
   - Quick verdict preview

4. ## Quick Comparison Overview
   [Comparison table format:]
   | Feature | Option A | Option B |
   |---------|----------|----------|
   | [Aspect] | [Rating/Detail] | [Rating/Detail] |

5. ## [Option A] Overview
   - What it is
   - Best for whom
   - Key strengths
   - Limitations
   [200-250 words]

6. ## [Option B] Overview
   - What it is
   - Best for whom
   - Key strengths
   - Limitations
   [200-250 words]

7. ## Head-to-Head Comparison
   ### [Aspect 1]: Winner = [Option]
   ### [Aspect 2]: Winner = [Option]
   ### [Aspect 3]: Winner = [Option]
   ### [Aspect 4]: Winner = [Option]
   [Each aspect 75-100 words]

8. ## When to Choose [Option A]
   [Specific scenarios - bullet points]

9. ## When to Choose [Option B]
   [Specific scenarios - bullet points]

10. ## The Verdict
    - Overall winner and why
    - Specific recommendation by use case
    - Next steps CTA

COMPARISON ELEMENTS:
- Fair treatment of both options
- Clear criteria for evaluation
- Specific use case recommendations
- Data-driven where possible

TONE: Balanced, helpful, decisive
AVOID: Obvious bias, unfair comparison`,

  default: `Write an SEO-optimized article for content marketing.

FORMAT REQUIREMENTS:
- Word Count: 1000-1500 words
- Clear H2/H3 structure
- Meta description included
- Actionable content

STRUCTURE:
1. Compelling title with keyword
2. Engaging introduction
3. Well-organized body sections
4. Practical takeaways
5. Clear conclusion with CTA

SEO ELEMENTS:
- Keyword in title and first paragraph
- Related keywords throughout
- Scannable formatting
- Mobile-friendly structure

TONE: Expert, helpful, engaging`,
};
