# Johnny5 + HIX AI Integration Design

**Date**: 2026-02-23
**Status**: Approved
**Approach**: Skill-Driven Automation (Approach 3)

## Overview

Enable Johnny5 to autonomously use HIX AI for content creation via the `hix-ai` skill and Claude-in-Chrome MCP browser automation.

## Requirements

| Requirement | Decision |
|-------------|----------|
| **Triggers** | Natural language, cron/scheduled, workflow triggers |
| **Output** | Download to local folder + store in Johnny5 memory |
| **Autonomy** | Collaborative - Johnny5 proposes, user refines, then executes |

## Architecture

```
User Request
    ↓
Johnny5 Chat (Claude Code CLI via Bridge)
    ↓
Loads hix-ai skill (knowledge + prompts)
    ↓
Uses Claude-in-Chrome MCP tools
    ↓
Automates HIX AI web interface
    ↓
Downloads content → ~/johnny5-content/hix-ai/
    ↓
Logs to Johnny5 memory
```

## Components

### 1. HIX AI Skill
**Location**: `~/.claude/skills/hix-ai/`

Provides:
- Platform knowledge (tools, models, capabilities)
- Model selection guide
- Prompt templates
- Browser automation reference

Auto-triggers on keywords: "HIX", "hix.ai", "HIX AI"

### 2. Claude-in-Chrome MCP
**Existing Tool**: `mcp__claude-in-chrome__*`

Used for:
- Navigation (`navigate`)
- Form input (`form_input`, `fill`)
- Clicking (`click`)
- Screenshots (`take_screenshot`)
- File downloads (via browser)

### 3. Content Storage
**Location**: `~/johnny5-content/hix-ai/YYYY-MM-DD/`

Structure:
```
~/johnny5-content/
└── hix-ai/
    └── 2026-02-23/
        ├── coder1-product-image-001.png
        ├── coder1-product-image-002.png
        └── manifest.json
```

**manifest.json**:
```json
{
  "created": "2026-02-23T19:45:00Z",
  "tool": "AI Image",
  "model": "Nano Banana Pro",
  "prompt": "...",
  "files": ["coder1-product-image-001.png"],
  "settings": { "aspect": "16:9", "resolution": "4K" }
}
```

### 4. Memory Integration
Johnny5 stores facts about created content:
```
Fact: Created HIX AI product images for Coder1 on 2026-02-23
Type: content-creation
Files: ~/johnny5-content/hix-ai/2026-02-23/
```

## Workflow

### User Interaction Flow

1. **User Request**:
   ```
   "Johnny5, create a product image for Coder1 using HIX AI"
   ```

2. **Johnny5 Proposes Plan**:
   ```
   I'll create a product image for Coder1 using HIX AI:

   Model: Nano Banana Pro (best for commercial shots)
   Prompt: "Professional product photography of Coder1 IDE..."
   Settings: 16:9, 4K, 2 variations

   Approve this plan? (y/n/refine)
   ```

3. **User Approves/Refines**

4. **Johnny5 Executes** via Claude-in-Chrome:
   - Navigate to hix.ai
   - Sign in (if needed)
   - Select AI Image → Nano Banana Pro
   - Enter prompt
   - Set aspect ratio, resolution
   - Generate
   - Download files

5. **Johnny5 Reports**:
   ```
   Created 2 images:
   - ~/johnny5-content/hix-ai/2026-02-23/coder1-product-001.png
   - ~/johnny5-content/hix-ai/2026-02-23/coder1-product-002.png

   Logged to memory for future reference.
   ```

## HIX AI Skill Reference

The skill contains detailed references for:

| Reference File | Content |
|----------------|---------|
| `browser-automation.md` | Step-by-step UI navigation |
| `ai-image.md` | Models, settings, editing |
| `ai-video.md` | Video modes and workflows |
| `ai-slides.md` | Presentation creation |
| `ai-writer.md` | Writing and research |
| `deep-research.md` | Research reports |
| `prompt-templates.md` | Ready-to-use prompts |

## Future Evolution

When usage patterns emerge, consider evolving to:

**Approach 1: MCP Tool Integration**
- Build dedicated `mcp__hix-ai__*` tools
- Cleaner API for common operations
- Reusable outside Johnny5 context

## No Implementation Required

This design uses existing components:
- `hix-ai` skill (already installed)
- Claude-in-Chrome MCP (already available)
- Johnny5's memory system (existing)

Johnny5 can use HIX AI immediately via natural language.
