/**
 * System prompts and prompt builders for AI-powered outreach generation
 * Used by the outreach service to generate personalized influencer messages
 */

import type { OutreachParams } from "./outreach";

// ============================================================================
// System Prompts
// ============================================================================

/**
 * System prompt for initial outreach message generation
 */
export const OUTREACH_SYSTEM_PROMPT = `You are an expert influencer marketing specialist helping SaaS companies and brands reach out to social media creators. You write personalized, engaging, and professional outreach messages that feel authentic and not spammy.

Key principles:
- Be concise (under 150 words for DMs, under 200 for emails)
- Personalize based on the creator's content, style, and audience
- Highlight clear value proposition for the creator
- Include a specific ask/CTA that's easy to respond to
- Sound genuine and human, not salesy or templated
- Mention specific videos, posts, or content themes when possible
- Match the creator's vibe and communication style
- Focus on mutual benefit, not just what you want from them

Avoid:
- Generic compliments that could apply to anyone
- Overly formal or corporate language (unless brand requires it)
- Lengthy explanations - get to the point
- Pushy or desperate-sounding language
- Making promises you can't keep
- Using excessive emojis or exclamation marks`;

/**
 * System prompt for follow-up messages
 */
export const FOLLOW_UP_SYSTEM_PROMPT = `You are writing a gentle follow-up message to an influencer who hasn't responded to an initial outreach. Be respectful of their time, add new value or context, and make it easy to respond.

Key principles:
- Keep it shorter than the original message
- Reference the previous message briefly
- Add something new (updated offer, new content idea, etc.)
- Don't be pushy or guilt-tripping
- Give them an easy out if not interested
- Maintain a positive, understanding tone
- One follow-up is usually enough - respect silence`;

/**
 * System prompt for negotiation messages
 */
export const NEGOTIATION_SYSTEM_PROMPT = `You are helping negotiate influencer partnerships. Be professional but friendly, focus on mutual value, and always be transparent about terms.

Key principles:
- Be clear about budget constraints if any
- Focus on finding win-win solutions
- Be flexible on deliverables when possible
- Maintain professionalism even if they counter-offer high
- Document all agreed terms clearly
- Show appreciation for their work and value
- Don't make promises beyond your authority`;

/**
 * System prompt for contract/confirmation messages
 */
export const CONFIRMATION_SYSTEM_PROMPT = `You are writing a confirmation message to finalize partnership details with an influencer. Be clear, professional, and ensure all important details are captured.

Key principles:
- Summarize all agreed terms clearly
- List specific deliverables with deadlines
- Confirm payment terms and timeline
- Include next steps and contact info
- Express enthusiasm about the partnership
- Keep legal language minimal but accurate`;

// ============================================================================
// Prompt Builders
// ============================================================================

/**
 * Format a number with K/M suffixes for readability
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toString();
}

/**
 * Build the prompt for generating an initial outreach message
 */
export function buildOutreachPrompt(params: OutreachParams): string {
  const sections: string[] = [];

  // Creator Information
  sections.push(`Write a personalized outreach message for the following social media creator:

Creator Info:
- Username: @${params.username}
- Display Name: ${params.displayName}
- Platform: ${params.platform || "TikTok"}
- Followers: ${formatNumber(params.followers)}
- Niche/Categories: ${params.niche}
- Bio: ${params.bio || "Not available"}
- Recent content themes: ${params.contentThemes?.join(", ") || "General content"}`);

  // Add engagement metrics if available
  if (params.engagementRate) {
    sections.push(`- Engagement Rate: ${params.engagementRate.toFixed(2)}%`);
  }

  // Product/Campaign Information
  sections.push(`
Product/Campaign Info:
- Product/Brand: ${params.productName}
- Product Description: ${params.productDescription}
- Campaign Goal: ${params.campaignGoal}
- Offer/Compensation: ${params.offer || "To be discussed based on deliverables"}`);

  // Brand Guidelines if provided
  if (params.brandGuidelines) {
    sections.push(`
Brand Voice Guidelines:
${params.brandGuidelines}`);
  }

  // Additional Context
  if (params.additionalContext) {
    sections.push(`
Additional Context:
${params.additionalContext}`);
  }

  // Tone and Message Type
  sections.push(`
Tone: ${getToneDescription(params.tone || "friendly")}
Message Type: ${params.messageType || "Initial outreach DM"}`);

  // Generation Instructions
  sections.push(`
Generate a personalized ${params.includeSubject ? "email with subject line" : "DM"} that:
1. Opens with something specific about their content (reference actual themes/style)
2. Introduces the product/brand naturally and concisely
3. Explains why they're a great fit (be specific, not generic)
4. Clearly states the opportunity/offer
5. Includes a clear, low-friction CTA
6. Keeps total length under ${params.maxLength || 150} words

${params.includeSubject ? "Format: Start with 'Subject: [subject line]' on its own line, then the message body." : ""}`);

  return sections.join("\n");
}

/**
 * Build the prompt for generating a follow-up message
 */
export function buildFollowUpPrompt(params: OutreachParams): string {
  let prompt = `Write a follow-up message to an influencer who hasn't responded to our initial outreach:

Creator: @${params.username} (${params.displayName})
Platform: ${params.platform || "TikTok"}
Followers: ${formatNumber(params.followers)}
Niche: ${params.niche}

Product/Brand: ${params.productName}
Original Offer: ${params.offer || "Partnership opportunity"}`;

  // Include previous message context if available
  if (params.previousMessages && params.previousMessages.length > 0) {
    const lastMessage = params.previousMessages[params.previousMessages.length - 1];
    prompt += `

Previous Message (sent ${lastMessage.daysSince || "recently"}):
"${lastMessage.body.slice(0, 200)}${lastMessage.body.length > 200 ? "..." : ""}"`;
  }

  if (params.additionalContext) {
    prompt += `

New context to mention:
${params.additionalContext}`;
  }

  prompt += `

Tone: ${getToneDescription(params.tone || "friendly")}

Generate a brief follow-up (under 100 words) that:
1. References the previous outreach naturally
2. Adds new value or information if possible
3. Makes it easy for them to respond (yes/no is fine)
4. Doesn't sound desperate or pushy
5. Gives them a graceful out if not interested`;

  return prompt;
}

/**
 * Build the prompt for generating a negotiation message
 */
export function buildNegotiationPrompt(params: OutreachParams): string {
  let prompt = `Write a negotiation response to an influencer discussing partnership terms:

Creator: @${params.username} (${params.displayName})
Followers: ${formatNumber(params.followers)}
Engagement Rate: ${params.engagementRate?.toFixed(2) || "N/A"}%

Our Budget Range: ${params.budgetRange || "Flexible based on deliverables"}
Deliverables Needed: ${params.deliverables || "To be discussed"}`;

  if (params.previousMessages && params.previousMessages.length > 0) {
    prompt += `

Conversation History:`;
    params.previousMessages.slice(-3).forEach((msg, i) => {
      prompt += `
${i + 1}. "${msg.body.slice(0, 150)}${msg.body.length > 150 ? "..." : ""}"`;
    });
  }

  if (params.additionalContext) {
    prompt += `

Negotiation context:
${params.additionalContext}`;
  }

  prompt += `

Generate a negotiation response (under 150 words) that:
1. Acknowledges their position/counter-offer
2. Proposes a fair middle ground if needed
3. Emphasizes the value of the partnership
4. Keeps the conversation moving forward
5. Maintains a collaborative, not adversarial tone`;

  return prompt;
}

/**
 * Build the prompt for generating a confirmation/contract message
 */
export function buildConfirmationPrompt(params: OutreachParams): string {
  return `Write a partnership confirmation message to finalize details with an influencer:

Creator: @${params.username} (${params.displayName})
Platform: ${params.platform || "TikTok"}

Agreed Terms:
- Compensation: ${params.offer || "As discussed"}
- Deliverables: ${params.deliverables || "As discussed"}
- Timeline: ${params.timeline || "To be confirmed"}
- Usage Rights: ${params.usageRights || "Standard social media usage"}

Additional Notes:
${params.additionalContext || "None"}

Generate a confirmation message (under 200 words) that:
1. Expresses excitement about the partnership
2. Clearly summarizes all agreed terms
3. Lists specific next steps
4. Provides contact information for questions
5. Sets expectations for the process ahead
6. Maintains a warm but professional tone`;
}

/**
 * Build the prompt for improving an existing message
 */
export function buildImprovementPrompt(
  originalMessage: string,
  feedback: string
): string {
  return `Improve this outreach message based on the feedback provided:

Original Message:
"${originalMessage}"

Feedback/Issues to Address:
${feedback}

Generate an improved version that:
1. Addresses all the feedback points
2. Maintains the core message and intent
3. Keeps a similar length (or shorter if feedback mentions length)
4. Sounds more natural and personalized
5. Retains any specific details that were good

Only output the improved message, no explanations.`;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a description of the tone for the prompt
 */
function getToneDescription(
  tone: "professional" | "casual" | "friendly" | "enthusiastic"
): string {
  const toneDescriptions = {
    professional:
      "Professional and polished, suitable for corporate brands or formal partnerships",
    casual:
      "Casual and laid-back, like texting a friend, using informal language",
    friendly:
      "Friendly and warm, approachable but still professional, conversational",
    enthusiastic:
      "Enthusiastic and energetic, showing genuine excitement, using positive language",
  };
  return toneDescriptions[tone] || toneDescriptions.friendly;
}

/**
 * Get the appropriate system prompt based on message type
 */
export function getSystemPromptForType(
  messageType: "initial" | "follow_up" | "negotiation" | "confirmation"
): string {
  const prompts = {
    initial: OUTREACH_SYSTEM_PROMPT,
    follow_up: FOLLOW_UP_SYSTEM_PROMPT,
    negotiation: NEGOTIATION_SYSTEM_PROMPT,
    confirmation: CONFIRMATION_SYSTEM_PROMPT,
  };
  return prompts[messageType] || OUTREACH_SYSTEM_PROMPT;
}

/**
 * Get the appropriate prompt builder based on message type
 */
export function getPromptBuilderForType(
  messageType: "initial" | "follow_up" | "negotiation" | "confirmation"
): (params: OutreachParams) => string {
  const builders = {
    initial: buildOutreachPrompt,
    follow_up: buildFollowUpPrompt,
    negotiation: buildNegotiationPrompt,
    confirmation: buildConfirmationPrompt,
  };
  return builders[messageType] || buildOutreachPrompt;
}

// ============================================================================
// Email-Specific Prompts
// ============================================================================

import type { Campaign, Influencer } from "@/types/database";

/**
 * Options for building an email outreach prompt
 */
export interface EmailOutreachOptions {
  tone: "casual" | "professional";
  includeOffer: boolean;
  senderName: string;
  senderRole?: string;
  companyName: string;
}

/**
 * Build a system and user prompt for email outreach generation
 */
export function buildEmailOutreachPrompt(
  campaign: Campaign,
  influencer: Influencer,
  options: EmailOutreachOptions
): { system: string; user: string } {
  const system = `You write influencer outreach emails that get responses.

Your emails are:
- Personalized and show genuine familiarity with their content
- Concise (under 200 words for body)
- Professional but warm — this is email, not DM
- Clear about the opportunity and next steps
- Ending with a specific, low-friction call to action

Tone: ${options.tone === "casual" ? "Friendly and conversational, like a peer reaching out" : "Professional but personable, respectful of their time"}

Structure:
1. Opening: Personal connection to their content (1-2 sentences)
2. Who you are: Brief intro (1 sentence)
3. The opportunity: What you're proposing (2-3 sentences)
4. Why them: Specific reason they're a fit (1-2 sentences)
5. CTA: Clear next step (1 sentence)
6. Sign-off: Name and optional title

DO NOT:
- Use generic "love your content" without specifics
- Write walls of text
- Sound like a template
- Be pushy about rates or commitments upfront
- Use excessive exclamation marks or emojis
- Include "Sent via LeadPoint.ai" or any tool signatures`;

  const user = `Write an outreach email for this collaboration:

**Campaign:**
- Name: ${campaign.name}
- Product: ${campaign.description || "N/A"}
- Target audience: ${JSON.stringify(campaign.target_audience || {})}

**Influencer:**
- Name: ${influencer.display_name || influencer.username}
- Handle: @${influencer.username}
- Platform: ${influencer.platform || "TikTok"}
- Followers: ${influencer.follower_count?.toLocaleString() || "Unknown"}
- Niche/Tags: ${influencer.categories?.join(", ") || "General content creator"}
- Bio: ${influencer.bio || "N/A"}

**Sender:**
- Name: ${options.senderName}
- Role: ${options.senderRole || "Founder"}
- Company: ${options.companyName}

${options.includeOffer ? "Mention that you have budget for paid collaborations and are open to discussing rates that work for them." : "Focus on the opportunity without mentioning payment yet."}

Return the email in this exact format:
SUBJECT: [subject line here]

[email body here - do not include greeting like "Hi [Name]" as that will be added automatically]

[sign-off]
${options.senderName}${options.senderRole ? `\n${options.senderRole}, ${options.companyName}` : ""}`;

  return { system, user };
}

/**
 * Parse an email response from Claude into subject and body
 */
export function parseEmailResponse(response: string): {
  subject: string;
  body: string;
} {
  const subjectMatch = response.match(/SUBJECT:\s*(.+?)(?:\n|$)/i);
  const subject = subjectMatch
    ? subjectMatch[1].trim()
    : "Collaboration opportunity";

  const bodyStart = response.indexOf(
    "\n",
    response.toLowerCase().indexOf("subject:")
  );
  const body = bodyStart > -1 ? response.slice(bodyStart).trim() : response;

  return { subject, body };
}
