# Frictionless User Onboarding Plan for Coder1 IDE with Claude Code

## Executive Summary
Create a seamless onboarding experience that gets users from landing page to productive coding in under 2 minutes, with clear paths to premium features like agent supervision and parallel agents.

## Current State Analysis
- **Entry Point**: Product Creation Hub at port 3000 → IDE at `/ide` route
- **Flow**: PRD generation → Wireframe creation → "Enter IDE" button → Opens new tab
- **Authentication**: None currently implemented
- **Claude Code Integration**: Uses CLI manager with API key support
- **Premium Features**: SupervisionEngine.ts exists but not integrated

## Proposed Onboarding Flow

### Phase 1: Landing & Quick Start (0-30 seconds)
1. **Smart Landing Page**
   - Auto-detect if user has Claude Code API key in browser storage
   - Two prominent paths: "Start Free" vs "Start with Claude Code Pro"
   - One-click demo project for instant gratification

2. **Instant IDE Access**
   - Remove intermediate steps for experienced users
   - Add "Skip to IDE" button that bypasses PRD generation
   - Pre-populate with sample project for first-time users

### Phase 2: Claude Code Setup (30-60 seconds)
1. **API Key Configuration**
   - Floating setup wizard on first IDE entry
   - Auto-detect Claude Code CLI availability
   - Option to use free tier with limitations

2. **Quick Start Templates**
   - 5 pre-built project templates with PRDs
   - "Clone & Code" functionality
   - Each template demonstrates different Claude Code capabilities

### Phase 3: Premium Features Discovery (60-90 seconds)
1. **Feature Showcase**
   - Interactive tour highlighting premium features
   - Live preview of agent supervision in action
   - "Try Premium Free for 7 Days" prominent CTA

2. **Progressive Enhancement**
   - Start with single agent, show "Unlock Parallel Agents" when hitting limits
   - Show supervision benefits when user steps away
   - Display saved time metrics to justify upgrade

## Technical Implementation Plan

### 1. Authentication System (Lightweight)
```javascript
// Simple JWT-based auth stored in localStorage
- No passwords initially, just email verification
- OAuth integration (GitHub, Google) for instant access
- Session persistence across tabs
```

### 2. Onboarding Service
```javascript
// New service: OnboardingService.js
- Track user progress through funnel
- A/B test different flows
- Personalize based on user type (hobbyist vs professional)
```

### 3. Premium Feature Gates
```javascript
// Feature flags in IDE
- Agent supervision toggle (disabled for free)
- Parallel agent selector (max 1 for free, 5 for premium)
- Priority queue for Claude Code execution
```

### 4. Data Flow Optimization
- Store PRD in IndexedDB for instant IDE access
- Pre-warm Claude Code CLI on page load
- WebSocket connection for real-time updates

## User Journey Maps

### Free User Path
1. Land on homepage → Click "Start Building Free"
2. Optional: Quick PRD generation (can skip)
3. Enter IDE with sample project
4. Use single Claude Code agent
5. See premium features grayed out with upgrade prompts

### Premium User Path
1. Land on homepage → Click "I have Claude Code Pro"
2. One-click API key setup
3. Choose from advanced templates
4. Enter IDE with full features unlocked
5. Access supervision panel and parallel agents

## Premium Feature Differentiation

### Free Tier
- Single Claude Code agent
- Basic PRD generation
- Manual supervision required
- Standard execution priority
- Community support

### Premium Tier ($19/month)
- Up to 5 parallel agents
- AI agent supervision (no human needed)
- Priority execution queue
- Advanced templates & frameworks
- Live collaboration features
- Priority support

## Metrics to Track
1. **Funnel Conversion**
   - Homepage → IDE entry rate
   - API key setup completion rate
   - Free → Premium conversion rate

2. **Time Metrics**
   - Time to first code generation
   - Time spent in setup vs coding
   - Session duration by tier

3. **Feature Adoption**
   - Supervision feature usage
   - Parallel agent utilization
   - Template usage rates

## Migration Strategy
1. **Soft Launch**
   - Enable for 10% of new users
   - A/B test against current flow
   - Gather feedback via in-app survey

2. **Progressive Rollout**
   - Week 1-2: New users only
   - Week 3-4: Prompt existing users
   - Week 5+: Full migration

## Risk Mitigation
1. **Fallback Options**
   - Keep classic flow accessible via URL parameter
   - Allow users to switch between flows
   - Maintain backward compatibility

2. **Support Strategy**
   - In-app help widget with common issues
   - Video tutorials for each step
   - Community Discord for peer support

## Implementation Checklist
When ready to implement, follow these steps:

- [ ] Set up lightweight authentication system
- [ ] Create onboarding service with progress tracking
- [ ] Implement premium feature gates
- [ ] Build quick start templates
- [ ] Create API key setup wizard
- [ ] Design premium feature showcase
- [ ] Set up metrics tracking
- [ ] Create A/B testing framework
- [ ] Build migration tools
- [ ] Prepare support documentation

This plan prioritizes speed-to-value while creating clear upgrade paths to premium features. The focus is on removing friction while showcasing the power of supervised and parallel agents.

---
*Plan created: January 2025*
*Status: Ready for implementation*