# YT-Spy Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Claude Code skill (`/yt-spy`) that monitors 4 YouTube channels for new Claude Code videos, auto-generates a Kallaway-style script in Mike's voice, posts a first comment, and emails Poolkraftllc@gmail.com with the full production package.

**Architecture:** CronCreate schedules `claude -p "Run /yt-spy"` every 15 minutes. The skill polls YouTube RSS feeds (free, no API key), detects Claude Code videos, fetches transcripts via MCP, generates scripts via Claude, and calls two Node.js helpers for YouTube commenting (OAuth) and email (nodemailer). State persists in a JSON file to avoid double-processing.

**Tech Stack:** Node.js 18+, `googleapis` v140, `nodemailer` v6, YouTube Data API v3 (OAuth 2.0), YouTube RSS feeds (XML), Gmail SMTP App Password, Claude Code CLI, CronCreate

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `~/.claude/skills/yt-spy/SKILL.md` | Create | Main skill instructions for Claude |
| `~/.claude/skills/yt-spy/package.json` | Create | Node.js deps (googleapis, nodemailer, dotenv) |
| `~/.claude/skills/yt-spy/helpers/post-comment.js` | Create | YouTube Data API v3 comment poster (OAuth) |
| `~/.claude/skills/yt-spy/helpers/send-email.js` | Create | Nodemailer Gmail SMTP emailer |
| `~/.claude/skills/yt-spy/helpers/setup-oauth.js` | Create | One-time interactive OAuth token setup wizard |
| `~/.claude/skills/yt-spy/helpers/test-helpers.js` | Create | Integration test runner for helpers |
| `~/.claude/skills/yt-spy/state.json` | Create | Persisted seen-video-IDs per channel |
| `~/.claude/skills/yt-spy/.env.example` | Create | Credential template |
| `~/.claude/skills/yt-spy/.gitignore` | Create | Exclude .env and client_secret.json |
| `docs/superpowers/specs/2026-04-10-yt-spy-design.md` | Create | Copy of approved design spec |

---

## Task 1: Resolve YouTube Channel IDs

**Files:**
- Modify: `~/.claude/skills/yt-spy/SKILL.md` (will be created in Task 3, but channel IDs feed into it)

- [ ] **Step 1: Look up each channel ID**

Fetch each creator's YouTube channel page and extract the `channel_id` from the RSS link or page source:

```bash
# Nate Herk
curl -s "https://www.youtube.com/@nateherk" | grep -o '"channelId":"[^"]*"' | head -1

# Mark Kashef
curl -s "https://www.youtube.com/@markkashef" | grep -o '"channelId":"[^"]*"' | head -1

# Jay E / RoboNuggets (try both handles)
curl -s "https://www.youtube.com/@RoboNuggets" | grep -o '"channelId":"[^"]*"' | head -1

# Chase AI
curl -s "https://www.youtube.com/@ChaseAI" | grep -o '"channelId":"[^"]*"' | head -1
```

If the handle lookup returns no match, try the alternative:
```bash
# Alternative: use YouTube's channel search redirect
curl -sL "https://www.youtube.com/@nateherk/about" | grep -o 'channel/[A-Za-z0-9_-]\{24\}' | head -1
```

- [ ] **Step 2: Verify each RSS feed works**

```bash
# Replace CHANNEL_ID with actual ID found above
curl -s "https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID" | head -50
```

Expected output: XML starting with `<?xml` containing `<feed xmlns=` and multiple `<entry>` blocks.

- [ ] **Step 3: Record the 4 channel IDs**

Save to a scratch file for reference during Task 3:
```
nate-herk: UCxxxxxxxxxxxxxxxxxxxxxxxxx
mark-kashef: UCxxxxxxxxxxxxxxxxxxxxxxxxx
robo-nuggets: UCxxxxxxxxxxxxxxxxxxxxxxxxx
chase-ai: UCxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Task 2: Scaffold Skill Directory + Dependencies

**Files:**
- Create: `~/.claude/skills/yt-spy/` (directory structure)
- Create: `~/.claude/skills/yt-spy/package.json`
- Create: `~/.claude/skills/yt-spy/.env.example`
- Create: `~/.claude/skills/yt-spy/.gitignore`
- Create: `~/.claude/skills/yt-spy/state.json`
- Create: `~/.claude/skills/yt-spy/pending/.gitkeep`
- Create: `~/.claude/skills/yt-spy/helpers/` (directory)

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p ~/.claude/skills/yt-spy/helpers
mkdir -p ~/.claude/skills/yt-spy/pending
touch ~/.claude/skills/yt-spy/pending/.gitkeep
```

- [ ] **Step 2: Write package.json**

```bash
cat > ~/.claude/skills/yt-spy/package.json << 'EOF'
{
  "name": "yt-spy-helpers",
  "version": "1.0.0",
  "description": "Helper scripts for the yt-spy Claude Code skill",
  "private": true,
  "dependencies": {
    "dotenv": "^16.4.0",
    "googleapis": "^140.0.0",
    "nodemailer": "^6.9.0"
  }
}
EOF
```

- [ ] **Step 3: Write .env.example**

```bash
cat > ~/.claude/skills/yt-spy/.env.example << 'EOF'
# YouTube Data API v3 OAuth credentials
# Get from: https://console.cloud.google.com/ → APIs & Services → Credentials
# Create an OAuth 2.0 Client ID (Desktop app type), download as client_secret.json
# Then run: node ~/.claude/skills/yt-spy/helpers/setup-oauth.js
YOUTUBE_CLIENT_ID=your-client-id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your-client-secret
YOUTUBE_ACCESS_TOKEN=ya29.your-access-token
YOUTUBE_REFRESH_TOKEN=1//your-refresh-token

# Gmail SMTP App Password (for email alerts)
# Get from: myaccount.google.com → Security → 2-Step Verification → App Passwords
# Generate for "Mail" → "Mac" (or any name) → copy 16-char password
GMAIL_USER=Poolkraftllc@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
EOF
```

- [ ] **Step 4: Write .gitignore**

```bash
cat > ~/.claude/skills/yt-spy/.gitignore << 'EOF'
.env
client_secret.json
node_modules/
pending/*/
EOF
```

- [ ] **Step 5: Write initial state.json**

```bash
cat > ~/.claude/skills/yt-spy/state.json << 'EOF'
{
  "seen": {
    "nate-herk": [],
    "mark-kashef": [],
    "robo-nuggets": [],
    "chase-ai": []
  },
  "lastRun": null
}
EOF
```

- [ ] **Step 6: Install dependencies**

```bash
cd ~/.claude/skills/yt-spy && npm install
```

Expected output: `added N packages` with no errors. `node_modules/` created.

---

## Task 3: Write helpers/post-comment.js

**Files:**
- Create: `~/.claude/skills/yt-spy/helpers/post-comment.js`

- [ ] **Step 1: Write post-comment.js**

```bash
cat > ~/.claude/skills/yt-spy/helpers/post-comment.js << 'EOF'
#!/usr/bin/env node
'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const [, , videoId, commentText] = process.argv;

if (!videoId || !commentText) {
  console.error('Usage: node post-comment.js <videoId> <commentText>');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET
);

oauth2Client.setCredentials({
  access_token: process.env.YOUTUBE_ACCESS_TOKEN,
  refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
});

// Persist refreshed access token back to .env
oauth2Client.on('tokens', (tokens) => {
  if (tokens.access_token) {
    const envPath = path.join(__dirname, '../.env');
    let content = fs.readFileSync(envPath, 'utf8');
    content = content.replace(
      /^YOUTUBE_ACCESS_TOKEN=.*$/m,
      `YOUTUBE_ACCESS_TOKEN=${tokens.access_token}`
    );
    fs.writeFileSync(envPath, content);
  }
});

const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

(async () => {
  try {
    const response = await youtube.commentThreads.insert({
      part: ['snippet'],
      requestBody: {
        snippet: {
          videoId,
          topLevelComment: {
            snippet: { textOriginal: commentText },
          },
        },
      },
    });
    const commentId = response.data.id;
    console.log(`COMMENT_ID:${commentId}`);
    console.log(`COMMENT_URL:https://www.youtube.com/watch?v=${videoId}&lc=${commentId}`);
    process.exit(0);
  } catch (err) {
    const reason = err?.errors?.[0]?.reason;
    if (err.code === 403 || reason === 'quotaExceeded') {
      console.warn('WARNING: YouTube API quota exceeded. Comment not posted.');
    } else if (reason === 'forbidden') {
      console.warn('WARNING: Commenting forbidden on this video (disabled or restricted).');
    } else {
      console.error('ERROR posting comment:', err.message);
    }
    process.exit(1);
  }
})();
EOF
chmod +x ~/.claude/skills/yt-spy/helpers/post-comment.js
```

- [ ] **Step 2: Verify syntax**

```bash
node --check ~/.claude/skills/yt-spy/helpers/post-comment.js
echo "Exit code: $?"
```

Expected output: no errors, `Exit code: 0`.

- [ ] **Step 3: Verify usage error exits 1**

```bash
node ~/.claude/skills/yt-spy/helpers/post-comment.js
echo "Exit code: $?"
```

Expected output: `Usage: node post-comment.js <videoId> <commentText>` and `Exit code: 1`.

---

## Task 4: Write helpers/send-email.js

**Files:**
- Create: `~/.claude/skills/yt-spy/helpers/send-email.js`

- [ ] **Step 1: Write send-email.js**

```bash
cat > ~/.claude/skills/yt-spy/helpers/send-email.js << 'EOF'
#!/usr/bin/env node
'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const nodemailer = require('nodemailer');

let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', async () => {
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    console.error('ERROR: Invalid JSON on stdin');
    process.exit(1);
  }

  const {
    videoTitle, channelName, videoUrl, postedAgo,
    summary, originalAngle, script, thumbnailBrief, commentUrl,
  } = payload;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const htmlBody = `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px">
  <h2 style="color:#cc0000">[YT-SPY] New Claude Code Video Detected</h2>
  <table style="border-collapse:collapse;width:100%">
    <tr><td style="padding:4px 0"><strong>Channel:</strong></td><td>${channelName}</td></tr>
    <tr><td style="padding:4px 0"><strong>Video:</strong></td><td><a href="${videoUrl}">${videoTitle}</a></td></tr>
    <tr><td style="padding:4px 0"><strong>Posted:</strong></td><td>${postedAgo}</td></tr>
    <tr><td style="padding:4px 0"><strong>Comment:</strong></td><td><a href="${commentUrl}">${commentUrl || 'Not posted (quota exceeded)'}</a></td></tr>
  </table>

  <hr style="margin:20px 0"/>

  <h3>Video Summary</h3>
  <p>${summary}</p>

  <h3>Your Original Angle</h3>
  <p style="background:#f0f7ff;padding:12px;border-left:4px solid #0066cc">${originalAngle}</p>

  <hr style="margin:20px 0"/>

  <h3>Your Script (Kallaway Format)</h3>
  <pre style="background:#f5f5f5;padding:16px;white-space:pre-wrap;font-size:13px">${script}</pre>

  <hr style="margin:20px 0"/>

  <h3>Thumbnail Brief</h3>
  <pre style="background:#fff8e7;padding:16px;white-space:pre-wrap;font-size:13px">${thumbnailBrief}</pre>

  <hr style="margin:20px 0"/>
  <p style="color:#666;font-size:12px">
    Run <code>/yt-spy launch</code> in Claude Code to open Clickly with the thumbnail brief pre-loaded.
  </p>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"YT-Spy" <${process.env.GMAIL_USER}>`,
      to: 'Poolkraftllc@gmail.com',
      subject: `[YT-SPY] New Claude Code video: "${videoTitle}" — ${channelName}`,
      html: htmlBody,
    });
    console.log('Email sent successfully');
    process.exit(0);
  } catch (err) {
    console.error('ERROR sending email:', err.message);
    process.exit(1);
  }
});
EOF
chmod +x ~/.claude/skills/yt-spy/helpers/send-email.js
```

- [ ] **Step 2: Verify syntax**

```bash
node --check ~/.claude/skills/yt-spy/helpers/send-email.js
echo "Exit code: $?"
```

Expected: `Exit code: 0`.

- [ ] **Step 3: Verify bad JSON exits 1**

```bash
echo 'not-json' | node ~/.claude/skills/yt-spy/helpers/send-email.js
echo "Exit code: $?"
```

Expected: `ERROR: Invalid JSON on stdin` and `Exit code: 1`.

---

## Task 5: Write helpers/setup-oauth.js

**Files:**
- Create: `~/.claude/skills/yt-spy/helpers/setup-oauth.js`

- [ ] **Step 1: Write setup-oauth.js**

```bash
cat > ~/.claude/skills/yt-spy/helpers/setup-oauth.js << 'EOF'
#!/usr/bin/env node
'use strict';
const { google } = require('googleapis');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const SKILL_DIR = path.join(__dirname, '..');
const secretPath = path.join(SKILL_DIR, 'client_secret.json');
const envPath = path.join(SKILL_DIR, '.env');

console.log('\nYT-Spy OAuth Setup\n==================\n');

if (!fs.existsSync(secretPath)) {
  console.error('ERROR: client_secret.json not found.');
  console.error('Steps:');
  console.error('  1. Go to https://console.cloud.google.com/');
  console.error('  2. Create or select a project');
  console.error('  3. Enable YouTube Data API v3');
  console.error('  4. APIs & Services → Credentials → Create OAuth 2.0 Client ID (Desktop app)');
  console.error('  5. Download JSON → save as ~/.claude/skills/yt-spy/client_secret.json');
  process.exit(1);
}

const secretRaw = JSON.parse(fs.readFileSync(secretPath, 'utf8'));
const { client_id, client_secret, redirect_uris } = secretRaw.installed || secretRaw.web;
const redirectUri = redirect_uris?.[0] || 'urn:ietf:wg:oauth:2.0:oob';

const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/youtube.force-ssl'],
  prompt: 'consent',
});

console.log('Open this URL in your browser:\n');
console.log(authUrl);
console.log('\nAfter authorizing, paste the code here:');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('\nAuthorization code: ', async (code) => {
  rl.close();
  try {
    const { tokens } = await oauth2Client.getToken(code.trim());

    // Read existing .env or start fresh
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    if (envContent && !envContent.endsWith('\n')) envContent += '\n';

    const updates = {
      YOUTUBE_CLIENT_ID: client_id,
      YOUTUBE_CLIENT_SECRET: client_secret,
      YOUTUBE_ACCESS_TOKEN: tokens.access_token,
      YOUTUBE_REFRESH_TOKEN: tokens.refresh_token || '',
    };

    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const line = `${key}=${value}`;
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, line);
      } else {
        envContent += `${line}\n`;
      }
    }

    fs.writeFileSync(envPath, envContent);
    console.log('\nTokens saved to .env successfully!');
    console.log('Run /yt-spy to start monitoring.');
  } catch (err) {
    console.error('\nError exchanging code for tokens:', err.message);
    process.exit(1);
  }
});
EOF
chmod +x ~/.claude/skills/yt-spy/helpers/setup-oauth.js
```

- [ ] **Step 2: Verify syntax**

```bash
node --check ~/.claude/skills/yt-spy/helpers/setup-oauth.js
echo "Exit code: $?"
```

Expected: `Exit code: 0`.

---

## Task 6: Write SKILL.md

**Files:**
- Create: `~/.claude/skills/yt-spy/SKILL.md`

Replace `NATE_HERK_ID`, `MARK_KASHEF_ID`, `ROBO_NUGGETS_ID`, `CHASE_AI_ID` with actual channel IDs from Task 1.

- [ ] **Step 1: Write SKILL.md**

Write to `~/.claude/skills/yt-spy/SKILL.md`:

```markdown
---
name: yt-spy
description: |
  Monitor YouTube channels for new Claude Code videos. Generates Kallaway-style script in Mike's voice,
  posts first comment automatically, sends email alert to Poolkraftllc@gmail.com.
  
  Trigger phrases:
  - /yt-spy (or: "run yt-spy", "check for new Claude Code videos")
  - /yt-spy launch (open Clickly with pending thumbnail brief)
  - /yt-spy status (show last run + pending packages)
metadata:
  tags: [youtube, monitoring, content-creation, automation, cron]
---

# YT-Spy: YouTube Claude Code Channel Monitor

## Channel Configuration

| Creator | Channel Key | Channel ID | RSS URL |
|---------|------------|-----------|---------|
| Nate Herk | nate-herk | NATE_HERK_ID | https://www.youtube.com/feeds/videos.xml?channel_id=NATE_HERK_ID |
| Mark Kashef | mark-kashef | MARK_KASHEF_ID | https://www.youtube.com/feeds/videos.xml?channel_id=MARK_KASHEF_ID |
| Jay E / RoboNuggets | robo-nuggets | ROBO_NUGGETS_ID | https://www.youtube.com/feeds/videos.xml?channel_id=ROBO_NUGGETS_ID |
| Chase AI | chase-ai | CHASE_AI_ID | https://www.youtube.com/feeds/videos.xml?channel_id=CHASE_AI_ID |

**Claude Code detection keywords** (case-insensitive, title OR description):
- "Claude Code"
- "claude-code"  
- "Claude.ai Code"

**Paths:**
- Skill dir: `~/.claude/skills/yt-spy/`
- State: `~/.claude/skills/yt-spy/state.json`
- Pending packages: `~/.claude/skills/yt-spy/pending/`

---

## /yt-spy (Main Monitor Run)

### Step 1: Load State

```bash
cat ~/.claude/skills/yt-spy/state.json
```

Parse the JSON. The `seen` object maps channel keys to arrays of already-processed video IDs.

### Step 2: Poll Each RSS Feed

For each channel in the table above, fetch its RSS feed:

```bash
curl -s "https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID"
```

Parse the XML response. Each `<entry>` contains:
- `<yt:videoId>` — the video ID
- `<title>` — video title
- `<published>` — ISO 8601 publish timestamp
- `<media:description>` or `<summary>` — description text

Extract the top 5 newest entries from each feed.

### Step 3: Detect New Claude Code Videos

For each entry:
1. If the video ID is already in `state.json["seen"][channelKey]` → skip
2. If title OR description contains any Claude Code keyword (case-insensitive) → process
3. Otherwise → skip (not Claude Code content) but still add to seen to avoid future re-checks

### Step 4: Fetch Transcript

For each matched video, call:
```
mcp__youtube__get_transcript(videoId: "<VIDEO_ID>")
```

Save transcript text. If transcript is unavailable, proceed with title + description only and note this in the script preamble.

### Step 5: Generate Script + Original Angle

Read these foundation files before generating:
- `~/.claude/skills/video-script-writer/kallaway-patterns.md`
- `~/Desktop/Businesses/mike-drop-content/foundation/01-audience-avatar.md`
- `~/Desktop/Businesses/mike-drop-content/foundation/02-creator-persona.md`
- `~/Desktop/Businesses/mike-drop-content/foundation/03-niche-intelligence-report.md`

Use this prompt to generate the script:

```
You are generating a YouTube video script for Mike Kraft, a Claude Code content creator targeting "Dave" — a 35-48 corporate professional who has 45 minutes/night to work on their side hustle and is terrified of risking family finances.

COMPETITOR VIDEO: "[VIDEO TITLE]" by [CHANNEL NAME]
VIDEO URL: https://www.youtube.com/watch?v=[VIDEO_ID]
TRANSCRIPT:
[TRANSCRIPT TEXT]

TASK: Write a complete Kallaway-format YouTube script on this same topic that:
1. Covers the core topic but finds what the competitor did NOT cover or underexplained — make that Mike's edge (the "original angle")
2. Uses Mike's exact voice (see 02-creator-persona.md)
3. Targets Dave's fears, constraints, and aspirations (see 01-audience-avatar.md)
4. Follows all 9 Kallaway patterns exactly (see kallaway-patterns.md)
5. Bakes in Cialdini + Chase Hughes persuasion layers

VOICE RULES (CRITICAL — non-negotiable):
✅ USE: "Here's the thing," "No cap," "100%," "It's an absolute banger," "Automatically," "Baller"
❌ NEVER USE: "Hard stop," "smash that like," "In today's video," "might," "maybe," "try"
✅ State truths: "When you do this..." NOT "If you try..."
✅ Short punchy sentences. No hedging. Mentor tone, not hype-bro.

OUTPUT FORMAT:

## SUGGESTED TITLE
[title — punchy, specific, curiosity-gap or number-based]

## ORIGINAL ANGLE
[1-2 sentences: what gap you found and how Mike's video fills it differently]

## HOOK (0:00–0:30)
[verbatim script — pattern-interrupt opening, promise, proof]

## SCRIPT
[Full script with [0:30], [1:00], [2:00] etc. timestamp markers]

## PERSUASION LAYER NOTES
[2-3 bullets on which Cialdini + Chase Hughes elements are woven in]
```

### Step 6: Generate Thumbnail Brief

Immediately after the script, generate thumbnail brief with this prompt:

```
Generate a Clickly thumbnail brief for this video.

VIDEO TITLE: [TITLE]
HOOK: [first line of hook]
ORIGINAL ANGLE: [the angle from script]

OUTPUT FORMAT:

## THUMBNAIL BRIEF
**Hook text overlay:** [max 6 words, punchy, contrasting color]
**Mike's expression/body language:** [specific emotion and pose — e.g., "shocked/disbelief, pointing at text overlay"]
**Background setting:** [clean studio / specific color / location description]
**Props or on-screen elements:** [laptop, code on screen, phone, etc. if relevant]
**Color direction:** [dominant color + accent — e.g., "dark navy + electric yellow"]
**Clickly preset suggestion:** [Bold / Reaction / Minimal / Split-screen]
```

### Step 7: Save Pending Package

Create the package directory:

```bash
SLUG=$(echo "[VIDEO-TITLE]" | python3 -c "import sys,re; print(re.sub(r'[^a-z0-9-]','',re.sub(r'\s+','-',sys.stdin.read().strip().lower()))[:50])")
DATE=$(date +%Y-%m-%d)
PKG_DIR="$HOME/.claude/skills/yt-spy/pending/${DATE}-${SLUG}"
mkdir -p "$PKG_DIR"
```

Write three files:
1. `$PKG_DIR/script.md` — the full generated script
2. `$PKG_DIR/thumbnail-brief.md` — the thumbnail brief
3. `$PKG_DIR/video-meta.json`:
```json
{
  "videoId": "VIDEO_ID",
  "videoTitle": "VIDEO TITLE",
  "channelName": "CHANNEL NAME",
  "channelKey": "channel-key",
  "videoUrl": "https://www.youtube.com/watch?v=VIDEO_ID",
  "publishedAt": "ISO_TIMESTAMP",
  "processedAt": "ISO_TIMESTAMP"
}
```

### Step 8: Post Comment

Generate a 2-4 sentence comment in Mike's voice. Rules:
- Specific to THIS video's content (references something actually said)
- Genuine reaction — not promotional
- No "Hard stop"
- Adds one quick insight or angle
- Does NOT mention Mike's channel

Example tone:
"The part about [specific topic] is where most people get it backwards. [Quick insight]. 100% worth the watch."

Run:
```bash
node ~/.claude/skills/yt-spy/helpers/post-comment.js "VIDEO_ID" "COMMENT_TEXT"
```

Capture stdout. If output contains `COMMENT_URL:`, extract it. If exit code is 1, log warning and set commentUrl to "Not posted (quota exceeded)".

### Step 9: Send Email Alert

Build JSON payload:

```bash
python3 -c "
import json, sys
payload = {
  'videoTitle': 'VIDEO_TITLE',
  'channelName': 'CHANNEL_NAME',
  'videoUrl': 'https://www.youtube.com/watch?v=VIDEO_ID',
  'postedAgo': 'X minutes ago',
  'summary': 'TWO_SENTENCE_SUMMARY',
  'originalAngle': 'ORIGINAL_ANGLE_TEXT',
  'script': open('PKG_DIR/script.md').read(),
  'thumbnailBrief': open('PKG_DIR/thumbnail-brief.md').read(),
  'commentUrl': 'COMMENT_URL_OR_EMPTY'
}
print(json.dumps(payload))
" | node ~/.claude/skills/yt-spy/helpers/send-email.js
```

If send fails: save payload as `$PKG_DIR/email-payload.json` for manual retry.

### Step 10: Update State

After processing all channels, update state.json with all seen video IDs (both matches and skipped-non-Claude-Code):

```bash
python3 -c "
import json
from datetime import datetime, timezone

state_path = '$HOME/.claude/skills/yt-spy/state.json'
with open(state_path) as f:
    state = json.load(f)

# Add video IDs to appropriate channel key
state['seen']['CHANNEL_KEY'].append('VIDEO_ID')
state['lastRun'] = datetime.now(timezone.utc).isoformat()

with open(state_path, 'w') as f:
    json.dump(state, f, indent=2)
print('State updated')
"
```

---

## /yt-spy launch

1. List `~/.claude/skills/yt-spy/pending/` sorted newest-first
2. Read `thumbnail-brief.md` and `video-meta.json` from the most recent package
3. Display the video title and brief
4. Invoke the `clickly-thumbnail-creator` skill with the thumbnail brief loaded as context
5. After Clickly step completes, display `script.md` for reference while recording

---

## /yt-spy status

1. Read `state.json` → show `lastRun` and count of seen IDs per channel
2. List all directories in `pending/` with creation dates
3. Show total pending packages not yet launched

---

## Error Handling Rules

- RSS fetch fails → log `[WARN] RSS fetch failed for <channel>` → skip channel → continue
- Transcript unavailable → generate script from title + description only → note "Transcript unavailable" in script header
- Comment post fails (quota/forbidden) → log warning → continue with email
- Email send fails → save `email-payload.json` to pending package → log path for manual retry
- Never abort the entire run due to a single channel or video failure
```

- [ ] **Step 2: Replace placeholder channel IDs with actual IDs from Task 1**

```bash
# Replace NATE_HERK_ID with actual channel ID (repeat for each)
sed -i '' 's/NATE_HERK_ID/UC_ACTUAL_ID_HERE/g' ~/.claude/skills/yt-spy/SKILL.md
```

- [ ] **Step 3: Verify SKILL.md is valid**

```bash
wc -l ~/.claude/skills/yt-spy/SKILL.md
head -10 ~/.claude/skills/yt-spy/SKILL.md
```

Expected: file has 200+ lines, starts with valid YAML frontmatter (`---`).

---

## Task 7: Set Up CronCreate Scheduling

- [ ] **Step 1: Confirm Claude CLI is accessible**

```bash
which claude && claude --version
```

Expected: path like `/usr/local/bin/claude` and a version string.

- [ ] **Step 2: Create the cron job**

Use the CronCreate tool with:
- **Schedule:** every 15 minutes (`*/15 * * * *`)
- **Command:** `cd ~ && claude -p "Run the /yt-spy skill to check all 4 channels for new Claude Code videos" --no-interactive 2>> ~/.claude/skills/yt-spy/cron.log`

- [ ] **Step 3: Verify cron is registered**

Use CronList to confirm the job appears with correct schedule.

---

## Task 8: One-Time OAuth Setup (Manual — Mike runs this)

This task is documented for Mike to run once before the cron fires for the first time.

- [ ] **Step 1: Enable YouTube Data API v3**

1. Go to https://console.cloud.google.com/
2. Create a new project (or use existing)
3. APIs & Services → Library → search "YouTube Data API v3" → Enable

- [ ] **Step 2: Create OAuth credentials**

1. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
2. Application type: **Desktop app**
3. Name: "yt-spy"
4. Download JSON → save as `~/.claude/skills/yt-spy/client_secret.json`

- [ ] **Step 3: Set up Gmail App Password**

1. Go to myaccount.google.com → Security
2. Enable 2-Step Verification if not already on
3. App Passwords → Select app: "Mail" → Select device: "Mac" → Generate
4. Copy the 16-character password

- [ ] **Step 4: Create .env from template**

```bash
cp ~/.claude/skills/yt-spy/.env.example ~/.claude/skills/yt-spy/.env
# Edit .env: set GMAIL_USER and GMAIL_APP_PASSWORD with values from Step 3
```

- [ ] **Step 5: Run OAuth wizard**

```bash
node ~/.claude/skills/yt-spy/helpers/setup-oauth.js
```

Follow prompts: open URL in browser → authorize → paste code back.
Expected: "Tokens saved to .env successfully!"

---

## Task 9: End-to-End Test Run

- [ ] **Step 1: Find a recent Claude Code video from one of the 4 channels**

```bash
curl -s "https://www.youtube.com/feeds/videos.xml?channel_id=NATE_HERK_ID" | python3 -c "
import sys
from xml.etree import ElementTree as ET
root = ET.parse(sys.stdin).getroot()
ns = {'yt': 'http://www.youtube.com/xml/schemas/2015', 'atom': 'http://www.w3.org/2005/Atom'}
for entry in root.findall('atom:entry', ns)[:3]:
    vid = entry.find('yt:videoId', ns).text
    title = entry.find('atom:title', ns).text
    print(f'{vid}: {title}')
"
```

- [ ] **Step 2: Clear one video ID from state.json to force reprocessing**

Edit `state.json` to remove that video's ID from the seen list (or clear all seen IDs for testing).

- [ ] **Step 3: Run skill manually**

```bash
claude -p "Run the /yt-spy skill to check all 4 channels for new Claude Code videos"
```

- [ ] **Step 4: Verify outputs**

```bash
# Check pending package created
ls -la ~/.claude/skills/yt-spy/pending/

# Check script content
cat ~/.claude/skills/yt-spy/pending/*/script.md | head -30

# Check state updated
cat ~/.claude/skills/yt-spy/state.json

# Check email (look for [YT-SPY] subject in Poolkraftllc@gmail.com inbox)
```

- [ ] **Step 5: Verify comment on YouTube**

Open the YouTube video and check for a new comment matching what was generated.

- [ ] **Step 6: Test /yt-spy launch**

```bash
claude -p "/yt-spy launch"
```

Expected: Clickly opens with thumbnail brief pre-loaded.

---

## Task 10: Copy Spec to Docs

- [ ] **Step 1: Copy design spec**

```bash
cp /Users/michaelkraft/.claude/plans/witty-mixing-parnas.md \
   /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/docs/superpowers/specs/2026-04-10-yt-spy-design.md
```

- [ ] **Step 2: Commit the plan and spec**

```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
git add docs/superpowers/plans/2026-04-10-yt-spy-skill.md
git add docs/superpowers/specs/2026-04-10-yt-spy-design.md
git commit -m "docs: add yt-spy skill design spec and implementation plan"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All spec requirements have tasks — RSS polling (Task 6 SKILL.md Step 2), detection (Step 3), transcript (Step 4), script gen (Step 5), thumbnail brief (Step 6), pending package (Step 7), comment (Task 3 + Step 8), email (Task 4 + Step 9), state persistence (Task 2 Step 5 + Step 10), cron scheduling (Task 7), `/yt-spy launch` (Task 6 SKILL.md launch section), `/yt-spy status` (SKILL.md status section)
- [x] **No placeholders:** All code blocks are complete. Channel IDs noted as needing resolution in Task 1. All helper scripts are fully written.
- [x] **Type consistency:** `state.json` channel keys (`nate-herk`, `mark-kashef`, `robo-nuggets`, `chase-ai`) used consistently in SKILL.md and state initialization
- [x] **Error handling:** Every failure mode documented — RSS fail, transcript fail, comment quota, email fail
