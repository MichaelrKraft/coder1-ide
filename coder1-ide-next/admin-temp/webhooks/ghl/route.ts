/**
 * Go High Level Webhook Handler
 * Receives webhook events from GHL for contact updates, campaign events, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ghlService } from '@/services/gohighlevel-service';
import { logger } from '@/lib/logger';

// Store processed webhook IDs to prevent duplicates (use Redis/DB in production)
const processedWebhooks = new Set<string>();

export async function POST(request: NextRequest) {
  try {
    // Get webhook signature for verification
    const signature = request.headers.get('x-webhook-signature') || 
                      request.headers.get('x-ghl-signature') || '';
    
    // Parse webhook payload
    const payload = await request.json();
    
    // Log webhook receipt
    logger.info('GHL webhook received:', {
      type: payload.type || payload.event_type,
      webhookId: payload.webhook_id || payload.id,
    });

    // Verify signature (if configured)
    if (process.env.GHL_WEBHOOK_SECRET) {
      const isValid = ghlService.verifyWebhookSignature(payload, signature);
      if (!isValid) {
        logger.error('Invalid GHL webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // Check for duplicate webhooks
    const webhookId = payload.webhook_id || payload.id || `${payload.type}-${Date.now()}`;
    if (processedWebhooks.has(webhookId)) {
      logger.debug('Duplicate webhook, skipping:', webhookId);
      return NextResponse.json({ 
        success: true,
        message: 'Already processed' 
      });
    }

    // Process webhook asynchronously to respond quickly
    setImmediate(() => {
      processWebhookAsync(payload);
    });

    // Mark as processed
    processedWebhooks.add(webhookId);

    // Clean up old webhook IDs periodically (prevent memory leak)
    if (processedWebhooks.size > 1000) {
      const idsToKeep = Array.from(processedWebhooks).slice(-500);
      processedWebhooks.clear();
      idsToKeep.forEach(id => processedWebhooks.add(id));
    }

    // Always respond with 200 OK quickly
    return NextResponse.json({ 
      success: true,
      webhookId,
      message: 'Webhook received and queued for processing'
    });
  } catch (error) {
    logger.error('Failed to process GHL webhook:', error);
    
    // Still return 200 to prevent retries
    return NextResponse.json({ 
      success: false,
      error: 'Processing failed but acknowledged'
    });
  }
}

/**
 * Process webhook asynchronously
 */
async function processWebhookAsync(payload: any) {
  try {
    const eventType = payload.type || payload.event_type || payload.eventType;
    const data = payload.data || payload;

    logger.debug('Processing GHL webhook:', { eventType, data });

    switch (eventType) {
      case 'contact.create':
      case 'ContactCreate':
        await handleContactCreate(data);
        break;

      case 'contact.update':
      case 'ContactUpdate':
        await handleContactUpdate(data);
        break;

      case 'contact.delete':
      case 'ContactDelete':
        await handleContactDelete(data);
        break;

      case 'contact.tag_added':
      case 'ContactTagAdded':
        await handleContactTagAdded(data);
        break;

      case 'contact.tag_removed':
      case 'ContactTagRemoved':
        await handleContactTagRemoved(data);
        break;

      case 'opportunity.create':
      case 'OpportunityCreate':
        await handleOpportunityCreate(data);
        break;

      case 'opportunity.status_update':
      case 'OpportunityStatusUpdate':
        await handleOpportunityStatusUpdate(data);
        break;

      case 'appointment.scheduled':
      case 'AppointmentScheduled':
        await handleAppointmentScheduled(data);
        break;

      case 'email.opened':
      case 'EmailOpened':
        await handleEmailOpened(data);
        break;

      case 'email.clicked':
      case 'EmailClicked':
        await handleEmailClicked(data);
        break;

      case 'sms.replied':
      case 'SMSReplied':
        await handleSMSReplied(data);
        break;

      case 'form.submitted':
      case 'FormSubmitted':
        await handleFormSubmitted(data);
        break;

      default:
        logger.debug('Unhandled GHL webhook type:', eventType);
    }

    logger.info(`Successfully processed GHL webhook: ${eventType}`);
  } catch (error) {
    logger.error('Failed to process GHL webhook async:', error);
  }
}

// Webhook handlers

async function handleContactCreate(data: any) {
  logger.info('New GHL contact created:', data.email || data.id);
  
  // You might want to sync this back to your local database
  // For example, check if this contact has a CoderOne account
}

async function handleContactUpdate(data: any) {
  logger.info('GHL contact updated:', data.email || data.id);
  
  // Update local user data if needed
  // Check for subscription changes, tag updates, etc.
}

async function handleContactDelete(data: any) {
  logger.info('GHL contact deleted:', data.email || data.id);
  
  // Handle contact deletion if needed
  // Maybe mark user as inactive in local database
}

async function handleContactTagAdded(data: any) {
  logger.info('Tag added to contact:', {
    contactId: data.contact_id,
    tag: data.tag
  });
  
  // Handle tag-based automation
  // For example, if "Pro User" tag is added, update local subscription
}

async function handleContactTagRemoved(data: any) {
  logger.info('Tag removed from contact:', {
    contactId: data.contact_id,
    tag: data.tag
  });
}

async function handleOpportunityCreate(data: any) {
  logger.info('New opportunity created:', data);
  
  // Track sales pipeline events
  // Maybe notify sales team or update dashboards
}

async function handleOpportunityStatusUpdate(data: any) {
  logger.info('Opportunity status updated:', {
    opportunityId: data.opportunity_id,
    status: data.status,
    pipelineStage: data.pipeline_stage
  });
  
  // Handle pipeline stage changes
  // If "Won", might trigger pro account activation
}

async function handleAppointmentScheduled(data: any) {
  logger.info('Appointment scheduled:', {
    contactId: data.contact_id,
    appointmentDate: data.appointment_date
  });
  
  // Track user engagement
  // Maybe send reminder emails through CoderOne
}

async function handleEmailOpened(data: any) {
  logger.debug('Email opened:', {
    contactId: data.contact_id,
    campaignId: data.campaign_id
  });
  
  // Track email engagement metrics
  // Update user engagement score
}

async function handleEmailClicked(data: any) {
  logger.debug('Email link clicked:', {
    contactId: data.contact_id,
    link: data.clicked_url
  });
  
  // Track click-through rates
  // Maybe trigger follow-up automation
}

async function handleSMSReplied(data: any) {
  logger.info('SMS reply received:', {
    contactId: data.contact_id,
    message: data.message
  });
  
  // Handle SMS conversations
  // Maybe trigger AI response or alert support
}

async function handleFormSubmitted(data: any) {
  logger.info('Form submitted:', {
    contactId: data.contact_id,
    formId: data.form_id,
    fields: data.fields
  });
  
  // Process form submissions
  // Maybe create support tickets or trigger workflows
}

// Health check endpoint for webhook testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'healthy',
    service: 'GHL Webhook Handler',
    timestamp: new Date().toISOString(),
    processedCount: processedWebhooks.size,
    ghlServiceReady: ghlService.isReady()
  });
}