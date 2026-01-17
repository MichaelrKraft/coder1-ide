/**
 * Subscription Updated Email Template
 * Sent when a user's subscription plan changes
 */

import type { EmailContent } from '../client';

export interface SubscriptionUpdatedEmailData {
  name: string;
  email: string;
  oldPlan: string;
  newPlan: string;
  isUpgrade: boolean;
  effectiveDate?: string;
  newFeatures?: string[];
}

/**
 * Format plan name for display
 */
function formatPlanName(plan: string): string {
  const planNames: Record<string, string> = {
    free: 'Free',
    starter: 'Starter',
    growth: 'Growth',
    scale: 'Scale',
    enterprise: 'Enterprise',
  };
  return planNames[plan.toLowerCase()] || plan;
}

/**
 * Generate subscription updated email content
 */
export function subscriptionUpdatedEmail(data: SubscriptionUpdatedEmailData): EmailContent {
  const { name, oldPlan, newPlan, isUpgrade, effectiveDate, newFeatures } = data;
  const displayName = name || 'there';
  const oldPlanFormatted = formatPlanName(oldPlan);
  const newPlanFormatted = formatPlanName(newPlan);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.leadpoint.ai';

  const subject = isUpgrade
    ? `You've Upgraded to ${newPlanFormatted}!`
    : `Your Plan Has Changed to ${newPlanFormatted}`;

  const headerColor = isUpgrade
    ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
    : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)';

  const headerTitle = isUpgrade ? 'Upgrade Confirmed!' : 'Plan Updated';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Updated</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: ${headerColor}; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">${headerTitle}</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 24px 0; color: #18181b; font-size: 24px; font-weight: 600;">Hi ${displayName},</h2>
              
              ${isUpgrade ? `
              <p style="margin: 0 0 16px 0; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                Great news! Your subscription has been upgraded from <strong>${oldPlanFormatted}</strong> to <strong>${newPlanFormatted}</strong>.
              </p>
              ` : `
              <p style="margin: 0 0 16px 0; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                Your subscription has been changed from <strong>${oldPlanFormatted}</strong> to <strong>${newPlanFormatted}</strong>.
              </p>
              `}
              
              ${effectiveDate ? `
              <p style="margin: 0 0 16px 0; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                This change is effective as of <strong>${effectiveDate}</strong>.
              </p>
              ` : ''}
              
              <!-- Plan Change Summary -->
              <div style="margin: 24px 0; padding: 20px; background-color: #f4f4f5; border-radius: 8px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="width: 45%; text-align: center; padding: 10px;">
                      <p style="margin: 0 0 4px 0; color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Previous Plan</p>
                      <p style="margin: 0; color: #3f3f46; font-size: 18px; font-weight: 600;">${oldPlanFormatted}</p>
                    </td>
                    <td style="width: 10%; text-align: center; padding: 10px;">
                      <span style="color: #a1a1aa; font-size: 24px;">&rarr;</span>
                    </td>
                    <td style="width: 45%; text-align: center; padding: 10px;">
                      <p style="margin: 0 0 4px 0; color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">New Plan</p>
                      <p style="margin: 0; color: ${isUpgrade ? '#059669' : '#7c3aed'}; font-size: 18px; font-weight: 600;">${newPlanFormatted}</p>
                    </td>
                  </tr>
                </table>
              </div>
              
              ${newFeatures && newFeatures.length > 0 ? `
              <p style="margin: 24px 0 16px 0; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                ${isUpgrade ? 'You now have access to:' : 'Your plan includes:'}
              </p>
              
              <ul style="margin: 0 0 24px 0; padding-left: 24px; color: #3f3f46; font-size: 16px; line-height: 1.8;">
                ${newFeatures.map(feature => `<li>${feature}</li>`).join('\n                ')}
              </ul>
              ` : ''}
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 32px 0;">
                <tr>
                  <td style="background-color: #7c3aed; border-radius: 6px;">
                    <a href="${appUrl}/dashboard" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">Go to Dashboard</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                Have questions about your new plan? Reply to this email or visit our <a href="${appUrl}/settings/billing" style="color: #7c3aed; text-decoration: none;">billing settings</a>.
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

${isUpgrade
    ? `Great news! Your subscription has been upgraded from ${oldPlanFormatted} to ${newPlanFormatted}.`
    : `Your subscription has been changed from ${oldPlanFormatted} to ${newPlanFormatted}.`}

${effectiveDate ? `This change is effective as of ${effectiveDate}.\n` : ''}
Plan Change Summary:
${oldPlanFormatted} -> ${newPlanFormatted}

${newFeatures && newFeatures.length > 0
    ? `${isUpgrade ? 'You now have access to:' : 'Your plan includes:'}\n${newFeatures.map(f => `- ${f}`).join('\n')}\n`
    : ''}
Go to your dashboard: ${appUrl}/dashboard

Have questions about your new plan? Reply to this email or visit your billing settings at ${appUrl}/settings/billing.

---
LeadPoint.ai - AI-Powered Lead Discovery
  `.trim();

  return { subject, html, text };
}
