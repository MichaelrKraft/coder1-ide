/**
 * Outreach Types for LeadPoint.ai
 * Types for AI-generated outreach messages and related functionality
 */

import type { Platform } from "./database";

// ============================================================================
// Outreach Parameters
// ============================================================================

/**
 * Parameters for generating an outreach message
 */
export interface OutreachParams {
  // Influencer info
  username: string;
  displayName: string;
  platform?: Platform;
  followers: number;
  niche: string;
  bio?: string;
  contentThemes?: string[];
  engagementRate?: number;
  location?: string;

  // Campaign/Product info
  productName: string;
  productDescription: string;
  campaignGoal: string;
  offer?: string;
  brandGuidelines?: string;

  // Message configuration
  tone?: "professional" | "casual" | "friendly" | "enthusiastic";
  messageType?: "initial" | "follow_up" | "negotiation" | "confirmation";
  includeSubject?: boolean;
  maxLength?: number;

  // Additional context
  additionalContext?: string;
  previousMessages?: PreviousMessage[];

  // Negotiation specific
  budgetRange?: string;
  deliverables?: string;

  // Confirmation specific
  timeline?: string;
  usageRights?: string;
}

/**
 * Previous message in a conversation thread
 */
export interface PreviousMessage {
  body: string;
  sentAt?: string;
  daysSince?: string;
  role?: "sent" | "received";
}

// ============================================================================
// Outreach Results
// ============================================================================

/**
 * Result of generating an outreach message
 */
export interface OutreachResult {
  message: string;
  subject?: string;
  variations?: string[];
  metadata: OutreachMetadata;
}

/**
 * Metadata about the generation
 */
export interface OutreachMetadata {
  model: string;
  generatedAt: string;
  tokensUsed?: number;
  inputTokens?: number;
  outputTokens?: number;
  messageType: string;
  tone: string;
  isMock?: boolean;
}

// ============================================================================
// Outreach Message (Database)
// ============================================================================

/**
 * Outreach message as stored in the database
 */
export interface OutreachMessageRecord {
  id: string;
  campaign_id: string;
  campaign_influencer_id: string;
  influencer_id: string;
  content: string;
  subject?: string;
  message_type: "initial" | "follow_up" | "negotiation" | "confirmation";
  status: OutreachMessageStatus;
  generated_by_ai: boolean;
  ai_metadata?: OutreachMetadata;
  personalization_data?: Record<string, unknown>;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  replied_at?: string;
  reply_content?: string;
  scheduled_for?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Status of an outreach message
 */
export type OutreachMessageStatus =
  | "draft"
  | "scheduled"
  | "sent"
  | "delivered"
  | "read"
  | "replied"
  | "bounced"
  | "failed";

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request to generate an outreach message
 */
export interface GenerateOutreachRequest {
  influencer_id: string;
  campaign_influencer_id?: string;
  tone?: "professional" | "casual" | "friendly" | "enthusiastic";
  message_type?: "initial" | "follow_up" | "negotiation" | "confirmation";
  additional_context?: string;
  generate_variations?: boolean;
  variation_count?: number;
  include_subject?: boolean;
  max_length?: number;
  custom_product_info?: {
    name?: string;
    description?: string;
    campaign_goal?: string;
    offer?: string;
  };
}

/**
 * Response from generating an outreach message
 */
export interface GenerateOutreachResponse {
  message: string;
  subject?: string;
  variations?: string[];
  influencer: {
    id: string;
    username: string;
    display_name: string;
    platform: Platform;
  };
  metadata: OutreachMetadata;
  credits_used?: number;
  credits_remaining?: number;
}

/**
 * Request to save an outreach message
 */
export interface SaveOutreachRequest {
  campaign_influencer_id: string;
  content: string;
  subject?: string;
  message_type: "initial" | "follow_up" | "negotiation" | "confirmation";
  generated_by_ai?: boolean;
  ai_metadata?: OutreachMetadata;
  scheduled_for?: string;
}

/**
 * Request to send an outreach message
 */
export interface SendOutreachRequest {
  message_id: string;
  scheduled_for?: string;
  send_immediately?: boolean;
}

/**
 * Request to improve an existing message
 */
export interface ImproveMessageRequest {
  original_message: string;
  feedback: string;
  message_type?: "initial" | "follow_up" | "negotiation" | "confirmation";
}

/**
 * Response from improving a message
 */
export interface ImproveMessageResponse {
  improved_message: string;
  changes_made: string[];
  metadata: OutreachMetadata;
}

// ============================================================================
// Outreach Analytics
// ============================================================================

/**
 * Analytics for outreach performance
 */
export interface OutreachAnalytics {
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_replied: number;
  delivery_rate: number;
  open_rate: number;
  reply_rate: number;
  average_response_time_hours?: number;
  by_message_type: Record<string, {
    sent: number;
    replied: number;
    reply_rate: number;
  }>;
  by_platform: Record<Platform, {
    sent: number;
    replied: number;
    reply_rate: number;
  }>;
}

// ============================================================================
// Outreach Template Types
// ============================================================================

/**
 * Saved outreach template
 */
export interface OutreachTemplate {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  message_type: "initial" | "follow_up" | "negotiation" | "confirmation";
  subject_template?: string;
  body_template: string;
  variables: string[];
  tone: "professional" | "casual" | "friendly" | "enthusiastic";
  is_default: boolean;
  usage_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Variable that can be used in templates
 */
export interface TemplateVariable {
  name: string;
  description: string;
  example: string;
  source: "influencer" | "campaign" | "organization" | "custom";
}

/**
 * Available template variables
 */
export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  {
    name: "{{influencer_name}}",
    description: "Influencer's display name",
    example: "Sarah",
    source: "influencer",
  },
  {
    name: "{{influencer_username}}",
    description: "Influencer's handle/username",
    example: "@sarahcreates",
    source: "influencer",
  },
  {
    name: "{{follower_count}}",
    description: "Formatted follower count",
    example: "150K",
    source: "influencer",
  },
  {
    name: "{{niche}}",
    description: "Influencer's content niche",
    example: "fitness & wellness",
    source: "influencer",
  },
  {
    name: "{{product_name}}",
    description: "Product or brand name",
    example: "FitTrack Pro",
    source: "campaign",
  },
  {
    name: "{{campaign_goal}}",
    description: "Campaign objective",
    example: "brand awareness",
    source: "campaign",
  },
  {
    name: "{{offer}}",
    description: "Compensation offer",
    example: "$500 + free products",
    source: "campaign",
  },
  {
    name: "{{company_name}}",
    description: "Organization name",
    example: "TechCorp",
    source: "organization",
  },
  {
    name: "{{sender_name}}",
    description: "Sender's name",
    example: "John",
    source: "organization",
  },
];
