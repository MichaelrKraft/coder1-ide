export const REDDIT_PROMPTS: Record<string, string> = {
  reddit_story: `Write a Reddit post in personal story/testimonial format.

FORMAT REQUIREMENTS:
- Title: Genuine, non-clickbait (50-100 characters)
- Body: 300-600 words
- No direct product links or obvious promotion
- Authentic Reddit voice and formatting

STRUCTURE:
1. Relatable title that invites curiosity
2. Opening hook - the "before" state
3. The struggle/problem (specific, emotional)
4. The discovery moment (how you found the solution)
5. The transformation (specific results)
6. Lessons learned / what you'd tell others
7. Soft invitation for questions (no CTA)

REDDIT-NATIVE ELEMENTS:
- Use "Edit:" for additions
- TL;DR at bottom if long
- Acknowledge potential skepticism
- Reply-friendly ending ("Happy to answer questions")
- Authentic imperfections in writing

TONE:
- Vulnerable, not polished
- Helpful, not salesy
- Specific, not vague
- Community-minded
- Self-aware and humble

AVOID:
- Product names in title
- Direct links
- "Check out this thing"
- Salesy language
- Perfect grammar (too polished = suspicious)`,

  reddit_question: `Write a Reddit post as a question that sparks discussion.

FORMAT REQUIREMENTS:
- Title: Genuine question format (50-80 characters)
- Body: 100-200 words of context
- Invites diverse responses
- No hidden agenda feeling

STRUCTURE:
1. Question title that resonates with the community
2. Brief context (your situation)
3. What you've tried already
4. Specific aspect you're asking about
5. Open-ended invitation for opinions

QUESTION TYPES THAT WORK:
- "Has anyone else experienced [problem]?"
- "What finally worked for you when [situation]?"
- "Am I the only one who [relatable frustration]?"
- "Looking for advice on [specific challenge]"
- "What do you wish you knew before [situation]?"

REDDIT-NATIVE ELEMENTS:
- Show you've done some research
- Acknowledge you might be wrong
- Be open to different viewpoints
- Thank people in advance

TONE: Curious, humble, engaged
AVOID: Leading questions, obvious agenda, humble-bragging`,

  reddit_value_post: `Write an educational Reddit post that provides genuine value first.

FORMAT REQUIREMENTS:
- Title: Clear value promise (60-100 characters)
- Body: 400-800 words
- Actionable information
- Formatted for easy reading

STRUCTURE:
1. Title: "[Resource/Guide/Tips] for [audience/goal]"
2. Brief intro establishing credibility
3. The main content (tips, steps, insights)
4. Formatting with headers, bullets, numbers
5. Common mistakes to avoid
6. Invitation for questions/additions

CONTENT FRAMEWORKS:
- "X things I learned after [experience]"
- "Step-by-step guide to [outcome]"
- "The mistakes I made so you don't have to"
- "What [experts] won't tell you about [topic]"
- "My [timeframe] results doing [approach]"

REDDIT FORMATTING:
- Use ** for bold
- Use numbered lists and bullets
- Break up text with headers
- Include a TL;DR
- Leave room for others to add

TONE: Generous, expert but humble, community-focused
AVOID: Gatekeeping, superiority, hidden sales pitch`,

  reddit_ama_style: `Write a Reddit AMA-style post for building authority.

FORMAT REQUIREMENTS:
- Title: Clear expertise/experience claim
- Intro: 200-300 words establishing credibility
- Pre-answered common questions (3-5)
- Invitation for questions

STRUCTURE:
1. Title: "I'm [role/achievement]. AMA about [topic]"
2. Proof of credibility (brief background)
3. Why you're doing this AMA
4. What you can help with
5. Pre-answered FAQs:
   - Q: [Common question 1]
   - A: [Helpful answer]
   - Q: [Common question 2]
   - A: [Helpful answer]
6. "Ask me anything about [specific topics]"
7. Time availability statement

AMA BEST PRACTICES:
- Be specific about your expertise
- Set boundaries on what you'll answer
- Pre-answer to show value immediately
- Be generous with information
- Commit to response time

CREDIBILITY ELEMENTS:
- Specific numbers/results
- Time in field/experience
- Unique perspective or access
- Proof you can offer (verification)

TONE: Confident but approachable, generous, engaged
AVOID: Bragging, vagueness, sales pitch disguised as AMA`,

  default: `Write an authentic Reddit post that provides value to the community.

STRUCTURE:
1. Genuine, non-clickbait title
2. Relatable opening
3. Value-driven content
4. Community-friendly tone
5. Open invitation for discussion

REDDIT VOICE:
- Authentic and imperfect
- Value-first, no obvious selling
- Community-minded
- Self-aware

AVOID: Salesy language, direct promotion, perfect polish`,
};
