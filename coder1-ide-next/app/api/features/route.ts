import { NextRequest, NextResponse } from 'next/server';
import { featureFlags, FEATURE_FLAGS } from '@/config/feature-flags';

/**
 * GET /api/features - Get all feature flag statuses
 */
export async function GET(request: NextRequest) {
  try {
    const statuses = featureFlags.getAllStatuses();
    
    return NextResponse.json({
      success: true,
      features: statuses,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get feature statuses:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve feature statuses'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/features - Enable or update a feature
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { feature, enabled, percentage, users, config } = body;
    
    if (!feature) {
      return NextResponse.json(
        {
          success: false,
          error: 'Feature name is required'
        },
        { status: 400 }
      );
    }
    
    if (enabled === false) {
      // Disable the feature
      await featureFlags.disableFeature(feature, body.reason);
    } else {
      // Enable or update the feature
      await featureFlags.enableFeature(feature, {
        percentage,
        users,
        config
      });
    }
    
    return NextResponse.json({
      success: true,
      feature,
      status: enabled === false ? 'disabled' : 'enabled',
      config: featureFlags.getConfig(feature)
    });
    
  } catch (error: any) {
    console.error('Failed to update feature:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update feature'
      },
      { status: 500 }
    );
  }
}