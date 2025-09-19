# ParaThinker Beta Testing Guide

## Overview
ParaThinker is a parallel reasoning system that uses multiple AI strategies to solve complex problems. It's inspired by research showing 14-40% accuracy improvements over single reasoning chains.

## How to Test ParaThinker

### 1. Access Beta IDE
Navigate to: `http://localhost:3001/ide-beta`

### 2. Test via StatusBar Button
1. Look for the purple **ParaThinker** button in the status bar (bottom of IDE)
2. Click it to start parallel reasoning on the current context
3. The system will automatically detect:
   - Last terminal error
   - Current problem context
   - Active file context

### 3. Test via Terminal Command
1. Open the terminal in Beta IDE
2. Type: `/parathink` followed by your problem
3. Examples:
   ```bash
   /parathink how do I fix this TypeScript error?
   /parathink optimize this React component for performance
   /parathink design a database schema for a blog
   ```
4. Check status with: `/parathink status`

### 4. View Dashboard
When ParaThinker starts:
1. The Preview Panel will automatically switch to the ParaThinker dashboard
2. You'll see:
   - Real-time progress for each reasoning strategy
   - Individual solution paths
   - Confidence scores
   - Final voting results

## Test Scenarios

### Scenario 1: Error Resolution
1. Intentionally create an error in your code
2. Run the code to generate an error in terminal
3. Click ParaThinker button or type `/parathink`
4. Watch as 10 strategies analyze the error

### Scenario 2: Architecture Decision
1. Type in terminal: `/parathink should I use Redux or Context API for state management?`
2. Observe different perspectives from:
   - Pattern Recognition strategy
   - First Principles strategy
   - Performance-First strategy
   - User-Centric strategy

### Scenario 3: Code Optimization
1. Open a React component file
2. Type: `/parathink optimize this component`
3. Watch strategies like:
   - Performance Optimizer
   - Error Analysis
   - Security Focused
   - Provide different optimization approaches

## Understanding the Results

### Strategy Icons
- 🔬 Analytical Decomposition
- 🎯 Pattern Recognition
- 🏗️ First Principles
- ⏮️ Reverse Engineering
- 💡 Lateral Thinking
- 🎓 Domain Expert
- 🚨 Error Analysis
- ⚡ Performance First
- 👤 User Centric
- 🔒 Security Focused

### Confidence Scores
- **80-100%**: High confidence (green)
- **60-79%**: Medium confidence (yellow)
- **Below 60%**: Low confidence (orange)

### Voting System
- Each strategy votes for the best solution
- Weighted by confidence scores
- Final solution is synthesized from top votes

## API Testing

### Start a Session
```bash
curl -X POST http://localhost:3001/api/beta/parallel-reasoning/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "problem": "How do I implement authentication in Next.js?",
    "strategies": ["analytical", "pattern_matching", "security_focused"]
  }'
```

### Check Status
```bash
curl http://localhost:3001/api/beta/parallel-reasoning/status/[SESSION_ID]
```

### Get Results
```bash
curl http://localhost:3001/api/beta/parallel-reasoning/results/[SESSION_ID]
```

## What to Look For

### Success Indicators
- ✅ Multiple strategies start processing
- ✅ Progress bars move independently
- ✅ Different solutions emerge from different strategies
- ✅ Voting produces a synthesized solution
- ✅ Dashboard updates in real-time

### Potential Issues
- ⚠️ If no Claude API key: Strategies will fail with error
- ⚠️ If problem too vague: Low confidence scores
- ⚠️ If network issues: Some strategies may timeout

## Benefits Over Single Reasoning

1. **Avoids Tunnel Vision**: Multiple perspectives prevent getting stuck
2. **Higher Accuracy**: 14-40% improvement in problem-solving
3. **Confidence Scoring**: Know how reliable the solution is
4. **Best of All Worlds**: Combines analytical, creative, and practical approaches

## Feedback

After testing, consider:
- Which strategies were most helpful?
- Was the dashboard intuitive?
- Did parallel reasoning provide better solutions?
- Any UI/UX improvements needed?

## Next Steps

This is a beta feature. Future enhancements:
- Custom strategy selection
- Strategy learning/adaptation
- Historical session comparison
- Export reasoning paths
- Integration with main IDE (non-beta)

---

**Note**: ParaThinker is currently only available in Beta IDE at `/ide-beta` to ensure stability of the main IDE while we refine this powerful feature.