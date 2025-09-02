# API Specification: /ui Commands & Interfaces

## Overview

This document defines the complete API specification for the Preview enhancement, including terminal commands, component interfaces, and service APIs. This serves as the contract for implementation across all phases.

## Terminal Command API

### Core Command Structure
```bash
/ui <command> [options] [arguments]
```

### Phase 1 Commands (Basic Functionality)

#### `/ui create <description>`
Generate a basic component from natural language description.

**Syntax:**
```bash
/ui create <component-description>
```

**Examples:**
```bash
/ui create "button"
/ui create "card with title and content"  
/ui create "modern pricing table with 3 columns"
```

**Response:**
```
🎨 Generating component: "button"
✅ Component generated successfully!
📁 Component: Button
🔧 Props: children, onClick, variant
```

**Error Cases:**
```bash
/ui create
# Error: Component description required
# Usage: /ui create <description>

/ui create ""
# Error: Component description cannot be empty
```

#### `/ui help`
Display available commands and usage information.

**Syntax:**
```bash
/ui help [command]
```

**Examples:**
```bash
/ui help              # Show all commands
/ui help create       # Show create command details
```

**Response:**
```
Available /ui commands:

/ui create <description>  - Generate component from description
/ui help [command]        - Show help information
/ui version              - Show version information

Examples:
  /ui create "button with hover effects"
  /ui create "responsive card layout"
```

#### `/ui version`
Display Preview enhancement version and status.

**Syntax:**
```bash
/ui version
```

**Response:**
```
Coder1 Preview Enhancement v1.0.0
Phase: 1 (Basic Functionality)
Status: Active
Features: Component Generation, Live Preview
```

### Phase 2 Commands (Enhanced Features)

#### `/ui variant <changes>`
Create variations of the current component.

**Syntax:**
```bash
/ui variant <modification-description>
```

**Examples:**
```bash
/ui variant "make it smaller and add dark mode"
/ui variant "change to outlined style"
/ui variant "add loading state"
```

**Response:**
```
🎨 Creating variant: "make it smaller and add dark mode"
✅ Variant created successfully!
📁 Component: Button (Variant 2)
🔧 Changes: size=small, theme=dark
```

#### `/ui responsive [breakpoint]`
Generate responsive variations or optimize for specific breakpoint.

**Syntax:**
```bash
/ui responsive [mobile|tablet|desktop]
```

**Examples:**
```bash
/ui responsive              # Generate all responsive variants
/ui responsive mobile       # Optimize for mobile
/ui responsive tablet       # Optimize for tablet
```

#### `/ui props <prop-name> <value>`
Update component props in real-time.

**Syntax:**
```bash
/ui props <prop-name> <value>
```

**Examples:**
```bash
/ui props variant "secondary"
/ui props size "large"
/ui props disabled true
```

### Phase 3 Commands (AI-Powered Features)

#### `/ui agents <agent-list>`
Specify which AI agents to use for component generation.

**Syntax:**
```bash
/ui agents <agent1,agent2,...>
/ui create <description> --agents <agent-list>
```

**Available Agents:**
- `architect` - System design and component structure
- `implementer` - Code implementation and logic
- `designer` - Visual design and styling
- `tester` - Test generation and quality assurance

**Examples:**
```bash
/ui agents architect,designer
/ui create "complex dashboard" --agents architect,implementer,tester
```

#### `/ui optimize [type]`
Optimize current component for specific criteria.

**Syntax:**
```bash
/ui optimize [performance|accessibility|bundle-size|all]
```

**Examples:**
```bash
/ui optimize                    # Optimize all aspects
/ui optimize performance        # Focus on performance
/ui optimize accessibility      # Focus on a11y
/ui optimize bundle-size        # Minimize bundle size
```

#### `/ui test [type]`
Generate tests for current component.

**Syntax:**
```bash
/ui test [unit|integration|visual|all]
```

**Examples:**
```bash
/ui test                # Generate all test types
/ui test unit          # Generate unit tests only
/ui test visual        # Generate visual regression tests
```

### Phase 4 Commands (Professional Features)

#### `/ui design-system <action>`
Integrate with design system tokens and patterns.

**Syntax:**
```bash
/ui design-system <apply|validate|export>
```

**Examples:**
```bash
/ui design-system apply         # Apply design tokens to component
/ui design-system validate      # Check design system compliance
/ui design-system export        # Export component to design system
```

#### `/ui marketplace <action>`
Interact with component marketplace.

**Syntax:**
```bash
/ui marketplace <search|publish|install> [query]
```

**Examples:**
```bash
/ui marketplace search "button"     # Search for button components
/ui marketplace publish             # Publish current component
/ui marketplace install button-123  # Install component by ID
```

## Component Interface Specifications

### ComponentBundle Interface
```typescript
interface ComponentBundle {
  // Identification
  id: string;                    // Unique component identifier
  name: string;                  // Component name (e.g., "Button")
  version: string;               // Semantic version (e.g., "1.0.0")
  
  // Code and Implementation  
  code: string;                  // JSX/React component code
  dependencies: string[];        // Required npm packages
  imports: string[];            // Import statements needed
  
  // Component Configuration
  props: ComponentProps;         // Default and available props
  variants: ComponentVariant[];  // Style/behavior variations
  states: ComponentState[];     // Interactive states (hover, focus, etc.)
  
  // Metadata
  description: string;          // Human-readable description
  category: ComponentCategory;  // UI category (button, form, layout, etc.)
  tags: string[];              // Searchable tags
  
  // Quality Assurance
  tests: TestSuite;            // Generated test suites
  accessibility: A11yReport;    // Accessibility compliance report
  performance: PerformanceMetrics; // Performance analysis
  
  // Generation Info
  generatedBy: AIAgent[];      // Which agents contributed
  generatedAt: number;         // Timestamp
  prompt: string;              // Original user prompt
}

interface ComponentProps {
  [propName: string]: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'function';
    defaultValue: any;
    required: boolean;
    description: string;
    options?: any[];           // For enum-like props
  };
}

interface ComponentVariant {
  name: string;                // Variant name (e.g., "primary", "secondary")
  props: Record<string, any>;  // Props that define this variant
  preview?: string;            // Base64 encoded preview image
}

interface ComponentState {
  name: string;                // State name (e.g., "hover", "focus")
  trigger: string;             // How to trigger (e.g., ":hover", ":focus")
  styles: Record<string, any>; // CSS changes for this state
}

type ComponentCategory = 
  | 'button' | 'input' | 'layout' | 'navigation' 
  | 'feedback' | 'data-display' | 'overlay' | 'other';

interface TestSuite {
  unit: Test[];               // Unit tests
  integration: Test[];        // Integration tests  
  visual: VisualTest[];      // Visual regression tests
  accessibility: A11yTest[]; // Accessibility tests
}

interface AIAgent {
  name: 'architect' | 'implementer' | 'designer' | 'tester';
  version: string;
  contribution: string;       // What this agent contributed
  confidence: number;         // 0-1 confidence score
}
```

### Preview State Interface
```typescript
interface PreviewState {
  // Current Display
  mode: 'placeholder' | 'component' | 'error' | 'loading';
  currentComponent: ComponentBundle | null;
  activeVariant: string | null;
  activeStates: string[];      // Currently active states (hover, focus, etc.)
  
  // View Configuration
  breakpoint: 'mobile' | 'tablet' | 'desktop';
  theme: 'light' | 'dark' | 'auto';
  showGrid: boolean;          // Show layout grid
  showSpacing: boolean;       // Show spacing guidelines
  
  // Interactive Props
  interactiveProps: Record<string, any>; // Props being manipulated in UI
  
  // Error Handling
  error: PreviewError | null;
  warnings: PreviewWarning[];
  
  // Performance
  renderTime: number;         // Last render time in ms
  bundleSize: number;         // Component bundle size in bytes
}

interface PreviewError {
  type: 'compilation' | 'runtime' | 'render' | 'sandbox';
  message: string;
  stack?: string;
  component?: ComponentBundle;
}

interface PreviewWarning {
  type: 'accessibility' | 'performance' | 'props' | 'styling';
  message: string;
  severity: 'low' | 'medium' | 'high';
  suggestion?: string;
}
```

## Service API Specifications

### ComponentGenerator Service
```typescript
interface IComponentGenerator {
  // Basic Generation (Phase 1)
  generateBasicComponent(prompt: string): Promise<ComponentBundle>;
  
  // Enhanced Generation (Phase 2)
  generateVariant(
    baseComponent: ComponentBundle, 
    modifications: string
  ): Promise<ComponentBundle>;
  
  generateResponsiveVariant(
    component: ComponentBundle,
    breakpoint: 'mobile' | 'tablet' | 'desktop'
  ): Promise<ComponentBundle>;
  
  // AI-Powered Generation (Phase 3)
  generateWithAgents(
    prompt: string,
    agents: AIAgent[]
  ): Promise<ComponentBundle>;
  
  optimizeComponent(
    component: ComponentBundle,
    criteria: OptimizationCriteria
  ): Promise<ComponentBundle>;
  
  // Professional Features (Phase 4)
  generateWithDesignSystem(
    prompt: string,
    designSystem: DesignSystemConfig
  ): Promise<ComponentBundle>;
}

interface OptimizationCriteria {
  performance: boolean;
  accessibility: boolean;
  bundleSize: boolean;
  maintainability: boolean;
}

interface DesignSystemConfig {
  tokens: DesignTokens;
  components: ComponentPattern[];
  guidelines: StyleGuideline[];
}
```

### PreviewRenderer Service
```typescript
interface IPreviewRenderer {
  // Core Rendering
  renderComponent(component: ComponentBundle): Promise<RenderResult>;
  updateProps(componentId: string, props: Record<string, any>): Promise<void>;
  
  // State Management
  setComponentState(componentId: string, states: string[]): Promise<void>;
  setBreakpoint(breakpoint: 'mobile' | 'tablet' | 'desktop'): Promise<void>;
  setTheme(theme: 'light' | 'dark'): Promise<void>;
  
  // Screenshots and Export
  captureScreenshot(componentId: string): Promise<string>; // Base64 image
  exportComponent(componentId: string, format: ExportFormat): Promise<string>;
  
  // Performance Monitoring
  measurePerformance(componentId: string): Promise<PerformanceMetrics>;
  validateAccessibility(componentId: string): Promise<A11yReport>;
}

interface RenderResult {
  success: boolean;
  componentId: string;
  renderTime: number;
  warnings: PreviewWarning[];
  error?: PreviewError;
}

type ExportFormat = 'jsx' | 'html' | 'css' | 'storybook' | 'figma';

interface PerformanceMetrics {
  renderTime: number;          // Component render time in ms
  bundleSize: number;          // Bundle size in bytes
  memoryUsage: number;         // Memory usage in bytes
  accessibility: A11yScore;    // Accessibility score
  bestPractices: QualityScore; // General quality score
}

interface A11yReport {
  score: number;               // 0-100 accessibility score
  violations: A11yViolation[];
  warnings: A11yWarning[];
  suggestions: A11ySuggestion[];
}
```

### Terminal Integration Service
```typescript
interface ITerminalIntegration {
  // Command Registration
  registerCommand(command: string, handler: CommandHandler): void;
  unregisterCommand(command: string): void;
  
  // Output Management
  writeToTerminal(message: string, formatting?: TerminalFormatting): void;
  writeError(error: string): void;
  writeSuccess(message: string): void;
  writeWarning(message: string): void;
  
  // Command Processing
  parseCommand(input: string): ParsedCommand;
  executeCommand(command: ParsedCommand): Promise<CommandResult>;
  
  // History and Autocomplete
  getCommandHistory(): string[];
  getAutocompleteSuggestions(partial: string): string[];
}

interface CommandHandler {
  (args: string[], context: TerminalContext): Promise<CommandResult>;
}

interface TerminalContext {
  currentComponent: ComponentBundle | null;
  previewState: PreviewState;
  user: UserContext;
}

interface ParsedCommand {
  command: string;             // Main command (e.g., "ui")
  subcommand: string;          // Subcommand (e.g., "create")
  args: string[];              // Arguments
  flags: Record<string, any>;  // Parsed flags (e.g., --agents)
}

interface CommandResult {
  success: boolean;
  message: string;
  data?: any;                  // Additional result data
  component?: ComponentBundle; // Generated component if applicable
}

interface TerminalFormatting {
  color?: 'red' | 'green' | 'yellow' | 'blue' | 'cyan' | 'magenta';
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}
```

## WebSocket API (Real-time Updates)

### Message Types
```typescript
// Client to Server Messages
interface ClientMessage {
  type: 'RENDER_COMPONENT' | 'UPDATE_PROPS' | 'CAPTURE_SCREENSHOT';
  payload: any;
  requestId: string;
}

// Server to Client Messages  
interface ServerMessage {
  type: 'RENDER_SUCCESS' | 'RENDER_ERROR' | 'PROPS_UPDATED' | 'SCREENSHOT_READY';
  payload: any;
  requestId?: string;
}

// Specific Message Payloads
interface RenderComponentPayload {
  component: ComponentBundle;
  props?: Record<string, any>;
  breakpoint?: string;
  theme?: string;
}

interface UpdatePropsPayload {
  componentId: string;
  props: Record<string, any>;
}

interface RenderSuccessPayload {
  componentId: string;
  renderTime: number;
  screenshot?: string;        // Base64 encoded preview
}

interface RenderErrorPayload {
  error: PreviewError;
  componentId?: string;
}
```

## HTTP API Endpoints

### Component Management
```
POST   /api/preview/component/generate
POST   /api/preview/component/variant
GET    /api/preview/component/:id
PUT    /api/preview/component/:id
DELETE /api/preview/component/:id

POST   /api/preview/component/:id/optimize
POST   /api/preview/component/:id/test
POST   /api/preview/component/:id/screenshot
```

### Marketplace (Phase 4)
```
GET    /api/marketplace/components
POST   /api/marketplace/components
GET    /api/marketplace/components/search
GET    /api/marketplace/components/:id
POST   /api/marketplace/components/:id/install
```

### Design System (Phase 4)
```
GET    /api/design-system/tokens
POST   /api/design-system/validate
POST   /api/design-system/apply
```

## Error Codes & Messages

### Terminal Error Codes
| Code | Message | Description |
|------|---------|-------------|
| UI001 | Component description required | Empty or missing component description |
| UI002 | Invalid command syntax | Malformed command structure |
| UI003 | Component generation failed | AI generation error |
| UI004 | Component not found | Referenced component doesn't exist |
| UI005 | Invalid props provided | Props don't match component interface |
| UI006 | Render timeout | Component took too long to render |
| UI007 | Sandbox security error | Security violation in component code |

### HTTP Status Codes
| Code | Meaning | Usage |
|------|---------|-------|
| 200 | Success | Successful operation |
| 201 | Created | Component created successfully |
| 400 | Bad Request | Invalid request parameters |
| 404 | Not Found | Component or resource not found |
| 422 | Unprocessable Entity | Valid request but cannot process |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |

This API specification provides a complete contract for implementing the Preview enhancement across all phases, ensuring consistency and compatibility between different components and services.