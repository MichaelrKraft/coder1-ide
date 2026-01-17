/**
 * Welcome Email Template
 * Sent to new users when they sign up
 */

import type { EmailContent } from '../client';

export interface WelcomeEmailData {
  name: string;
  email: string;
}

/**
 * Generate welcome email content
 */
export function welcomeEmail(data: WelcomeEmailData): EmailContent {
  const { name } = data;
  const displayName = name || 'there';

  const subject = 'Welcome to LeadPoint.ai!';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to LeadPoint.ai</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">LeadPoint.ai</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 24px 0; color: #18181b; font-size: 24px; font-weight: 600;">Welcome, ${displayName}!</h2>

              <p style="margin: 0 0 16px 0; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                Thank you for joining LeadPoint.ai. We're excited to help you discover and connect with qualified leads for your business.
              </p>
              
              <p style="margin: 0 0 24px 0; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                Here's what you can do next:
              </p>
              
              <ul style="margin: 0 0 24px 0; padding-left: 24px; color: #3f3f46; font-size: 16px; line-height: 1.8;">
                <li><strong>Discover Leads</strong> - Use our AI-powered search to find qualified prospects in your target market</li>
                <li><strong>Create Campaigns</strong> - Set up outreach campaigns with personalized messaging</li>
                <li><strong>Track Performance</strong> - Monitor engagement and campaign results</li>
              </ul>
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 32px 0;">
                <tr>
                  <td style="background-color: #7c3aed; border-radius: 6px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.leadpoint.ai'}/dashboard" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">Get Started</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                If you have any questions, just reply to this email. We're here to help!
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
Welcome to LeadPoint.ai, ${displayName}!

Thank you for joining us. We're excited to help you discover and connect with qualified leads for your business.

Here's what you can do next:
- Discover Leads: Use our AI-powered search to find qualified prospects in your target market
- Create Campaigns: Set up outreach campaigns with personalized messaging
- Track Performance: Monitor engagement and campaign results

Get started at: ${process.env.NEXT_PUBLIC_APP_URL || 'https://app.leadpoint.ai'}/dashboard

If you have any questions, just reply to this email. We're here to help!

---
LeadPoint.ai - AI-Powered Lead Discovery
  `.trim();

  return { subject, html, text };
}
