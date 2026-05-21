/**
 * Power User Report (PUR) Type Definitions
 * Types for content sourcing, curation, newsletter drafting, and member verification
 */

// ================================================================================
// Enum-like string union types
// ================================================================================

export type PurSourceKind = 'reddit' | 'x' | 'hn' | 'youtube' | 'blog' | 'email';

export type PurFindStatus = 'active' | 'deleted' | 'excluded';

export type PurCuratedCategory =
  | 'workflow'
  | 'power_tool'
  | 'thread'
  | 'video'
  | 'spotlight';

export type PurMemberStatus =
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'revoked'
  | 'left';

export type PurVerificationDecision =
  | 'auto_approve'
  | 'auto_reject'
  | 'manual_flag'
  | 'mike_approve'
  | 'mike_reject';

// ================================================================================
// Core entity types (mirror DB schema, timestamps are Unix milliseconds)
// ================================================================================

export interface PurSource {
  id: string;
  kind: PurSourceKind;
  handle: string;
  url: string | null;
  weight: number;
  active: boolean;
  addedAt: number;
  lastScrapedAt: number | null;
  errorCount: number;
}

export interface PurFind {
  id: string;
  sourceId: string | null;
  externalId: string;
  url: string;
  title: string | null;
  author: string | null;
  contentHash: string;
  rawJson: string | null;
  snippet: string | null;
  engagementScore: number;
  publishedAt: number | null;
  scrapedAt: number;
  dedupGroupId: string | null;
  status: PurFindStatus;
}

export interface PurCurated {
  id: string;
  weekIso: string;
  findId: string | null;
  rank: number | null;
  category: PurCuratedCategory | null;
  justification: string | null;
  mikeApproved: boolean;
  createdAt: number;
}

export interface PurNewsletter {
  id: string;
  weekIso: string;
  draftPath: string | null;
  substackUrl: string | null;
  subject: string | null;
  mikeEssay: string | null;
  bodyMd: string | null;
  sentAt: number | null;
  createdAt: number;
}

export interface PurMember {
  id: string;
  discordId: string;
  discordUsername: string | null;
  verifiedAt: number | null;
  sessionsCount: number | null;
  screenshotHash: string | null;
  status: PurMemberStatus;
  verificationAttempts: number;
  lastAttemptAt: number | null;
  notes: string | null;
  createdAt: number;
}

export interface PurVerification {
  id: string;
  memberId: string | null;
  screenshotPath: string | null;
  visionOutputJson: string | null;
  decision: PurVerificationDecision | null;
  reviewer: string | null;
  reviewedAt: number | null;
  reason: string | null;
  createdAt: number;
}

export interface PurMetrics {
  weekIso: string;
  subscribers: number | null;
  netNew: number | null;
  discordTotal: number | null;
  verifiedCount: number | null;
  coder1Conversions: number | null;
  newsletterOpenRate: number | null;
  recordedAt: number;
}

export interface PurAuditLog {
  id: string;
  actor: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  payloadJson: string | null;
  at: number;
}

export interface PurCandidateSource {
  id: string;
  kind: PurSourceKind | null;
  handle: string | null;
  reason: string | null;
  foundAt: number | null;
  reviewed: boolean;
}

export interface PurMemberDmSent {
  id: string;
  memberId: string | null;
  dmDay: 0 | 1 | 3 | 7;
  sentAt: number;
}

// ================================================================================
// Input / creation types (omit auto-generated fields)
// ================================================================================

export type PurSourceCreateInput = Omit<PurSource, 'id' | 'addedAt' | 'lastScrapedAt' | 'errorCount'>;

export type PurFindCreateInput = Omit<PurFind, 'id' | 'scrapedAt' | 'engagementScore' | 'status' | 'dedupGroupId'>;

export type PurCuratedCreateInput = Omit<PurCurated, 'id' | 'createdAt' | 'mikeApproved'>;

export type PurNewsletterCreateInput = Omit<PurNewsletter, 'id' | 'createdAt' | 'sentAt'>;

export type PurMemberCreateInput = Omit<PurMember, 'id' | 'createdAt' | 'verificationAttempts' | 'lastAttemptAt' | 'verifiedAt'>;

export type PurVerificationCreateInput = Omit<PurVerification, 'id' | 'createdAt' | 'reviewedAt'>;

// ================================================================================
// Scout / scraper types
// ================================================================================

export interface ScrapedItem {
  externalId: string;
  url: string;
  title: string | null;
  author: string | null;
  snippet: string | null;
  rawJson: string;
  upvotes: number;
  comments: number;
  publishedAt: number | null;
}

export interface ScoutResult {
  sourceId: string;
  itemsFound: number;
  itemsNew: number;
  itemsDuplicate: number;
  errors: string[];
  scrapedAt: number;
}

// ================================================================================
// Curator types
// ================================================================================

export interface CurationBatch {
  weekIso: string;
  candidates: PurFind[];
  selected: PurCurated[];
  totalCandidates: number;
  createdAt: number;
}

export interface CurationCriteria {
  weekIso: string;
  maxItems: number;
  categoryTargets: Partial<Record<PurCuratedCategory, number>>;
  minEngagementScore: number;
}

// ================================================================================
// Drafter types
// ================================================================================

export interface DraftSection {
  category: PurCuratedCategory;
  items: Array<{
    find: PurFind;
    curated: PurCurated;
  }>;
}

export interface NewsletterDraft {
  weekIso: string;
  subject: string;
  bodyMd: string;
  sections: DraftSection[];
  draftPath: string;
  createdAt: number;
}

// ================================================================================
// Verification pipeline types
// ================================================================================

export interface VerificationRequest {
  discordId: string;
  discordUsername: string;
  screenshotPath: string;
}

export interface VerificationResult {
  decision: PurVerificationDecision;
  reason: string;
  visionOutputJson: string;
  sessionsCount: number | null;
  screenshotHash: string;
}
