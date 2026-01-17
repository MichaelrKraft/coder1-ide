/**
 * Payment Failed Email Template
 * Sent when a subscription payment fails
 */

import type { EmailContent } from '../client';

export interface PaymentFailedEmailData {
  name: string;
  email: string;
  planName: string;
  amount?: string;
  currency?: string;
  nextRetryDate?: string;
  updatePaymentUrl?: string;
}

/**
 * Generate payment failed email content
 */
export function paymentFailedEmail(data: PaymentFailedEmailData): EmailContent {
  const { name, planName, amount, currency, nextRetryDate } = data;
  const displayName = name || 'there';
  const displayAmount = amount && currency ? `${currency}${amount}` : null;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.leadpoint.ai';
  const updatePaymentUrl = data.updatePaymentUrl || `${appUrl}/settings/billing`;

  const subject = 'Action Required: Payment Failed for Your Subscription';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Failed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Payment Failed</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 24px 0; color: #18181b; font-size: 24px; font-weight: 600;">Hi ${displayName},</h2>
              
              <p style="margin: 0 0 16px 0; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                We were unable to process your payment for your <strong>${planName}</strong> subscription${displayAmount ? ` (${displayAmount})` : ''}.
              </p>
              
              <p style="margin: 0 0 16px 0; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                This can happen for several reasons:
              </p>
              
              <ul style="margin: 0 0 24px 0; padding-left: 24px; color: #3f3f46; font-size: 16px; line-height: 1.8;">
                <li>Card has expired</li>
                <li>Insufficient funds</li>
                <li>Card was declined by your bank</li>
              </ul>
              
              ${nextRetryDate ? `
              <p style="margin: 0 0 16px 0; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                We'll automatically retry the payment on <strong>${nextRetryDate}</strong>.
              </p>
              ` : ''}
              
              <p style="margin: 0 0 24px 0; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                To avoid any interruption to your service, please update your payment method:
              </p>
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 32px 0;">
                <tr>
                  <td style="background-color: #dc2626; border-radius: 6px;">
                    <a href="${updatePaymentUrl}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">Update Payment Method</a>
                  </td>
                </tr>
              </table>
              
              <div style="margin: 24px 0; padding: 16px; background-color: #fef2f2; border-radius: 6px; border-left: 4px solid #dc2626;">
                <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6;">
                  <strong>Important:</strong> If payment continues to fail, your subscription will be canceled and you'll lose access to premium features.
                </p>
              </div>
              
              <p style="margin: 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                Need help? Reply to this email and our support team will assist you.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; color: #a1a1aa; font-size: 12px; text-align: center;">
                LeadPoint.ai - AI-Powered Lead Discovery
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Hi ${displayName},

We were unable to process your payment for your ${planName} subscription${displayAmount ? ` (${displayAmount})` : ''}.

This can happen for several reasons:
- Card has expired
- Insufficient funds
- Card was declined by your bank

${nextRetryDate ? `We'll automatically retry the payment on ${nextRetryDate}.\n\n` : ''}To avoid any interruption to your service, please update your payment method:
${updatePaymentUrl}

IMPORTANT: If payment continues to fail, your subscription will be canceled and you'll lose access to premium features.

Need help? Reply to this email and our support team will assist you.

---
LeadPoint.ai - AI-Powered Lead Discovery
  `.trim();

  return { subject, html, text };
}
