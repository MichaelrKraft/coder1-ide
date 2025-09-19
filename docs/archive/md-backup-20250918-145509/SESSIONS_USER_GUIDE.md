# Sessions Button User Guide

## Overview

The Sessions button in the Explorer panel provides comprehensive session management functionality for the Coder1 IDE. It allows users to manage development sessions, create checkpoints, and restore previous work states seamlessly.

## Accessing Sessions

- **Location**: Left panel of the IDE → **Sessions** tab (Clock icon ⏰)
- **Visual State**: Tab highlights in cyan when active, with animated gradient background effects
- **Interface**: Clean, organized layout with current session at top, previous sessions below

## Current Session Management

When you have an active coding session running:

### Session Display
- **Live Timer**: Shows elapsed time in `HH:MM:SS` format, updating every second
- **Intelligent Session Title**: Auto-generated based on your activity:
  - 🐛 Bug fixes: "🐛 Bug Fix: [context]"
  - ✨ New features: "✨ Feature: [feature name]"
  - ♻️ Refactoring: "♻️ Refactor: [target]"
  - 🔧 Setup work: "🔧 Setup: [type]"
  - 📚 Documentation: "📚 Docs: [target]"
  - ⏰ Time-based fallback: "💻 Morning Coding Session"

### Project Detection
- **Smart Project Naming**: Automatically detects project type:
  - "Next.js App" for Next.js projects
  - "React TypeScript Project" for React + TS
  - "Node.js Project" for Node applications
  - Custom names based on directory structure

### Session Actions
- **End Session** button: Saves current state and properly ends the session
- **Refresh** button: Updates session list and checkpoint data
- **Checkpoint Count**: Shows number of saved checkpoints for current session

## Checkpoint System

### Automatic Checkpoints
- System automatically creates savepoints during development
- Captures complete IDE state including:
  - Open files and editor content
  - Terminal history and state
  - UI layout and preferences

### Checkpoint Restoration
- **One-Click Restore**: Click any checkpoint to restore that exact IDE state
- **Visual Feedback**: Loading spinners and "Restoring..." status during restoration
- **Quick Access**: Shows up to 3 most recent checkpoints in current session panel
- **Timestamp Display**: Shows when each checkpoint was created

### Checkpoint Details
- **Intelligent Naming**: Checkpoints get meaningful names based on activity
- **State Snapshot**: Complete capture of development environment
- **Instant Recovery**: Restore exact working state from any point

## Starting New Sessions

### When No Session is Active
- **Prominent Start Button**: Blue "Start New Session" button with Play icon
- **Automatic Initialization**: Creates session and begins activity tracking
- **Intelligent Naming**: Session gets appropriate name based on detected activity

### Session Creation Process
1. Click "Start New Session"
2. System creates session with timestamp
3. Begins monitoring file changes, terminal activity, and interactions
4. Auto-generates appropriate session name and project context

## Previous Sessions Management

### Session History
- **Chronological List**: All previous sessions sorted by most recent first
- **Rich Metadata**: Each session displays:
  - Enhanced title with emoji indicators
  - Project name and type
  - Creation date and total duration
  - Activity summary and file modification count

### Session Information Display
- **Duration Calculation**: Shows total time spent in each session
- **Activity Indicators**: Icons showing what type of work was done:
  - 📄 IDE work indicator
  - ⏰ Session timing information
  - 📁 Project context
- **Description**: Auto-generated summary of session activities

### One-Click Session Restoration
- **Click to Restore**: Click any previous session to restore it
- **Automatic Checkpoint Loading**: System finds and restores latest checkpoint automatically
- **Fallback Behavior**: If no checkpoints exist, switches to session context
- **State Recovery**: Restores:
  - File states and editor content
  - Terminal history
  - IDE layout and preferences

## Advanced Features

### Session Enhancement System
- **Activity Detection**: Automatically identifies session activities:
  - Testing (when .test. or .spec. files modified)
  - Documentation (README, .md files)
  - Styling (CSS, SCSS files)
  - API Development (api/, routes/ directories)
  - Building (npm run build commands)
  - Version Control (git operations)

- **Language Detection**: Identifies primary programming language used
- **File Tracking**: Monitors and counts file modifications
- **Claude Integration**: Tracks AI assistance usage and interactions

### Status Feedback System
- **Success Messages**: Green status bars for successful operations
- **Error Handling**: Red status bars with detailed error messages
- **Loading States**: Spinners and progress indicators during operations
- **Statistics Display**: 
  - Total session count
  - Current session checkpoint count
  - Activity summaries

## User Workflow Examples

### Starting a Fresh Coding Session
1. Navigate to Sessions tab in Explorer panel
2. Click "Start New Session" button
3. Begin coding - system automatically tracks activity
4. Session gets intelligent name based on your work
5. Checkpoints created automatically during development

### Resuming Previous Work
1. Open Sessions tab
2. Browse previous sessions list
3. Click desired session to restore
4. IDE automatically restores exact state from latest checkpoint
5. Continue working from where you left off

### Recovering from Mistakes
1. While in current session, view checkpoint list
2. Click on earlier checkpoint when code was working
3. IDE instantly restores to that exact state
4. Your mistake is undone, work state recovered

### Project Switching
1. Working on Project A in current session
2. Need to switch to Project B
3. Click Project B's previous session
4. IDE switches context completely to Project B
5. Return to Project A later by clicking its session

## Technical Implementation Details

### Backend APIs
- **Session Management**: `/api/sessions` - Create, read, update, delete sessions
- **Checkpoint System**: `/api/checkpoint` - Checkpoint creation and restoration
- **Session Restoration**: `/api/sessions/[id]/checkpoints/[checkpointId]/restore`

### Data Storage
- **Session Metadata**: Stored in `data/sessions/[sessionId]/metadata.json`
- **Checkpoints**: Individual checkpoint data in session directories
- **LocalStorage Integration**: Immediate state persistence for performance

### Event System
- **Cross-Component Communication**: Custom events for real-time updates
- **Session Change Events**: Notify other components when sessions switch
- **Checkpoint Events**: Broadcast checkpoint creation and restoration
- **Automatic Cleanup**: Deduplication and maintenance of session data

### Session Enhancement Service
- **Intelligent Naming Algorithm**: Analyzes activity patterns for meaningful names
- **Project Detection Logic**: Scans files and structure for project type
- **Activity Classification**: Categorizes development work automatically
- **Duration Calculation**: Precise timing for sessions and activities

## Best Practices

### Effective Session Management
- **Natural Workflow**: Start session when beginning focused work
- **Checkpoint Strategy**: Let system auto-create checkpoints, restore when needed
- **Session Naming**: Let intelligence system name sessions automatically
- **Recovery Usage**: Use checkpoints for quick recovery from mistakes

### Organization Tips
- **Project Sessions**: Each major project should have its own sessions
- **Feature Sessions**: Create new session for each major feature
- **Bug Fix Sessions**: Separate sessions for debugging work
- **Learning Sessions**: Use sessions to track learning and experimentation

## Troubleshooting

### Common Issues
- **Session Not Starting**: Check that backend server is running properly
- **Restoration Failures**: Verify checkpoint data exists and is not corrupted
- **Missing Checkpoints**: Check that file system has write permissions
- **Slow Loading**: Large sessions may take longer to load - be patient

### Recovery Steps
- **Refresh Sessions**: Use refresh button to reload session data
- **Browser Refresh**: If UI becomes unresponsive, refresh the page
- **Manual Recovery**: Check `data/sessions` directory for manual backup
- **Server Restart**: Restart development server if sessions stop working

---

*This guide covers the comprehensive session management system in Coder1 IDE, designed to provide seamless development workflow management and state recovery capabilities.*