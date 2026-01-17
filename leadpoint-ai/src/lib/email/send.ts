/**
 * High-Level Email Send Functions
 * Combines templates with the email client for easy usage
 */

import { sendEmail, type SendEmailResult } from './client';
import {
  welcomeEmail,
  paymentFailedEmail,
  subscriptionUpdatedEmail,
  type WelcomeEmailData,
  type PaymentFailedEmailData,
  type SubscriptionUpdatedEmailData,
} from './templates';

/**
 * User data for email sending
 */
export interface EmailUser {
  email: string;
  name?: string | null;
}

/**
 * Send a welcome email to a new user
 */
export async function sendWelcomeEmail(user: EmailUser): Promise<SendEmailResult> {
  const data: WelcomeEmailData = {
    name: user.name || '',
    email: user.email,
  };

  const content = welcomeEmail(data);

  return sendEmail({
    to: user.email,
    subject: content.subject,
    html: content.html,
    text: content.text,
    tags: [
      { name: 'type', value: 'transactional' },
      { name: 'template', value: 'welcome' },
    ],
  });
}

/**
 * Send a payment failed notification email
 */
export async function sendPaymentFailedEmail(
  user: EmailUser,
  details: {
    planName: string;
    amount?: string;
    currency?: string;
    nextRetryDate?: string;
  }
): Promise<SendEmailResult> {
  const data: PaymentFailedEmailData = {
    name: user.name || '',
    email: user.email,
    planName: details.planName,
    amount: details.amount,
    currency: details.currency,
    nextRetryDate: details.nextRetryDate,
  };

  const content = paymentFailedEmail(data);

  return sendEmail({
    to: user.email,
    subject: content.subject,
    html: content.html,
    text: content.text,
    tags: [
      { name: 'type', value: 'transactional' },
      { name: 'template', value: 'payment-failed' },
    ],
  });
}

/**
 * Send a subscription updated notification email
 */
export async function sendSubscriptionUpdatedEmail(
  user: EmailUser,
  oldPlan: string,
  newPlan: string,
  options?: {
    effectiveDate?: string;
    newFeatures?: string[];
  }
): Promise<SendEmailResult> {
  // Determine if this is an upgrade based on plan hierarchy
  const planHierarchy = ['free', 'starter', 'growth', 'scale', 'enterprise'];
  const oldIndex = planHierarchy.indexOf(oldPlan.toLowerCase());
  const newIndex = planHierarchy.indexOf(newPlan.toLowerCase());
  const isUpgrade = newIndex > oldIndex;

  const data: SubscriptionUpdatedEmailData = {
    name: user.name || '',
    email: user.email,
    oldPlan,
    newPlan,
    isUpgrade,
    effectiveDate: options?.effectiveDate,
    newFeatures: options?.newFeatures,
  };

  const content = subscriptionUpdatedEmail(data);

  return sendEmail({
    to: user.email,
    subject: content.subject,
    html: content.html,
    text: content.text,
    tags: [
      { name: 'type', value: 'transactional' },
      { name: 'template', value: 'subscription-updated' },
      { name: 'change-type', value: isUpgrade ? 'upgrade' : 'downgrade' },
    ],
  });
}
