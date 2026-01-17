// Apify TikTok Influencer Discovery Integration
// =============================================

// Client exports
export {
  apifyClient,
  runActor,
  runActorAsync,
  getRunStatus,
  getRunResults,
  getResultsByRunId,
} from './client'

// Actor configurations
export {
  APIFY_ACTORS,
  type ApifyActorId,
  type TikTokHashtagInput,
  type TikTokProfileInput,
  defaultHashtagInput,
  defaultProfileInput,
  FOLLOWER_TIERS,
  type FollowerTier,
  getFollowerTier,
  COMMON_NICHES,
  type NicheCategory,
} from './actors'

// Type definitions
export type {
  TikTokVideo,
  TikTokProfile,
  DiscoveredInfluencer,
  TikTokVideoSummary,
  ApifyWebhookPayload,
  DiscoveryJob,
  DiscoveryFilters,
} from './types'

// Service functions
export {
  discoverInfluencers,
  getProfileDetails,
  getDiscoveryResults,
  transformToInfluencer,
  transformToVideoSummary,
  processDiscoveryResults,
  batchDiscoverInfluencers,
  type DiscoveryOptions,
  type DiscoveryResult,
} from './services'

// Scoring functions
export {
  calculateInfluencerScore,
  scoreInfluencersFromVideos,
  getTierExpectations,
  compareScores,
  filterByScore,
  calculateAverageScore,
  type InfluencerScoreFactors,
  type InfluencerScore,
} from './scoring'

// Mock data for development
export {
  mockTikTokVideos,
  mockTikTokProfiles,
  getMockDiscoveryResults,
  getMockProfileResults,
  getAllMockData,
} from './mock'
