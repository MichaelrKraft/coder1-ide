import { NextRequest, NextResponse } from 'next/server';
import type { Johnny5APIResponse } from '@/types/johnny5';

/**
 * Matched Capability - A feature Johnny5 can offer based on user profile
 */
interface MatchedCapability {
  id: string;
  name: string;
  description: string;
  relevanceScore: number;
  category: string;
  enabled: boolean;
  reason: string;
  requiredIntegrations?: string[];
}

/**
 * GET /api/johnny5/onboarding/capabilities
 *
 * Get capabilities matched to user profile.
 * Returns suggested capabilities based on user's roles, platforms, and goals.
 */
export async function GET(request: NextRequest) {
  // In real implementation, this would:
  // 1. Fetch user profile
  // 2. Run capability matching algorithm
  // 3. Sort by relevance score

  const capabilities = generateMatchedCapabilities();

  const response: Johnny5APIResponse<MatchedCapability[]> = {
    success: true,
    data: capabilities,
    timestamp: new Date(),
  };

  return NextResponse.json(response);
}

/**
 * POST /api/johnny5/onboarding/capabilities
 *
 * Enable or disable a capability.
 *
 * Request body:
 * - capabilityId: string
 * - enabled: boolean
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.capabilityId || typeof body.enabled !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: capabilityId, enabled',
          timestamp: new Date(),
        },
        { status: 400 }
      );
    }

    // In real implementation, update capability status in database
    const capability = MOCK_CAPABILITIES.find((c) => c.id === body.capabilityId);
    if (capability) {
      capability.enabled = body.enabled;
    }

    const response: Johnny5APIResponse<{ capabilityId: string; enabled: boolean }> = {
      success: true,
      data: { capabilityId: body.capabilityId, enabled: body.enabled },
      timestamp: new Date(),
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request body',
        timestamp: new Date(),
      },
      { status: 400 }
    );
  }
}

// ================================================================================
// Capability Matching Logic
// ================================================================================

function generateMatchedCapabilities(): MatchedCapability[] {
  // Sort by relevance score descending
  return [...MOCK_CAPABILITIES].sort((a, b) => b.relevanceScore - a.relevanceScore);
}

// ================================================================================
// Mock Data
// ================================================================================

const MOCK_CAPABILITIES: MatchedCapability[] = [
  {
    id: 'cap_001',
    name: 'Morning Brief with Overnight Summary',
    description: 'Wake up to a summary of what Johnny5 accomplished while you slept.',
    relevanceScore: 95,
    category: 'productivity',
    enabled: true,
    reason: 'Essential for solo founders who want to maximize productive time',
  },
  {
    id: 'cap_002',
    name: 'Competitor Video Monitoring',
    description: 'Track competitor YouTube channels and alert on outlier videos.',
    relevanceScore: 92,
    category: 'monitoring',
    enabled: true,
    reason: 'You run a YouTube channel - stay ahead of content trends',
    requiredIntegrations: ['youtube'],
  },
  {
    id: 'cap_003',
    name: 'Content Repurposing Pipeline',
    description: 'Automatically repurpose YouTube videos → Newsletter → X threads.',
    relevanceScore: 88,
    category: 'content',
    enabled: false,
    reason: 'You create content on multiple platforms - streamline your workflow',
    requiredIntegrations: ['youtube', 'newsletter'],
  },
  {
    id: 'cap_004',
    name: 'HackerNews SaaS Trend Monitor',
    description: 'Monitor HackerNews for SaaS trends and competitor news.',
    relevanceScore: 85,
    category: 'research',
    enabled: false,
    reason: 'You are building a SaaS - stay informed on industry trends',
  },
  {
    id: 'cap_005',
    name: 'Automatic Thumbnail Generation',
    description: 'Generate thumbnail variations for your YouTube videos using AI.',
    relevanceScore: 82,
    category: 'content',
    enabled: false,
    reason: 'Thumbnails are critical for YouTube - save time with AI generation',
    requiredIntegrations: ['youtube'],
  },
  {
    id: 'cap_006',
    name: 'Daily SaaS Metrics Report',
    description: 'Track Creator Buddy metrics daily with trend analysis.',
    relevanceScore: 80,
    category: 'analytics',
    enabled: false,
    reason: 'You mentioned building Creator Buddy SaaS - track growth automatically',
    requiredIntegrations: ['analytics'],
  },
  {
    id: 'cap_007',
    name: 'Conversation-Based Research',
    description: 'Research topics you mention in conversation automatically.',
    relevanceScore: 78,
    category: 'research',
    enabled: false,
    reason: 'Turn casual mentions into actionable research reports',
  },
  {
    id: 'cap_008',
    name: 'Trend-Based Feature Building',
    description: 'Build demo features based on detected trends in your space.',
    relevanceScore: 75,
    category: 'development',
    enabled: false,
    reason: 'As a developer, you can benefit from proactive feature suggestions',
  },
  {
    id: 'cap_009',
    name: 'Competitor Newsletter Summaries',
    description: 'Summarize competitor newsletters so you stay informed without reading everything.',
    relevanceScore: 72,
    category: 'research',
    enabled: false,
    reason: 'You write a newsletter - know what competitors are saying',
    requiredIntegrations: ['email'],
  },
  {
    id: 'cap_010',
    name: 'API Update Alerts',
    description: 'Alert when APIs you use have updates or breaking changes.',
    relevanceScore: 70,
    category: 'development',
    enabled: false,
    reason: 'As a developer, stay ahead of dependency updates',
    requiredIntegrations: ['github'],
  },
];
