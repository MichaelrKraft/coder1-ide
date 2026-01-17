/**
 * Mock responses for development without Anthropic API key
 * These provide realistic-looking responses for testing the UI
 */

import type { OutreachParams, OutreachResult, OutreachMetadata } from "@/types/outreach";
import { formatNumber } from "./prompts";

// ============================================================================
// Generic Mock Response
// ============================================================================

/**
 * Generate a generic mock response based on the prompt content
 */
export function getMockResponse(prompt: string): string {
  // Detect prompt type and return appropriate mock
  const promptLower = prompt.toLowerCase();

  if (promptLower.includes("outreach") || promptLower.includes("creator")) {
    return getMockOutreachMessage();
  }

  if (promptLower.includes("follow-up") || promptLower.includes("follow up")) {
    return getMockFollowUpMessage();
  }

  if (promptLower.includes("negotiat")) {
    return getMockNegotiationMessage();
  }

  if (promptLower.includes("confirm") || promptLower.includes("partnership")) {
    return getMockConfirmationMessage();
  }

  if (promptLower.includes("improve")) {
    return getMockImprovedMessage();
  }

  // Default generic response
  return `Thank you for your message! I've processed your request and generated this response based on the context provided. This is a mock response generated without an API key configured. To get real AI-generated content, please set your ANTHROPIC_API_KEY environment variable.`;
}

// ============================================================================
// Mock Outreach Messages
// ============================================================================

const MOCK_OUTREACH_MESSAGES = [
  `Hey! I've been loving your content lately, especially your approach to making complex topics feel approachable. Your audience engagement is really impressive!

I'm reaching out from our team because we think you'd be a perfect fit for a collaboration we're planning. We're looking for creators who genuinely connect with their audience, and your content style aligns perfectly with what we're building.

Would you be open to a quick chat about what a partnership might look like? No pressure either way - just thought it could be a great fit!`,

  `Hi there! Your recent content has been on point - the way you break things down for your audience is exactly what we look for in creator partners.

We're launching a campaign and immediately thought of you. Your authentic style and engaged following would be perfect for what we have in mind.

Interested in hearing more about the opportunity? I'd love to share some details if you're open to it!`,

  `Hey! Just came across your profile and had to reach out. Your content is refreshing and your community seems really engaged - that's rare to find!

I work with brands connecting with creators, and I think there could be a really natural fit here. We're looking for authentic voices, not just follower counts.

Would you be interested in learning more? Happy to share details whenever works for you!`,
];

function getMockOutreachMessage(): string {
  return MOCK_OUTREACH_MESSAGES[
    Math.floor(Math.random() * MOCK_OUTREACH_MESSAGES.length)
  ];
}

// ============================================================================
// Mock Follow-up Messages
// ============================================================================

const MOCK_FOLLOWUP_MESSAGES = [
  `Hey! Just wanted to follow up on my previous message - totally understand if you've been busy!

Quick update: we've actually expanded the campaign and have more flexibility now. Would love to chat if you're interested, but no worries if it's not the right fit!`,

  `Hi again! Circling back on my earlier message about the collaboration opportunity.

I know your inbox is probably flooded, so I'll keep this short - we're still interested and the offer is still on the table. Let me know if you'd like to discuss!`,

  `Hey! Just a quick bump on my previous note. We're finalizing our creator lineup this week and wanted to make sure you had a chance to see the opportunity.

Either way, keep creating awesome content!`,
];

function getMockFollowUpMessage(): string {
  return MOCK_FOLLOWUP_MESSAGES[
    Math.floor(Math.random() * MOCK_FOLLOWUP_MESSAGES.length)
  ];
}

// ============================================================================
// Mock Negotiation Messages
// ============================================================================

const MOCK_NEGOTIATION_MESSAGES = [
  `Thanks for getting back to me on the terms! I appreciate you sharing what works for you.

I hear you on the rate - your engagement numbers definitely justify a premium. Here's what I can do: we can bump the base rate and add performance bonuses tied to engagement. That way you're rewarded for the quality your content brings.

Would that structure work better for you?`,

  `Really appreciate your transparency on the numbers. Let me see what we can work with on our end.

What if we adjusted the deliverables slightly - maybe one less post but with story support - and kept the rate closer to what you mentioned? We want this to feel like a win for both sides.

Open to finding the right balance here!`,

  `Thanks for the counter! I totally get where you're coming from.

Let me propose a middle ground: we match your rate request but include exclusivity for the campaign period. This actually benefits you too since we'll be cross-promoting your content on our channels.

Thoughts?`,
];

function getMockNegotiationMessage(): string {
  return MOCK_NEGOTIATION_MESSAGES[
    Math.floor(Math.random() * MOCK_NEGOTIATION_MESSAGES.length)
  ];
}

// ============================================================================
// Mock Confirmation Messages
// ============================================================================

const MOCK_CONFIRMATION_MESSAGES = [
  `Awesome - so excited to make this official!

Just to confirm what we've agreed on:
- 2 feed posts + 3 stories
- $1,500 total compensation
- Content due by end of month
- 30-day usage rights for our channels

I'll send over the formal agreement shortly. Let me know if anything looks off!

Looking forward to working together! 🎉`,

  `Great news - we're all set!

Here's the partnership summary:
- Deliverables: 1 reel + 2 stories featuring the product
- Payment: $800 upon content approval
- Timeline: Draft by the 15th, publish by the 20th
- Usage: Social media repurposing allowed

Contract coming your way today. So pumped about this collab!`,

  `Perfect, let's lock this in!

Quick recap of our agreement:
- 3 TikTok videos over 2 weeks
- $2,000 flat rate + affiliate commission
- First video next Monday
- Standard usage rights included

Will send the paperwork by EOD. Can't wait to see what you create!`,
];

function getMockConfirmationMessage(): string {
  return MOCK_CONFIRMATION_MESSAGES[
    Math.floor(Math.random() * MOCK_CONFIRMATION_MESSAGES.length)
  ];
}

// ============================================================================
// Mock Improved Messages
// ============================================================================

function getMockImprovedMessage(): string {
  return `Here's the improved version of your message:

Hey! I noticed your recent content about lifestyle and wellness - your approach to making health topics feel accessible is exactly what resonates with our audience.

We're launching a new product line and think your authentic voice would be perfect. We're offering competitive rates plus free product, and we're flexible on the deliverables.

Would you be interested in a quick call this week? I'd love to share more details and hear your ideas!`;
}

// ============================================================================
// Full Mock Outreach Result
// ============================================================================

/**
 * Generate a complete mock outreach result with metadata
 */
export function getMockOutreachResult(params: OutreachParams): OutreachResult {
  const messageType = params.messageType || "initial";

  let message: string;
  switch (messageType) {
    case "follow_up":
      message = getMockFollowUpMessage();
      break;
    case "negotiation":
      message = getMockNegotiationMessage();
      break;
    case "confirmation":
      message = getMockConfirmationMessage();
      break;
    default:
      message = getMockPersonalizedOutreach(params);
  }

  const metadata: OutreachMetadata = {
    model: "mock",
    generatedAt: new Date().toISOString(),
    tokensUsed: 0,
    inputTokens: 0,
    outputTokens: 0,
    messageType,
    tone: params.tone || "friendly",
    isMock: true,
  };

  const result: OutreachResult = {
    message,
    metadata,
  };

  // Add subject if requested
  if (params.includeSubject) {
    result.subject = getMockSubject(params);
  }

  return result;
}

/**
 * Generate a personalized mock outreach with actual params
 */
function getMockPersonalizedOutreach(params: OutreachParams): string {
  const firstName = params.displayName.split(" ")[0];
  const followerStr = formatNumber(params.followers);

  return `Hey ${firstName}! 👋

I've been following your ${params.niche || "content"} and absolutely love your creative approach - especially the way you engage with your ${followerStr} followers!

I'm reaching out from ${params.productName || "our team"}. ${params.productDescription ? params.productDescription.slice(0, 100) + "..." : "We're working on something exciting that I think aligns with your content style."}

Given your amazing content and engaged following, I think you'd be a perfect fit for a collaboration we're planning.${params.offer ? ` We're offering ${params.offer} for the right partnership.` : ""}

Would you be interested in learning more? I'd love to chat about what working together could look like!

Best,
[Your Name]`;
}

/**
 * Generate a mock email subject line
 */
function getMockSubject(params: OutreachParams): string {
  const subjects = [
    `Collab opportunity for @${params.username}?`,
    `${params.productName || "Brand"} x ${params.displayName} partnership`,
    `Quick question about a potential collab`,
    `Loved your recent content - partnership idea!`,
    `${params.niche || "Creator"} collab opportunity`,
  ];
  return subjects[Math.floor(Math.random() * subjects.length)];
}

/**
 * Generate mock variations of a message
 */
export function getMockVariations(params: OutreachParams, count: number = 3): string[] {
  const variations: string[] = [];

  for (let i = 0; i < count; i++) {
    const result = getMockOutreachResult({
      ...params,
      additionalContext: `Variation ${i + 1}`,
    });
    variations.push(result.message);
  }

  return variations;
}

// ============================================================================
// Email-Specific Mock
// ============================================================================

/**
 * Generate a mock email outreach response for development
 */
export function getMockEmailOutreach(
  influencerName: string,
  companyName: string
): { subject: string; body: string } {
  return {
    subject: `Collaboration opportunity with ${companyName}`,
    body: `I've been following your content and love the creative approach you bring to your videos!

I'm reaching out from ${companyName}. We're looking for authentic creators to help share our story with their audience.

Given your engaged following and content style, I think you'd be a perfect fit for a collaboration we're planning.

Would you be interested in learning more? I'd love to chat about what a partnership could look like!

Best,
[Sender Name]`,
  };
}
