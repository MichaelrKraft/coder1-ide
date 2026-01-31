import { NextRequest, NextResponse } from 'next/server';
import type { Johnny5Skill, Johnny5APIResponse } from '@/types/johnny5';

/**
 * GET /api/johnny5/skills
 *
 * Returns all Johnny5 skills with optional filtering.
 *
 * Query params:
 * - enabled: 'true' or 'false' to filter by enabled status
 * - createdBy: 'system', 'user', or 'self_improvement'
 * - trigger: 'scheduled', 'event', 'manual', or 'trend'
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const enabledFilter = searchParams.get('enabled');
  const createdByFilter = searchParams.get('createdBy');
  const triggerFilter = searchParams.get('trigger');

  let skills = [...MOCK_SKILLS];

  // Apply filters
  if (enabledFilter !== null) {
    const enabled = enabledFilter === 'true';
    skills = skills.filter((s) => s.enabled === enabled);
  }

  if (createdByFilter) {
    skills = skills.filter((s) => s.createdBy === createdByFilter);
  }

  if (triggerFilter) {
    skills = skills.filter((s) => s.trigger === triggerFilter);
  }

  const response: Johnny5APIResponse<Johnny5Skill[]> = {
    success: true,
    data: skills,
    timestamp: new Date(),
  };

  return NextResponse.json(response);
}

/**
 * POST /api/johnny5/skills
 *
 * Create a new skill.
 *
 * Request body:
 * - name: string
 * - description: string
 * - trigger: 'scheduled' | 'event' | 'manual' | 'trend'
 * - dependencies: string[]
 * - code?: string
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.description || !body.trigger) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, description, trigger',
          timestamp: new Date(),
        },
        { status: 400 }
      );
    }

    // Create new skill
    const newSkill: Johnny5Skill = {
      id: `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: body.name,
      description: body.description,
      trigger: body.trigger,
      createdBy: 'user',
      createdAt: new Date(),
      usageCount: 0,
      successRate: 100,
      dependencies: body.dependencies || [],
      code: body.code,
      enabled: true,
    };

    // In real implementation, save to database
    MOCK_SKILLS.push(newSkill);

    const response: Johnny5APIResponse<Johnny5Skill> = {
      success: true,
      data: newSkill,
      timestamp: new Date(),
    };

    return NextResponse.json(response, { status: 201 });
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
// Mock Data
// ================================================================================

const MOCK_SKILLS: Johnny5Skill[] = [
  {
    id: 'skill_001',
    name: 'Daily Analytics Report',
    description: 'Generates a daily report of token usage, session stats, and efficiency metrics.',
    trigger: 'scheduled',
    createdBy: 'system',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000),
    usageCount: 47,
    successRate: 98,
    dependencies: ['analytics-service'],
    enabled: true,
  },
  {
    id: 'skill_002',
    name: 'Morning Brief Generator',
    description: 'Compiles overnight activity into a morning summary with actionable items.',
    trigger: 'scheduled',
    createdBy: 'system',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    lastUsed: new Date(Date.now() - 8 * 60 * 60 * 1000),
    usageCount: 28,
    successRate: 100,
    dependencies: ['morning-brief-service', 'activity-tracker'],
    enabled: true,
  },
  {
    id: 'skill_003',
    name: 'Security Audit',
    description: 'Scans for potential security issues and prompt injection attempts.',
    trigger: 'event',
    createdBy: 'system',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    lastUsed: new Date(Date.now() - 30 * 60 * 1000),
    usageCount: 156,
    successRate: 99,
    dependencies: ['security-service'],
    enabled: true,
  },
  {
    id: 'skill_004',
    name: 'Content Repurposer',
    description: 'Repurposes content from YouTube videos to newsletter format and X threads.',
    trigger: 'manual',
    createdBy: 'self_improvement',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    usageCount: 12,
    successRate: 87,
    dependencies: ['youtube-api', 'content-generator'],
    enabled: true,
  },
  {
    id: 'skill_005',
    name: 'Competitor Video Monitor',
    description: 'Monitors competitor YouTube channels for outlier videos and trend opportunities.',
    trigger: 'scheduled',
    createdBy: 'self_improvement',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    lastUsed: new Date(Date.now() - 12 * 60 * 60 * 1000),
    usageCount: 8,
    successRate: 94,
    dependencies: ['youtube-api', 'trend-analyzer'],
    enabled: true,
  },
  {
    id: 'skill_006',
    name: 'Quick Deploy Script',
    description: 'Custom deployment script for staging environment.',
    trigger: 'manual',
    createdBy: 'user',
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    lastUsed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    usageCount: 24,
    successRate: 96,
    dependencies: ['vercel-api'],
    enabled: true,
  },
];
