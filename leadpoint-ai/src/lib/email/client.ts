/**
 * Email Client for LeadPoint.ai
 * Handles transactional email sending with Resend
 * Supports mock mode when RESEND_API_KEY is not set
 */

import { Resend } from 'resend';

// Initialize Resend client only if API key is available
const resendClient = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * Email content structure
 */
export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

/**
 * Options for sending an email
 */
export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

/**
 * Result of sending an email
 */
export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  isMock: boolean;
  error?: string;
}

/**
 * Default sender email address
 */
const DEFAULT_FROM_EMAIL = 'noreply@leadpoint.ai';

/**
 * Get the configured sender email address
 */
export function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL;
}

/**
 * Check if email sending is available (API key configured)
 */
export function isEmailAvailable(): boolean {
  return resendClient !== null;
}

/**
 * Send an email using Resend
 * Falls back to logging when no API key is configured (mock mode)
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const fromEmail = getFromEmail();

  // Mock mode - log instead of sending
  if (!resendClient) {
    console.log('[Email Mock] Would send email:', {
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      tags: options.tags,
      textPreview: options.text.substring(0, 100) + '...',
    });

    return {
      success: true,
      messageId: `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      isMock: true,
    };
  }

  try {
    const { data, error } = await resendClient.emails.send({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      tags: options.tags,
    });

    if (error) {
      console.error('[Email] Resend API error:', error);
      return {
        success: false,
        isMock: false,
        error: error.message,
      };
    }

    console.log('[Email] Sent successfully:', {
      messageId: data?.id,
      to: options.to,
      subject: options.subject,
    });

    return {
      success: true,
      messageId: data?.id,
      isMock: false,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Email] Failed to send:', errorMessage);

    return {
      success: false,
      isMock: false,
      error: errorMessage,
    };
  }
}
