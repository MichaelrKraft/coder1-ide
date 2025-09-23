# Multi-Claude Tabs Feature

## Overview
The Multi-Claude Tabs feature allows you to run multiple Claude CLI sessions simultaneously in separate terminal tabs, all working in the same directory.

## How to Use

### 1. Access the IDE
Navigate to: `http://localhost:3001/ide`

### 2. Create New Claude Tabs
Click the **"➕ New Claude Tab"** button in the terminal tab bar. This will:
- Create a new terminal session
- Automatically run the `claude` command
- Name the tab "Claude 1", "Claude 2", etc.

### 3. Work in Parallel
Each Claude tab:
- Is a completely independent Claude CLI session
- Works in the same directory (`/Users/michaelkraft/autonomous_vibe_interface/`)
- Can edit different files simultaneously
- Maintains its own conversation context

## Example Workflow

```
Tab: Claude 1
> "Help me build the authentication system"
[Claude works on auth.js, login.jsx, etc.]

Tab: Claude 2  
> "Create a dashboard component with charts"
[Claude works on Dashboard.jsx, charts.js, etc.]

Tab: Claude 3
> "Write tests for the API endpoints"
[Claude works on api.test.js, auth.test.js, etc.]
```

## Benefits

- **True Parallelism**: Multiple Claude instances working simultaneously
- **User Control**: You orchestrate what each Claude works on
- **Shared Directory**: All changes are immediately visible to all Claudes
- **Natural Workflow**: Like having multiple developers on your team

## Important Notes

- Each Claude tab consumes its own Claude CLI resources
- File conflicts are possible if multiple Claudes edit the same file
- Server commands (npm run dev, etc.) affect all tabs
- Each tab maintains independent conversation history

## Removed Features

The complex "conductor" system with mock agents has been removed in favor of this simpler, more practical multi-Claude approach. The `/team` slash commands no longer work as they were part of the removed system.

## Technical Implementation

- Conductor service files removed
- Agent management system removed  
- Simple "New Claude Tab" button added
- Auto-runs `claude` command when tab opens
- Uses existing terminal infrastructure

This is Phase 1 of the multi-Claude implementation, focusing on simplicity and reliability.