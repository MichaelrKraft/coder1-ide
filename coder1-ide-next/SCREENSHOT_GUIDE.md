# Screenshots Guide for Team Landing Page

This document outlines the exact screenshots needed to replace placeholder visuals in the team landing page with real IDE features.

## 🎯 Purpose

Replace emoji icons and placeholder descriptions in `/app/teams/page.tsx` with actual screenshots showing Coder1's team collaboration features in action.

## 📸 Screenshots Needed

### 1. Team Panel UI (`/public/screenshots/team-panel.png`)

**Where to find it:**
- Navigate to http://localhost:3001/ide (sign in first)
- Look at the status bar at the bottom
- Click the "Team" button with the Cloud icon
- This opens the Team Panel on the right side

**What to capture:**
- Full Team Panel showing:
  - Header with "Coder1 Team" and connection indicator (green dot)
  - Members list (at least 2-3 members with online status indicators)
  - Activity feed showing recent actions with timestamps
  - Knowledge base preview with contributor names
- Ensure the panel is fully visible and readable

**Dimensions:** ~400px wide x 600px tall

**Usage in landing page:** TeamCollaborationDemo section (line ~380)

---

### 2. Real-time Collaborative Editing (`/public/screenshots/collaborative-editing.png`)

**Where to find it:**
- Open a code file in Monaco Editor (left panel, File Explorer)
- If you have multiple users/sessions active, you'll see:
  - Other users' cursors in different colors
  - User presence indicators (colored avatars/badges)
  - Real-time text updates as others type

**What to capture:**
- Monaco Editor with visible:
  - Code with syntax highlighting
  - Multiple user cursors (if available, otherwise single cursor is OK)
  - User presence indicators at top of editor
  - Line numbers and code structure visible

**Dimensions:** ~800px wide x 500px tall

**Usage in landing page:** TeamFeaturesSection - "Stop Merge Conflicts" use case (line ~220)

---

### 3. Activity Feed Detail (`/public/screenshots/activity-feed.png`)

**Where to find it:**
- Inside the Team Panel (right side panel)
- Scroll to "Recent Activity" section
- Shows list of recent team actions

**What to capture:**
- Close-up of Activity Feed showing:
  - 4-5 recent activities
  - Emoji icons (📝, 🔄, ✅, etc.)
  - @username mentions in cyan color
  - Action descriptions
  - Time ago (5m ago, 10m ago, etc.)

**Dimensions:** ~350px wide x 300px tall

**Usage in landing page:** TeamCollaborationDemo section (line ~420)

---

### 4. Knowledge Base Cards (`/public/screenshots/knowledge-base.png`)

**Where to find it:**
- Inside the Team Panel (right side panel)
- Scroll to "Team Knowledge" section
- Shows cards with team learning/facts

**What to capture:**
- 2-3 Knowledge Base cards showing:
  - Contributor name (@mike, @testuser)
  - Confirmation count (3x confirmed, 5x confirmed)
  - Knowledge fact with category (e.g., "authentication-approach: JWT tokens")
  - Card background and borders

**Dimensions:** ~350px wide x 250px tall

**Usage in landing page:** TeamCollaborationDemo section (line ~440)

---

### 5. Status Bar with Team Indicators (`/public/screenshots/status-bar-team.png`)

**Where to find it:**
- Bottom of the IDE interface
- Status bar showing connection status and team info

**What to capture:**
- Full status bar showing:
  - Team button with Cloud icon
  - Connection indicators
  - Token counts (if visible)
  - Online members count
  - Presence indicators (green dots)

**Dimensions:** Full width (~1200px) x 44px tall

**Usage in landing page:** TeamHeroSection demo (line ~180)

---

### 6. File Explorer with Team Context (`/public/screenshots/file-explorer-team.png`)

**Where to find it:**
- Left side panel
- File Explorer showing project files
- Look for any team-related indicators (who's editing which file)

**What to capture:**
- File tree showing:
  - Folder structure
  - File names
  - Any presence indicators (who's viewing/editing)
  - Recent changes highlights

**Dimensions:** ~300px wide x 500px tall

**Usage in landing page:** TeamFeaturesSection - "Onboarding" use case (line ~210)

---

### 7. Terminal with Team Activity (`/public/screenshots/terminal-team.png`)

**Where to find it:**
- Bottom panel (Terminal)
- Shows command history and output
- May show team member actions if logged

**What to capture:**
- Terminal showing:
  - Command prompt
  - Recent commands (git, npm, etc.)
  - Output showing team coordination (if available)
  - Terminal tabs if multiple sessions

**Dimensions:** ~800px wide x 300px tall

**Usage in landing page:** TeamUseCasesSection - Distributed Team (line ~510)

---

### 8. Monaco Editor with Team Tooltip (`/public/screenshots/editor-tooltip.png`)

**Where to find it:**
- Monaco Editor (center panel)
- Hover over code to see tooltips
- Johnny5/Team AI suggestions should appear

**What to capture:**
- Editor with visible:
  - Code being edited
  - Tooltip showing team knowledge or AI suggestion
  - Reference to team pattern or contribution
  - Clear, readable text

**Dimensions:** ~600px wide x 400px tall

**Usage in landing page:** TeamFeaturesSection - "Code Reviews" use case (line ~260)

---

## 📁 File Organization

After capturing screenshots, save them to:
```
/Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/public/screenshots/
```

Create the directory if it doesn't exist:
```bash
mkdir -p /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next/public/screenshots
```

## 🔄 Integration Steps

After capturing all screenshots:

1. **Save screenshots** to `/public/screenshots/` directory
2. **Update `/app/teams/page.tsx`** to import and use the screenshots:

```typescript
import Image from 'next/image';

// Replace emoji icons with actual screenshots
<Image
  src="/screenshots/team-panel.png"
  alt="Team Panel UI showing members and activity"
  width={400}
  height={600}
  className="rounded-lg border border-gray-800/50 shadow-xl"
/>
```

3. **Test the landing page** at http://localhost:3001/teams to ensure images load correctly
4. **Optimize images** if needed (compress, resize for web)

## ✅ Checklist

- [ ] Screenshot 1: Team Panel UI
- [ ] Screenshot 2: Collaborative Editing
- [ ] Screenshot 3: Activity Feed Detail
- [ ] Screenshot 4: Knowledge Base Cards
- [ ] Screenshot 5: Status Bar with Team
- [ ] Screenshot 6: File Explorer with Team
- [ ] Screenshot 7: Terminal with Team Activity
- [ ] Screenshot 8: Editor with Team Tooltip
- [ ] All screenshots saved to `/public/screenshots/`
- [ ] `/app/teams/page.tsx` updated with Image components
- [ ] Landing page tested and images verified

## 🎨 Screenshot Tips

1. **Clean UI**: Hide any personal information or sensitive data
2. **High Resolution**: Capture at 2x resolution for retina displays
3. **Good Lighting**: Use the IDE's cyan/purple theme with proper contrast
4. **Readable Text**: Ensure all text is legible at display size
5. **Consistent Style**: All screenshots should use the same IDE theme
6. **Real Data**: Use realistic example data (code, file names, team members)
7. **Focus**: Crop to show only relevant UI elements
8. **Context**: Include enough surrounding UI for context

---

**Created:** February 2026
**Purpose:** Team Landing Page Enhancement
**Target:** `/app/teams/page.tsx`
