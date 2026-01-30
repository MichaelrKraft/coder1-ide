import { NextRequest, NextResponse } from 'next/server';
import type { Johnny5APIResponse } from '@/types/johnny5';

/**
 * User Profile for capability matching
 */
interface UserProfile {
  id: string;
  roles: string[];
  platforms: string[];
  projects: string[];
  goals: string[];
  preferences: {
    proactivityLevel: 'low' | 'medium' | 'high';
    notificationChannels: string[];
    workingHours?: { start: string; end: string };
  };
  extractedFrom: 'conversation' | 'manual' | 'integration';
  createdAt: Date;
  updatedAt: Date;
}

// Mock user profile (in real implementation, would be stored in database)
let userProfile: UserProfile = {
  id: 'user_001',
  roles: ['founder', 'developer', 'creator'],
  platforms: ['youtube', 'newsletter', 'twitter'],
  projects: ['Coder1 IDE', 'Creator Buddy SaaS'],
  goals: [
    'Build a successful SaaS',
    'Grow YouTube to 100K subscribers',
    'Automate repetitive tasks',
    'Ship faster with AI assistance',
  ],
  preferences: {
    proactivityLevel: 'medium',
    notificationChannels: ['panel', 'email'],
    workingHours: { start: '09:00', end: '18:00' },
  },
  extractedFrom: 'conversation',
  createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
};

/**
 * GET /api/johnny5/onboarding/profile
 *
 * Get the current user profile used for capability matching.
 */
export async function GET() {
  const response: Johnny5APIResponse<UserProfile> = {
    success: true,
    data: userProfile,
    timestamp: new Date(),
  };

  return NextResponse.json(response);
}

/**
 * POST /api/johnny5/onboarding/profile
 *
 * Update the user profile with new information.
 *
 * Request body:
 * - roles?: string[]
 * - platforms?: string[]
 * - projects?: string[]
 * - goals?: string[]
 * - preferences?: object
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Update profile fields
    if (Array.isArray(body.roles)) {
      userProfile.roles = [...new Set([...userProfile.roles, ...body.roles])];
    }
    if (Array.isArray(body.platforms)) {
      userProfile.platforms = [...new Set([...userProfile.platforms, ...body.platforms])];
    }
    if (Array.isArray(body.projects)) {
      userProfile.projects = [...new Set([...userProfile.projects, ...body.projects])];
    }
    if (Array.isArray(body.goals)) {
      userProfile.goals = [...new Set([...userProfile.goals, ...body.goals])];
    }
    if (body.preferences) {
      userProfile.preferences = {
        ...userProfile.preferences,
        ...body.preferences,
      };
    }

    userProfile.updatedAt = new Date();
    userProfile.extractedFrom = body.extractedFrom || 'manual';

    const response: Johnny5APIResponse<UserProfile> = {
      success: true,
      data: userProfile,
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
 * PATCH /api/johnny5/onboarding/profile
 *
 * Replace specific profile fields entirely.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // Replace profile fields (instead of merge)
    if (Array.isArray(body.roles)) {
      userProfile.roles = body.roles;
    }
    if (Array.isArray(body.platforms)) {
      userProfile.platforms = body.platforms;
    }
    if (Array.isArray(body.projects)) {
      userProfile.projects = body.projects;
    }
    if (Array.isArray(body.goals)) {
      userProfile.goals = body.goals;
    }
    if (body.preferences) {
      userProfile.preferences = body.preferences;
    }

    userProfile.updatedAt = new Date();

    const response: Johnny5APIResponse<UserProfile> = {
      success: true,
      data: userProfile,
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
