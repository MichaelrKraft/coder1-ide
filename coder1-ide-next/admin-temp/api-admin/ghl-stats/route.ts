/**
 * Admin API - Go High Level Statistics
 * Provides CRM statistics and engagement metrics from GHL
 */

import { NextRequest, NextResponse } from 'next/server';
import { ghlService } from '@/services/gohighlevel-service';
import { logger } from '@/lib/logger';
import { verifyToken } from '@/lib/auth/jwt';

// Admin check (reuse from users route in production)
async function isAdmin(request: NextRequest): Promise<boolean> {
  try {
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) return false;

    const payload = verifyToken(token);
    if (!payload) return false;

    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',');
    return adminEmails.includes(payload.email);
  } catch (error) {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    if (!await isAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if GHL is enabled
    if (process.env.ENABLE_GHL_INTEGRATION !== 'true' || !ghlService.isReady()) {
      return NextResponse.json({
        enabled: false,
        message: 'GHL integration not enabled or not configured',
      });
    }

    // Get GHL statistics
    const stats = await ghlService.getContactStats();

    // Get recent contacts (last 10)
    const recentContacts = await ghlService.getAllContacts(10, 0);

    // Prepare response
    const response = {
      enabled: true,
      connectionStatus: ghlService.isReady() ? 'connected' : 'disconnected',
      statistics: stats,
      recentContacts: recentContacts.map(contact => ({
        email: contact.email,
        name: contact.name,
        tags: contact.tags,
        dateAdded: contact.dateAdded,
      })),
      configuration: {
        locationId: process.env.GHL_LOCATION_ID ? 'configured' : 'not configured',
        webhookUrl: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/webhooks/ghl`,
        autoSync: process.env.ENABLE_GHL_AUTO_SYNC === 'true',
        emailCampaigns: process.env.ENABLE_GHL_EMAIL_CAMPAIGNS === 'true',
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to get GHL statistics:', error);
    return NextResponse.json(
      { 
        enabled: true,
        error: 'Failed to fetch GHL statistics',
        details: error.message,
      },
      { status: 500 }
    );
  }
}