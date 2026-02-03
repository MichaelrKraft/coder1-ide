# Skills.sh Integration - Post-Alpha Feature

**Status**: DEFERRED - Implement after Alpha Launch
**Priority**: Medium (nice-to-have enhancement)
**Created**: 2025-02-02
**Reference Session**: Discussion with Claude about skills.sh integration

---

## Executive Summary

[skills.sh](https://skills.sh/) is a public registry of 36,000+ reusable AI agent skills. This document outlines how to integrate it with Coder1's existing Templates Hub to provide users access to community skills alongside your curated collection.

**Key Decision**: Enhance the existing Templates Hub page rather than building a new IDE panel. This is lower risk and leverages existing infrastructure.

---

## What is skills.sh?

- **Registry**: 36,000+ skills ranked by installation count
- **Installation**: `npx skills add owner/repo`
- **Skill Format**: `SKILL.md` file + optional `scripts/` and `references/` folders
- **Top Skills**: vercel-labs/ai-sdk (84K installs), react-best-practices (84K), web-design-guidelines (63K)
- **Supported**: Claude Code, Cursor, GitHub Copilot, Cline, and many others

---

## Current State: What You Already Have

### Templates Hub (`/CANONICAL/templates-hub.html`)
- 44 templates across 5 categories
- Beautiful UI with 3D card effects, search, filtering
- One-click installation via API endpoints
- Categories: AI Agents, MCP Integrations, Smart Hooks, Quick Commands, Skills

### Existing APIs
- `/api/templates/install-mcp/` - MCP installation
- `/api/skills/install` - Skills installation
- `/api/agents/install` - Agent installation

### What's Working Well
- Visual polish (3D effects, glowing borders, animations)
- Clear organization with pill filters
- Installation UX with loading states
- localStorage persistence for installed state

---

## Recommended Implementation

### Option A: Add "Community Skills" Category (Simplest)

Add a new category to Templates Hub that pulls from skills.sh:

```javascript
// In templates-hub-fix.js, add new category
const CATEGORIES = [
  { id: 'all', name: 'All', icon: 'fa-th-large' },
  { id: 'agents', name: 'AI Agents', icon: 'fa-robot', count: 15 },
  { id: 'mcp', name: 'MCP Integrations', icon: 'fa-plug', count: 15 },
  { id: 'hooks', name: 'Smart Hooks', icon: 'fa-bolt', count: 7 },
  { id: 'commands', name: 'Quick Commands', icon: 'fa-terminal', count: 7 },
  // NEW:
  { id: 'community', name: 'Community Skills', icon: 'fa-users', count: '36K+' }
];
```

**Implementation Steps:**

1. **Create proxy API route** to fetch skills.sh data:
   ```
   /api/skills-browser/search?q=react&page=1
   ```

2. **Cache results** server-side (15-minute TTL) to avoid rate limiting

3. **Add "Community" tab** to Templates Hub that loads from this API

4. **Mark Coder1 templates** with a "Verified" badge to differentiate

5. **Installation** uses existing terminal injection pattern:
   ```javascript
   const command = `npx skills add ${skillId}`;
   // Inject into terminal or show copy button
   ```

### Option B: IDE Quick-Access Panel (More Complex)

Add a button in the IDE status bar that opens a slide-up panel for quick skill discovery. This touches core IDE code - **not recommended before beta stability**.

---

## Technical Architecture

### Data Flow
```
skills.sh Registry
       |
       v
/api/skills-browser/search (Next.js proxy with caching)
       |
       v
Templates Hub UI (new "Community" category)
       |
       v
Terminal command injection OR copy-to-clipboard
```

### Suggested File Structure
```
coder1-ide-next/
├── app/api/skills-browser/
│   ├── search/route.ts      # Proxy to skills.sh with caching
│   ├── featured/route.ts    # Coder1 curated picks
│   └── trending/route.ts    # Top skills by installs
└── lib/skills-browser/
    ├── skills-sh-client.ts  # Fetch + parse skills.sh
    └── cache.ts             # In-memory cache with TTL
```

### API Implementation Notes

**Challenge**: skills.sh may not have a public API, so you may need to:
1. Scrape the leaderboard page with cheerio
2. Use GitHub API to search for skill repos
3. Contact skills.sh about API access

**Caching Strategy**:
```typescript
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const skillsCache = new Map<string, { data: any; fetchedAt: number }>();
```

---

## UI/UX Recommendations

### 1. Differentiate Coder1 vs Community
- Add "Coder1 Verified" badge to your 44 curated templates
- Community skills show "Community" badge
- Featured banner: "Coder1 Picks" section at top

### 2. Add "Installed" Management
- New filter: "Show Installed Only"
- Ability to see what's installed and where
- Uninstall option (remove from ~/.claude/skills/)

### 3. Search Improvements
- Add sort options: Trending, Most Installed, Recently Added
- Filter by technology tags
- "Smart" search: "show me React testing skills"

### 4. Installation Feedback
- Show progress in terminal
- Toast notification on success/failure
- Update card UI to show "Installed" state

---

## Coder1 Featured Skills (Starter List)

Curate 10-15 skills that work well with Coder1:

```javascript
const CODER1_FEATURED = [
  {
    id: 'vercel-labs/ai-sdk',
    reason: 'Essential for AI-powered applications',
    tags: ['ai', 'essential']
  },
  {
    id: 'anthropics/claude-code-rules',
    reason: 'Official Claude Code configuration',
    tags: ['claude', 'essential']
  },
  {
    id: 'vercel-labs/react-best-practices',
    reason: 'React patterns and conventions',
    tags: ['react', 'frontend']
  },
  {
    id: 'stripe/stripe-agent-toolkit',
    reason: 'Payment integration patterns',
    tags: ['payments', 'integration']
  },
  // Add more based on skills.sh leaderboard
];
```

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| skills.sh changes format | Cache data, graceful fallbacks |
| Rate limiting | Server-side caching, respect limits |
| Quality variance in community skills | Feature "Verified" Coder1 picks prominently |
| Breaking Templates Hub | Test in staging, feature flag |

---

## Implementation Checklist

- [ ] Create `/api/skills-browser/search/route.ts` proxy endpoint
- [ ] Implement server-side caching (15-min TTL)
- [ ] Add "Community Skills" category to Templates Hub
- [ ] Create featured skills data file
- [ ] Add "Coder1 Verified" badge to existing templates
- [ ] Add "Installed" filter/view
- [ ] Test installation flow end-to-end
- [ ] Add loading states and error handling
- [ ] Document for users

---

## Resources

- **skills.sh**: https://skills.sh/
- **skills.sh docs**: https://skills.sh/docs
- **Example skill repo**: https://github.com/vercel-labs/agent-skills
- **Installation command**: `npx skills add owner/repo`

---

## Session Context

This document was created after reviewing:
1. The Karpathy-inspired CLAUDE.md article (behavioral guardrails for LLMs)
2. skills.sh registry and installation pattern
3. Existing Coder1 Templates Hub implementation
4. Coder1 IDE architecture (Johnny5 skills, Wcygan commands, DiscoverPanel)

**Decision**: Defer IDE panel implementation. Focus on enhancing Templates Hub as it's lower risk and already working well.

---

*Last Updated: 2025-02-02*
