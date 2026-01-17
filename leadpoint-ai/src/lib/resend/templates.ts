/**
 * Email Templates for LeadPoint.ai
 * Provides HTML wrapping and subject line generation for outreach emails
 */

/**
 * Wrap email body in a responsive HTML template
 * 
 * @param body - The email body content (can contain newlines)
 * @param campaignInfluencerId - ID for tracking purposes
 * @returns Complete HTML email content
 */
export function wrapEmailHtml(body: string, campaignInfluencerId: string): string {
  // Convert newlines to HTML breaks and sanitize basic content
  const htmlBody = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Message</title>
  <style>
    /* Reset styles */
    body, html {
      margin: 0;
      padding: 0;
      width: 100%;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    
    /* Main container */
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #1a1a1a;
      background-color: #ffffff;
    }
    
    /* Content wrapper */
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    
    /* Typography */
    p {
      margin: 0 0 16px 0;
    }
    
    /* Links */
    a {
      color: #0066cc;
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    /* Responsive adjustments */
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        padding: 15px;
      }
      
      body {
        font-size: 15px;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    ${htmlBody}
  </div>
  <!-- Tracking pixel placeholder for Resend webhooks -->
  <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" 
       alt="" 
       width="1" 
       height="1" 
       style="display:none;" 
       data-campaign-influencer-id="${campaignInfluencerId}" />
</body>
</html>
  `.trim();
}

/**
 * Subject line variants for different outreach contexts
 */
export type SubjectVariant = 'collab' | 'opportunity' | 'partnership' | 'followup' | 'custom';

/**
 * Generate a subject line for outreach emails
 * 
 * @param campaignName - Name of the campaign or product
 * @param influencerName - Display name of the influencer
 * @param variant - Type of subject line to generate
 * @returns Generated subject line
 */
export function generateSubject(
  campaignName: string, 
  influencerName: string,
  variant: SubjectVariant = 'collab'
): string {
  const subjects: Record<SubjectVariant, string> = {
    collab: `Collab opportunity – ${campaignName}`,
    opportunity: `Quick question for ${influencerName}`,
    partnership: `Partnership idea for your content`,
    followup: `Following up – ${campaignName}`,
    custom: `${campaignName} x ${influencerName}`,
  };
  
  return subjects[variant];
}

/**
 * Generate personalized subject lines based on influencer data
 * 
 * @param params - Parameters for generating the subject
 * @returns Array of subject line options
 */
export function generateSubjectOptions(params: {
  campaignName: string;
  influencerName: string;
  niche?: string;
  followerCount?: number;
}): string[] {
  const { campaignName, influencerName, niche } = params;
  
  const options: string[] = [
    `Collab opportunity – ${campaignName}`,
    `Quick question for ${influencerName}`,
    `Partnership idea for your content`,
  ];
  
  if (niche) {
    options.push(`${niche} collaboration opportunity`);
  }
  
  options.push(
    `Let's create something amazing together`,
    `Opportunity for ${influencerName}`,
  );
  
  return options;
}

/**
 * Create a plain text version of the email for fallback
 * 
 * @param body - The email body content
 * @returns Plain text version
 */
export function createPlainText(body: string): string {
  return body
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .trim();
}

/**
 * Generate a preview snippet for the email
 * 
 * @param body - The email body content
 * @param maxLength - Maximum length of the preview (default 150)
 * @returns Preview snippet
 */
export function generatePreview(body: string, maxLength: number = 150): string {
  const plainText = createPlainText(body);
  
  if (plainText.length <= maxLength) {
    return plainText;
  }
  
  // Cut at last space before maxLength
  const truncated = plainText.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return `${truncated.substring(0, lastSpace > 0 ? lastSpace : maxLength)}...`;
}
