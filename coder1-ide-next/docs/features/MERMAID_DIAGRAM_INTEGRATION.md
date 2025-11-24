# Mermaid.js Diagram Generation Integration - Feature Specification

**Status**: 📋 Planned  
**Priority**: Medium  
**Estimated Effort**: 9-13 hours  
**Inspiration**: [Codigram.app](https://codigram.app) - Free AI-powered diagram generator  

---

## 🎯 Executive Summary

Add AI-powered diagram generation to Coder1 IDE using Mermaid.js, enabling users to create professional diagrams (flowcharts, architecture diagrams, ERDs, etc.) through natural language descriptions. This feature completes the "requirements → design → code" pipeline and differentiates Coder1 from competitors.

**Key Benefits**:
- ⚡ **Time Savings**: 30 minutes → 2 minutes for diagram creation
- 🤖 **AI-Powered**: Natural language → professional diagrams
- 🎨 **Professional Output**: Export-ready for documentation
- 🔄 **Workflow Integration**: Seamless part of development process
- 🆓 **Zero Backend Cost**: Client-side rendering via Mermaid.js

---

## 📖 Inspiration: Codigram.app

**Website**: https://codigram.app

### What Makes Codigram Special

1. **No Login Required**: Instant access, no setup
2. **Natural Language Input**: "Create a flowchart for brewing coffee with a decision for bean availability"
3. **Instant Visualization**: Mermaid.js renders diagrams in real-time
4. **Live Code Editing**: Edit Mermaid syntax with instant preview
5. **Export Options**: PNG, SVG, or raw code (no watermarks)
6. **Privacy-First**: All processing happens in browser

### Diagram Types Available

#### Core Section
- Flowcharts
- Sequence Diagrams
- Class Diagrams
- State Diagrams
- Entity Relationship Diagrams

#### Planning Section
- User Journeys
- Gantt Charts
- Mindmaps
- Timelines
- Requirement Diagrams

#### Data Section
- Pie Charts
- Quadrant Charts

#### System Section
- GitGraph Diagrams

---

## 🏗️ Architecture Overview

### Technology Stack
- **Rendering Engine**: [Mermaid.js](https://mermaid.js.org/) (v10+)
- **AI Integration**: Claude API (via existing `claude-service.ts`)
- **Editor**: Monaco Editor (syntax highlighting for Mermaid code)
- **Layout**: React Resizable Panels (split-pane interface)
- **Export**: SVG → Canvas → PNG conversion

### System Integration Points

```
┌─────────────────────────────────────────────────────────┐
│                    Coder1 IDE                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐    ┌────────────────┐               │
│  │ PRD Generator│───→│ Diagram Studio │               │
│  │ (5 Questions)│    │ (NEW FEATURE)  │               │
│  └──────────────┘    └────────────────┘               │
│         │                     │                         │
│         ├─────────────────────┤                        │
│         ↓                     ↓                         │
│  ┌──────────────────────────────────┐                  │
│  │    Claude Service (AI)           │                  │
│  │  • Natural Language → Mermaid    │                  │
│  │  • Architecture Analysis         │                  │
│  │  • Diagram Refinement            │                  │
│  └──────────────────────────────────┘                  │
│         │                     │                         │
│         ↓                     ↓                         │
│  ┌──────────────┐    ┌────────────────┐               │
│  │  Mermaid.js  │    │  File System   │               │
│  │  (Rendering) │    │  (.mmd files)  │               │
│  └──────────────┘    └────────────────┘               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 User Interface Design

### Layout: Split-Pane Editor

```
┌─────────────────────────────────────────────────────────────┐
│ Diagram Studio                [Templates ▼] [Export ▼]      │
├────────────────────────┬────────────────────────────────────┤
│                        │                                    │
│  AI Chat Input         │        Live Preview                │
│  ┌──────────────────┐  │  ┌──────────────────────────────┐ │
│  │ "Create a        │  │  │                              │ │
│  │ flowchart showing│  │  │    ┌──────────┐              │ │
│  │ user auth flow   │  │  │    │  Start   │              │ │
│  │ with OAuth..."   │  │  │    └────┬─────┘              │ │
│  │                  │  │  │         │                     │ │
│  │ [Generate]       │  │  │    ┌────▼────┐               │ │
│  └──────────────────┘  │  │    │ Login?  │               │ │
│                        │  │    └────┬────┘               │ │
│  Mermaid Code Editor   │  │         │                     │ │
│  ┌──────────────────┐  │  │    [Rendered Mermaid]        │ │
│  │ graph TD         │  │  │                              │ │
│  │   A[Start]       │  │  │                              │ │
│  │   A-->B{Login?}  │  │  │                              │ │
│  │   B-->|Yes| C    │  │  └──────────────────────────────┘ │
│  │   B-->|No| D     │  │                                    │
│  └──────────────────┘  │  Diagram Type: [Flowchart    ▼]   │
│                        │                                    │
│  [Refine with AI]      │  [Export PNG] [Export SVG] [Code]  │
│                        │                                    │
└────────────────────────┴────────────────────────────────────┘
```

### Color Scheme (Coder1 Branding)

- **Primary (Cyan)**: `#00D9FF` - Active elements, highlights, diagram accents
- **Secondary (Purple)**: `#8B5CF6` - Gradients, secondary elements
- **Tertiary (Orange)**: `#FB923C` - Warnings, special states
- **Background**: `#0F1419` - Main dark background
- **Surface**: `#1A1F26` - Panels and cards
- **Border**: `#2A2F36` - Element borders

### Glassmorphic Design
- Semi-transparent panels with backdrop blur
- Gradient backgrounds with animated orbs
- Smooth transitions and hover effects
- Consistent with existing Coder1 aesthetic

---

## 📋 Implementation Phases

### Phase 1: Basic Integration (2-3 hours)

**Goal**: Working diagram generation page with AI conversion

#### Tasks:
1. **Install Dependencies**
   ```bash
   npm install mermaid
   npm install --save-dev @types/mermaid
   ```

2. **Create Core Utilities** (`lib/diagram-utils.ts`)
   - Initialize Mermaid with Coder1 theme
   - Render function (Mermaid code → SVG)
   - Export helpers (SVG → PNG, copy to clipboard)
   - Validation (check Mermaid syntax)

3. **Extend Claude Service** (`lib/claude-service.ts`)
   - Add `generateMermaidCode(description, type?)` method
   - Prompt engineering for optimal syntax
   - Extract code from Claude response
   - Handle multi-turn refinement

4. **Create Diagram Studio Page** (`app/diagrams/page.tsx`)
   - Next.js client component
   - Split-pane layout with ResizablePanels
   - Text input for natural language
   - Live preview pane
   - Basic export (PNG, SVG, Code)

#### Success Criteria:
- ✅ User enters "Create a flowchart for user login"
- ✅ Claude generates valid Mermaid code
- ✅ Diagram renders correctly in preview
- ✅ Can export as PNG/SVG/Code

---

### Phase 2: Enhanced UX (3-4 hours)

**Goal**: Professional UI with templates and refinement

#### Tasks:
1. **Template Library Component** (`components/diagrams/DiagramTemplates.tsx`)
   - 15+ pre-built templates organized by category
   - Quick preview on hover
   - One-click insertion
   - Search/filter functionality

2. **Template Categories**:
   - **Architecture**: System design, microservices, component diagrams
   - **Workflows**: User flows, business processes, approval chains
   - **Database**: ERDs, schema designs, relationship diagrams
   - **Planning**: Gantt charts, timelines, roadmaps
   - **Development**: Git workflows, deployment pipelines, testing flows

3. **AI Chat Interface** (`components/diagrams/DiagramChat.tsx`)
   - Conversational refinement UI
   - Message history display
   - Context-aware suggestions
   - Examples: "Make the database box larger", "Add error handling path"

4. **Monaco Editor Integration**
   - Syntax highlighting for Mermaid
   - Auto-completion for Mermaid keywords
   - Real-time syntax validation
   - Error highlighting with helpful messages

5. **Professional Polish**
   - Animated gradient backgrounds
   - Loading states with progress indicators
   - Keyboard shortcuts (Cmd+S save, Cmd+E export)
   - Responsive design for all screen sizes

#### Success Criteria:
- ✅ 15+ templates available and working
- ✅ AI chat can refine diagrams conversationally
- ✅ Monaco editor highlights Mermaid syntax
- ✅ UI matches Coder1 glassmorphic design

---

### Phase 3: Deep Integration (4-6 hours)

**Goal**: Integrate throughout Coder1 workflow

#### Tasks:
1. **PRD Generator Integration**
   - After 5-question workflow completes
   - Offer "Generate Architecture Diagram?" button
   - Auto-analyze requirements for diagram type
   - Generate system design from PRD context
   - Embed diagram in PRD export (Markdown/HTML)

2. **Smart Context Detection**
   - Analyze open files in IDE
   - Detect patterns (e.g., 5 React components → suggest component relationship diagram)
   - Database models detected → offer ERD generation
   - API routes detected → offer API flow diagram

3. **Navigation Integration**
   - Add "Diagrams" to main MenuBar
   - Optional: Add "Diagrams" tab to LeftPanel (alongside Explorer, Sessions, Search)
   - Display saved diagrams count in status bar

4. **File System Integration** (`services/diagram-service.ts`)
   - Save diagrams as `.mmd` files in project
   - CRUD operations (create, read, update, delete)
   - Auto-detect and render `.mmd` files when opened
   - Git integration (track diagram changes)

5. **Diagram Library Panel**
   - List all saved diagrams
   - Preview thumbnails on hover
   - Quick open/edit/delete actions
   - Search and filter by type/name

#### Success Criteria:
- ✅ PRD Generator offers diagram creation
- ✅ Diagrams saved to project `.mmd` files
- ✅ Left panel shows diagram library
- ✅ Smart suggestions based on IDE context
- ✅ Full CRUD operations working

---

## 🗂️ File Structure

```
coder1-ide-next/
├── app/
│   └── diagrams/
│       └── page.tsx                    # Main diagram studio page
│
├── components/
│   └── diagrams/
│       ├── DiagramEditor.tsx           # Split-pane editor layout
│       ├── DiagramPreview.tsx          # Live Mermaid renderer
│       ├── DiagramTemplates.tsx        # Template selector modal
│       ├── DiagramExport.tsx           # Export modal (PNG/SVG/Code)
│       ├── DiagramChat.tsx             # AI refinement chat UI
│       └── DiagramLibrary.tsx          # Saved diagrams browser
│
├── lib/
│   ├── claude-service.ts               # Extend with diagram methods
│   └── diagram-utils.ts                # Mermaid helpers (NEW)
│       ├── initializeMermaid()
│       ├── renderDiagram()
│       ├── exportToPNG()
│       ├── exportToSVG()
│       ├── validateMermaidSyntax()
│       └── applyCodeer1Theme()
│
├── services/
│   └── diagram-service.ts              # Diagram CRUD operations (NEW)
│       ├── saveDiagram()
│       ├── loadDiagram()
│       ├── listDiagrams()
│       ├── deleteDiagram()
│       └── detectDiagramContext()
│
├── public/
│   └── diagrams/
│       └── templates/                  # Template .mmd files
│           ├── architecture/
│           ├── workflows/
│           ├── database/
│           └── planning/
│
└── docs/
    └── features/
        └── MERMAID_DIAGRAM_INTEGRATION.md  # This document
```

---

## 💻 Technical Implementation Details

### 1. Mermaid.js Configuration

```typescript
// lib/diagram-utils.ts
import mermaid from 'mermaid';

export function initializeMermaid() {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
      primaryColor: '#00D9FF',        // Coder1 cyan
      primaryTextColor: '#ffffff',
      primaryBorderColor: '#8B5CF6',  // Coder1 purple
      lineColor: '#00D9FF',
      secondaryColor: '#8B5CF6',
      tertiaryColor: '#FB923C',       // Coder1 orange
      background: '#0F1419',
      mainBkg: '#1A1F26',
      secondBkg: '#2A2F36',
      textColor: '#ffffff',
      fontSize: '16px',
    },
    flowchart: {
      curve: 'basis',
      padding: 20,
    },
    sequence: {
      actorMargin: 50,
      width: 150,
      height: 65,
    },
  });
}

export async function renderDiagram(
  code: string, 
  elementId: string
): Promise<string> {
  try {
    const { svg } = await mermaid.render(elementId, code);
    return svg;
  } catch (error) {
    throw new Error(`Mermaid rendering failed: ${error.message}`);
  }
}

export async function exportToPNG(svg: string): Promise<Blob> {
  // Convert SVG to Canvas, then to PNG
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  
  return new Promise((resolve, reject) => {
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('PNG conversion failed'));
      }, 'image/png');
    };
    img.onerror = reject;
    img.src = 'data:image/svg+xml;base64,' + btoa(svg);
  });
}

export function validateMermaidSyntax(code: string): { valid: boolean; error?: string } {
  try {
    mermaid.parse(code);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}
```

---

### 2. Claude Service Extension

```typescript
// lib/claude-service.ts - Add these methods

/**
 * Generate Mermaid.js code from natural language description
 */
async generateMermaidCode(
  description: string, 
  diagramType?: string
): Promise<string> {
  const prompt = `You are a Mermaid.js diagram expert. Generate Mermaid.js code for the following description:

Description: ${description}
${diagramType ? `Diagram Type: ${diagramType}` : 'Choose the most appropriate diagram type'}

Requirements:
- Use Mermaid.js v10+ syntax
- Include clear, descriptive labels
- Use logical structure and proper indentation
- For flowcharts, use meaningful node IDs
- For sequence diagrams, include all actors
- Return ONLY the Mermaid code, no markdown fences or explanations

Example formats:
Flowchart: graph TD
Sequence: sequenceDiagram
Class: classDiagram
ER: erDiagram
State: stateDiagram-v2

Generate the diagram:`;

  const response = await this.chat(prompt);
  return this.extractMermaidCode(response);
}

/**
 * Refine existing Mermaid code based on natural language instruction
 */
async refineMermaidCode(
  currentCode: string,
  instruction: string
): Promise<string> {
  const prompt = `You are refining a Mermaid.js diagram. Here is the current code:

\`\`\`mermaid
${currentCode}
\`\`\`

User instruction: ${instruction}

Generate the updated Mermaid code with the requested changes. Return ONLY the new Mermaid code.`;

  const response = await this.chat(prompt);
  return this.extractMermaidCode(response);
}

/**
 * Extract Mermaid code from Claude response
 */
private extractMermaidCode(response: string): string {
  // Remove markdown code fences if present
  const codeBlockRegex = /```(?:mermaid)?\s*\n([\s\S]*?)\n```/;
  const match = response.match(codeBlockRegex);
  
  if (match) {
    return match[1].trim();
  }
  
  // If no code block, return the whole response (might be raw Mermaid)
  return response.trim();
}

/**
 * Analyze requirements and suggest diagram types
 */
async suggestDiagramTypes(context: string): Promise<string[]> {
  const prompt = `Based on this context, what types of diagrams would be most useful?

Context: ${context}

Return 1-3 diagram types from:
- flowchart (process flows, decision trees)
- sequence (API interactions, user flows)
- class (object models, architecture)
- er (database schemas)
- state (state machines, transitions)
- gantt (project planning, timelines)

Return as JSON array: ["type1", "type2"]`;

  const response = await this.chat(prompt);
  return JSON.parse(response);
}
```

---

### 3. React Component Example

```typescript
// components/diagrams/DiagramEditor.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Sparkles, Download, Code, Eye } from 'lucide-react';
import { claudeService } from '@/lib/claude-service';
import { renderDiagram, exportToPNG, validateMermaidSyntax } from '@/lib/diagram-utils';

export default function DiagramEditor() {
  const [description, setDescription] = useState('');
  const [mermaidCode, setMermaidCode] = useState('');
  const [renderedSVG, setRenderedSVG] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (!description.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const code = await claudeService.generateMermaidCode(description);
      setMermaidCode(code);
      
      // Render immediately
      const svg = await renderDiagram(code, 'diagram-preview');
      setRenderedSVG(svg);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCodeChange = async (newCode: string) => {
    setMermaidCode(newCode);
    
    // Validate and render
    const validation = validateMermaidSyntax(newCode);
    if (validation.valid) {
      try {
        const svg = await renderDiagram(newCode, 'diagram-preview');
        setRenderedSVG(svg);
        setError(null);
      } catch (err) {
        setError(err.message);
      }
    } else {
      setError(validation.error);
    }
  };

  const handleExportPNG = async () => {
    if (!renderedSVG) return;
    
    try {
      const blob = await exportToPNG(renderedSVG);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'diagram.png';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Export failed: ' + err.message);
    }
  };

  return (
    <div className="h-screen bg-bg-primary">
      {/* Header */}
      <div className="h-16 border-b border-border-default flex items-center justify-between px-6">
        <h1 className="text-xl font-bold bg-gradient-to-r from-coder1-cyan to-coder1-purple bg-clip-text text-transparent">
          Diagram Studio
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handleExportPNG}
            disabled={!renderedSVG}
            className="px-4 py-2 bg-bg-secondary border border-border-default rounded-lg hover:border-coder1-cyan disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Split Pane Editor */}
      <PanelGroup direction="horizontal" className="h-[calc(100vh-4rem)]">
        {/* Left: Input & Code */}
        <Panel defaultSize={50} minSize={30}>
          <div className="h-full p-6 overflow-auto">
            {/* Natural Language Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-text-secondary">
                Describe your diagram
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Create a flowchart for user authentication with OAuth..."
                className="w-full h-32 px-4 py-3 bg-bg-secondary border border-border-default rounded-lg focus:border-coder1-cyan resize-none"
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !description.trim()}
                className="mt-3 px-6 py-2 bg-gradient-to-r from-coder1-cyan to-coder1-purple text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {isGenerating ? 'Generating...' : 'Generate with AI'}
              </button>
            </div>

            {/* Mermaid Code Editor */}
            {mermaidCode && (
              <div>
                <label className="block text-sm font-medium mb-2 text-text-secondary">
                  Mermaid Code
                </label>
                <textarea
                  value={mermaidCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  className="w-full h-64 px-4 py-3 bg-bg-secondary border border-border-default rounded-lg focus:border-coder1-cyan font-mono text-sm resize-none"
                />
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>
        </Panel>

        <PanelResizeHandle className="w-1 bg-border-default hover:bg-coder1-cyan transition-colors" />

        {/* Right: Preview */}
        <Panel defaultSize={50} minSize={30}>
          <div className="h-full p-6 bg-bg-secondary overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-text-secondary">
                Live Preview
              </label>
              <Eye className="w-4 h-4 text-text-muted" />
            </div>
            
            <div 
              ref={previewRef}
              className="bg-bg-primary border border-border-default rounded-lg p-8 min-h-[400px] flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: renderedSVG }}
            />
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}
```

---

## 📚 Template Library

### 15 Pre-Built Templates

#### Architecture Templates (5)
1. **Microservices Architecture**
   ```mermaid
   graph TB
       A[API Gateway] --> B[Auth Service]
       A --> C[User Service]
       A --> D[Order Service]
       B --> E[(Auth DB)]
       C --> F[(User DB)]
       D --> G[(Order DB)]
   ```

2. **Three-Tier Architecture**
3. **Serverless Architecture**
4. **Event-Driven Architecture**
5. **Component Relationship Diagram**

#### Workflow Templates (4)
1. **User Registration Flow**
2. **Payment Processing Flow**
3. **CI/CD Pipeline**
4. **Approval Process**

#### Database Templates (3)
1. **E-commerce ERD**
2. **Social Media ERD**
3. **SaaS Application ERD**

#### Planning Templates (3)
1. **Project Roadmap (Gantt)**
2. **Sprint Timeline**
3. **Product Launch Timeline**

---

## 🎯 Integration Points

### 1. PRD Generator Integration

```typescript
// In PRD Generator page after 5 questions complete:

const handleConsultationComplete = async (answers: string[]) => {
  // Generate PRD
  const prd = await claudeService.generatePRD(answers);
  
  // Offer diagram generation
  const shouldGenerateDiagram = await confirmDialog({
    title: "Generate Architecture Diagram?",
    message: "Would you like an AI-generated system architecture diagram for your PRD?",
  });
  
  if (shouldGenerateDiagram) {
    const diagram = await claudeService.generateMermaidCode(
      `System architecture for: ${prd.title}. Requirements: ${prd.requirements.join(', ')}`,
      'flowchart'
    );
    
    // Save diagram with PRD
    prd.architectureDiagram = diagram;
  }
  
  // Continue to IDE
  router.push('/ide?prd=' + prd.id);
};
```

### 2. Smart Context Detection

```typescript
// services/diagram-service.ts

export async function detectDiagramContext(): Promise<{
  suggested: boolean;
  type: string;
  reason: string;
} | null> {
  const openFiles = useIDEStore.getState().openFiles;
  
  // Detect React components
  const reactComponents = openFiles.filter(f => 
    f.endsWith('.tsx') || f.endsWith('.jsx')
  );
  
  if (reactComponents.length >= 5) {
    return {
      suggested: true,
      type: 'component-diagram',
      reason: `You have ${reactComponents.length} React components. Would you like to visualize their relationships?`
    };
  }
  
  // Detect database models
  const hasModels = openFiles.some(f => 
    f.includes('model') || f.includes('schema')
  );
  
  if (hasModels) {
    return {
      suggested: true,
      type: 'er-diagram',
      reason: 'Detected database models. Generate an ERD?'
    };
  }
  
  // Detect API routes
  const apiRoutes = openFiles.filter(f => 
    f.includes('api/') || f.includes('routes/')
  );
  
  if (apiRoutes.length >= 3) {
    return {
      suggested: true,
      type: 'sequence-diagram',
      reason: `You have ${apiRoutes.length} API routes. Visualize API flow?`
    };
  }
  
  return null;
}
```

### 3. Navigation Integration

```typescript
// components/MenuBar.tsx - Add to navigation items

const menuItems = [
  // ... existing items
  {
    label: 'Diagrams',
    href: '/diagrams',
    icon: <Network className="w-4 h-4" />,
    description: 'Create architecture and flow diagrams'
  }
];
```

---

## ⚡ Performance Considerations

### Client-Side Rendering
- Mermaid.js renders entirely in browser (no server load)
- Large diagrams (100+ nodes) may take 2-3 seconds
- Use debouncing for live preview (500ms delay)

### Optimization Strategies
1. **Debounce Preview Updates**: Only re-render after user stops typing
2. **Lazy Load Templates**: Load template library on demand
3. **Memoize Rendered Diagrams**: Cache SVG output for unchanged code
4. **Virtual Scrolling**: For diagram library with 50+ diagrams

### Code Example: Debounced Preview

```typescript
const [mermaidCode, setMermaidCode] = useState('');
const [debouncedCode, setDebouncedCode] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedCode(mermaidCode);
  }, 500); // Wait 500ms after user stops typing
  
  return () => clearTimeout(timer);
}, [mermaidCode]);

useEffect(() => {
  if (debouncedCode) {
    renderDiagram(debouncedCode, 'preview').then(setRenderedSVG);
  }
}, [debouncedCode]);
```

---

## 🚨 Error Handling

### Common Errors & Solutions

1. **Invalid Mermaid Syntax**
   - **Error**: `Parse error on line X`
   - **Solution**: Highlight error line in Monaco editor, show helpful message
   - **User Action**: Fix syntax or click "Fix with AI"

2. **Rendering Timeout**
   - **Error**: Diagram too complex (10,000+ characters)
   - **Solution**: Show warning, offer to simplify with AI
   - **User Action**: Reduce complexity or split into multiple diagrams

3. **Export Failure**
   - **Error**: PNG conversion fails in Safari
   - **Solution**: Fallback to SVG export
   - **User Action**: Download SVG instead

4. **Claude API Error**
   - **Error**: API key invalid or rate limited
   - **Solution**: Show manual editor mode
   - **User Action**: Edit Mermaid code directly or retry later

### Error Handling Code

```typescript
try {
  const code = await claudeService.generateMermaidCode(description);
  setMermaidCode(code);
} catch (error) {
  if (error.message.includes('API key')) {
    setError('Claude API unavailable. Please edit Mermaid code manually.');
    setShowManualEditor(true);
  } else if (error.message.includes('rate limit')) {
    setError('Rate limited. Try again in a few minutes.');
  } else {
    setError(`Generation failed: ${error.message}`);
  }
}
```

---

## 📊 Success Metrics

### Phase 1 Success Criteria
- ✅ User can generate diagram from natural language
- ✅ Claude produces valid Mermaid syntax 90%+ of time
- ✅ Diagram renders correctly in preview
- ✅ Export works for PNG/SVG/Code
- ✅ Response time < 5 seconds for generation

### Phase 2 Success Criteria
- ✅ 15+ templates available
- ✅ AI refinement works conversationally
- ✅ Monaco editor provides syntax help
- ✅ UI matches Coder1 design system
- ✅ Zero crashes during normal use

### Phase 3 Success Criteria
- ✅ PRD Generator offers diagram creation
- ✅ Smart suggestions appear based on context
- ✅ Diagrams saved to project files
- ✅ Navigation integrated seamlessly
- ✅ File operations (CRUD) work reliably

### User Metrics (Post-Launch)
- **Adoption Rate**: 40%+ of users try diagram feature within first session
- **Time Savings**: 90%+ reduction in diagram creation time (30min → 2min)
- **Export Rate**: 70%+ of generated diagrams are exported
- **Template Usage**: 50%+ of diagrams start from templates
- **AI Refinement**: 60%+ of users refine diagrams with AI after initial generation

---

## 🎉 Benefits & Value Proposition

### For Beginners
- **No Mermaid Learning Curve**: AI translates English → Mermaid
- **Templates Provide Starting Points**: Learn by example
- **Visual Feedback**: See results immediately
- **Professional Output**: Export-ready for presentations

### For Professional Developers
- **Speed**: 15x faster than manual diagram creation
- **Consistency**: AI ensures proper syntax
- **Iterative Refinement**: Quickly experiment with different structures
- **Documentation Integration**: Embed in PRDs, README files, wikis

### For Coder1 Platform
- **Differentiation**: Feature not in VSCode, Cursor, Replit
- **Workflow Completion**: Requirements → Design → Code pipeline
- **AI Showcase**: Demonstrates Claude's diagram understanding
- **User Engagement**: Sticky feature that increases session length

---

## 🔮 Future Enhancements (Post-MVP)

### Advanced Features
1. **Real-Time Collaboration**: Multiple users edit same diagram
2. **Version History**: Track diagram changes over time
3. **Diagram Diffing**: Visual comparison of diagram versions
4. **Animation**: Animated sequence diagrams showing flow
5. **Interactive Diagrams**: Click nodes to navigate to code

### AI Enhancements
1. **Code → Diagram**: Reverse engineering (analyze code, generate diagram)
2. **Diagram → Code**: Generate boilerplate from architecture diagram
3. **Smart Layouts**: AI optimizes node positioning for clarity
4. **Multi-Diagram Projects**: Manage related diagrams (system, component, sequence)

### Integration Enhancements
1. **GitHub Integration**: Diagrams in PR descriptions
2. **Confluence/Notion Export**: One-click export to wikis
3. **Figma Bridge**: Convert diagrams to Figma designs
4. **Presentation Mode**: Full-screen diagram walkthrough

---

## 📖 Resources & References

### Mermaid.js Documentation
- **Official Docs**: https://mermaid.js.org/
- **Live Editor**: https://mermaid.live/
- **Syntax Reference**: https://mermaid.js.org/intro/syntax-reference.html
- **Examples Gallery**: https://mermaid.js.org/ecosystem/integrations-community.html

### Inspiration
- **Codigram**: https://codigram.app (main inspiration)
- **Excalidraw**: https://excalidraw.com (hand-drawn diagrams)
- **Draw.io**: https://app.diagrams.net (traditional diagramming)

### Technical References
- **React Resizable Panels**: https://github.com/bvaughn/react-resizable-panels
- **Monaco Editor**: https://microsoft.github.io/monaco-editor/
- **SVG to PNG Conversion**: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API

---

## 🛠️ Implementation Checklist

### Pre-Implementation
- [ ] Review this specification document
- [ ] Visit Codigram.app to understand UX
- [ ] Check Mermaid.js documentation
- [ ] Confirm Claude API access working

### Phase 1 (Basic Integration)
- [ ] Install mermaid package
- [ ] Create `lib/diagram-utils.ts`
- [ ] Extend `lib/claude-service.ts`
- [ ] Create `app/diagrams/page.tsx`
- [ ] Test: Generate flowchart from English
- [ ] Test: Export PNG/SVG/Code
- [ ] Commit: "feat: Add basic Mermaid diagram generation"

### Phase 2 (Enhanced UX)
- [ ] Create template library component
- [ ] Add 15+ templates
- [ ] Implement AI chat refinement
- [ ] Integrate Monaco editor
- [ ] Apply Coder1 design system
- [ ] Test: All templates render correctly
- [ ] Test: AI refinement works conversationally
- [ ] Commit: "feat: Add diagram templates and AI refinement"

### Phase 3 (Deep Integration)
- [ ] Integrate with PRD Generator
- [ ] Implement context detection
- [ ] Add navigation links
- [ ] Create diagram service (CRUD)
- [ ] Add to left panel (optional)
- [ ] Test: End-to-end workflow (PRD → Diagram → Export)
- [ ] Test: File operations (save/load/delete)
- [ ] Commit: "feat: Integrate diagrams throughout Coder1 workflow"

### Post-Implementation
- [ ] Update CLAUDE.md with diagram feature
- [ ] Create user documentation
- [ ] Add examples to public/diagrams/
- [ ] Performance testing with large diagrams
- [ ] Gather user feedback

---

## 📞 Support & Questions

**For Implementation Questions**:
- Review Mermaid.js documentation: https://mermaid.js.org/
- Check Codigram.app for UX patterns
- Reference existing Coder1 components for styling

**For Design Questions**:
- Follow Coder1 design tokens (`lib/design-tokens.ts`)
- Use glassmorphic style from existing pages
- Match color scheme (cyan/purple/orange)

**For AI Integration Questions**:
- Reference `lib/claude-service.ts` patterns
- Use existing prompt engineering approaches
- Follow token usage tracking patterns

---

## ✅ Final Notes for Implementing Agent

### Key Success Factors
1. **Start Simple**: Phase 1 first, then iterate
2. **Test Frequently**: Verify each component before moving on
3. **Match Existing Patterns**: Study consultation page, PRD generator
4. **AI-First Approach**: Make AI the primary interface, manual editing secondary
5. **Professional Polish**: This is a flagship feature, quality matters

### Common Pitfalls to Avoid
- ❌ Don't overcomplicate Phase 1 - basic functionality first
- ❌ Don't skip Mermaid theme configuration - it must match Coder1
- ❌ Don't forget error handling - Claude API can fail
- ❌ Don't ignore mobile - responsive design required
- ❌ Don't hardcode examples - use template system

### Estimated Timeline
- **Phase 1**: 2-3 hours (core functionality)
- **Phase 2**: 3-4 hours (polish and templates)
- **Phase 3**: 4-6 hours (deep integration)
- **Total**: 9-13 hours for complete implementation

---

**Good luck with implementation! This feature will significantly enhance Coder1's value proposition.** 🚀

*Document Version: 1.0*  
*Created: November 24, 2025*  
*For: Coder1 IDE Feature Development*
