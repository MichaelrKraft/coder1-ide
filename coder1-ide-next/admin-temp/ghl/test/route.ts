/**
 * GHL Integration Test Endpoint
 * Tests the connection and basic functionality of Go High Level integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { ghlService } from '@/services/gohighlevel-service';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const results = {
      timestamp: new Date().toISOString(),
      environment: {
        enabled: process.env.ENABLE_GHL_INTEGRATION === 'true',
        hasApiKey: !!process.env.GHL_API_KEY,
        hasClientId: !!process.env.GHL_CLIENT_ID,
        hasLocationId: !!process.env.GHL_LOCATION_ID,
        hasWebhookSecret: !!process.env.GHL_WEBHOOK_SECRET,
      },
      service: {
        initialized: ghlService.isReady(),
        connectionTest: false,
      },
      tests: {
        connection: { status: 'pending', message: '' },
        createContact: { status: 'pending', message: '' },
        retrieveContact: { status: 'pending', message: '' },
        trackActivity: { status: 'pending', message: '' },
        webhookEndpoint: { status: 'pending', message: '' },
      },
    };

    // Check if integration is enabled
    if (!results.environment.enabled) {
      return NextResponse.json({
        ...results,
        message: 'GHL integration is disabled. Set ENABLE_GHL_INTEGRATION=true in .env.local',
      });
    }

    // Check required credentials
    if (!results.environment.hasApiKey && !results.environment.hasClientId) {
      return NextResponse.json({
        ...results,
        message: 'Missing GHL credentials. Please configure GHL_API_KEY or GHL_CLIENT_ID/SECRET in .env.local',
      });
    }

    // Test 1: Connection
    try {
      const connected = await ghlService.testConnection();
      results.service.connectionTest = connected;
      results.tests.connection = {
        status: connected ? 'success' : 'failed',
        message: connected ? 'Successfully connected to GHL' : 'Failed to connect to GHL',
      };
    } catch (error) {
      results.tests.connection = {
        status: 'error',
        message: `Connection test error: ${error.message}`,
      };
    }

    // Test 2: Create test contact
    const testEmail = `test-${Date.now()}@coderone-test.com`;
    let testContactId: string | null = null;

    try {
      testContactId = await ghlService.upsertContact({
        email: testEmail,
        name: 'Test User',
        firstName: 'Test',
        lastName: 'User',
        tags: ['Test Contact', 'Integration Test'],
        customFields: {
          testField: 'This is a test contact',
          createdAt: new Date().toISOString(),
        },
        source: 'CoderOne Test',
      });

      results.tests.createContact = {
        status: testContactId ? 'success' : 'failed',
        message: testContactId ? `Created test contact: ${testContactId}` : 'Failed to create contact',
      };
    } catch (error) {
      results.tests.createContact = {
        status: 'error',
        message: `Create contact error: ${error.message}`,
      };
    }

    // Test 3: Retrieve contact
    if (testContactId) {
      try {
        const retrievedContact = await ghlService.getContactByEmail(testEmail);
        results.tests.retrieveContact = {
          status: retrievedContact ? 'success' : 'failed',
          message: retrievedContact 
            ? `Retrieved contact: ${retrievedContact.email}` 
            : 'Failed to retrieve contact',
        };
      } catch (error) {
        results.tests.retrieveContact = {
          status: 'error',
          message: `Retrieve contact error: ${error.message}`,
        };
      }
    } else {
      results.tests.retrieveContact = {
        status: 'skipped',
        message: 'Skipped - no test contact created',
      };
    }

    // Test 4: Track activity
    if (testContactId) {
      try {
        const tracked = await ghlService.trackActivity({
          contactId: testContactId,
          type: 'custom',
          description: 'Integration test activity',
          metadata: {
            test: true,
            timestamp: new Date().toISOString(),
          },
        });

        results.tests.trackActivity = {
          status: tracked ? 'success' : 'failed',
          message: tracked ? 'Activity tracked successfully' : 'Failed to track activity',
        };
      } catch (error) {
        results.tests.trackActivity = {
          status: 'error',
          message: `Track activity error: ${error.message}`,
        };
      }
    } else {
      results.tests.trackActivity = {
        status: 'skipped',
        message: 'Skipped - no test contact created',
      };
    }

    // Test 5: Webhook endpoint
    try {
      const webhookUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/webhooks/ghl`;
      const webhookResponse = await fetch(webhookUrl);
      
      results.tests.webhookEndpoint = {
        status: webhookResponse.ok ? 'success' : 'failed',
        message: webhookResponse.ok 
          ? `Webhook endpoint active at: ${webhookUrl}`
          : `Webhook endpoint not responding: ${webhookResponse.status}`,
      };
    } catch (error) {
      results.tests.webhookEndpoint = {
        status: 'error',
        message: `Webhook test error: ${error.message}`,
      };
    }

    // Clean up test contact (optional - you might want to keep for verification)
    // if (testContactId) {
    //   try {
    //     await ghlService.deleteContact(testContactId);
    //   } catch (error) {
    //     // Ignore cleanup errors
    //   }
    // }

    // Calculate overall status
    const testStatuses = Object.values(results.tests);
    const successCount = testStatuses.filter(t => t.status === 'success').length;
    const failedCount = testStatuses.filter(t => t.status === 'failed' || t.status === 'error').length;

    return NextResponse.json({
      ...results,
      summary: {
        totalTests: testStatuses.length,
        passed: successCount,
        failed: failedCount,
        status: failedCount === 0 ? 'success' : failedCount < testStatuses.length ? 'partial' : 'failed',
        message: failedCount === 0 
          ? '✅ All GHL integration tests passed!' 
          : `⚠️ ${failedCount} test(s) failed. Check the results above.`,
      },
      nextSteps: [
        'Add your GHL API credentials to .env.local',
        'Configure your GHL location ID',
        'Set up webhooks in GHL pointing to: /api/webhooks/ghl',
        'Create automation workflows in GHL',
        'Test with real user registrations',
      ],
    });
  } catch (error) {
    logger.error('GHL test endpoint error:', error);
    return NextResponse.json(
      {
        error: 'Test failed',
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}