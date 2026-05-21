/**
 * PUR Distributor — generates social content and distributes to X, Discord, and LinkedIn
 * after Mike manually posts to Substack. Entry point: Mike's /pur-shipped command.
 * Idempotent: if sent_at is already set, this is a no-op.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getAgentHubDatabase } from '../agent-hub/db';
import { currentWeekIso } from './helpers';

const Anthropic = require('@anthropic-ai/sdk').default;

// ================================================================================
// Telegram
// ================================================================================

async function sendTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch (err) {
    console.warn('[distributor] Telegram failed:', err);
  }
}

// ================================================================================
// OAuth 1.0a for X (Twitter) API v2
// ================================================================================

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

function buildOAuthHeader(
  method: string,
  url: string,
  bodyParams: Record<string, string>,
  credentials: {
    consumerKey: string;
    consumerSecret: string;
    accessToken: string;
    accessSecret: string;
  }
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: credentials.accessToken,
    oauth_version: '1.0',
  };

  // Combine all params for signature base
  const allParams: Record<string, string> = { ...bodyParams, ...oauthParams };
  const sortedParams = Object.keys(allParams)
    .sort()
    .map(k => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join('&');

  const signatureBase = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(sortedParams),
  ].join('&');

  const signingKey = `${percentEncode(credentials.consumerSecret)}&${percentEncode(credentials.accessSecret)}`;
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBase)
    .digest('base64');

  oauthParams['oauth_signature'] = signature;

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map(k => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(', ');

  return `OAuth ${headerParts}`;
}

async function postTweet(
  text: string,
  replyToId: string | null,
  credentials: {
    consumerKey: string;
    consumerSecret: string;
    accessToken: string;
    accessSecret: string;
  }
): Promise<string | null> {
  const url = 'https://api.twitter.com/2/tweets';
  const body: Record<string, unknown> = { text };
  if (replyToId) {
    body.reply = { in_reply_to_tweet_id: replyToId };
  }

  // OAuth signs the top-level body key for simple string params
  // For nested objects, only sign string-value pairs
  const signableParams: Record<string, string> = { text };

  const authHeader = buildOAuthHeader('POST', url, signableParams, credentials);

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('[distributor] X API error:', resp.status, errText);
      return null;
    }

    const data = (await resp.json()) as { data?: { id?: string } };
    return data?.data?.id ?? null;
  } catch (err) {
    console.error('[distributor] X API request failed:', err);
    return null;
  }
}

// ================================================================================
// Claude content generation
// ================================================================================

async function generateTwitterThread(
  newsletterMd: string,
  subject: string
): Promise<string[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
  const systemPrompt =
    'Write a Twitter thread about this newsletter. Be concise, specific, no fluff. ' +
    'First tweet: hook. Last tweet: link + CTA for Coder1. Max 280 chars each.';

  const userPrompt = `Newsletter subject: ${subject}

Newsletter content (first 1200 chars):
${newsletterMd.slice(0, 1200)}

Write a thread of 6-10 tweets. Output each tweet on its own line prefixed with "TWEET: ".`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const block = msg.content[0];
    if (block.type !== 'text') return defaultThread(subject);
    const tweets = block.text
      .split('\n')
      .filter((l: string) => l.startsWith('TWEET:'))
      .map((l: string) => l.replace(/^TWEET:\s*/, '').trim())
      .filter((t: string) => t.length > 0 && t.length <= 280);
    return tweets.length >= 3 ? tweets : defaultThread(subject);
  } catch (err) {
    console.warn('[distributor] Twitter thread generation failed:', err);
    return defaultThread(subject);
  }
}

function defaultThread(subject: string): string[] {
  return [
    `${subject} — The Claude Code Power User Report is out.`,
    'This week: workflows, MCPs, and tools worth adding to your Claude Code setup.',
    'Read the full issue + try Coder1 IDE free at https://coder1.ai',
  ];
}

async function generateLinkedInPost(
  newsletterMd: string,
  subject: string
): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
  const userPrompt = `Write a LinkedIn post (200-300 words) promoting this newsletter issue.
Professional tone, no hype, focus on the practical value for developers.
End with a link to https://coder1.ai

Newsletter subject: ${subject}
Newsletter content (first 1000 chars):
${newsletterMd.slice(0, 1000)}

Output only the post text.`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const block = msg.content[0];
    return block.type === 'text'
      ? block.text.trim()
      : `New issue of The Claude Code Power User Report: ${subject}`;
  } catch (err) {
    console.warn('[distributor] LinkedIn generation failed:', err);
    return `New issue of The Claude Code Power User Report: ${subject}`;
  }
}

async function generateRedditPost(
  newsletterMd: string,
  subject: string
): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
  const userPrompt = `Write a Reddit post for r/ClaudeCode promoting this newsletter issue.
Tone: informal, community-appropriate, genuinely helpful — not spammy.
Include a brief summary of the top items. Keep under 300 words.

Newsletter subject: ${subject}
Newsletter content (first 1000 chars):
${newsletterMd.slice(0, 1000)}

Output only the post body (no title line needed).`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const block = msg.content[0];
    return block.type === 'text'
      ? block.text.trim()
      : `New Power User Report out: ${subject}`;
  } catch (err) {
    console.warn('[distributor] Reddit generation failed:', err);
    return `New Power User Report out: ${subject}`;
  }
}

// ================================================================================
// Main
// ================================================================================

export async function runDistributor(weekIso: string, substackUrl: string): Promise<void> {
  const db = getAgentHubDatabase();

  // 1. Load newsletter row
  const row = db.prepare(
    `SELECT id, week_iso, draft_path, subject, sent_at FROM pur_newsletters WHERE week_iso = ?`
  ).get(weekIso) as {
    id: string;
    week_iso: string;
    draft_path: string | null;
    subject: string | null;
    sent_at: number | null;
  } | undefined;

  if (!row) {
    throw new Error(`No newsletter record found for ${weekIso} — run drafter first`);
  }

  // 2. Idempotency check
  if (row.sent_at !== null) {
    console.log(`[distributor] Already distributed ${weekIso} — skipping`);
    return;
  }

  if (!row.draft_path) {
    throw new Error(`Newsletter ${weekIso} has no draft_path — run drafter first`);
  }

  // 3. Load draft markdown
  const newsletterMd = fs.readFileSync(row.draft_path, 'utf8');
  const subject = row.subject || 'The Claude Code Power User Report';

  const draftsDir = path.join(process.cwd(), 'data', 'pur', 'drafts');
  fs.mkdirSync(draftsDir, { recursive: true });

  // 4. Generate Twitter thread
  const tweets = await generateTwitterThread(newsletterMd, subject);
  const twitterPath = path.join(draftsDir, `${weekIso}-twitter-thread.md`);
  fs.writeFileSync(
    twitterPath,
    tweets.map((t, i) => `**Tweet ${i + 1}:**\n${t}`).join('\n\n'),
    'utf8'
  );

  // 5. Generate LinkedIn post
  const linkedInText = await generateLinkedInPost(newsletterMd, subject);
  const linkedInPath = path.join(draftsDir, `${weekIso}-linkedin.md`);
  fs.writeFileSync(linkedInPath, linkedInText, 'utf8');

  // 6. Generate Reddit draft
  const redditText = await generateRedditPost(newsletterMd, subject);
  const redditPath = path.join(draftsDir, `${weekIso}-reddit.md`);
  fs.writeFileSync(redditPath, redditText, 'utf8');

  // 7. Post Twitter thread
  let twitterSuccess = false;
  const xKey = process.env.X_API_KEY;
  const xSecret = process.env.X_API_SECRET;
  const xAccessToken = process.env.X_ACCESS_TOKEN;
  const xAccessSecret = process.env.X_ACCESS_SECRET;

  if (!xKey || !xSecret || !xAccessToken || !xAccessSecret) {
    console.warn('[distributor] X API env vars missing — skipping Twitter posting');
  } else {
    const credentials = {
      consumerKey: xKey,
      consumerSecret: xSecret,
      accessToken: xAccessToken,
      accessSecret: xAccessSecret,
    };

    try {
      let previousTweetId: string | null = null;
      let allPosted = true;

      for (const tweetText of tweets) {
        const tweetId = await postTweet(tweetText, previousTweetId, credentials);
        if (tweetId) {
          previousTweetId = tweetId;
        } else {
          console.error('[distributor] Failed to post tweet — stopping thread');
          allPosted = false;
          break;
        }
      }
      twitterSuccess = allPosted;
    } catch (err) {
      console.error('[distributor] Twitter thread posting failed:', err);
    }
  }

  // 8. Post to Discord #announcements
  let discordSuccess = false;
  const discordToken = process.env.DISCORD_BOT_TOKEN;
  const discordChannelId = process.env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID;

  if (discordToken && discordChannelId) {
    try {
      const discordMsg = `📨 New issue: **The Claude Code Power User Report**\n\n${subject}\n\n${substackUrl}\n\n—`;
      const resp = await fetch(
        `https://discord.com/api/v10/channels/${discordChannelId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bot ${discordToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: discordMsg }),
        }
      );
      discordSuccess = resp.ok;
      if (!resp.ok) {
        const errText = await resp.text();
        console.error('[distributor] Discord post failed:', resp.status, errText);
      }
    } catch (err) {
      console.error('[distributor] Discord request failed:', err);
    }
  } else {
    console.warn('[distributor] Discord env vars missing — skipping Discord announcement');
  }

  // 9. Update pur_newsletters
  db.prepare(
    `UPDATE pur_newsletters SET sent_at = ?, substack_url = ? WHERE week_iso = ?`
  ).run(Date.now(), substackUrl, weekIso);

  // 10. Telegram summary
  const twitterStatus = twitterSuccess ? '✅' : '❌';
  const discordStatus = discordSuccess ? '✅' : '❌';
  await sendTelegram(
    `📣 Distribution complete for ${weekIso}. Twitter ${twitterStatus}, Discord ${discordStatus}. Draft files in data/pur/drafts/`
  );

  console.log(
    `[distributor] Done. Twitter: ${twitterStatus}, Discord: ${discordStatus}`
  );
}

export async function handleShippedCommand(
  weekIso: string,
  substackUrl: string
): Promise<void> {
  return runDistributor(weekIso, substackUrl);
}

export async function main(weekIso?: string, substackUrl?: string): Promise<void> {
  const week = weekIso || currentWeekIso();
  const url = substackUrl || '';
  if (!url) {
    console.error('[distributor] Usage: main(weekIso, substackUrl)');
    process.exit(1);
  }
  console.log(`[distributor] Running for week ${week}`);
  await runDistributor(week, url);
}

if (require.main === module) {
  const [, , weekArg, urlArg] = process.argv;
  main(weekArg, urlArg).catch(err => {
    console.error('[distributor] Fatal:', err);
    process.exit(1);
  });
}
