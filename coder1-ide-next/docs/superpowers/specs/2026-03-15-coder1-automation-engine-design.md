# Coder1 Automation Engine — Design Spec

**Date:** 2026-03-15
**Status:** Implemented
**Author:** Claude Code (Subagent-Driven Development)

---

## Problem

Mike Kraft is a solo founder building Coder1 IDE at the beta stage. He needs to:
1. Monitor competitors (Cursor, Windsurf, Base44, V0, Replit) and thought leaders continuously — without manual effort each day
2. Maintain a consistent 3-posts/day social media presence (Twitter/X + LinkedIn) to build audience and brand
3. Build a compounding intelligence asset that improves over time and informs product decisions

All the individual Claude Code skills already existed. The gap was an **orchestration layer** that runs them automatically, chains their outputs, and connects to publishing via Zapier.

---

## Solution Overview

A daily automation system that:
- Fires every morning at 7 AM via macOS LaunchAgent
- Gathers competitive intelligence (YouTube transcripts + competitor sites + Obsidian vault)
- Generates 3 social media drafts in Mike's voice
- Delivers them to a Google Doc for human review
- Publishes to Twitter/X and LinkedIn via one-click Zapier webhooks

**Key principle:** Nothing publishes automatically. Every post requires a manual click in Google Docs.

---

## Architecture

```
macOS LaunchAgent (7:00 AM daily)
  → ~/scripts/coder1-daily-run.sh
    → claude --print "run daily-intelligence-and-content skill"

PHASE 1 — GATHER (runs in parallel)
  ├── YouTube: transcripts from 7 channels (new videos only, last 24h)
  │   Channels: Brian Casel, Greg Isenberg, Matt Wolfe, Matthew Berman,
  │             Alex Finn, Liam Ottley, Samin Yasar
  ├── Competitor sites: browser-check for new announcements
  │   Sites: cursor.sh, windsurf.ai, base44.com, v0.dev, replit.com
  └── Obsidian: read last 7 days of daily notes (voice anchoring)

PHASE 2 — SYNTHESIZE
  → Claude generates Daily Brief (300-500 words)
  → Logs row to Google Sheets "Coder1 Intelligence Log"
    Columns: Date | Top Source | Key Insight | Best Angle | Published?

PHASE 3 — GENERATE 3 DRAFTS
  Draft 1: Twitter Thread — 4-6 tweets (hook + insight + CTA)
  Draft 2: LinkedIn Post — 200-350 words (story + CTA + hashtags)
  Draft 3: Hot-take Tweet — ≤240 chars (contrarian, no hashtags)

PHASE 4 — DELIVER
  → Creates Google Doc: "Coder1 Daily: YYYY-MM-DD" in "Coder1 Content Drafts/"
  → Sends Gmail: "[Coder1] 3 drafts ready → [Doc link]"

REVIEW WORKFLOW (Mike)
  → Receives email with Doc link
  → Opens Doc, edits any draft
  → Clicks publish button (Google Apps Script custom menu)
    → Each button fires Zapier webhook → Twitter/X or LinkedIn

ZAPIER PUBLISHING
  Zap 1: coder1-publish-thread → Twitter thread (reply chain)
  Zap 2: coder1-publish-linkedin → LinkedIn post
  Zap 3: coder1-publish-tweet → Single tweet
```

---

## Files Created

| File | Purpose |
|------|---------|
| `~/.claude/skills/daily-intelligence-and-content.md` | Master orchestrator skill (4 phases, content prompts, error handling) |
| `~/scripts/coder1-daily-run.sh` | Shell wrapper: connectivity check, skill invocation, retry logic, logging |
| `~/Library/LaunchAgents/com.coder1.daily-intelligence.plist` | macOS scheduler: fires at 07:00 daily |
| `~/scripts/install-daily-automation.sh` | One-time idempotent setup script |
| `~/scripts/coder1-google-apps-script.js` | Google Apps Script: Publish buttons, Doc parsing, Zapier webhooks, Sheets update |
| `~/scripts/ZAPIER_SETUP_GUIDE.md` | Step-by-step instructions for creating the 3 Zapier Zaps |

---

## Design Decisions

### Human-in-the-Loop (Non-Negotiable)
Content never publishes automatically. The Google Docs review step is mandatory. This prevents brand damage from poor AI-generated posts and ensures Mike maintains authentic voice.

### Daily 7 AM Cadence
3 drafts per day = ~21 posts/week when fully reviewed. Set at 7 AM so drafts are ready for Mike's morning review before his day starts.

### Google Sheets as Intelligence Archive
Every day's brief is logged permanently. After 6 months this becomes a competitive intelligence dataset showing: which channels are most valuable, which angles perform best, competitor announcement patterns. This compounds in value over time.

### Obsidian Voice Anchoring
Reading Mike's last 7 daily notes before generating content ensures drafts sound like him, not generic AI. This is the most important quality mechanism in the entire system.

### Error Tolerance
The system is designed to produce useful output even when some inputs fail. Individual YouTube channels or competitor sites can fail without aborting the run. Only Google Doc creation failure is fatal (since that's the primary deliverable).

### Reuse of Existing Skills
No existing skills were modified. The orchestrator invokes patterns from competitor-monitoring-loop, competitor-content-pipeline, viral-tweet-writer, and content-studio by including their content format rules and prompts inline.

---

## Google Sheets Schema

**Sheet: "Daily Briefs"**
| Column | Header | Description |
|--------|--------|-------------|
| A | Date | YYYY-MM-DD |
| B | Top Source | Most interesting channel/competitor today |
| C | Key Insight | One sentence summary |
| D | Best Angle | Best content angle identified |
| E | Published? | Filled by Apps Script when content is published |

**Sheet: "Errors"**
| Column | Header | Description |
|--------|--------|-------------|
| A | Date | YYYY-MM-DD |
| B | Phase | Which phase failed (gather/synthesize/generate/deliver) |
| C | Error Message | Error description |
| D | Resolved? | Manual tracking column |

---

## Google Doc Section Format

The Apps Script parses Docs by exact heading text. The skill generates Docs with these section headers (must not be changed):

```
DRAFT 1: TWITTER THREAD
DRAFT 2: LINKEDIN POST
DRAFT 3: HOT-TAKE TWEET
```

Each section ends with a marker line:
- `— End of thread —`
- `— End of LinkedIn post —`
- `— End of tweet —`

---

## Zapier Webhook Payload Formats

**Thread payload** (`{platform: "twitter_thread"}`)
```json
{
  "platform": "twitter_thread",
  "tweets": ["1/ Hook...", "2/ Point...", "3/ CTA..."],
  "tweet_count": 3,
  "hook": "1/ Hook...",
  "date": "YYYY-MM-DD",
  "timestamp": "ISO8601"
}
```

**LinkedIn payload** (`{platform: "linkedin"}`)
```json
{
  "platform": "linkedin",
  "content": "Full post text\n\n#Hashtag1 #Hashtag2",
  "char_count": 342,
  "date": "YYYY-MM-DD",
  "timestamp": "ISO8601"
}
```

**Tweet payload** (`{platform: "twitter_single"}`)
```json
{
  "platform": "twitter_single",
  "content": "The single tweet text",
  "char_count": 180,
  "date": "YYYY-MM-DD",
  "timestamp": "ISO8601"
}
```

---

## First-Time Setup Checklist

- [ ] Create Google Drive folder: `Coder1 Content Drafts`
- [ ] Create Google Sheets: `Coder1 Intelligence Log` (two tabs: Daily Briefs, Errors)
- [ ] Copy Sheets ID into `daily-intelligence-and-content.md` and `coder1-google-apps-script.js`
- [ ] Create a Google Doc → paste Apps Script → authorize → verify menu appears
- [ ] Follow `~/scripts/ZAPIER_SETUP_GUIDE.md` to create 3 Zaps
- [ ] Copy 3 webhook URLs into Apps Script and skill configuration
- [ ] Run `~/scripts/install-daily-automation.sh`
- [ ] Test: `launchctl start com.coder1.daily-intelligence`
- [ ] Monitor: `tail -f ~/logs/coder1-daily-$(date +%Y-%m-%d).log`

---

## Future Enhancements

1. **Engagement tracking**: Zapier reads engagement 24h post-publish → logs to Sheets "Performance" tab → Claude learns which angles perform best over time
2. **Follow-up content**: If a post performs above threshold, next-day system auto-generates a follow-up angle
3. **Newsletter draft**: 4th daily draft (newsletter section) added once email list exists
4. **Cloud cron**: Move LaunchAgent to Render.com free-tier worker — runs even when Mac is off
5. **Competitive alerts**: Immediate Gmail/Slack notification if a competitor announces a major feature (without waiting for 7 AM)
6. **Reddit monitoring**: Add r/ClaudeAI, r/cursor, r/LocalLLaMA to Phase 1 gather — rich source of user pain points
