# Detailed Prompt for AI Team Quality Gate Testing

**Purpose**: This prompt is designed to pass the 50%+ quality threshold by covering multiple aspects that the quality assessment looks for.

---

## 🎯 The Prompt (Copy-Paste This)

```
claude

I need help building a React dashboard component for my web application. Here are the detailed requirements:

FEATURES:
- Modern dashboard with clean, professional design
- 4 stat cards showing key metrics (users, revenue, growth, engagement)
- Interactive data visualization chart (line chart for trends)
- Responsive layout that works on mobile and desktop
- Dark mode support with smooth transitions
- Loading states and error handling

TECH STACK:
- React 18 with TypeScript
- Tailwind CSS for styling
- Recharts or Chart.js for data visualization
- React hooks for state management
- Framer Motion for animations (optional)

REQUIREMENTS:
- Component should be reusable and well-documented
- Props interface for passing in metric data
- Accessible (ARIA labels, keyboard navigation)
- Performance optimized (memo, useMemo where needed)
- Include PropTypes or TypeScript types
- Follow React best practices

DESIGN PREFERENCES:
- Clean, minimalist aesthetic
- Purple/blue gradient accents (#6366f1, #8b5cf6)
- Smooth hover effects and transitions
- Card-based layout with subtle shadows
- Mobile-first responsive approach

ACCEPTANCE CRITERIA:
- Component renders without errors
- Data updates reactively when props change
- Responsive across all screen sizes
- Passes accessibility checks
- Has proper TypeScript types
- Includes basic unit tests

Please help me build this dashboard component with a focus on code quality, reusability, and modern React patterns.
```

---

## 📊 Why This Prompt Passes Quality Gate

### Aspects Covered (Will Score 70-80%):

1. **Features** ✅ (4 stat cards, chart, responsive, dark mode)
2. **Tech Stack** ✅ (React, TypeScript, Tailwind, Recharts)
3. **Requirements** ✅ (reusable, documented, accessible, performant)
4. **Design** ✅ (minimalist, colors, effects, layout)
5. **Acceptance Criteria** ✅ (tests, types, responsive, accessible)
6. **Architecture** ✅ (component-based, hooks, patterns)
7. **Scope** ✅ (clear boundaries, specific deliverable)

### Quality Score Estimate:
```
aspectsDetected: 7 out of ~10 possible
score: ~70%
threshold: 50%
passed: TRUE ✅
```

---

## 🎮 How to Use

### Step 1: Open Terminal
```bash
# Navigate to http://localhost:3001/ide
# Click on main terminal tab
```

### Step 2: Paste Prompt
```bash
# Type exactly:
claude

# Then paste the detailed prompt above
# Press Enter
```

### Step 3: Wait for Response
```
# Claude will respond with analysis/questions
# This creates conversation history with rich context
```

### Step 4: Click AI Team
```
# After Claude responds, click "AI Team" button
# Quality gate will assess the conversation
# Should show: "✅ Context quality is sufficient for AI Team spawning."
# Agents will spawn!
```

---

## 🔍 What Happens Next

### Expected Server Logs:
```
🔍 Analyzing conversation history...
📊 Context Quality: 70% (7/10 aspects detected)
✅ Context quality is sufficient for AI Team spawning.
⚡ Spawning AI Team...
🤖 Connecting to AI Team Management System...

🤖 Created agent terminal session: session_X-frontend (frontend)
🔌 Socket connected to agent terminal: session_X-frontend
📺 Routing output from session_X-frontend (N chars)
📝 Output type: string, trimmed length: N
📝 Output preview: <content>...
📤 [DEBUG] Broadcasting to 1 socket(s)...
```

### Expected Browser:
```
✅ New agent terminal tabs appear (Frontend, Backend, etc.)
✅ Agent output displays in terminals
✅ OR clear diagnostic messages if output is empty
```

---

## 💡 Alternative Shorter Prompt (Medium Quality)

If you want something shorter that still passes (60% threshold):

```
claude

I want to build a modern React dashboard with the following:
- 4 metric cards (users, revenue, growth, engagement) 
- Line chart for trend visualization
- Responsive design with Tailwind CSS
- Dark mode toggle
- TypeScript for type safety
- Clean, professional UI with purple/blue gradients

Tech: React 18, TypeScript, Tailwind, Recharts
Make it reusable, accessible, and well-documented.
```

This should score ~60-65%, still passing the 50% threshold.

---

## 🎯 Testing Checklist

After spawning agents:

- [ ] Server shows "✅ Context quality is sufficient"
- [ ] Server shows "⚡ Spawning AI Team..."
- [ ] Agent terminal sessions created (check logs)
- [ ] Socket connections established (check logs)
- [ ] Enhanced logging appears:
  - [ ] `📺 Routing output from agentX`
  - [ ] `📝 Output type: string, trimmed length: N`
  - [ ] `📝 Output preview: <content>`
- [ ] Agent tabs appear in browser
- [ ] Output displays OR clear diagnostics show

---

**Ready to Test!** 🚀
