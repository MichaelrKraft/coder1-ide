export const BONUS_PROMPTS: Record<string, string> = {
  bonus_description: `Write a compelling bonus description for a single bonus item.

FORMAT REQUIREMENTS:
- Bonus Name: Creative, benefit-focused name (5-8 words max)
- Perceived Value: Specific dollar amount ($47-$297 range typically)
- Description: 2-3 sentences explaining what it is and why it matters
- Key Benefit: One powerful outcome statement

STRUCTURE:
1. Attention-grabbing bonus name that implies value
2. Clear dollar value assignment
3. What the bonus includes/delivers
4. Why this bonus makes success easier/faster
5. How it complements (not competes with) the main offer

FRAMEWORK (Jon Benson's Approach):
- Bonuses should remove obstacles to success
- Each bonus should feel like "the missing piece"
- Value should be specific, not vague
- Position as "making success inevitable"

TONE: Exciting, valuable, exclusive
OUTPUT: Name, Value, Description, Key Benefit`,

  bonus_stack: `Write a complete bonus stack of 3-5 bonuses that complement the main offer.

FORMAT REQUIREMENTS:
- 3-5 individual bonuses
- Each bonus: Name, Value ($), Description (2-3 sentences)
- Total stack value calculation
- Stack summary paragraph

STRUCTURE FOR EACH BONUS:
1. BONUS #[X]: [Creative Name]
   Value: $[Amount]
   [2-3 sentence description]
   Key Benefit: [One-line outcome]

2. End with:
   TOTAL BONUS VALUE: $[Sum]
   [Summary paragraph about the complete package]

FRAMEWORK (Jon Benson's Approach):
- Bonuses should complement, not compete with main offer
- Each solves a specific obstacle to success
- Stack should feel overwhelming in value
- Create "no brainer" decision when combined with main offer

BONUS TYPES TO INCLUDE:
- Quick-start/implementation bonus
- Template/swipe file bonus
- Advanced strategy bonus
- Support/community bonus
- Time-saver/shortcut bonus

TONE: Generous, valuable, exclusive
AVOID: Generic bonuses, competing with main offer`,

  bonus_fast_action: `Write a time-limited fast-action bonus to create urgency.

FORMAT REQUIREMENTS:
- Bonus Name: Urgency-focused, exclusive-feeling
- Value: $97-$497 range (premium feel)
- Time Limit: Specific deadline or quantity limit
- Description: Why this is special and limited
- Scarcity reason: Legitimate reason for limitation

STRUCTURE:
1. FAST-ACTION BONUS (Available for [timeframe/quantity] only)
2. [Bonus Name]
3. Value: $[Amount]
4. [3-4 sentences about what makes this special]
5. Why it's limited (legitimate scarcity reason)
6. Deadline/availability statement

URGENCY TRIGGERS:
- "First 50 buyers only"
- "Available until [date] only"
- "One-time offer - not available later"
- "Limited by [legitimate constraint]"

FRAMEWORK:
- Scarcity must feel authentic, not manufactured
- Bonus should be genuinely valuable
- Removal after deadline must be believable
- Creates "act now" motivation

TONE: Urgent but not pushy, exclusive, premium`,

  bonus_upgrade: `Write a premium upgrade bonus that increases perceived value.

FORMAT REQUIREMENTS:
- Upgrade Name: Premium, exclusive positioning
- Value: $297-$997 range
- What's Included: Detailed breakdown
- Who It's For: Ideal candidate description
- Transformation Promise: Specific outcome

STRUCTURE:
1. PREMIUM UPGRADE: [Name]
2. Value: $[Amount]
3. Perfect For: [Ideal candidate description]
4. What You Get:
   - [Item 1 with benefit]
   - [Item 2 with benefit]
   - [Item 3 with benefit]
5. The Transformation: [Specific outcome statement]
6. Why This Matters: [2-3 sentences]

UPGRADE ELEMENTS:
- Done-for-you components
- Personal access/support
- Advanced strategies
- VIP/priority treatment
- Extended resources

FRAMEWORK:
- Upgrade should 10x specific results
- Appeal to "serious" buyers
- Justify premium positioning
- Create clear before/after contrast

TONE: Premium, exclusive, transformational`,

  default: `Write a compelling bonus that adds value to the main offer.

STRUCTURE:
1. Creative bonus name
2. Specific dollar value
3. Clear description (2-3 sentences)
4. Key benefit statement
5. How it complements the main offer

FRAMEWORK:
- Bonus should remove an obstacle to success
- Value should exceed perceived price
- Must complement, not compete with main offer

TONE: Valuable, exclusive, generous`,
};
