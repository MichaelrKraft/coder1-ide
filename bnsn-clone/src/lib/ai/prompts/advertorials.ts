export const ADVERTORIAL_PROMPTS: Record<string, string> = {
  advertorial_news: `Write a news-style advertorial for native ad networks (Taboola/Outbrain).

FORMAT REQUIREMENTS:
- Headline: News-style, curiosity-driven (60-80 characters)
- Subheadline: Expands on the hook
- Body: 800-1200 words
- Formatted like a news article
- Native ad network compliant

STRUCTURE:
1. NEWS-STYLE HEADLINE (pattern interrupt)
2. Subheadline with specific claim
3. Opening hook - newsworthy angle
4. The "discovery" or "breakthrough" (Problem established)
5. Expert/research backing (Agitate)
6. The solution revealed (Solution)
7. How it works (mechanism)
8. Results/proof (testimonials, data)
9. Availability information
10. Soft CTA disguised as "learn more"

NEWS ELEMENTS:
- Dateline format optional
- Quote from "expert" or user
- Statistics and research references
- Journalistic third-person initially
- Shift to benefit-focused second-person

PAS FRAMEWORK (Problem-Agitate-Solution):
- Problem: Establish the newsworthy issue
- Agitate: Show why existing solutions fail
- Solution: Reveal the discovery/breakthrough

COMPLIANCE:
- "Advertorial" or "Sponsored" disclosure
- No false claims
- Specific, verifiable results language

TONE: Journalistic, authoritative, discovery-focused
AVOID: Obvious sales language, unsubstantiated claims`,

  advertorial_discovery: `Write a personal discovery story advertorial.

FORMAT REQUIREMENTS:
- Headline: Personal discovery angle (60-80 characters)
- Body: 1000-1500 words
- First-person narrative
- Native content feel

STRUCTURE:
1. HEADLINE: "[Location] [Person] Discovers [Outcome]"
2. Personal opening - relatable situation
3. The struggle (specific problem details)
4. Rock bottom / turning point moment
5. The accidental discovery
6. Initial skepticism
7. Decision to try it
8. The experience and process
9. Results (specific, dated, measurable)
10. Life after transformation
11. "I had to share this" moment
12. How others can access it

STORYTELLING ELEMENTS:
- Specific dates and places
- Sensory details
- Emotional moments
- Dialogue snippets
- Before/after contrast

PAS FRAMEWORK:
- Problem: Personal struggle (relatable)
- Agitate: Failed attempts, growing desperation
- Solution: The discovery that changed everything

CREDIBILITY BUILDERS:
- Specific timeline
- Measurable results
- Acknowledgment of initial doubt
- Real-world details

TONE: Personal, authentic, transformational
AVOID: Too polished, unbelievable results, obvious pitch`,

  advertorial_interview: `Write an expert interview format advertorial.

FORMAT REQUIREMENTS:
- Headline: Expert authority angle
- Body: 800-1200 words
- Q&A format with narrative bridges
- Expert credibility established

STRUCTURE:
1. HEADLINE: "[Expert Title] Reveals [Breakthrough/Secret]"
2. Introduction of expert (credentials)
3. Context for the interview
4. Q&A FORMAT:
   Q: [Journalist question about problem]
   A: [Expert answer establishing problem]

   Q: [Question about why solutions fail]
   A: [Expert explains, agitates]

   Q: [Question about the breakthrough]
   A: [Expert reveals solution]

   Q: [How does it work?]
   A: [Expert explains mechanism]

   Q: [What results do people see?]
   A: [Expert shares proof/testimonials]

   Q: [How can readers access this?]
   A: [Expert provides path to solution]
5. Closing editorial summary
6. Call-to-action as "Editor's Note"

EXPERT ELEMENTS:
- Credentials and experience
- Contrarian insight
- Specific methodology
- Patient success stories
- Professional but accessible language

TONE: Journalistic, authoritative, educational
AVOID: Infomercial feel, unverifiable claims`,

  advertorial_listicle: `Write a listicle-format advertorial ("X Secrets/Tips").

FORMAT REQUIREMENTS:
- Headline: Numbered list promise
- Body: 1000-1500 words
- Clear numbered sections
- Blog-style formatting

STRUCTURE:
1. HEADLINE: "[Number] [Secrets/Tips/Reasons] [Outcome]"
2. Introduction hook (the problem)
3. Promise of what they'll learn
4. LIST ITEMS (5-7 typically):

   #1: [Counterintuitive insight]
   [Explanation with proof]

   #2: [Little-known fact]
   [Why this matters]

   #3: [Common mistake to avoid]
   [What to do instead]

   #4: [Expert secret]
   [How to apply it]

   #5: [The key insight - leads to solution]
   [Introduces product naturally]

5. Conclusion tying it together
6. "Bonus" or "The real secret" (CTA)

LISTICLE PSYCHOLOGY:
- Start with quick wins
- Build to most important
- Each point standalone valuable
- Final point leads to solution
- Curiosity gaps between items

CONTENT FEEL:
- Genuinely helpful information
- Could stand alone without CTA
- Educational with soft sell
- Native to blog/content sites

TONE: Helpful, insider knowledge, conversational
AVOID: Clickbait without delivery, obvious pitch before value`,

  advertorial_expose: `Write an industry exposé-style advertorial.

FORMAT REQUIREMENTS:
- Headline: Controversial/exposé angle
- Body: 1000-1500 words
- Investigative journalism feel
- "Industry secrets revealed" positioning

STRUCTURE:
1. HEADLINE: "The [Industry] Secret They Don't Want You to Know"
2. Opening hook - the controversy
3. "What they're not telling you" (Problem)
4. Why the industry profits from the problem (Agitate)
5. The insider who broke ranks
6. What really works (Solution revealed)
7. The science/proof behind it
8. Who's trying to suppress this
9. How to access the solution
10. "Take back control" CTA

EXPOSÉ ELEMENTS:
- Us vs. them framing
- Industry villain (corporations, big pharma, etc.)
- Whistleblower/insider angle
- Suppressed research/information
- Empowerment message

CONTROVERSY BALANCED WITH:
- Factual claims only
- No defamation
- "Some companies" vs. naming names
- Focus on solution, not attack

EMOTIONAL TRIGGERS:
- Righteous anger
- Empowerment
- Insider knowledge
- Taking control

TONE: Investigative, rebellious, empowering
AVOID: Defamation, conspiracy theories, unverifiable claims`,

  default: `Write a native advertising advertorial that reads like editorial content.

STRUCTURE:
1. Compelling headline (news or discovery angle)
2. Problem identification
3. Agitation of problem
4. Solution introduction
5. Proof and credibility
6. Call-to-action

FRAMEWORK: Problem-Agitate-Solution (PAS)
COMPLIANCE: Include advertorial disclosure
TONE: Editorial, journalistic, native content feel`,
};
