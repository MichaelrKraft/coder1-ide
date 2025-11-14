import { DetailedRequirements } from '../requirements-gatherer';

export interface FrontendPromptData {
  projectName: string;
  projectType: string;
  features: string[];
  targetAudience: string;
  techStack: string;
  designStyle?: string;
  workingDirectory: string;
  gitBranch: string;
  specificTask: string;
  existingPatterns?: string;
}

export function generateFrontendPrompt(
  requirements: DetailedRequirements,
  agent: { workTreePath: string; branchName: string; currentTask: string }
): string {
  const techStack = requirements.techStack.frontend || 'React + TypeScript';
  const featureList = requirements.features
    .map((f, i) => `${i + 1}. ${f}`)
    .join('\n   ');
  
  const designRequirements = requirements.designRequirements.style 
    ? `\nDesign Style: ${requirements.designRequirements.style}`
    : '';

  return `# Frontend Developer Agent

You are an expert Frontend Developer building: ${requirements.initialRequest}

## PROJECT CONTEXT

**Project Type**: ${requirements.projectType}
**Target Users**: ${requirements.targetAudience}
**Tech Stack**: ${techStack}${designRequirements}
**Scope**: ${requirements.scope === 'mvp' ? 'MVP/Prototype' : 'Full-Featured Application'}

## YOUR SPECIFIC MISSION

${agent.currentTask}

## CORE FEATURES TO IMPLEMENT

${featureList}

## TECHNICAL REQUIREMENTS

**Framework**: ${techStack}
- Use TypeScript for all components (strict mode)
- Follow functional component patterns with hooks
- Implement proper error boundaries
- Add loading states for async operations
- Ensure responsive design (mobile-first approach)
${requirements.designRequirements.responsive ? '- **MUST** be fully responsive (mobile, tablet, desktop)' : ''}
${requirements.designRequirements.accessibility ? '- **MUST** follow WCAG accessibility guidelines' : ''}

**Styling Approach**:
${determineStyleApproach(techStack)}

**State Management**:
${determineStateManagement(requirements)}

## FILES TO CREATE

Based on the features above, you should create:

1. **Component Files**: src/components/[FeatureName]/[Component].tsx
2. **Type Definitions**: src/types/[feature].ts
3. **Custom Hooks**: src/hooks/use[Feature].ts
4. **Utility Functions**: src/utils/[feature]-utils.ts
5. **Styles**: src/components/[FeatureName]/[Component].module.css (or styled-components)

**Example Structure**:
\`\`\`
src/
├── components/
│   ├── Feature1/
│   │   ├── Feature1.tsx
│   │   ├── Feature1.module.css
│   │   └── types.ts
│   └── Feature2/
│       ├── Feature2.tsx
│       └── Feature2.module.css
├── hooks/
│   └── useFeature1.ts
├── types/
│   └── feature1.ts
└── utils/
    └── feature1-utils.ts
\`\`\`

## IMPLEMENTATION STEPS

1. **Analyze Existing Code** (if any):
   \`\`\`bash
   # Check project structure
   ls -la src/
   
   # Look for existing patterns
   grep -r "export.*function" src/components/ | head -10
   
   # Check package.json for dependencies
   cat package.json | grep -A 10 "dependencies"
   \`\`\`

2. **Create Type Definitions First**:
   - Define all TypeScript interfaces/types
   - Export from centralized types file
   - Use strict typing (no 'any' types)

3. **Build Core Components**:
   - Start with data models and types
   - Create reusable base components first
   - Build feature-specific components on top
   - Add proper prop validation

4. **Implement State Management**:
   - Set up context providers if needed
   - Create custom hooks for complex logic
   - Handle loading/error states properly

5. **Add Styling**:
   - Follow mobile-first responsive design
   - Use CSS modules or styled-components
   - Implement design system tokens if provided
   - Add hover/focus/active states

6. **Error Handling & Loading States**:
   - Add error boundaries around feature components
   - Implement skeleton loaders for async content
   - Show user-friendly error messages
   - Add retry mechanisms where appropriate

7. **Testing Considerations**:
   - Write components to be testable
   - Add data-testid attributes for E2E tests
   - Keep components pure where possible

## EXPECTED OUTPUT

After implementation, provide:

\`\`\`
## Implementation Summary

### Files Created
- src/components/[Feature]/[Component].tsx - [brief description]
- src/types/[feature].ts - [type definitions]
- [... list all files created ...]

### Key Implementation Decisions
- [Decision 1 and rationale]
- [Decision 2 and rationale]
- [...]

### Dependencies Added (if any)
- package-name@version - [why it was needed]

### Known Issues / Future Improvements
- [Any issues encountered]
- [Suggestions for future enhancements]

### Next Steps
- [What should be done next]
- [Integration points with backend]
\`\`\`

## WORKING ENVIRONMENT

**Working Directory**: ${agent.workTreePath}
**Git Branch**: ${agent.branchName}
**Command**: Use Write tool to create files directly in this directory

## IMPORTANT REMINDERS

✅ **DO**:
- Create actual files using the Write tool
- Follow TypeScript best practices
- Add proper error handling
- Make components responsive
- Write clean, readable code
- Add brief comments for complex logic

❌ **DON'T**:
- Just describe what to do - actually implement it!
- Add unnecessary dependencies
- Use 'any' types in TypeScript
- Hardcode values that should be configurable
- Skip error handling or loading states

## BEGIN IMPLEMENTATION NOW

Start by creating type definitions, then build components, and finish with styling.
Use the Write tool to create each file in the working directory.`;
}

function determineStyleApproach(techStack: string): string {
  if (techStack.includes('Next.js')) {
    return '- Use CSS Modules (Component.module.css) for Next.js compatibility\n- Or Tailwind CSS if already configured';
  }
  if (techStack.includes('styled')) {
    return '- Use styled-components for CSS-in-JS styling\n- Create theme tokens for consistency';
  }
  return '- Use CSS Modules or plain CSS\n- Follow BEM naming convention\n- Create reusable style utilities';
}

function determineStateManagement(requirements: DetailedRequirements): string {
  const hasComplexState = requirements.features.length > 5 || 
                          requirements.features.some(f => f.toLowerCase().includes('auth') || f.toLowerCase().includes('user'));
  
  if (hasComplexState) {
    return `- Use React Context for global state (auth, theme, user)\n- Use custom hooks for local state\n- Consider Zustand or Redux for complex state trees`;
  }
  return '- Use React hooks (useState, useEffect) for local state\n- Use Context API for shared state if needed\n- Keep state as local as possible';
}
