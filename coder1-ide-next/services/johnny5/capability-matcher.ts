/**
 * Capability Matcher Service
 *
 * Matches user profiles to Johnny5 capabilities.
 * Discovers "unknown unknowns" - what users don't know Johnny5 can do for them.
 *
 * From Alex Finn: "The issue most people have when they use any AI tool is
 * they don't hunt the unknown unknowns... you want to spend a lot of time saying
 * 'Hey here's everything about me, what can you do for me?'"
 */

// ============================================================================
// Types
// ============================================================================

export interface UserProfile {
  id: string;
  roles: string[];              // 'founder', 'creator', 'developer', 'marketer'
  platforms: string[];          // 'youtube', 'twitter', 'newsletter', 'tiktok'
  projects: string[];           // Project names
  goals: string[];              // What they want to achieve
  preferences: {
    proactivityLevel: 'low' | 'medium' | 'high';
    notificationChannels: string[];
    workingHours?: { start: string; end: string };
  };
  extractedFrom: 'conversation' | 'manual' | 'integration';
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchedCapability {
  id: string;
  name: string;
  description: string;
  relevanceScore: number;       // 0-100
  category: CapabilityCategory;
  enabled: boolean;
  reason: string;               // Why this was suggested
  requiredIntegrations?: string[];
  icon: string;                 // Lucide icon name
  setupSteps?: string[];
}

export type CapabilityCategory =
  | 'content-creation'
  | 'monitoring'
  | 'automation'
  | 'research'
  | 'development'
  | 'analytics'
  | 'communication';

// ============================================================================
// Capability Definitions
// ============================================================================

interface CapabilityDefinition {
  id: string;
  name: string;
  description: string;
  category: CapabilityCategory;
  icon: string;
  triggers: {
    roles?: string[];
    platforms?: string[];
    keywords?: string[];
  };
  baseScore: number;
  requiredIntegrations?: string[];
  setupSteps?: string[];
}

export const CAPABILITY_DEFINITIONS: CapabilityDefinition[] = [
  // Content Creation
  {
    id: 'morning-brief',
    name: 'Morning Brief with Overnight Summary',
    description: 'Wake up to a personalized summary of what Johnny5 accomplished while you slept.',
    category: 'content-creation',
    icon: 'Sunrise',
    triggers: {
      roles: ['founder', 'creator', 'developer'],
    },
    baseScore: 90,
  },
  {
    id: 'content-repurpose',
    name: 'Repurpose Content Across Platforms',
    description: 'Automatically transform YouTube videos into newsletter posts, X threads, and LinkedIn articles.',
    category: 'content-creation',
    icon: 'Repeat',
    triggers: {
      platforms: ['youtube', 'newsletter', 'twitter'],
      roles: ['creator'],
    },
    baseScore: 85,
    requiredIntegrations: ['youtube', 'twitter'],
    setupSteps: ['Connect YouTube channel', 'Connect Twitter/X account', 'Set repurposing preferences'],
  },
  {
    id: 'thumbnail-generator',
    name: 'Auto-Generate Video Thumbnails',
    description: 'Create eye-catching thumbnails for your videos using AI-powered design.',
    category: 'content-creation',
    icon: 'Image',
    triggers: {
      platforms: ['youtube', 'tiktok'],
      roles: ['creator'],
    },
    baseScore: 75,
    requiredIntegrations: ['youtube'],
  },
  {
    id: 'newsletter-drafts',
    name: 'Draft Newsletter Issues',
    description: 'Generate newsletter drafts based on your recent content and industry trends.',
    category: 'content-creation',
    icon: 'Mail',
    triggers: {
      platforms: ['newsletter', 'substack'],
      roles: ['creator', 'founder'],
    },
    baseScore: 80,
  },

  // Monitoring
  {
    id: 'competitor-video-monitor',
    name: 'Competitor Video Monitoring',
    description: 'Track competitor channels and alert you when outlier content performs unexpectedly well.',
    category: 'monitoring',
    icon: 'Eye',
    triggers: {
      platforms: ['youtube'],
      roles: ['creator', 'marketer'],
    },
    baseScore: 85,
    requiredIntegrations: ['youtube'],
  },
  {
    id: 'hackernews-monitor',
    name: 'HackerNews Trend Monitoring',
    description: 'Monitor HackerNews for topics relevant to your SaaS and alert on trending discussions.',
    category: 'monitoring',
    icon: 'TrendingUp',
    triggers: {
      roles: ['founder', 'developer'],
      keywords: ['saas', 'startup', 'tech'],
    },
    baseScore: 75,
  },
  {
    id: 'api-update-alerts',
    name: 'API Update Alerts',
    description: 'Get notified when APIs you depend on release updates, deprecations, or breaking changes.',
    category: 'monitoring',
    icon: 'Bell',
    triggers: {
      roles: ['developer', 'founder'],
    },
    baseScore: 70,
  },
  {
    id: 'competitor-newsletter-monitor',
    name: 'Summarize Competitor Newsletters',
    description: 'Subscribe to and summarize competitor newsletters so you never miss key insights.',
    category: 'monitoring',
    icon: 'FileText',
    triggers: {
      roles: ['founder', 'marketer'],
      platforms: ['newsletter'],
    },
    baseScore: 70,
  },

  // Automation
  {
    id: 'auto-pr-creation',
    name: 'Proactive PR Creation',
    description: 'Automatically create pull requests for improvements and bug fixes while you sleep.',
    category: 'automation',
    icon: 'GitPullRequest',
    triggers: {
      roles: ['developer', 'founder'],
    },
    baseScore: 85,
    requiredIntegrations: ['github'],
    setupSteps: ['Connect GitHub', 'Select repositories', 'Set PR limits'],
  },
  {
    id: 'demo-feature-builder',
    name: 'Build Demo Features from Trends',
    description: 'Automatically prototype new features based on trending topics and user feedback.',
    category: 'automation',
    icon: 'Wand2',
    triggers: {
      roles: ['founder', 'developer'],
      keywords: ['saas', 'product'],
    },
    baseScore: 70,
  },
  {
    id: 'smart-scheduling',
    name: 'Smart Content Scheduling',
    description: 'Optimize posting times across platforms based on engagement analytics.',
    category: 'automation',
    icon: 'Calendar',
    triggers: {
      platforms: ['twitter', 'youtube', 'linkedin'],
      roles: ['creator', 'marketer'],
    },
    baseScore: 65,
  },

  // Research
  {
    id: 'topic-research',
    name: 'Research Topics from Conversation',
    description: 'Automatically research topics you mention in conversations and provide summaries.',
    category: 'research',
    icon: 'Search',
    triggers: {
      roles: ['founder', 'developer', 'creator'],
    },
    baseScore: 80,
  },
  {
    id: 'competitor-analysis',
    name: 'Deep Competitor Analysis',
    description: 'Generate comprehensive reports on competitor products, features, and strategies.',
    category: 'research',
    icon: 'BarChart',
    triggers: {
      roles: ['founder', 'marketer'],
    },
    baseScore: 75,
  },
  {
    id: 'tech-stack-research',
    name: 'Tech Stack Research',
    description: 'Evaluate new technologies and frameworks with pros/cons analysis.',
    category: 'research',
    icon: 'Layers',
    triggers: {
      roles: ['developer', 'founder'],
    },
    baseScore: 70,
  },

  // Development
  {
    id: 'code-review-automation',
    name: 'Automated Code Review',
    description: 'Review PRs for common issues, security vulnerabilities, and style violations.',
    category: 'development',
    icon: 'Code',
    triggers: {
      roles: ['developer', 'founder'],
    },
    baseScore: 85,
    requiredIntegrations: ['github'],
  },
  {
    id: 'test-generation',
    name: 'Auto-Generate Tests',
    description: 'Automatically write unit and integration tests for new code.',
    category: 'development',
    icon: 'TestTube2',
    triggers: {
      roles: ['developer'],
    },
    baseScore: 75,
    requiredIntegrations: ['github'],
  },
  {
    id: 'documentation-sync',
    name: 'Keep Documentation in Sync',
    description: 'Automatically update documentation when code changes.',
    category: 'development',
    icon: 'BookOpen',
    triggers: {
      roles: ['developer', 'founder'],
    },
    baseScore: 70,
    requiredIntegrations: ['github'],
  },

  // Analytics
  {
    id: 'metrics-tracking',
    name: 'Track Product Metrics Daily',
    description: 'Monitor key metrics for your SaaS and alert on significant changes.',
    category: 'analytics',
    icon: 'LineChart',
    triggers: {
      roles: ['founder'],
      keywords: ['saas', 'product', 'startup'],
    },
    baseScore: 85,
  },
  {
    id: 'content-analytics',
    name: 'Content Performance Analysis',
    description: 'Analyze which content performs best and suggest optimization strategies.',
    category: 'analytics',
    icon: 'PieChart',
    triggers: {
      platforms: ['youtube', 'twitter', 'newsletter'],
      roles: ['creator'],
    },
    baseScore: 75,
  },

  // Communication
  {
    id: 'email-drafts',
    name: 'Draft Email Responses',
    description: 'Prepare draft responses to emails based on your communication style.',
    category: 'communication',
    icon: 'MessageSquare',
    triggers: {
      roles: ['founder', 'marketer'],
    },
    baseScore: 65,
    requiredIntegrations: ['gmail'],
  },
  {
    id: 'meeting-prep',
    name: 'Meeting Preparation',
    description: 'Research attendees and prepare talking points before meetings.',
    category: 'communication',
    icon: 'Users',
    triggers: {
      roles: ['founder', 'marketer'],
    },
    baseScore: 60,
    requiredIntegrations: ['google-calendar'],
  },
];

// ============================================================================
// Matching Logic
// ============================================================================

/**
 * Calculate relevance score for a capability based on user profile
 */
function calculateRelevanceScore(
  capability: CapabilityDefinition,
  profile: UserProfile
): { score: number; reason: string } {
  let score = capability.baseScore;
  const reasons: string[] = [];

  // Role matching (highest weight)
  if (capability.triggers.roles) {
    const matchedRoles = capability.triggers.roles.filter((role) =>
      profile.roles.includes(role)
    );
    if (matchedRoles.length > 0) {
      score += matchedRoles.length * 15;
      reasons.push(`You're a ${matchedRoles.join(' and ')}`);
    } else {
      score -= 20;
    }
  }

  // Platform matching
  if (capability.triggers.platforms) {
    const matchedPlatforms = capability.triggers.platforms.filter((platform) =>
      profile.platforms.includes(platform)
    );
    if (matchedPlatforms.length > 0) {
      score += matchedPlatforms.length * 10;
      reasons.push(`You use ${matchedPlatforms.join(', ')}`);
    }
  }

  // Keyword matching against projects and goals
  if (capability.triggers.keywords) {
    const allText = [...profile.projects, ...profile.goals]
      .join(' ')
      .toLowerCase();
    const matchedKeywords = capability.triggers.keywords.filter((keyword) =>
      allText.includes(keyword.toLowerCase())
    );
    if (matchedKeywords.length > 0) {
      score += matchedKeywords.length * 8;
      reasons.push(`Matches your focus on ${matchedKeywords.join(', ')}`);
    }
  }

  // Proactivity level adjustment
  if (profile.preferences.proactivityLevel === 'high') {
    if (['automation', 'monitoring'].includes(capability.category)) {
      score += 10;
    }
  } else if (profile.preferences.proactivityLevel === 'low') {
    if (['automation'].includes(capability.category)) {
      score -= 15;
    }
  }

  // Cap score at 100
  score = Math.min(100, Math.max(0, score));

  // Generate reason string
  const reason =
    reasons.length > 0
      ? reasons.join('. ') + '.'
      : 'General productivity enhancement.';

  return { score, reason };
}

/**
 * Match user profile to capabilities and return sorted list
 */
export function matchCapabilities(
  profile: UserProfile,
  options: {
    minScore?: number;
    maxResults?: number;
    categories?: CapabilityCategory[];
  } = {}
): MatchedCapability[] {
  const { minScore = 50, maxResults = 15, categories } = options;

  let capabilities = CAPABILITY_DEFINITIONS;

  // Filter by categories if specified
  if (categories && categories.length > 0) {
    capabilities = capabilities.filter((cap) =>
      categories.includes(cap.category)
    );
  }

  // Calculate scores and map to MatchedCapability
  const matched: MatchedCapability[] = capabilities
    .map((cap) => {
      const { score, reason } = calculateRelevanceScore(cap, profile);
      return {
        id: cap.id,
        name: cap.name,
        description: cap.description,
        relevanceScore: score,
        category: cap.category,
        enabled: false, // Will be updated from user settings
        reason,
        requiredIntegrations: cap.requiredIntegrations,
        icon: cap.icon,
        setupSteps: cap.setupSteps,
      };
    })
    .filter((cap) => cap.relevanceScore >= minScore)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxResults);

  return matched;
}

/**
 * Get capabilities grouped by category
 */
export function getCapabilitiesByCategory(
  capabilities: MatchedCapability[]
): Record<CapabilityCategory, MatchedCapability[]> {
  const grouped: Record<CapabilityCategory, MatchedCapability[]> = {
    'content-creation': [],
    monitoring: [],
    automation: [],
    research: [],
    development: [],
    analytics: [],
    communication: [],
  };

  for (const cap of capabilities) {
    grouped[cap.category].push(cap);
  }

  return grouped;
}

/**
 * Get category metadata for display
 */
export function getCategoryMeta(category: CapabilityCategory): {
  label: string;
  icon: string;
  color: string;
} {
  const meta: Record<
    CapabilityCategory,
    { label: string; icon: string; color: string }
  > = {
    'content-creation': {
      label: 'Content Creation',
      icon: 'Pencil',
      color: 'purple',
    },
    monitoring: { label: 'Monitoring', icon: 'Eye', color: 'blue' },
    automation: { label: 'Automation', icon: 'Zap', color: 'amber' },
    research: { label: 'Research', icon: 'Search', color: 'green' },
    development: { label: 'Development', icon: 'Code', color: 'cyan' },
    analytics: { label: 'Analytics', icon: 'BarChart', color: 'pink' },
    communication: {
      label: 'Communication',
      icon: 'MessageSquare',
      color: 'orange',
    },
  };

  return meta[category];
}

// ============================================================================
// Mock Data for Development
// ============================================================================

export const MOCK_USER_PROFILE: UserProfile = {
  id: 'user-001',
  roles: ['founder', 'creator', 'developer'],
  platforms: ['youtube', 'twitter', 'newsletter'],
  projects: ['Creator Buddy SaaS', 'AI Tutorials Channel'],
  goals: [
    'Grow YouTube channel to 100k subscribers',
    'Launch SaaS product',
    'Build newsletter to 10k subscribers',
  ],
  preferences: {
    proactivityLevel: 'high',
    notificationChannels: ['panel', 'email'],
    workingHours: { start: '09:00', end: '18:00' },
  },
  extractedFrom: 'conversation',
  createdAt: new Date('2025-01-15'),
  updatedAt: new Date('2025-01-28'),
};

export const INTERVIEW_QUESTIONS = [
  {
    id: 'roles',
    question: "What best describes your role?",
    type: 'multi-select' as const,
    options: [
      { value: 'founder', label: 'Founder / Entrepreneur' },
      { value: 'developer', label: 'Developer / Engineer' },
      { value: 'creator', label: 'Content Creator' },
      { value: 'marketer', label: 'Marketer' },
      { value: 'designer', label: 'Designer' },
      { value: 'product', label: 'Product Manager' },
    ],
  },
  {
    id: 'platforms',
    question: 'Which platforms do you actively use?',
    type: 'multi-select' as const,
    options: [
      { value: 'youtube', label: 'YouTube' },
      { value: 'twitter', label: 'X / Twitter' },
      { value: 'newsletter', label: 'Newsletter (Substack, ConvertKit, etc.)' },
      { value: 'linkedin', label: 'LinkedIn' },
      { value: 'tiktok', label: 'TikTok' },
      { value: 'github', label: 'GitHub' },
    ],
  },
  {
    id: 'projects',
    question: "What are you currently working on?",
    type: 'text-list' as const,
    placeholder: 'e.g., My SaaS product, AI tutorials channel...',
  },
  {
    id: 'goals',
    question: 'What are your main goals right now?',
    type: 'text-list' as const,
    placeholder: 'e.g., Grow to 100k subscribers, Launch by Q2...',
  },
  {
    id: 'proactivity',
    question: 'How proactive should Johnny5 be?',
    type: 'single-select' as const,
    options: [
      { value: 'low', label: 'Conservative - Always ask before acting' },
      { value: 'medium', label: 'Balanced - Act on routine tasks, ask for big decisions' },
      { value: 'high', label: 'Autonomous - Take initiative, notify me after' },
    ],
  },
];
