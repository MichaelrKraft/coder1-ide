# Newsletter Digest Skill Design

**Date:** 2026-02-16
**Status:** Approved
**Author:** Claude + Mike

## Overview

A Claude Code skill that consolidates newsletters from multiple Gmail accounts into a single daily digest, integrated with Johnny5's morning brief.

## Requirements

### Functional Requirements

1. Access 3 Gmail accounts via browser automation
2. Search for 11 configured newsletters
3. Extract clean content from each newsletter
4. Consolidate into single markdown digest
5. Save to `~/Documents/newsletters/YYYY-MM-DD-digest.md`
6. Add link to Johnny5 morning brief for one-click access

### Newsletter List

- Unicorner
- WKND AI
- a16z speedrun
- Foundevo
- Newszii
- Aarteez newsletter
- AI Secret
- My Claw Newsletter
- The AI Report
- The Hustle
- Superpower Daily

### Gmail Accounts

- Account 0 (u/0): support@callspot.ai
- Account 1 (u/1): support@leadspot.ai
- Account 2 (u/2): poolkraftllc@gmail.com

## Technical Approach

### Browser Automation (Claude-in-Chrome)

Uses browser automation rather than Gmail API because:
- No OAuth setup required
- Works with existing logged-in accounts
- Matches article-extractor pattern
- Simpler configuration

### Multi-Account Access

Gmail supports multiple signed-in accounts via URL:
```
https://mail.google.com/mail/u/0/  # Account 1
https://mail.google.com/mail/u/1/  # Account 2
https://mail.google.com/mail/u/2/  # Account 3
```

### Workflow

```
1. Load config (newsletter list)
2. For each account (0, 1, 2):
   a. Navigate to that account's Gmail
   b. For each newsletter:
      - Search: from:{sender} OR subject:{name} newer_than:1d
      - If found, open and extract content
   c. Move to next account
3. Consolidate all newsletters into single digest
4. Save to ~/Documents/newsletters/
5. Add brief item to Johnny5 morning brief
```

## Skill Structure

```
newsletter-digest/
├── SKILL.md              # Main skill workflow
├── config/
│   └── senders.json      # Newsletter configuration
└── scripts/
    └── create-digest.sh  # Filename generator
```

### Config File Format

```json
{
  "accounts": 3,
  "newsletters": [
    "Unicorner",
    "WKND AI",
    "a16z speedrun",
    "Foundevo",
    "Newszii",
    "Aarteez newsletter",
    "AI Secret",
    "My Claw Newsletter",
    "The AI Report",
    "The Hustle",
    "Superpower Daily"
  ]
}
```

## Output Format

### Digest File

```markdown
# Newsletter Digest - February 16, 2026

**Generated:** 5:30 AM PST
**Sources:** 3 Gmail accounts
**Newsletters found:** 8 of 11

---

## Table of Contents
1. [The Hustle](#the-hustle)
2. [a16z speedrun](#a16z-speedrun)
...

---

## The Hustle
**From:** Account 1 | **Received:** Feb 16, 6:02 AM

[Clean extracted content...]

---

*Newsletters not found today: Unicorner, Foundevo, Newszii*
```

### Morning Brief Integration

Adds item to `researchCompleted` section:

```typescript
{
  id: "newsletter-digest-2026-02-16",
  title: "Newsletter Digest Ready",
  description: "8 newsletters from 3 accounts consolidated",
  link: "~/Documents/newsletters/2026-02-16-digest.md",
  priority: "medium",
  actionable: true,
  action: "Read Digest"
}
```

## Error Handling

| Scenario | Action |
|----------|--------|
| Newsletter not found | Skip, note in footer |
| Account login required | Pause, notify user |
| Gmail UI changed | Fall back to accessibility tree |
| Rate limiting | Add delays between accounts |

## Pre-requisites

1. User logged into all 3 Gmail accounts in Chrome
2. Claude-in-Chrome MCP server running
3. Johnny5 morning brief enabled

## Scheduling

- Runs as Johnny5 overnight task (~5-6 AM)
- Digest ready when user checks morning brief
- Can also be invoked manually: "consolidate my newsletters"

## Success Criteria

1. Successfully extracts content from available newsletters
2. Produces clean, readable markdown digest
3. Link appears in morning brief
4. One-click opens the digest file
