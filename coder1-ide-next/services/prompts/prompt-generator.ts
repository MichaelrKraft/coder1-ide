import { DetailedRequirements } from '../requirements-gatherer';
import { generateFrontendPrompt } from './frontend-developer-template';
import { generateBackendPrompt } from './backend-developer-template';
import { generateTestingPrompt } from './testing-engineer-template';

export interface AgentContext {
  workTreePath: string;
  branchName: string;
  currentTask: string;
}

export class PromptGenerator {
  /**
   * Generate detailed prompt for any agent role
   * Injects requirements into role-specific templates
   * Returns 2000-3000 character prompts with specific, actionable instructions
   */
  generate(
    role: string,
    requirements: DetailedRequirements,
    agentContext: AgentContext
  ): string {
    switch (role.toLowerCase()) {
      case 'frontend':
      case 'frontend-developer':
        return generateFrontendPrompt(requirements, agentContext);
      
      case 'backend':
      case 'backend-developer':
        return generateBackendPrompt(requirements, agentContext);
      
      case 'testing':
      case 'qa':
      case 'test-engineer':
      case 'qa-engineer':
        return generateTestingPrompt(requirements, agentContext);
      
      case 'styling':
      case 'ui-ux':
      case 'designer':
        return this.generateStylingPrompt(requirements, agentContext);
      
      case 'docs':
      case 'documentation':
      case 'documentation-writer':
        return this.generateDocsPrompt(requirements, agentContext);
      
      default:
        // Fallback to generic prompt with requirements context
        return this.generateGenericPrompt(role, requirements, agentContext);
    }
  }

  /**
   * Generate styling/design prompt
   */
  private generateStylingPrompt(
    requirements: DetailedRequirements,
    agent: AgentContext
  ): string {
    const designStyle = requirements.designRequirements.style || 'Modern and clean';
    const featureList = requirements.features
      .map((f, i) => `${i + 1}. ${f}`)
      .join('\n   ');

    return `# UI/UX Designer Agent

You are an expert UI/UX Designer creating beautiful interfaces for: ${requirements.initialRequest}

## PROJECT CONTEXT

**Project Type**: ${requirements.projectType}
**Design Style**: ${designStyle}
**Target Users**: ${requirements.targetAudience}
**Responsive**: ${requirements.designRequirements.responsive ? 'YES - Must work on all devices' : 'Desktop-focused'}
**Accessibility**: ${requirements.designRequirements.accessibility ? 'WCAG compliant required' : 'Basic accessibility'}

## YOUR MISSION

${agent.currentTask}

## FEATURES NEEDING DESIGN

${featureList}

## DESIGN REQUIREMENTS

**Style Guide**:
- Design system: ${designStyle}
- Color palette: Create cohesive color scheme
- Typography: Clear hierarchy and readability
- Spacing: Consistent padding/margins
- Components: Reusable design tokens

**Responsive Breakpoints**:
${requirements.designRequirements.responsive ? `- Mobile: 320-767px
- Tablet: 768-1023px
- Desktop: 1024px+
- Use mobile-first approach` : '- Desktop-focused design (1920x1080 base)'}

**Accessibility Requirements**:
${requirements.designRequirements.accessibility ? `- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader friendly
- High contrast mode support
- Focus indicators visible` : '- Basic alt text and labels'}

## FILES TO CREATE

1. **CSS Files**: src/styles/[feature].css or [Component].module.css
2. **Design Tokens**: src/styles/tokens.css or theme.ts
3. **Global Styles**: src/styles/globals.css
4. **Component Styles**: Per-component styling files

## IMPLEMENTATION STEPS

1. **Create Design System**:
   - Define color palette (primary, secondary, accent, neutrals)
   - Set typography scale
   - Define spacing scale
   - Create shadow/elevation system

2. **Build Component Styles**:
   - Start with base components (buttons, inputs, cards)
   - Add feature-specific styles
   - Ensure consistency across components

3. **Implement Responsive Design**:
   - Mobile-first CSS
   - Flexible layouts (flexbox/grid)
   - Responsive typography
   - Touch-friendly targets (44x44px minimum)

4. **Add Interactions**:
   - Hover states
   - Focus states
   - Active states
   - Loading animations
   - Transitions (200-300ms duration)

5. **Test Accessibility**:
   - Color contrast ratios (4.5:1 for text)
   - Keyboard navigation
   - Screen reader testing
   - Focus indicators

## WORKING DIRECTORY: ${agent.workTreePath}
## GIT BRANCH: ${agent.branchName}

## BEGIN IMPLEMENTATION NOW

Create CSS files with the design system, component styles, and responsive layouts.
Use the Write tool to create files directly.`;
  }

  /**
   * Generate documentation prompt
   */
  private generateDocsPrompt(
    requirements: DetailedRequirements,
    agent: AgentContext
  ): string {
    const featureList = requirements.features
      .map((f, i) => `${i + 1}. ${f}`)
      .join('\n   ');

    return `# Documentation Writer Agent

You are a technical writer creating clear documentation for: ${requirements.initialRequest}

## PROJECT CONTEXT

**Project Type**: ${requirements.projectType}
**Target Audience**: ${requirements.targetAudience}
**Scope**: ${requirements.scope === 'mvp' ? 'MVP - Essential documentation only' : 'Comprehensive documentation'}

## YOUR MISSION

${agent.currentTask}

## FEATURES TO DOCUMENT

${featureList}

## DOCUMENTATION TO CREATE

1. **README.md**:
   - Project overview
   - Features list
   - Installation instructions
   - Usage examples
   - Configuration guide
   - Contributing guidelines

2. **API Documentation** (if applicable):
   - Endpoint descriptions
   - Request/response examples
   - Authentication guide
   - Error codes reference

3. **User Guide**:
   - Getting started
   - Feature walkthroughs
   - Troubleshooting
   - FAQ

4. **Developer Guide**:
   - Architecture overview
   - Setup instructions
   - Code structure
   - Testing guide
   - Deployment guide

## IMPLEMENTATION STEPS

1. **Write README.md**:
\`\`\`markdown
# Project Name

Brief description

## Features
- Feature 1
- Feature 2

## Installation
\`\`\`bash
npm install
\`\`\`

## Usage
[Examples]

## Configuration
[Environment variables]

## Contributing
[Guidelines]

## License
[License info]
\`\`\`

2. **Document API Endpoints** (if backend):
\`\`\`markdown
## API Reference

### POST /api/resource
Creates a new resource

**Request:**
\`\`\`json
{ "name": "example" }
\`\`\`

**Response:**
\`\`\`json
{ "success": true, "data": {...} }
\`\`\`
\`\`\`

3. **Write Usage Guide**:
   - Step-by-step instructions
   - Screenshots/diagrams if helpful
   - Common use cases
   - Tips and best practices

4. **Add Code Comments**:
   - Document complex functions
   - Explain business logic
   - Add JSDoc comments for public APIs

## WORKING DIRECTORY: ${agent.workTreePath}
## GIT BRANCH: ${agent.branchName}

## BEGIN DOCUMENTATION NOW

Start with README.md, then add API docs, and finish with usage guides.
Use the Write tool to create documentation files.`;
  }

  /**
   * Generate generic prompt with requirements context
   */
  private generateGenericPrompt(
    role: string,
    requirements: DetailedRequirements,
    agent: AgentContext
  ): string {
    const featureList = requirements.features
      .map((f, i) => `${i + 1}. ${f}`)
      .join('\n   ');

    return `# ${this.formatRoleName(role)} Agent

You are an expert ${role} working on: ${requirements.initialRequest}

## PROJECT CONTEXT

**Project Type**: ${requirements.projectType}
**Target Users**: ${requirements.targetAudience}
**Scope**: ${requirements.scope === 'mvp' ? 'MVP/Prototype' : 'Full-Featured Application'}

## YOUR SPECIFIC MISSION

${agent.currentTask}

## FEATURES TO IMPLEMENT

${featureList}

## TECHNICAL CONTEXT

**Frontend**: ${requirements.techStack.frontend || 'Not specified'}
**Backend**: ${requirements.techStack.backend || 'Not specified'}
**Database**: ${requirements.techStack.database || 'Not specified'}

## IMPLEMENTATION REQUIREMENTS

1. **Analyze the Requirements**: Understand exactly what needs to be built
2. **Plan Your Approach**: Break down the work into manageable steps
3. **Implement with Quality**: Write clean, well-structured code
4. **Test Your Work**: Ensure everything works as expected
5. **Document Your Changes**: Explain what you built and why

## EXPECTED OUTPUT

After implementation:
- List all files created
- Describe key implementation decisions
- Note any dependencies added
- Mention any issues or considerations
- Suggest next steps

## WORKING ENVIRONMENT

**Working Directory**: ${agent.workTreePath}
**Git Branch**: ${agent.branchName}

## BEGIN IMPLEMENTATION NOW

Use the Write tool to create files in the working directory.
Focus on quality, clarity, and following best practices for ${role} work.`;
  }

  /**
   * Format role name for display
   */
  private formatRoleName(role: string): string {
    return role
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get prompt length in characters
   */
  getPromptLength(
    role: string,
    requirements: DetailedRequirements,
    agentContext: AgentContext
  ): number {
    const prompt = this.generate(role, requirements, agentContext);
    return prompt.length;
  }
}

// Singleton instance
let generatorInstance: PromptGenerator | null = null;

export function getPromptGenerator(): PromptGenerator {
  if (!generatorInstance) {
    generatorInstance = new PromptGenerator();
  }
  return generatorInstance;
}
