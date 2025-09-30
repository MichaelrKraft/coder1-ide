/**
 * GHL Workflow Triggers API
 * Allows triggering specific automation workflows in Go High Level
 */

import { NextRequest, NextResponse } from 'next/server';
import { ghlService } from '@/services/gohighlevel-service';
import { ghlUserSync } from '@/services/ghl-user-sync';
import { getUserById } from '@/lib/auth/db';
import { logger } from '@/lib/logger';
import { verifyToken } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { workflow, userId, metadata } = body;

    // Get user details
    const targetUserId = userId || payload.userId;
    const user = getUserById(targetUserId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get GHL contact
    const contact = await ghlService.getContactByEmail(user.email);
    if (!contact?.id) {
      return NextResponse.json(
        { error: 'User not synced with GHL' },
        { status: 400 }
      );
    }

    // Trigger specific workflows based on type
    let success = false;
    let message = '';

    switch (workflow) {
      case 'welcome':
        // Welcome email sequence
        success = await ghlService.triggerWorkflow(
          contact.id,
          process.env.GHL_WORKFLOW_ONBOARDING || 'onboarding',
          {
            username: user.username,
            email: user.email,
            ...metadata,
          }
        );
        message = 'Welcome sequence triggered';
        break;

      case 'pro-upgrade':
        // Pro upgrade celebration
        success = await ghlService.triggerWorkflow(
          contact.id,
          process.env.GHL_WORKFLOW_PRO_UPGRADE || 'pro-upgrade',
          {
            username: user.username,
            upgradeDate: new Date().toISOString(),
            ...metadata,
          }
        );
        message = 'Pro upgrade workflow triggered';
        break;

      case 'inactive-user':
        // Re-engagement for inactive users
        success = await ghlService.triggerWorkflow(
          contact.id,
          process.env.GHL_WORKFLOW_REENGAGEMENT || 're-engagement',
          {
            username: user.username,
            lastActive: user.last_login,
            ...metadata,
          }
        );
        message = 'Re-engagement workflow triggered';
        break;

      case 'milestone':
        // Milestone achievement (projects, usage, etc.)
        success = await ghlService.triggerWorkflow(
          contact.id,
          process.env.GHL_WORKFLOW_MILESTONE || 'milestone',
          {
            username: user.username,
            milestone: metadata?.milestone || 'Achievement',
            ...metadata,
          }
        );
        message = 'Milestone workflow triggered';
        break;

      case 'support':
        // Support ticket or help request
        success = await ghlService.triggerWorkflow(
          contact.id,
          process.env.GHL_WORKFLOW_SUPPORT || 'support',
          {
            username: user.username,
            issue: metadata?.issue || 'General inquiry',
            priority: metadata?.priority || 'normal',
            ...metadata,
          }
        );
        message = 'Support workflow triggered';
        break;

      case 'feature-announcement':
        // New feature announcement
        success = await ghlService.triggerWorkflow(
          contact.id,
          process.env.GHL_WORKFLOW_FEATURE || 'feature-announcement',
          {
            featureName: metadata?.featureName || 'New Feature',
            description: metadata?.description,
            ...metadata,
          }
        );
        message = 'Feature announcement sent';
        break;

      case 'survey':
        // User feedback survey
        success = await ghlService.triggerWorkflow(
          contact.id,
          process.env.GHL_WORKFLOW_SURVEY || 'survey',
          {
            surveyType: metadata?.surveyType || 'nps',
            ...metadata,
          }
        );
        message = 'Survey workflow triggered';
        break;

      default:
        return NextResponse.json(
          { error: 'Unknown workflow type' },
          { status: 400 }
        );
    }

    if (success) {
      // Track the workflow trigger
      await ghlService.trackActivity({
        contactId: contact.id,
        type: 'custom',
        description: `Workflow triggered: ${workflow}`,
        metadata: {
          workflow,
          triggeredBy: payload.email,
          timestamp: new Date().toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        message,
        workflow,
        contactId: contact.id,
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to trigger workflow' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Failed to trigger GHL workflow:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get available workflows
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Return available workflows
    const workflows = [
      {
        id: 'welcome',
        name: 'Welcome Sequence',
        description: 'Onboarding email series for new users',
        icon: '👋',
      },
      {
        id: 'pro-upgrade',
        name: 'Pro Upgrade Celebration',
        description: 'Congratulations and onboarding for Pro users',
        icon: '🎉',
      },
      {
        id: 'inactive-user',
        name: 'Re-engagement Campaign',
        description: 'Win back inactive users',
        icon: '🔄',
      },
      {
        id: 'milestone',
        name: 'Milestone Achievement',
        description: 'Celebrate user achievements',
        icon: '🏆',
      },
      {
        id: 'support',
        name: 'Support Request',
        description: 'Create support ticket and notify team',
        icon: '🆘',
      },
      {
        id: 'feature-announcement',
        name: 'Feature Announcement',
        description: 'Announce new features to users',
        icon: '✨',
      },
      {
        id: 'survey',
        name: 'Feedback Survey',
        description: 'Collect user feedback',
        icon: '📊',
      },
    ];

    return NextResponse.json({
      workflows,
      ghlEnabled: process.env.ENABLE_GHL_INTEGRATION === 'true',
      ghlConnected: ghlService.isReady(),
    });
  } catch (error) {
    logger.error('Failed to get workflows:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}