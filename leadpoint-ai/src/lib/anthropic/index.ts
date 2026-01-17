/**
 * Anthropic AI Integration for LeadPoint.ai
 *
 * This module provides AI-powered features including:
 * - Outreach message generation
 * - Message improvement
 * - Content analysis
 *
 * @module lib/anthropic
 */

// Core client exports
export {
  getAnthropicClient,
  anthropic,
  generateMessage,
  generateCompletion,
  generateChatCompletion,
  streamCompletion,
  isAnthropicAvailable,
  getClientMode,
  MODELS,
  DEFAULT_MODEL,
  type ModelId,
  type ChatMessage,
  type GenerationOptions,
  type GenerationResult,
} from "./client";

// Outreach generation exports
export {
  generateOutreach,
  generateVariations,
  improveMessage,
  generateBatchOutreach,
  buildOutreachParams,
  estimateCredits,
  isOutreachServiceAvailable,
  getOutreachServiceMode,
  OutreachError,
  OutreachErrorCodes,
  type OutreachParams,
  type OutreachResult,
  type OutreachMetadata,
} from "./outreach";

// Prompt exports (for customization)
export {
  OUTREACH_SYSTEM_PROMPT,
  FOLLOW_UP_SYSTEM_PROMPT,
  NEGOTIATION_SYSTEM_PROMPT,
  CONFIRMATION_SYSTEM_PROMPT,
  buildOutreachPrompt,
  buildFollowUpPrompt,
  buildNegotiationPrompt,
  buildConfirmationPrompt,
  buildImprovementPrompt,
  getSystemPromptForType,
  getPromptBuilderForType,
  formatNumber,
} from "./prompts";

// Mock exports (for testing)
export {
  getMockResponse,
  getMockOutreachResult,
  getMockVariations,
} from "./mock";
