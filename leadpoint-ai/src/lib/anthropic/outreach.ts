/**
 * AI-Powered Outreach Generation Service
 * Handles all influencer outreach message generation using Claude
 */

import {
  generateMessage,
  generateCompletion,
  getAnthropicClient,
  DEFAULT_MODEL,
} from "./client";
import {
  getSystemPromptForType,
  getPromptBuilderForType,
  buildImprovementPrompt,
  formatNumber,
} from "./prompts";
import { getMockOutreachResult, getMockVariations } from "./mock";
import type {
  OutreachParams,
  OutreachResult,
  OutreachMetadata,
} from "@/types/outreach";

// Re-export types for convenience
export type { OutreachParams, OutreachResult, OutreachMetadata };

// ============================================================================
// Core Generation Functions
// ============================================================================

/**
 * Generate a personalized outreach message for an influencer
 */
export async function generateOutreach(
  params: OutreachParams
): Promise<OutreachResult> {
  const client = getAnthropicClient();
  const messageType = params.messageType || "initial";

  // Use mock if no API key
  if (!client) {
    console.log("[Outreach] Using mock mode - no API key configured");
    return getMockOutreachResult(params);
  }

  try {
    const systemPrompt = getSystemPromptForType(messageType);
    const promptBuilder = getPromptBuilderForType(messageType);
    const prompt = promptBuilder(params);

    const result = await generateCompletion(prompt, {
      systemPrompt,
      maxTokens: 1024,
      temperature: 0.7,
    });

    // Parse subject if included
    let message = result.text.trim();
    let subject: string | undefined;

    if (params.includeSubject && message.toLowerCase().startsWith("subject:")) {
      const lines = message.split("\n");
      const subjectLine = lines[0];
      subject = subjectLine.replace(/^subject:\s*/i, "").trim();
      message = lines.slice(1).join("\n").trim();
    }

    const metadata: OutreachMetadata = {
      model: result.model,
      generatedAt: new Date().toISOString(),
      tokensUsed: (result.usage?.inputTokens || 0) + (result.usage?.outputTokens || 0),
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
      messageType,
      tone: params.tone || "friendly",
    };

    return {
      message,
      subject,
      metadata,
    };
  } catch (error) {
    console.error("[Outreach] Error generating message:", error);

    // Check for rate limit errors
    if (error instanceof Error && error.message.includes("rate")) {
      throw new OutreachError(
        "Rate limit exceeded. Please try again in a moment.",
        "RATE_LIMIT"
      );
    }

    // Check for invalid API key
    if (error instanceof Error && error.message.includes("authentication")) {
      throw new OutreachError(
        "Invalid API key. Please check your ANTHROPIC_API_KEY.",
        "AUTH_ERROR"
      );
    }

    // Fallback to mock on error
    console.log("[Outreach] Falling back to mock due to error");
    return getMockOutreachResult(params);
  }
}

/**
 * Generate multiple variations of an outreach message
 */
export async function generateVariations(
  params: OutreachParams,
  count: number = 3
): Promise<string[]> {
  const client = getAnthropicClient();

  // Use mock if no API key
  if (!client) {
    return getMockVariations(params, count);
  }

  // Generate variations in parallel
  const variationPromises = Array(count)
    .fill(null)
    .map((_, index) =>
      generateOutreach({
        ...params,
        additionalContext: `${params.additionalContext || ""}\n\nGenerate variation #${index + 1} - make it distinct from other variations while maintaining the same key message.`,
      })
    );

  try {
    const results = await Promise.all(variationPromises);
    return results.map((r) => r.message);
  } catch (error) {
    console.error("[Outreach] Error generating variations:", error);
    return getMockVariations(params, count);
  }
}

/**
 * Improve an existing outreach message based on feedback
 */
export async function improveMessage(
  originalMessage: string,
  feedback: string,
  messageType?: "initial" | "follow_up" | "negotiation" | "confirmation"
): Promise<OutreachResult> {
  const client = getAnthropicClient();

  if (!client) {
    return {
      message: `[Improved version - mock mode]\n\n${originalMessage}\n\n(Feedback applied: ${feedback})`,
      metadata: {
        model: "mock",
        generatedAt: new Date().toISOString(),
        messageType: messageType || "initial",
        tone: "friendly",
        isMock: true,
      },
    };
  }

  try {
    const systemPrompt = getSystemPromptForType(messageType || "initial");
    const prompt = buildImprovementPrompt(originalMessage, feedback);

    const result = await generateCompletion(prompt, {
      systemPrompt,
      maxTokens: 1024,
      temperature: 0.7,
    });

    return {
      message: result.text.trim(),
      metadata: {
        model: result.model,
        generatedAt: new Date().toISOString(),
        tokensUsed: (result.usage?.inputTokens || 0) + (result.usage?.outputTokens || 0),
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
        messageType: messageType || "initial",
        tone: "friendly",
      },
    };
  } catch (error) {
    console.error("[Outreach] Error improving message:", error);
    throw new OutreachError("Failed to improve message", "GENERATION_ERROR");
  }
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Generate outreach messages for multiple influencers
 */
export async function generateBatchOutreach(
  influencers: Array<{
    username: string;
    displayName: string;
    followers: number;
    niche: string;
    bio?: string;
    contentThemes?: string[];
    engagementRate?: number;
  }>,
  campaignInfo: {
    productName: string;
    productDescription: string;
    campaignGoal: string;
    offer?: string;
    brandGuidelines?: string;
  },
  options?: {
    tone?: "professional" | "casual" | "friendly" | "enthusiastic";
    messageType?: "initial" | "follow_up" | "negotiation" | "confirmation";
    includeSubject?: boolean;
    maxConcurrent?: number;
  }
): Promise<
  Array<{
    username: string;
    result: OutreachResult | null;
    error?: string;
  }>
> {
  const { maxConcurrent = 3, ...messageOptions } = options || {};
  const results: Array<{
    username: string;
    result: OutreachResult | null;
    error?: string;
  }> = [];

  // Process in batches to avoid rate limits
  for (let i = 0; i < influencers.length; i += maxConcurrent) {
    const batch = influencers.slice(i, i + maxConcurrent);

    const batchPromises = batch.map(async (influencer) => {
      try {
        const result = await generateOutreach({
          ...influencer,
          ...campaignInfo,
          ...messageOptions,
        });
        return { username: influencer.username, result, error: undefined };
      } catch (error) {
        return {
          username: influencer.username,
          result: null,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Small delay between batches to avoid rate limits
    if (i + maxConcurrent < influencers.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build outreach params from influencer and campaign data
 */
export function buildOutreachParams(
  influencer: {
    id?: string;
    username: string;
    display_name: string;
    platform?: string;
    follower_count: number;
    categories?: string[];
    bio?: string | null;
    engagement_rate?: number | null;
    location?: string | null;
    ai_analysis?: {
      content_themes?: string[];
    } | null;
  },
  campaign: {
    name: string;
    description?: string | null;
    goals?: {
      primary_goal?: string;
    };
    target_audience?: {
      interests?: string[];
    };
  },
  organization?: {
    name: string;
    settings?: {
      default_outreach_tone?: "professional" | "casual" | "friendly";
      brand_guidelines?: string;
    };
  },
  customOptions?: Partial<OutreachParams>
): OutreachParams {
  return {
    // Influencer info
    username: influencer.username,
    displayName: influencer.display_name,
    platform: (influencer.platform as OutreachParams["platform"]) || "tiktok",
    followers: influencer.follower_count,
    niche: influencer.categories?.join(", ") || "general",
    bio: influencer.bio || undefined,
    contentThemes: influencer.ai_analysis?.content_themes || [],
    engagementRate: influencer.engagement_rate || undefined,
    location: influencer.location || undefined,

    // Campaign info
    productName: organization?.name || campaign.name,
    productDescription: campaign.description || `Campaign: ${campaign.name}`,
    campaignGoal: campaign.goals?.primary_goal || "brand awareness",

    // Defaults
    tone: organization?.settings?.default_outreach_tone || "friendly",
    messageType: "initial",
    brandGuidelines: organization?.settings?.brand_guidelines,

    // Overrides
    ...customOptions,
  };
}

/**
 * Estimate the number of credits/tokens a generation will use
 */
export function estimateCredits(params: OutreachParams): number {
  // Rough estimate based on message type and variations
  const baseCredits: Record<string, number> = {
    initial: 1,
    follow_up: 0.5,
    negotiation: 1,
    confirmation: 0.5,
  };

  return baseCredits[params.messageType || "initial"] || 1;
}

/**
 * Check if the service is available (API key configured)
 */
export function isOutreachServiceAvailable(): boolean {
  return !!getAnthropicClient();
}

/**
 * Get the current service mode
 */
export function getOutreachServiceMode(): "live" | "mock" {
  return getAnthropicClient() ? "live" : "mock";
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Custom error class for outreach-specific errors
 */
export class OutreachError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = "OUTREACH_ERROR",
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "OutreachError";
    this.code = code;
    this.details = details;
  }
}

/**
 * Error codes for outreach operations
 */
export const OutreachErrorCodes = {
  RATE_LIMIT: "RATE_LIMIT",
  AUTH_ERROR: "AUTH_ERROR",
  GENERATION_ERROR: "GENERATION_ERROR",
  INVALID_PARAMS: "INVALID_PARAMS",
  INFLUENCER_NOT_FOUND: "INFLUENCER_NOT_FOUND",
  CAMPAIGN_NOT_FOUND: "CAMPAIGN_NOT_FOUND",
  INSUFFICIENT_CREDITS: "INSUFFICIENT_CREDITS",
} as const;
