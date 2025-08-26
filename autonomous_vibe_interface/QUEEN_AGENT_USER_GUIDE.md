# 👑 Queen Agent User Guide - CoderOne IDE

## Overview

The Queen Agent is your AI project coordinator that transforms plain English descriptions into actionable tasks for specialist AI agents. Instead of manually managing multiple agents, simply answer 5 simple questions and watch your AI team spring into action.

## How to Use Queen Agent

### Step 1: Start AI Team
1. Open CoderOne IDE at http://localhost:3000/ide
2. In the terminal, type `claude code` and press Enter
3. Click the **AI Team** button in the terminal header
4. Agents will begin spawning automatically

### Step 2: Open Queen Agent
1. Look for the preview panel (right side of IDE)
2. Click the **👑 Queen Agent** tab (it's the first tab, highlighted in blue)
3. The Queen Agent interface will open with the first question

### Step 3: Answer 5 Simple Questions

The Queen will ask you these questions:

1. **"Frontend or full-stack application?"**
   - Answer: "frontend" for UI-only projects
   - Answer: "fullstack" or "full-stack" for complete applications

2. **"Who is your ideal customer avatar?"**
   - Examples: "startup founders", "enterprise users", "young professionals", "developers"
   - This helps tailor the UI/UX appropriately

3. **"User authentication needed? (yes/no)"**
   - Answer: "yes" to include login/register functionality
   - Answer: "no" for public applications

4. **"Database/API required? (yes/no)"**
   - Answer: "yes" if you need data persistence
   - Answer: "no" for static applications

5. **"Any special requirements or features?"**
   - Examples: "dark mode", "mobile responsive", "real-time updates", "payment integration"
   - Or simply: "none" for standard features

### Step 4: Task Generation & Assignment

After answering all questions:
- Queen Agent analyzes your requirements
- Generates specific, actionable tasks
- Automatically assigns tasks to appropriate agents:
  - 🎨 **Frontend Developer**: UI components, React, responsive design
  - ⚙️ **Backend Developer**: APIs, database, authentication

### Step 5: Monitor Progress

1. Click on individual agent tabs to see them working
2. Watch for blue "UPDATE FROM QUEEN" messages
3. Agents will show their progress in real-time
4. Check the terminal for detailed output

## Example Conversations

### Example 1: Task Management App
```
Q1: Frontend or full-stack application?
A1: fullstack

Q2: Who is your ideal customer avatar?
A2: startup teams

Q3: User authentication needed?
A3: yes

Q4: Database/API required?
A4: yes

Q5: Any special requirements or features?
A5: drag and drop tasks, team collaboration
```

**Generated Tasks:**
- Frontend: "Create a React application for startup teams with authentication components including form validation and responsive design. Special requirements: drag and drop tasks, team collaboration"
- Backend: "Build Express.js backend with JWT authentication system including login/register endpoints, password hashing, and middleware protection with database integration and CRUD operations. Special requirements: drag and drop tasks, team collaboration"

### Example 2: Landing Page
```
Q1: Frontend or full-stack application?
A1: frontend

Q2: Who is your ideal customer avatar?
A2: potential customers

Q3: User authentication needed?
A3: no

Q4: Database/API required?
A4: no

Q5: Any special requirements or features?
A5: animations, contact form
```

**Generated Task:**
- Frontend: "Create a React application for potential customers with a clean, responsive interface. Special requirements: animations, contact form"

## Features

### Visual Feedback
- **Blue Queen Tab**: Always visible, indicates coordination mode
- **Progress Indicator**: Shows current question number
- **Answer History**: See all your previous answers
- **Task Display**: Clear view of generated and assigned tasks
- **Live Status**: Real-time updates on task assignment

### Smart Task Generation
- **Role-Specific Context**: Each agent receives tasks tailored to their expertise
- **Comprehensive Instructions**: Tasks include all necessary details
- **Automatic Broadcasting**: No manual task distribution needed

### Error Recovery
- **Robust Error Handling**: Gracefully handles missing agents
- **Reset Button**: Start a new project anytime with "Start New Project" button
- **Auto-Recovery**: Continues working even if some agents fail

## Tips for Success

### Best Practices
1. **Be Specific**: The more detail in your answers, the better the tasks
2. **Think About Users**: Your customer avatar shapes the entire design
3. **Start Simple**: You can always add features later
4. **Trust the Process**: Let Queen Agent handle the coordination

### Common Patterns
- **MVP First**: Start with "standard features", iterate later
- **User-Centric**: Always specify your target audience
- **Full-Stack Default**: Most modern apps need both frontend and backend
- **Auth is Common**: Most apps benefit from user accounts

### Troubleshooting

**Queen tab not appearing?**
- Ensure AI Team is active (button clicked)
- Check that agents have spawned
- Refresh the page if needed

**Tasks not being sent?**
- Verify agents are in "idle" or "working" state
- Check the browser console for errors
- Ensure you answered all 5 questions

**Want to start over?**
- Click "Start New Project" button after tasks are generated
- Or refresh the page to reset everything

## Advanced Usage

### Understanding Task Distribution
The Queen Agent uses intelligent routing:
- Frontend tasks → Frontend Developer agent
- Backend tasks → Backend Developer agent
- Full-stack projects → Both agents work in parallel

### Monitoring Coordination
Look for these indicators:
- **Queen Messages**: Blue-highlighted broadcasts
- **Agent Status**: Working (⚡), Completed (✅), Error (❌)
- **Session ID**: Bottom of panel for debugging

### Integration with Claude Code
Queen Agent works seamlessly with Claude Code CLI:
- Agents receive tasks as if you typed them manually
- Full Claude Code context and capabilities
- Automatic permission handling

## The Magic 🪄

In just 30 seconds, you can go from idea to implementation:
1. **5 seconds**: Click AI Team button
2. **20 seconds**: Answer 5 questions
3. **5 seconds**: Tasks generated and assigned
4. **Result**: Multiple AI agents coding your project in parallel!

No more:
- Manual task delegation
- Context switching between agents
- Remembering who's doing what
- Coordination overhead

## Summary

The Queen Agent transforms you from a project manager into a project visionary. Describe what you want to build in plain English, and watch as your AI team brings it to life with perfect coordination.

**Remember**: The Queen Agent makes you feel like you have an expert project manager who understands both your vision and your technical team's capabilities. That's not just good software—that's magic.

---

*Queen Agent v1.0 - Part of the CoderOne IDE Suite*
*Built for the future of collaborative AI development*