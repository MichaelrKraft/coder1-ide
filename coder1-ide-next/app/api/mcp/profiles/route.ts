/**
 * MCP Profiles API Route
 *
 * GET - List all profiles
 * POST - Create a new profile or apply existing profile
 * DELETE - Delete a profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { mcpProfileManager } from '@/services/mcp/MCPProfileManager';
import type {
  MCPProfileListResponse,
  MCPProfileCreateRequest,
  MCPProfileApplyRequest,
  MCPProfileApplyResponse,
} from '@/shared/types/mcp.types';

/**
 * GET /api/mcp/profiles
 * List all profiles with match percentages
 */
export async function GET() {
  try {
    const { profiles, activeProfileId } = await mcpProfileManager.listProfiles();

    // Calculate match percentages for each profile
    const profilesWithMatch = await Promise.all(
      profiles.map(async profile => ({
        ...profile,
        matchPercentage: await mcpProfileManager.calculateMatchPercentage(profile.id),
      }))
    );

    const response: MCPProfileListResponse & { profiles: (typeof profilesWithMatch)[number][] } = {
      profiles: profilesWithMatch,
      activeProfileId,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[MCP Profiles API] Error listing profiles:', error);
    return NextResponse.json(
      { error: 'Failed to list profiles', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mcp/profiles
 * Create a new profile or apply existing profile
 *
 * Body variants:
 * - { action: 'create', name, description?, servers?, tags? } - Create new profile
 * - { action: 'apply', profileId } - Apply existing profile
 * - { action: 'save-current', name, description? } - Save current config as profile
 * - { action: 'create-defaults' } - Create default profiles
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || 'create';

    switch (action) {
      case 'create': {
        const createReq = body as MCPProfileCreateRequest & { action: string };
        if (!createReq.name) {
          return NextResponse.json(
            { error: 'Profile name is required' },
            { status: 400 }
          );
        }

        const profile = await mcpProfileManager.createProfile({
          name: createReq.name,
          description: createReq.description,
          servers: createReq.servers,
          tags: createReq.tags,
        });

        return NextResponse.json({ success: true, profile });
      }

      case 'apply': {
        const applyReq = body as MCPProfileApplyRequest & { action: string };
        if (!applyReq.profileId) {
          return NextResponse.json(
            { error: 'Profile ID is required' },
            { status: 400 }
          );
        }

        const result = await mcpProfileManager.applyProfile(applyReq.profileId);
        const appliedProfile = await mcpProfileManager.getProfile(applyReq.profileId);

        const response: MCPProfileApplyResponse = {
          success: true,
          appliedProfile: appliedProfile!,
          changedServers: result.changedServers,
          backupId: result.backupId,
        };

        return NextResponse.json(response);
      }

      case 'save-current': {
        const saveReq = body as { action: string; name: string; description?: string };
        if (!saveReq.name) {
          return NextResponse.json(
            { error: 'Profile name is required' },
            { status: 400 }
          );
        }

        const profile = await mcpProfileManager.saveCurrentAsProfile(
          saveReq.name,
          saveReq.description
        );

        return NextResponse.json({ success: true, profile });
      }

      case 'create-defaults': {
        const profiles = await mcpProfileManager.createDefaultProfiles();
        return NextResponse.json({ success: true, profiles });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[MCP Profiles API] Error:', error);
    return NextResponse.json(
      { error: 'Profile operation failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mcp/profiles?id=<profileId>
 * Delete a profile
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('id');

    if (!profileId) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      );
    }

    const success = await mcpProfileManager.deleteProfile(profileId);

    if (!success) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[MCP Profiles API] Error deleting profile:', error);
    return NextResponse.json(
      { error: 'Failed to delete profile', details: (error as Error).message },
      { status: 500 }
    );
  }
}
