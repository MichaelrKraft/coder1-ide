/**
 * Discord Webhook Helper
 *
 * Simple fetch-based utility for posting messages and embeds to Discord
 * incoming webhooks. No SDK required — just a webhook URL.
 *
 * Usage:
 *   await postEmbedToDiscord(process.env.DISCORD_WEBHOOK_RESEARCH!, embed);
 */

// ============================================================================
// Types
// ============================================================================

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbedFooter {
  text: string;
  icon_url?: string;
}

export interface DiscordEmbed {
  title: string;
  description: string;
  url?: string;
  color?: number;       // Decimal integer (not hex string). See EMBED_COLORS.
  fields?: DiscordEmbedField[];
  footer?: DiscordEmbedFooter;
  timestamp?: string;   // ISO 8601
}

export interface DiscordWebhookPayload {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

// ============================================================================
// Color palette
// ============================================================================

export const EMBED_COLORS = {
  blurple:      0x5865F2,  // Discord brand blue — general
  green:        0x57F287,  // Success / model-release
  yellow:       0xFEE75C,  // Warning / industry
  red:          0xED4245,  // Error / policy
  fuchsia:      0xEB459E,  // Research
  white:        0xFFFFFE,  // Tool
} as const;

// Category → color mapping for Scout stories
export const CATEGORY_COLORS: Record<string, number> = {
  'model-release': EMBED_COLORS.green,
  'research':      EMBED_COLORS.fuchsia,
  'tool':          EMBED_COLORS.white,
  'industry':      EMBED_COLORS.yellow,
  'policy':        EMBED_COLORS.red,
};

// ============================================================================
// Core helpers
// ============================================================================

/**
 * Post a plain text message to a Discord webhook.
 * Returns false on failure instead of throwing.
 */
export async function postToDiscord(
  webhookUrl: string,
  content: string
): Promise<boolean> {
  return postPayload(webhookUrl, { content });
}

/**
 * Post a single rich embed to a Discord webhook.
 * Returns false on failure instead of throwing.
 */
export async function postEmbedToDiscord(
  webhookUrl: string,
  embed: DiscordEmbed
): Promise<boolean> {
  // Discord hard limits: title ≤256, description ≤4096, field.value ≤1024
  const safeEmbed = truncateEmbed(embed);
  return postPayload(webhookUrl, { embeds: [safeEmbed] });
}

/**
 * Post multiple embeds sequentially with a small delay between each.
 * Discord rate-limits: 5 webhook requests per 2 seconds per channel.
 * 500ms gap keeps us well within limits.
 * Returns the count of successfully posted embeds.
 */
export async function postEmbedsToDiscord(
  webhookUrl: string,
  embeds: DiscordEmbed[],
  delayMs = 500
): Promise<number> {
  let successCount = 0;
  for (const embed of embeds) {
    const ok = await postEmbedToDiscord(webhookUrl, embed);
    if (ok) successCount++;
    if (embeds.indexOf(embed) < embeds.length - 1) {
      await sleep(delayMs);
    }
  }
  return successCount;
}

// ============================================================================
// Internal
// ============================================================================

async function postPayload(
  webhookUrl: string,
  payload: DiscordWebhookPayload
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // Discord returns 429 with Retry-After header on rate limit
      const body = await response.text().catch(() => '');
      console.error(`[DiscordWebhook] POST failed: ${response.status} ${response.statusText}`, body);
      return false;
    }

    // 204 No Content = success; 200 = success with body (thread webhooks)
    return true;
  } catch (error) {
    console.error('[DiscordWebhook] Network error:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/** Enforce Discord's character limits so we never get a 400 back. */
function truncateEmbed(embed: DiscordEmbed): DiscordEmbed {
  return {
    ...embed,
    title: truncate(embed.title, 256),
    description: truncate(embed.description, 4096),
    fields: embed.fields?.map(f => ({
      ...f,
      name: truncate(f.name, 256),
      value: truncate(f.value, 1024),
    })),
  };
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '…';
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
