import { NextRequest, NextResponse } from 'next/server';
import { getProfile, saveProfile } from '@/lib/johnny5-db';
import { verifyAccessToken, extractTokenFromHeader } from '@/lib/auth/jwt';

/**
 * GET /api/johnny5/preferences
 *
 * Get user preferences from the database
 */
export async function GET(request: NextRequest) {
  try {
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

    const profile = await getProfile(userId);

    if (!profile) {
      return NextResponse.json({
        success: true,
        data: {
          preferences: {},
          roles: [],
          platforms: [],
          projects: [],
          goals: []
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        preferences: profile.preferences || {},
        roles: profile.roles || [],
        platforms: profile.platforms || [],
        projects: profile.projects || [],
        goals: profile.goals || []
      }
    });
  } catch (error) {
    console.error('[Johnny5 Preferences] Error getting preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get preferences' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/johnny5/preferences
 *
 * Save user preferences to the database.
 * Merges with existing preferences.
 *
 * Request body:
 * - preferences?: Record<string, any> - Personal preferences (favorite color, etc.)
 * - roles?: string[] - User roles
 * - platforms?: string[] - Platforms they use
 * - projects?: string[] - Their projects
 * - goals?: string[] - Their goals
 */
export async function POST(request: NextRequest) {
  try {
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

    // Get existing profile to merge with
    const existingProfile = await getProfile(userId);

    const updateData: Record<string, any> = {};

    // Merge preferences
    if (body.preferences) {
      const existingPrefs = existingProfile?.preferences || {};
      updateData.preferences = { ...existingPrefs, ...body.preferences };
    }

    // Merge arrays (add new items, remove duplicates)
    if (Array.isArray(body.roles)) {
      const existing = existingProfile?.roles || [];
      updateData.roles = [...new Set([...existing, ...body.roles])];
    }

    if (Array.isArray(body.platforms)) {
      const existing = existingProfile?.platforms || [];
      updateData.platforms = [...new Set([...existing, ...body.platforms])];
    }

    if (Array.isArray(body.projects)) {
      const existing = existingProfile?.projects || [];
      updateData.projects = [...new Set([...existing, ...body.projects])];
    }

    if (Array.isArray(body.goals)) {
      const existing = existingProfile?.goals || [];
      updateData.goals = [...new Set([...existing, ...body.goals])];
    }

    // Save to database
    await saveProfile(updateData, userId);

    // Get updated profile
    const updatedProfile = await getProfile(userId);

    return NextResponse.json({
      success: true,
      data: {
        preferences: updatedProfile?.preferences || {},
        roles: updatedProfile?.roles || [],
        platforms: updatedProfile?.platforms || [],
        projects: updatedProfile?.projects || [],
        goals: updatedProfile?.goals || []
      },
      message: 'Preferences saved successfully'
    });
  } catch (error) {
    console.error('[Johnny5 Preferences] Error saving preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save preferences' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/johnny5/preferences
 *
 * Clear a specific preference or all preferences
 *
 * Query params:
 * - key: string (optional) - Specific preference key to delete
 * - all: boolean (optional) - If true, clear all preferences
 */
export async function DELETE(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const clearAll = searchParams.get('all') === 'true';

    const existingProfile = await getProfile(userId);

    if (clearAll) {
      await saveProfile({ preferences: {} }, userId);
      return NextResponse.json({
        success: true,
        message: 'All preferences cleared'
      });
    }

    if (key && existingProfile?.preferences) {
      const newPrefs = { ...existingProfile.preferences };
      delete newPrefs[key];
      await saveProfile({ preferences: newPrefs }, userId);
      return NextResponse.json({
        success: true,
        message: `Preference '${key}' deleted`
      });
    }

    return NextResponse.json(
      { success: false, error: 'No key specified' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Johnny5 Preferences] Error deleting preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete preferences' },
      { status: 500 }
    );
  }
}
