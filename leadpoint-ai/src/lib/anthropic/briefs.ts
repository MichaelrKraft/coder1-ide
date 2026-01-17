/**
 * AI-Powered Content Brief Generation Service
 * Based on David Park methodology: "Brief should match influencer's natural style"
 */

import {
  generateCompletion,
  getAnthropicClient,
} from "./client";
import type {
  ContentBrief,
  InfluencerStyleAnalysis,
  Influencer,
  Campaign,
} from "@/types/database";

// ============================================================================
// Types
// ============================================================================

export interface GenerateBriefParams {
  influencer: Influencer
  campaign: Campaign
  campaignInfluencerId: string
  productInfo?: {
    name: string
    description: string
    keyBenefits: string[]
    targetAudience?: string
  }
  brandGuidelines?: string
  restrictions?: string[]
  preferredFormat?: ContentBrief['format_suggestion']
}

export interface GenerateBriefResult {
  brief: Omit<ContentBrief, 'id' | 'created_at' | 'updated_at'>
  metadata: {
    model: string
    generatedAt: string
    tokensUsed: number
    isMock?: boolean
  }
}

export interface RegenerateSectionParams {
  brief: ContentBrief
  section: 'hooks' | 'talking_points' | 'cta' | 'dos_donts' | 'product_mentions'
  feedback?: string
}

// ============================================================================
// System Prompts
// ============================================================================

const BRIEF_GENERATION_SYSTEM_PROMPT = `You are an expert content brief creator for influencer marketing campaigns.
Your goal is to create briefs that help influencers create authentic, engaging content that performs well.

Key principles (David Park methodology):
1. Match the influencer's natural style - don't force brand voice on them
2. Provide multiple hook options so they can choose what feels natural
3. Give talking points, not scripts - let their personality shine
4. Include clear do's and don'ts to avoid common mistakes
5. Suggest timing for product mentions that feels organic

Always output valid JSON matching the requested structure.`;

const SECTION_REGENERATION_PROMPT = `You are an expert at refining specific sections of content briefs.
Maintain consistency with the overall brief while improving the requested section.
Always output valid JSON matching the requested structure.`;

// ============================================================================
// Core Generation Functions
// ============================================================================

/**
 * Generate a complete content brief for an influencer
 */
export async function generateContentBrief(
  params: GenerateBriefParams
): Promise<GenerateBriefResult> {
  const client = getAnthropicClient();

  // Use mock if no API key
  if (!client) {
    console.log("[Briefs] Using mock mode - no API key configured");
    return getMockBriefResult(params);
  }

  try {
    const prompt = buildBriefGenerationPrompt(params);

    const result = await generateCompletion(prompt, {
      systemPrompt: BRIEF_GENERATION_SYSTEM_PROMPT,
      maxTokens: 2048,
      temperature: 0.7,
    });

    const parsedBrief = parseBriefResponse(result.text, params);

    return {
      brief: parsedBrief,
      metadata: {
        model: result.model,
        generatedAt: new Date().toISOString(),
        tokensUsed: (result.usage?.inputTokens || 0) + (result.usage?.outputTokens || 0),
      },
    };
  } catch (error) {
    console.error("[Briefs] Error generating brief:", error);
    // Fallback to mock on error
    return getMockBriefResult(params);
  }
}

/**
 * Regenerate a specific section of a brief
 */
export async function regenerateBriefSection(
  params: RegenerateSectionParams
): Promise<Partial<ContentBrief>> {
  const client = getAnthropicClient();

  if (!client) {
    return getMockSectionRegeneration(params);
  }

  try {
    const prompt = buildSectionRegenerationPrompt(params);

    const result = await generateCompletion(prompt, {
      systemPrompt: SECTION_REGENERATION_PROMPT,
      maxTokens: 1024,
      temperature: 0.8,
    });

    return parseSectionResponse(result.text);
  } catch (error) {
    console.error("[Briefs] Error regenerating section:", error);
    return getMockSectionRegeneration(params);
  }
}

// ============================================================================
// Prompt Builders
// ============================================================================

function buildBriefGenerationPrompt(params: GenerateBriefParams): string {
  const { influencer, campaign, productInfo, brandGuidelines, restrictions, preferredFormat } = params;

  const contentThemes = influencer.ai_analysis?.content_themes?.join(", ") || "general content";
  const audienceInfo = influencer.ai_analysis?.audience_demographics
    ? `Age: ${JSON.stringify(influencer.ai_analysis.audience_demographics.age_groups)}, Gender: ${JSON.stringify(influencer.ai_analysis.audience_demographics.gender_split)}`
    : "General audience";

  return `Create a content brief for the following influencer and campaign:

INFLUENCER PROFILE:
- Username: @${influencer.username}
- Display Name: ${influencer.display_name}
- Platform: ${influencer.platform}
- Followers: ${influencer.follower_count.toLocaleString()}
- Engagement Rate: ${influencer.engagement_rate || 'Unknown'}%
- Bio: ${influencer.bio || 'No bio available'}
- Content Themes: ${contentThemes}
- Audience: ${audienceInfo}

CAMPAIGN DETAILS:
- Campaign Name: ${campaign.name}
- Description: ${campaign.description || 'No description'}
- Primary Goal: ${campaign.goals?.primary_goal || 'brand awareness'}
- Target Audience: ${JSON.stringify(campaign.target_audience || {})}

${productInfo ? `
PRODUCT INFORMATION:
- Product Name: ${productInfo.name}
- Description: ${productInfo.description}
- Key Benefits: ${productInfo.keyBenefits.join(", ")}
${productInfo.targetAudience ? `- Target Audience: ${productInfo.targetAudience}` : ''}
` : ''}

${brandGuidelines ? `BRAND GUIDELINES:\n${brandGuidelines}\n` : ''}

${restrictions?.length ? `RESTRICTIONS:\n- ${restrictions.join("\n- ")}\n` : ''}

${preferredFormat ? `PREFERRED FORMAT: ${preferredFormat}\n` : ''}

Generate a content brief in the following JSON format:
{
  "title": "Brief title that summarizes the content direction",
  "hook_options": ["Hook option 1 matching influencer style", "Hook option 2", "Hook option 3"],
  "talking_points": ["Key point 1", "Key point 2", "Key point 3", "Key point 4"],
  "call_to_action": "Clear CTA for viewers",
  "product_mentions": [
    {
      "product_name": "Product name",
      "key_benefit": "Main benefit to highlight",
      "mention_timing": "early|middle|end|natural",
      "talking_point": "How to naturally mention this"
    }
  ],
  "influencer_style_analysis": {
    "tone": "energetic|calm|humorous|educational|casual|professional",
    "pacing": "fast|medium|slow",
    "common_hooks": ["Hook patterns they use"],
    "signature_phrases": ["Phrases they commonly use"],
    "typical_format": "Description of their typical video format",
    "audience_engagement_style": "How they interact with audience"
  },
  "restrictions": ["Any content restrictions"],
  "dos_and_donts": {
    "dos": ["Do this", "Do that"],
    "donts": ["Don't do this", "Avoid that"]
  },
  "estimated_duration": "30-60 seconds",
  "format_suggestion": "talking_head|voiceover|trend_format|storytelling|demo|review"
}

Ensure the brief matches the influencer's natural style and voice. Focus on authenticity over brand messaging.`;
}

function buildSectionRegenerationPrompt(params: RegenerateSectionParams): string {
  const { brief, section, feedback } = params;

  const sectionPrompts: Record<string, string> = {
    hooks: `Generate 3 new hook options that match this influencer's style.
Current hooks: ${JSON.stringify(brief.hook_options)}
${feedback ? `Feedback: ${feedback}` : ''}
Output JSON: { "hook_options": ["hook1", "hook2", "hook3"] }`,

    talking_points: `Generate 4 new talking points for this content brief.
Current talking points: ${JSON.stringify(brief.talking_points)}
${feedback ? `Feedback: ${feedback}` : ''}
Output JSON: { "talking_points": ["point1", "point2", "point3", "point4"] }`,

    cta: `Generate a new call to action that feels natural for this influencer.
Current CTA: ${brief.call_to_action}
${feedback ? `Feedback: ${feedback}` : ''}
Output JSON: { "call_to_action": "New CTA" }`,

    dos_donts: `Generate new do's and don'ts for this content brief.
Current: ${JSON.stringify(brief.dos_and_donts)}
${feedback ? `Feedback: ${feedback}` : ''}
Output JSON: { "dos_and_donts": { "dos": ["do1", "do2", "do3"], "donts": ["dont1", "dont2", "dont3"] } }`,

    product_mentions: `Generate new product mention suggestions.
Current: ${JSON.stringify(brief.product_mentions)}
${feedback ? `Feedback: ${feedback}` : ''}
Output JSON: { "product_mentions": [{ "product_name": "...", "key_benefit": "...", "mention_timing": "...", "talking_point": "..." }] }`,
  };

  return `Brief context:
Title: ${brief.title}
Style: ${brief.influencer_style_analysis.tone}, ${brief.influencer_style_analysis.pacing} pacing
Format: ${brief.format_suggestion}

${sectionPrompts[section]}`;
}

// ============================================================================
// Response Parsers
// ============================================================================

function parseBriefResponse(
  text: string,
  params: GenerateBriefParams
): Omit<ContentBrief, 'id' | 'created_at' | 'updated_at'> {
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
    const parsed = JSON.parse(jsonStr);

    return {
      campaign_id: params.campaign.id,
      influencer_id: params.influencer.id,
      campaign_influencer_id: params.campaignInfluencerId,
      title: parsed.title || 'Untitled Brief',
      hook_options: parsed.hook_options || [],
      talking_points: parsed.talking_points || [],
      call_to_action: parsed.call_to_action || '',
      product_mentions: parsed.product_mentions || [],
      influencer_style_analysis: parsed.influencer_style_analysis || getDefaultStyleAnalysis(),
      restrictions: parsed.restrictions || params.restrictions || [],
      dos_and_donts: parsed.dos_and_donts || { dos: [], donts: [] },
      estimated_duration: parsed.estimated_duration || '30-60 seconds',
      format_suggestion: parsed.format_suggestion || 'talking_head',
      status: 'draft',
      ai_generated: true,
    };
  } catch (error) {
    console.error("[Briefs] Failed to parse response:", error);
    // Return a default brief structure
    return getDefaultBrief(params);
  }
}

function parseSectionResponse(text: string): Partial<ContentBrief> {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("[Briefs] Failed to parse section response:", error);
    return {};
  }
}

// ============================================================================
// Mock Functions
// ============================================================================

function getMockBriefResult(params: GenerateBriefParams): GenerateBriefResult {
  const { influencer, campaign, campaignInfluencerId, productInfo } = params;

  const mockBrief: Omit<ContentBrief, 'id' | 'created_at' | 'updated_at'> = {
    campaign_id: campaign.id,
    influencer_id: influencer.id,
    campaign_influencer_id: campaignInfluencerId,
    title: `${productInfo?.name || campaign.name} x @${influencer.username} Content Brief`,
    hook_options: [
      `"Okay so I've been using this for a week and I need to talk about it..."`,
      `"POV: You finally found ${productInfo?.name || 'the thing'} everyone's been talking about"`,
      `"Not sponsored but like... actually wait, it is, but I'd buy this anyway"`,
    ],
    talking_points: [
      `Share your genuine first impression and initial reaction`,
      `Highlight ${productInfo?.keyBenefits?.[0] || 'the main benefit'} with a personal story`,
      `Show how it fits into your daily routine naturally`,
      `Address a common question or concern your audience might have`,
    ],
    call_to_action: `Check the link in my bio to learn more - let me know if you try it!`,
    product_mentions: [
      {
        product_name: productInfo?.name || 'Product',
        key_benefit: productInfo?.keyBenefits?.[0] || 'Main benefit',
        mention_timing: 'natural',
        talking_point: `Mention naturally when showing how you use it`,
      },
    ],
    influencer_style_analysis: {
      tone: 'casual',
      pacing: 'medium',
      common_hooks: ['POV:', 'Okay so...', 'Let me tell you about...'],
      signature_phrases: ['No but seriously', 'And I mean...', 'Like actually'],
      typical_format: 'Talking head with quick cuts and text overlays',
      audience_engagement_style: 'Conversational, responds to comments, asks questions',
    },
    restrictions: params.restrictions || [
      'No competitor mentions',
      'Must include required disclosures (#ad or #sponsored)',
    ],
    dos_and_donts: {
      dos: [
        'Be authentic - share your real experience',
        'Use your natural speaking style',
        'Include clear disclosure early in the video',
        'Engage with comments after posting',
      ],
      donts: [
        'Don\'t read from a script - use talking points naturally',
        'Don\'t over-promise or make claims we can\'t support',
        'Don\'t mention competitors by name',
        'Don\'t post without disclosure',
      ],
    },
    estimated_duration: '30-60 seconds',
    format_suggestion: 'talking_head',
    status: 'draft',
    ai_generated: true,
  };

  return {
    brief: mockBrief,
    metadata: {
      model: 'mock',
      generatedAt: new Date().toISOString(),
      tokensUsed: 0,
      isMock: true,
    },
  };
}

function getMockSectionRegeneration(
  params: RegenerateSectionParams
): Partial<ContentBrief> {
  const { section } = params;

  const mockSections: Record<string, Partial<ContentBrief>> = {
    hooks: {
      hook_options: [
        '"Wait, this actually changed my whole routine..."',
        '"I was today years old when I discovered this"',
        '"Unpopular opinion but this is a game changer"',
      ],
    },
    talking_points: {
      talking_points: [
        'Start with your honest first reaction',
        'Share a specific moment it made a difference',
        'Compare to what you used before (without naming brands)',
        'Give one tip for getting the most out of it',
      ],
    },
    cta: {
      call_to_action: 'Link in bio - comment below if you have questions!',
    },
    dos_donts: {
      dos_and_donts: {
        dos: [
          'Film in natural lighting',
          'Show the product in use',
          'Be honest about any downsides',
        ],
        donts: [
          'Don\'t use corporate language',
          'Don\'t film just the product alone',
          'Don\'t forget to save the audio trend',
        ],
      },
    },
    product_mentions: {
      product_mentions: [
        {
          product_name: 'Product',
          key_benefit: 'Key benefit',
          mention_timing: 'middle',
          talking_point: 'Transition naturally from your story to showing the product',
        },
      ],
    },
  };

  return mockSections[section] || {};
}

function getDefaultStyleAnalysis(): InfluencerStyleAnalysis {
  return {
    tone: 'casual',
    pacing: 'medium',
    common_hooks: [],
    signature_phrases: [],
    typical_format: 'Unknown',
    audience_engagement_style: 'Unknown',
  };
}

function getDefaultBrief(
  params: GenerateBriefParams
): Omit<ContentBrief, 'id' | 'created_at' | 'updated_at'> {
  return {
    campaign_id: params.campaign.id,
    influencer_id: params.influencer.id,
    campaign_influencer_id: params.campaignInfluencerId,
    title: 'Content Brief',
    hook_options: [],
    talking_points: [],
    call_to_action: '',
    product_mentions: [],
    influencer_style_analysis: getDefaultStyleAnalysis(),
    restrictions: params.restrictions || [],
    dos_and_donts: { dos: [], donts: [] },
    estimated_duration: '30-60 seconds',
    format_suggestion: 'talking_head',
    status: 'draft',
    ai_generated: true,
  };
}

// ============================================================================
// Error Handling
// ============================================================================

export class BriefError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = "BRIEF_ERROR",
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "BriefError";
    this.code = code;
    this.details = details;
  }
}

export const BriefErrorCodes = {
  RATE_LIMIT: "RATE_LIMIT",
  AUTH_ERROR: "AUTH_ERROR",
  GENERATION_ERROR: "GENERATION_ERROR",
  INVALID_PARAMS: "INVALID_PARAMS",
  INFLUENCER_NOT_FOUND: "INFLUENCER_NOT_FOUND",
  CAMPAIGN_NOT_FOUND: "CAMPAIGN_NOT_FOUND",
  BRIEF_NOT_FOUND: "BRIEF_NOT_FOUND",
} as const;

// ============================================================================
// Utility Functions
// ============================================================================

export function isBriefServiceAvailable(): boolean {
  return !!getAnthropicClient();
}

export function getBriefServiceMode(): "live" | "mock" {
  return getAnthropicClient() ? "live" : "mock";
}
