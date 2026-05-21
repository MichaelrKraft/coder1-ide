/**
 * PUR Discord Verifier Bot
 * Always-on discord.js v14 service for Power User Report member verification.
 * Start via: startPurDiscordBot() from server.js
 */

import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Message,
  GuildMember,
  Role,
  TextChannel,
  NewsChannel,
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import { getAgentHubDatabase } from '../lib/agent-hub/db';
import { generatePurId, screenshotPHash } from '../lib/pur/helpers';
import type { PurMemberStatus, PurVerificationDecision } from '../types/pur';

// ================================================================================
// Constants
// ================================================================================

const LOCK_FILE = path.join(process.cwd(), '.pur-discord.lock');
const PAUSE_FILE = path.join(process.cwd(), '.pur-verifier-paused');
const SCREENSHOTS_DIR = path.join(process.cwd(), 'data', 'pur', 'screenshots');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const SCREENSHOT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const MANUAL_REVIEW_TIMEOUT_MS = 4 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const MIN_SESSIONS = 50;
const AUTO_APPROVE_CONFIDENCE = 0.9;
const AUTO_REJECT_CONFIDENCE = 0.85;

const VISION_PROMPT = `Analyze this Claude desktop app screenshot to verify lifetime session count.
Expected UI: Claude desktop "Usage" stats screen showing lifetime session count prominently.

Return ONLY valid JSON (no markdown, no explanation):
{
  "sessions_count": <integer or null>,
  "confidence": <0.0 to 1.0>,
  "reasoning": "<one sentence>",
  "red_flags": []
}

Valid red_flags values: "edited_pixels", "inconsistent_fonts", "partial_screenshot", "wrong_ui", "no_sessions_visible"

Rules:
- sessions_count: extract ONLY the lifetime sessions number. null if not visible or wrong UI
- confidence: your confidence that the screenshot is genuine and sessions_count is correct
- Any red_flag present → lower confidence accordingly
- ONLY accept Claude desktop "Usage" stats screen. Reject conversation screenshots, mobile screenshots, other apps.
- Extract ONLY sessions count. Ignore all other visible data (email, name, content).`;

// ================================================================================
// Types
// ================================================================================

interface VisionOutput {
  sessions_count: number | null;
  confidence: number;
  reasoning: string;
  red_flags: string[];
}

// ================================================================================
// Telegram helper
// ================================================================================

async function sendTelegram(text: string, photoPath?: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    if (photoPath && fs.existsSync(photoPath)) {
      const form = new FormData();
      form.append('chat_id', chatId);
      form.append('caption', text);
      form.append('photo', new Blob([fs.readFileSync(photoPath)]), 'screenshot.png');
      await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: form });
    } else {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      });
    }
  } catch (err) {
    console.error('[pur-discord] Telegram send failed:', err);
  }
}

// ================================================================================
// Audit log helper
// ================================================================================

function writeAuditLog(
  actor: string,
  action: string,
  entityType: string,
  entityId: string,
  payload: Record<string, unknown>
): void {
  try {
    const db = getAgentHubDatabase();
    db.prepare(
      `INSERT INTO pur_audit_log (id, actor, action, entity_type, entity_id, payload_json, at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      generatePurId('audit'),
      actor,
      action,
      entityType,
      entityId,
      JSON.stringify(payload),
      Date.now()
    );
  } catch (err) {
    console.error('[pur-discord] Audit log write failed:', err);
  }
}

// ================================================================================
// Vision call
// ================================================================================

async function callVision(imagePath: string): Promise<VisionOutput> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Anthropic = require('@anthropic-ai/sdk').default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
  const base64Data = fs.readFileSync(imagePath).toString('base64');
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64Data } },
        { type: 'text', text: VISION_PROMPT },
      ],
    }],
  });
  const raw = response.content[0]?.text ?? '{}';
  try {
    return JSON.parse(raw) as VisionOutput;
  } catch {
    return { sessions_count: null, confidence: 0, reasoning: 'parse error', red_flags: ['wrong_ui'] };
  }
}

// ================================================================================
// Decision execution helpers
// ================================================================================

async function getVerifiedRole(member: GuildMember): Promise<Role | undefined> {
  return member.guild.roles.cache.find(r => r.name === 'Verified');
}

async function sendWelcomeDm(discordId: string, client: Client, memberId: string): Promise<void> {
  const user = await client.users.fetch(discordId).catch(() => null);
  if (!user) return;

  const day0Text = `Welcome to The Claude Code Power User Report Discord!

You're in because you've built real workflows with Claude Code. This community is for power users who want to go deeper.

Channels to check out:
• #workflows — share your setups, CLAUDE.md files, and automations
• #mcps-and-tools — MCP deep-dives and tool recommendations
• #what-are-you-building — post your current project
• #office-hours — live sessions with Mike

Read past issues: [Substack link TBD]`;

  await sendDmIfNotSent(user, memberId, 0, day0Text);

  // Schedule day 1/3/7 DMs
  scheduleDm(discordId, client, memberId, 1, 1 * 24 * 60 * 60 * 1000);
  scheduleDm(discordId, client, memberId, 3, 3 * 24 * 60 * 60 * 1000);
  scheduleDm(discordId, client, memberId, 7, 7 * 24 * 60 * 60 * 1000);
}

async function sendDmIfNotSent(
  user: { send: (text: string) => Promise<unknown> },
  memberId: string,
  dmDay: 0 | 1 | 3 | 7,
  text: string
): Promise<void> {
  const db = getAgentHubDatabase();
  const existing = db.prepare(
    `SELECT id FROM pur_member_dm_sent WHERE member_id = ? AND dm_day = ?`
  ).get(memberId, dmDay);
  if (existing) return;

  await user.send(text).catch((err: unknown) => {
    console.error(`[pur-discord] DM send failed (day ${dmDay}):`, err);
  });

  db.prepare(
    `INSERT OR IGNORE INTO pur_member_dm_sent (id, member_id, dm_day, sent_at) VALUES (?, ?, ?, ?)`
  ).run(generatePurId('dms'), memberId, dmDay, Date.now());
}

function scheduleDm(
  discordId: string,
  client: Client,
  memberId: string,
  dmDay: 1 | 3 | 7,
  delayMs: number
): void {
  const messages: Record<1 | 3 | 7, string> = {
    1: `Quick heads up: the last 3 newsletter issues are pinned in #announcements. Worth a skim — real workflows, not tutorials.`,
    3: `What are you building with Claude Code? Drop a quick note in #what-are-you-building. Even rough/early stage — the community loves seeing what people are working on.`,
    7: `Mike hosts office hours most Thursdays. Check #office-hours for the next session. Great place to get unstuck on complex workflows.`,
  };
  setTimeout(async () => {
    const user = await client.users.fetch(discordId).catch(() => null);
    if (!user) return;
    await sendDmIfNotSent(user, memberId, dmDay, messages[dmDay]);
  }, delayMs);
}

async function executeAutoApprove(
  discordId: string,
  discordUsername: string,
  memberId: string,
  sessionsCount: number,
  screenshotPath: string,
  client: Client,
  verifyChannelId: string,
  announcementsChannelId: string | undefined
): Promise<void> {
  const db = getAgentHubDatabase();
  const pHash = await screenshotPHash(screenshotPath).catch(() => '');
  db.prepare(
    `UPDATE pur_members SET status = 'verified', verified_at = ?, sessions_count = ?, screenshot_hash = ? WHERE id = ?`
  ).run(Date.now(), sessionsCount, pHash, memberId);

  // Assign Verified role
  const guild = client.guilds.cache.find(g => g.channels.cache.has(verifyChannelId));
  if (guild) {
    const member = await guild.members.fetch(discordId).catch(() => null);
    if (member) {
      const role = await getVerifiedRole(member);
      if (role) await member.roles.add(role).catch((err: unknown) => console.error('[pur-discord] Role assign failed:', err));
    }
  }

  // Welcome DM
  await sendWelcomeDm(discordId, client, memberId);

  // Announce
  if (announcementsChannelId) {
    const channel = client.channels.cache.get(announcementsChannelId);
    if (channel instanceof TextChannel || channel instanceof NewsChannel) {
      await channel.send(`Welcome to the server, <@${discordId}>! Just got verified with ${sessionsCount} sessions.`).catch(() => null);
    }
  }
}

async function executeAutoReject(
  discordId: string,
  memberId: string,
  sessionsCount: number | null,
  client: Client
): Promise<void> {
  const db = getAgentHubDatabase();
  db.prepare(`UPDATE pur_members SET status = 'rejected' WHERE id = ?`).run(memberId);
  const user = await client.users.fetch(discordId).catch(() => null);
  if (user) {
    const n = sessionsCount ?? 0;
    await user.send(
      `Thanks for applying! Your screenshot shows ${n} sessions, but the minimum is 50. Keep using Claude Code and try again when you hit 50 sessions. The screenshot must be from Claude desktop's Usage stats screen.`
    ).catch(() => null);
  }
}

async function executeManualFlag(
  discordId: string,
  discordUsername: string,
  memberId: string,
  vision: VisionOutput,
  screenshotPath: string,
  client: Client
): Promise<void> {
  const flags = vision.red_flags.join(', ') || 'none';
  const telegramText =
    `🔍 PUR Verify — manual review needed\nUser: ${discordUsername} (${discordId})\n` +
    `Sessions: ${vision.sessions_count ?? 'N/A'} (confidence: ${vision.confidence.toFixed(2)})\n` +
    `Red flags: ${flags}\n` +
    `Approve? Reply /pur-approve ${discordId} or /pur-reject ${discordId} [reason]`;
  await sendTelegram(telegramText, screenshotPath);

  // 4-hour timeout → auto-reject
  setTimeout(async () => {
    const db = getAgentHubDatabase();
    const row = db.prepare(`SELECT status FROM pur_members WHERE id = ?`).get(memberId) as { status: string } | undefined;
    if (!row || row.status !== 'pending') return;
    db.prepare(`UPDATE pur_members SET status = 'rejected' WHERE id = ?`).run(memberId);
    const user = await client.users.fetch(discordId).catch(() => null);
    if (user) {
      await user.send(
        `We couldn't verify automatically. Please try again with a clearer screenshot of Claude desktop's Usage stats screen.`
      ).catch(() => null);
    }
  }, MANUAL_REVIEW_TIMEOUT_MS);
}

// ================================================================================
// Verify channel message handler
// ================================================================================

async function handleVerifyMessage(message: Message, client: Client): Promise<void> {
  if (message.author.bot) return;
  const discordId = message.author.id;
  const discordUsername = message.author.username;

  // Check for image attachment
  const attachment = message.attachments.find(a => a.contentType?.startsWith('image/'));
  if (!attachment) {
    await message.author.send(
      'To verify your membership, please post a screenshot of Claude desktop\'s Usage stats screen in #verify. The image must show your lifetime session count.'
    ).catch(() => null);
    await message.delete().catch(() => null);
    return;
  }

  const db = getAgentHubDatabase();

  // Rate limit check
  const existing = db.prepare(
    `SELECT id, status, last_attempt_at, verification_attempts FROM pur_members WHERE discord_id = ?`
  ).get(discordId) as {
    id: string;
    status: string;
    last_attempt_at: number | null;
    verification_attempts: number;
  } | undefined;

  const now = Date.now();

  if (existing) {
    if (existing.status === 'revoked') {
      await message.author.send('Your access has been revoked. Contact the moderator.').catch(() => null);
      await message.delete().catch(() => null);
      return;
    }

    if (existing.last_attempt_at && (now - existing.last_attempt_at) < RATE_LIMIT_WINDOW_MS) {
      await message.author.send('Please wait 24h between attempts.').catch(() => null);
      await message.delete().catch(() => null);
      return;
    }

    if (existing.verification_attempts >= MAX_ATTEMPTS) {
      const lastAttempt = existing.last_attempt_at ?? 0;
      if ((now - lastAttempt) < SEVEN_DAYS_MS) {
        await message.author.send('Maximum attempts reached. Try again in 7 days.').catch(() => null);
        await message.delete().catch(() => null);
        return;
      }
    }
  }

  // Validate file size
  if (attachment.size > MAX_FILE_SIZE) {
    await message.author.send('Screenshot is too large (max 10MB). Please compress and retry.').catch(() => null);
    await message.delete().catch(() => null);
    return;
  }

  // Download screenshot
  const userDir = path.join(SCREENSHOTS_DIR, discordId);
  await fs.promises.mkdir(userDir, { recursive: true });
  const screenshotPath = path.join(userDir, `${now}.png`);
  const arrayBuffer = await fetch(attachment.url).then(r => r.arrayBuffer());
  await fs.promises.writeFile(screenshotPath, Buffer.from(arrayBuffer), { mode: 0o600 });

  // Upsert member row
  let memberId: string;
  if (existing) {
    memberId = existing.id;
    db.prepare(
      `UPDATE pur_members SET discord_username = ?, last_attempt_at = ?, verification_attempts = verification_attempts + 1 WHERE id = ?`
    ).run(discordUsername, now, memberId);
  } else {
    memberId = generatePurId('mbr');
    db.prepare(
      `INSERT INTO pur_members (id, discord_id, discord_username, status, verification_attempts, last_attempt_at, created_at)
       VALUES (?, ?, ?, 'pending', 1, ?, ?)`
    ).run(memberId, discordId, discordUsername, now, now);
  }

  // Delete the screenshot message from channel
  await message.delete().catch(() => null);

  // Determine if verifier is paused
  const isPaused = fs.existsSync(PAUSE_FILE);

  let decision: PurVerificationDecision;
  let vision: VisionOutput;

  if (isPaused) {
    decision = 'manual_flag';
    vision = { sessions_count: null, confidence: 0, reasoning: 'verifier paused', red_flags: [] };
  } else {
    vision = await callVision(screenshotPath).catch(() => ({
      sessions_count: null,
      confidence: 0,
      reasoning: 'vision call failed',
      red_flags: ['wrong_ui'],
    }));

    if (vision.red_flags.length > 0) {
      decision = 'manual_flag';
    } else if (
      vision.sessions_count !== null &&
      vision.sessions_count >= MIN_SESSIONS &&
      vision.confidence >= AUTO_APPROVE_CONFIDENCE
    ) {
      decision = 'auto_approve';
    } else if (
      vision.sessions_count !== null &&
      vision.sessions_count < MIN_SESSIONS &&
      vision.confidence >= AUTO_REJECT_CONFIDENCE
    ) {
      decision = 'auto_reject';
    } else {
      decision = 'manual_flag';
    }
  }

  // Insert verification record
  const verificationId = generatePurId('ver');
  db.prepare(
    `INSERT INTO pur_verifications (id, member_id, screenshot_path, vision_output_json, decision, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(verificationId, memberId, screenshotPath, JSON.stringify(vision), decision, now);

  const verifyChannelId = process.env.DISCORD_VERIFY_CHANNEL_ID ?? '';
  const announcementsChannelId = process.env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID;

  if (decision === 'auto_approve') {
    await executeAutoApprove(
      discordId, discordUsername, memberId,
      vision.sessions_count ?? 0, screenshotPath,
      client, verifyChannelId, announcementsChannelId
    );
  } else if (decision === 'auto_reject') {
    await executeAutoReject(discordId, memberId, vision.sessions_count, client);
  } else {
    await executeManualFlag(discordId, discordUsername, memberId, vision, screenshotPath, client);
  }

  writeAuditLog('bot', decision, 'member', memberId, { discordId, decision, sessions_count: vision.sessions_count });
}

// ================================================================================
// Slash command handlers
// ================================================================================

function isMike(userId: string): boolean {
  const mikeId = process.env.DISCORD_MIKE_USER_ID;
  return !!mikeId && userId === mikeId;
}

async function handleRevoke(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isMike(interaction.user.id)) {
    await interaction.reply({ content: 'Not authorized.', ephemeral: true });
    return;
  }
  const target = interaction.options.getUser('user', true);
  const reason = interaction.options.getString('reason') ?? '';
  const db = getAgentHubDatabase();
  const member = db.prepare(`SELECT id FROM pur_members WHERE discord_id = ?`).get(target.id) as { id: string } | undefined;
  if (!member) {
    await interaction.reply({ content: 'User not found in PUR members.', ephemeral: true });
    return;
  }
  db.prepare(`UPDATE pur_members SET status = 'revoked', notes = ? WHERE id = ?`).run(reason, member.id);

  // Remove Verified role
  const guild = interaction.guild;
  if (guild) {
    const guildMember = await guild.members.fetch(target.id).catch(() => null);
    if (guildMember) {
      const role = await getVerifiedRole(guildMember);
      if (role) await guildMember.roles.remove(role).catch(() => null);
    }
  }

  await target.send('Your access has been revoked. Contact the community for more info.').catch(() => null);
  writeAuditLog('mike', 'revoke', 'member', member.id, { discordId: target.id, reason });
  await interaction.reply({ content: `Revoked access for ${target.username}.`, ephemeral: true });
}

async function handleForget(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isMike(interaction.user.id)) {
    await interaction.reply({ content: 'Not authorized.', ephemeral: true });
    return;
  }
  const target = interaction.options.getUser('user', true);
  const discordId = target.id;
  const db = getAgentHubDatabase();
  const member = db.prepare(`SELECT id FROM pur_members WHERE discord_id = ?`).get(discordId) as { id: string } | undefined;
  if (!member) {
    await interaction.reply({ content: 'User not found in PUR members.', ephemeral: true });
    return;
  }
  const memberId = member.id;

  // GDPR cascade
  db.prepare(`DELETE FROM pur_verifications WHERE member_id = ?`).run(memberId);
  db.prepare(`DELETE FROM pur_member_dm_sent WHERE member_id = ?`).run(memberId);
  db.prepare(`DELETE FROM pur_members WHERE id = ?`).run(memberId);

  // Scrub audit log entries referencing this discord_id (LIKE filter avoids full table load)
  db.prepare(`DELETE FROM pur_audit_log WHERE payload_json LIKE ?`).run(`%${discordId}%`);

  // Delete screenshot directory
  const userDir = path.join(SCREENSHOTS_DIR, discordId);
  if (fs.existsSync(userDir)) {
    fs.rmSync(userDir, { recursive: true, force: true });
  }

  // Final audit entry
  writeAuditLog('mike', 'gdpr_forget', 'member', discordId, { filesystem_deleted: true });
  await interaction.reply({ content: 'Done. All data for that user has been deleted.', ephemeral: true });
}

async function handlePauseVerifier(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isMike(interaction.user.id)) {
    await interaction.reply({ content: 'Not authorized.', ephemeral: true });
    return;
  }
  fs.writeFileSync(PAUSE_FILE, String(Date.now()));
  await interaction.reply({ content: 'Verifier paused. All screenshots will be manually reviewed.', ephemeral: true });
}

async function handleResumeVerifier(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!isMike(interaction.user.id)) {
    await interaction.reply({ content: 'Not authorized.', ephemeral: true });
    return;
  }
  if (fs.existsSync(PAUSE_FILE)) {
    fs.unlinkSync(PAUSE_FILE);
    await interaction.reply({ content: 'Verifier resumed. Auto-verification is active.', ephemeral: true });
  } else {
    await interaction.reply({ content: 'Verifier was not paused.', ephemeral: true });
  }
}

async function handlePanic(interaction: ChatInputCommandInteraction, client: Client): Promise<void> {
  if (!isMike(interaction.user.id)) {
    await interaction.reply({ content: 'Not authorized.', ephemeral: true });
    return;
  }
  await interaction.reply({ content: 'Bot stopped.' });
  client.destroy();
  cleanup();
  process.exit(0);
}

// ================================================================================
// Slash command registration
// ================================================================================

async function registerCommands(token: string, clientId: string, guildId?: string): Promise<void> {
  const commands = [
    new SlashCommandBuilder()
      .setName('pur-revoke')
      .setDescription('Revoke a member\'s PUR access')
      .addUserOption(o => o.setName('user').setDescription('Member to revoke').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason for revocation').setRequired(false)),
    new SlashCommandBuilder()
      .setName('pur-forget')
      .setDescription('GDPR forget a user (deletes all data)')
      .addUserOption(o => o.setName('user').setDescription('Member to forget').setRequired(true)),
    new SlashCommandBuilder()
      .setName('pur-pause-verifier')
      .setDescription('Pause auto-verification (all screenshots go to manual review)'),
    new SlashCommandBuilder()
      .setName('pur-resume-verifier')
      .setDescription('Resume auto-verification after a pause'),
    new SlashCommandBuilder()
      .setName('pur-panic')
      .setDescription('Emergency stop the bot'),
  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(token);
  if (guildId) {
    const app = await rest.get(Routes.oauth2CurrentApplication()) as { id: string };
    await rest.put(Routes.applicationGuildCommands(app.id, guildId), { body: commands });
  } else {
    const app = await rest.get(Routes.oauth2CurrentApplication()) as { id: string };
    await rest.put(Routes.applicationCommands(app.id), { body: commands });
  }
  console.log('[pur-discord] Slash commands registered');
}

// ================================================================================
// Screenshot cleanup cron
// ================================================================================

function startCleanupCron(): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      if (!fs.existsSync(SCREENSHOTS_DIR)) return;
      let deleted = 0;
      const users = await fs.promises.readdir(SCREENSHOTS_DIR);
      for (const user of users) {
        const userDir = path.join(SCREENSHOTS_DIR, user);
        const stat = await fs.promises.stat(userDir);
        if (!stat.isDirectory()) continue;
        const files = await fs.promises.readdir(userDir);
        for (const file of files) {
          const filePath = path.join(userDir, file);
          const fileStat = await fs.promises.stat(filePath);
          if (Date.now() - fileStat.mtimeMs > SCREENSHOT_MAX_AGE_MS) {
            await fs.promises.unlink(filePath);
            deleted++;
          }
        }
      }
      if (deleted > 0) console.log(`[pur-discord] Cleanup: deleted ${deleted} old screenshots`);
    } catch (err) {
      console.error('[pur-discord] Cleanup error:', err);
    }
  }, CLEANUP_INTERVAL_MS);
}

// ================================================================================
// Lock file helpers
// ================================================================================

function writeLock(): void {
  fs.writeFileSync(LOCK_FILE, String(process.pid));
}

function cleanup(): void {
  try { fs.unlinkSync(LOCK_FILE); } catch { /* ignore */ }
}

// ================================================================================
// Main export
// ================================================================================

export async function startPurDiscordBot(): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.debug('[pur-discord] DISCORD_BOT_TOKEN not set — bot not started');
    return;
  }

  // Check lock file (prevent double-start)
  if (fs.existsSync(LOCK_FILE)) {
    console.warn('[pur-discord] Lock file exists — another instance may be running. Skipping start.');
    return;
  }
  writeLock();

  const verifyChannelId = process.env.DISCORD_VERIFY_CHANNEL_ID ?? '';
  const guildId = process.env.DISCORD_GUILD_ID;

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel],
  });

  let cleanupInterval: NodeJS.Timeout | null = null;

  // Graceful shutdown
  const shutdown = () => {
    console.log('[pur-discord] Shutting down...');
    if (cleanupInterval) clearInterval(cleanupInterval);
    client.destroy();
    cleanup();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  client.once('ready', async () => {
    console.log(`[pur-discord] Logged in as ${client.user?.tag}`);
    try {
      await registerCommands(token, client.user?.id ?? '', guildId);
    } catch (err) {
      console.error('[pur-discord] Command registration failed:', err);
    }
    cleanupInterval = startCleanupCron();
  });

  // Message handler for #verify channel
  client.on('messageCreate', async (message) => {
    try {
      if (message.channelId !== verifyChannelId) return;
      await handleVerifyMessage(message, client);
    } catch (err) {
      console.error('[pur-discord] messageCreate error:', err);
    }
  });

  // Slash commands
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    try {
      switch (interaction.commandName) {
        case 'pur-revoke': await handleRevoke(interaction); break;
        case 'pur-forget': await handleForget(interaction); break;
        case 'pur-pause-verifier': await handlePauseVerifier(interaction); break;
        case 'pur-resume-verifier': await handleResumeVerifier(interaction); break;
        case 'pur-panic': await handlePanic(interaction, client); break;
      }
    } catch (err) {
      console.error('[pur-discord] interactionCreate error:', err);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'An error occurred.', ephemeral: true }).catch(() => null);
      } else {
        await interaction.reply({ content: 'An error occurred.', ephemeral: true }).catch(() => null);
      }
    }
  });

  // Username change tracking
  client.on('guildMemberUpdate', async (_oldMember, newMember) => {
    try {
      const db = getAgentHubDatabase();
      db.prepare(
        `UPDATE pur_members SET discord_username = ? WHERE discord_id = ?`
      ).run(newMember.user.username, newMember.user.id);
    } catch (err) {
      console.error('[pur-discord] guildMemberUpdate error:', err);
    }
  });

  // Member left
  client.on('guildMemberRemove', async (member) => {
    try {
      const db = getAgentHubDatabase();
      db.prepare(
        `UPDATE pur_members SET status = 'left' WHERE discord_id = ? AND status NOT IN ('revoked')`
      ).run(member.user.id);
    } catch (err) {
      console.error('[pur-discord] guildMemberRemove error:', err);
    }
  });

  await client.login(token);
}
