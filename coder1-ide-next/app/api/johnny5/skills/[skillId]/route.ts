import { NextRequest, NextResponse } from 'next/server';
import type { Johnny5Skill, Johnny5APIResponse } from '@/types/johnny5';

/**
 * GET /api/johnny5/skills/[skillId]
 *
 * Get a specific skill by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { skillId: string } }
) {
  const { skillId } = params;
  const skill = MOCK_SKILLS.find((s) => s.id === skillId);

  if (!skill) {
    return NextResponse.json(
      {
        success: false,
        error: 'Skill not found',
        timestamp: new Date(),
      },
      { status: 404 }
    );
  }

  const response: Johnny5APIResponse<Johnny5Skill> = {
    success: true,
    data: skill,
    timestamp: new Date(),
  };

  return NextResponse.json(response);
}

/**
 * PATCH /api/johnny5/skills/[skillId]
 *
 * Update a skill. Used for enabling/disabling, editing, etc.
 *
 * Request body (all optional):
 * - enabled: boolean
 * - name: string
 * - description: string
 * - trigger: string
 * - dependencies: string[]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { skillId: string } }
) {
  const { skillId } = params;
  const skillIndex = MOCK_SKILLS.findIndex((s) => s.id === skillId);

  if (skillIndex === -1) {
    return NextResponse.json(
      {
        success: false,
        error: 'Skill not found',
        timestamp: new Date(),
      },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const skill = MOCK_SKILLS[skillIndex];

    // Update allowed fields
    if (typeof body.enabled === 'boolean') {
      skill.enabled = body.enabled;
    }
    if (body.name) {
      skill.name = body.name;
    }
    if (body.description) {
      skill.description = body.description;
    }
    if (body.trigger) {
      skill.trigger = body.trigger;
    }
    if (Array.isArray(body.dependencies)) {
      skill.dependencies = body.dependencies;
    }
    if (body.code !== undefined) {
      skill.code = body.code;
    }

    const response: Johnny5APIResponse<Johnny5Skill> = {
      success: true,
      data: skill,
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

/**
 * DELETE /api/johnny5/skills/[skillId]
 *
 * Delete a skill. Only user-created skills can be deleted.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { skillId: string } }
) {
  const { skillId } = params;
  const skillIndex = MOCK_SKILLS.findIndex((s) => s.id === skillId);

  if (skillIndex === -1) {
    return NextResponse.json(
      {
        success: false,
        error: 'Skill not found',
        timestamp: new Date(),
      },
      { status: 404 }
    );
  }

  const skill = MOCK_SKILLS[skillIndex];

  // Prevent deletion of system skills
  if (skill.createdBy === 'system') {
    return NextResponse.json(
      {
        success: false,
        error: 'Cannot delete system skills',
        timestamp: new Date(),
      },
      { status: 403 }
    );
  }

  // Remove skill from array
  MOCK_SKILLS.splice(skillIndex, 1);

  const response: Johnny5APIResponse<{ deleted: true; skillId: string }> = {
    success: true,
    data: { deleted: true, skillId },
    timestamp: new Date(),
  };

  return NextResponse.json(response);
}

// ================================================================================
// Mock Data (shared with main route - in real impl, use database)
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
