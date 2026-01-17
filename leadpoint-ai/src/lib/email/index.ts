/**
 * Email Module for LeadPoint.ai
 * Transactional email infrastructure using Resend
 *
 * Usage:
 * ```typescript
 * import { sendWelcomeEmail, sendPaymentFailedEmail, sendSubscriptionUpdatedEmail } from '@/lib/email';
 *
 * // Send welcome email
 * await sendWelcomeEmail({ email: 'user@example.com', name: 'John' });
 *
 * // Send payment failed email
 * await sendPaymentFailedEmail(
 *   { email: 'user@example.com', name: 'John' },
 *   { planName: 'Growth', amount: '99', currency: '$' }
 * );
 *
 * // Send subscription updated email
 * await sendSubscriptionUpdatedEmail(
 *   { email: 'user@example.com', name: 'John' },
 *   'starter',
 *   'growth',
 *   { newFeatures: ['Unlimited discoveries', 'Priority support'] }
 * );
 * ```
 */

// Client exports
export {
  sendEmail,
  isEmailAvailable,
  getFromEmail,
  type EmailContent,
  type SendEmailOptions,
  type SendEmailResult,
} from './client';

// High-level send functions
export {
  sendWelcomeEmail,
  sendPaymentFailedEmail,
  sendSubscriptionUpdatedEmail,
  type EmailUser,
} from './send';

// Template exports (for custom usage)
export {
  welcomeEmail,
  paymentFailedEmail,
  subscriptionUpdatedEmail,
  type WelcomeEmailData,
  type PaymentFailedEmailData,
  type SubscriptionUpdatedEmailData,
} from './templates';
