# Skills Tab in Discover Panel - Design

**Date:** 2026-02-13
**Status:** Approved
**Author:** AI Assistant + Mike

## Purpose

Add a "Skills" tab to the Discover panel that surfaces Claude Code skills (~/.claude/skills/) alongside the existing slash commands. Users can browse and execute skills directly from the IDE with one click.

## Constraints

- Minimal changes to DiscoverPanel.tsx - no new components or API endpoints
- Hardcoded skill list (auto-discovery deferred to future iteration)
- Must not break existing Commands tab behavior
- Consistent with Coder1 design system (cyan accents, dark backgrounds)

## Success Criteria

- Tab bar switches between Commands and Skills views
- Skills are searchable by name, description, and category
- Clicking a skill injects `/skill <name>` into the terminal
- Existing slash command functionality unchanged

## Approaches Considered

1. **Minimal Tab Addition (selected)** - Add tabs + static skills array directly in DiscoverPanel. Fastest, simplest, consistent.
2. **Refactored Panel with Shared Components** - Extract shared components, separate tab files. Cleaner but more code changes for the same result.
3. **Separate Skills Panel** - New standalone panel with its own status bar button. Redundant, inconsistent with tab preference.

## Architecture

### Tab Bar

- Position: Below header, above search bar
- State: `useState<'commands' | 'skills'>('commands')`
- Active tab: cyan underline + white text
- Inactive tab: muted text with hover highlight
- Switching tabs clears search input

### Skills Data

Hardcoded array in DiscoverPanel.tsx:

```typescript
interface SkillItem {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  category: string;
}

const SKILLS_LIST: SkillItem[] = [
  { id: 'brainstorming', name: 'Brainstorming', description: 'Transform ideas into validated designs', icon: Lightbulb, category: 'PLANNING' },
  // ... 15-20 curated skills
];
```

### Execution Flow

1. User clicks skill item
2. `injectCommand('/skill <id>', { focusTerminal: true, addNewline: true })`
3. Toast: "Skill <name> sent to terminal"
4. Panel closes, search clears

### Search

Same search input filters the active tab's content. Filters on `name`, `description`, and `category`.

### Skills Tab Layout

- Category headers group skills (PLANNING, DEVELOPMENT, DEBUGGING, QUALITY, PROJECT MGMT, GIT)
- Same scrollable area and item styling as Commands tab
- No "Add Custom Command" form
- No install buttons

## Implementation Notes

- Only file modified: `components/status-bar/DiscoverPanel.tsx`
- New Lucide icon imports needed for skill icons
- Tab default is "Commands" so existing UX is unchanged on open
- Skills list is easy to swap for API call later
