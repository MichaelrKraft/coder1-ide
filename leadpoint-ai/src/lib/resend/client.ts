/**
 * Resend Email Client for LeadPoint.ai
 * Handles email sending with proper error handling and mock mode support
 */

import { Resend } from 'resend';

// Initialize Resend client only if API key is available
export const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * Options for sending an email
 */
export interface SendEmailOptions {
  /** Recipient email address */
  to: string;
  /** Email subject line */
  subject: string;
  /** HTML content of the email */
  html: string;
  /** Optional reply-to address */
  replyTo?: string;
  /** Optional tags for tracking and analytics */
  tags?: { name: string; value: string }[];
}

/**
 * Result of sending an email
 */
export interface SendEmailResult {
  /** The message ID from Resend */
  messageId: string;
  /** Whether this was sent in mock mode */
  isMock?: boolean;
}

/**
 * Send an email using Resend
 * Falls back to mock mode if no API key is configured
 * 
 * @param options - Email options including recipient, subject, and content
 * @returns The message ID and mock status
 * @throws Error if the email fails to send
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  // Mock mode when no API key is available
  if (!resend) {
    console.warn('[Resend] No API key found, using mock mode');
    console.log('[Resend Mock] Would send email:', {
      to: options.to,
      subject: options.subject,
      tags: options.tags,
    });
    return { 
      messageId: `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      isMock: true,
    };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'outreach@example.com';

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
      reply_to: options.replyTo,
      tags: options.tags,
    });

    if (error) {
      console.error('[Resend] Error sending email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    if (!data?.id) {
      throw new Error('No message ID returned from Resend');
    }

    console.log('[Resend] Email sent successfully:', data.id);
    return { messageId: data.id };
  } catch (err) {
    // Re-throw Resend errors
    if (err instanceof Error && err.message.startsWith('Failed to send email')) {
      throw err;
    }
    // Wrap unexpected errors
    console.error('[Resend] Unexpected error:', err);
    throw new Error(`Failed to send email: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * Check if Resend is properly configured and available
 * 
 * @returns true if Resend API key is configured
 */
export function isResendAvailable(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Get the configured sender email address
 * 
 * @returns The sender email from environment or default
 */
export function getSenderEmail(): string {
  return process.env.RESEND_FROM_EMAIL || 'outreach@example.com';
}
