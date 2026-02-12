import { NextRequest, NextResponse } from 'next/server';
import type { Johnny5APIResponse } from '@/types/johnny5';
import { initializeDb, getProfile, saveProfile } from '@/lib/johnny5-db';
import { verifyAccessToken, extractTokenFromHeader } from '@/lib/auth/jwt';

/**
 * User Profile for capability matching
 * Now stored in SQLite database for persistence across deploys
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

/**
 * Get default profile for new users
 */
function getDefaultProfile(): UserProfile {
  return {
    id: 'user_default',
    roles: [],
    platforms: [],
    projects: [],
    goals: [],
    preferences: {
      proactivityLevel: 'medium',
      notificationChannels: ['panel'],
    },
    extractedFrom: 'manual',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Convert database profile to API profile format
 */
function dbProfileToApiProfile(dbProfile: Awaited<ReturnType<typeof getProfile>>): UserProfile | null {
  if (!dbProfile) return null;

  return {
    id: dbProfile.id,
    roles: dbProfile.roles || [],
    platforms: dbProfile.platforms || [],
    projects: dbProfile.projects || [],
    goals: dbProfile.goals || [],
    preferences: {
      proactivityLevel: dbProfile.proactivity_level || 'medium',
      notificationChannels: (dbProfile.preferences as Record<string, unknown>)?.notificationChannels as string[] || ['panel'],
      workingHours: (dbProfile.preferences as Record<string, unknown>)?.workingHours as { start: string; end: string } | undefined,
    },
    extractedFrom: ((dbProfile.preferences as Record<string, unknown>)?.extractedFrom as 'conversation' | 'manual' | 'integration') || 'manual',
    createdAt: new Date(dbProfile.created_at),
    updatedAt: new Date(dbProfile.updated_at),
  };
}

/**
 * GET /api/johnny5/onboarding/profile
 *
 * Get the current user profile used for capability matching.
 * Now reads from SQLite database for persistence.
 */
export async function GET(request: NextRequest) {
  try {
    await initializeDb();

    let userId = 'default';
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      const token = extractTokenFromHeader(authHeader);
      if (token) {
        const decoded = verifyAccessToken(token);
        if (decoded) {
          userId = decoded.userId;
        }
      }
    }

    const dbProfile = await getProfile(userId);
    const profile = dbProfileToApiProfile(dbProfile) || getDefaultProfile();

    const response: Johnny5APIResponse<UserProfile> = {
      success: true,
      data: profile,
      timestamp: new Date(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Johnny5 Profile] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get profile',
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/johnny5/onboarding/profile
 *
 * Update the user profile with new information (merge).
 * Now persists to SQLite database.
 */
export async function POST(request: NextRequest) {
  try {
    await initializeDb();

    let userId = 'default';
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      const token = extractTokenFromHeader(authHeader);
      if (token) {
        const decoded = verifyAccessToken(token);
        if (decoded) {
          userId = decoded.userId;
        }
      }
    }

    const body = await request.json();

    // Get existing profile or create default
    const existing = await getProfile(userId);
    const currentProfile = dbProfileToApiProfile(existing) || getDefaultProfile();

    // Merge arrays (add new items, keep existing)
    const updatedRoles = body.roles
      ? [...new Set([...currentProfile.roles, ...body.roles])]
      : currentProfile.roles;
    const updatedPlatforms = body.platforms
      ? [...new Set([...currentProfile.platforms, ...body.platforms])]
      : currentProfile.platforms;
    const updatedProjects = body.projects
      ? [...new Set([...currentProfile.projects, ...body.projects])]
      : currentProfile.projects;
    const updatedGoals = body.goals
      ? [...new Set([...currentProfile.goals, ...body.goals])]
      : currentProfile.goals;

    // Save to database
    await saveProfile({
      roles: updatedRoles,
      platforms: updatedPlatforms,
      projects: updatedProjects,
      goals: updatedGoals,
      proactivity_level: body.preferences?.proactivityLevel || currentProfile.preferences.proactivityLevel,
      preferences: {
        ...currentProfile.preferences,
        ...body.preferences,
        extractedFrom: body.extractedFrom || 'manual',
      },
    }, userId);

    // Fetch updated profile
    const updated = await getProfile(userId);
    const profile = dbProfileToApiProfile(updated) || getDefaultProfile();

    const response: Johnny5APIResponse<UserProfile> = {
      success: true,
      data: profile,
      timestamp: new Date(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Johnny5 Profile] POST error:', error);
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
 * Replace specific profile fields entirely (no merge).
 * Now persists to SQLite database.
 */
export async function PATCH(request: NextRequest) {
  try {
    await initializeDb();

    let userId = 'default';
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      const token = extractTokenFromHeader(authHeader);
      if (token) {
        const decoded = verifyAccessToken(token);
        if (decoded) {
          userId = decoded.userId;
        }
      }
    }

    const body = await request.json();

    // Save to database (replace mode)
    await saveProfile({
      roles: body.roles,
      platforms: body.platforms,
      projects: body.projects,
      goals: body.goals,
      proactivity_level: body.preferences?.proactivityLevel,
      preferences: body.preferences,
    }, userId);

    // Fetch updated profile
    const updated = await getProfile(userId);
    const profile = dbProfileToApiProfile(updated) || getDefaultProfile();

    const response: Johnny5APIResponse<UserProfile> = {
      success: true,
      data: profile,
      timestamp: new Date(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Johnny5 Profile] PATCH error:', error);
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
