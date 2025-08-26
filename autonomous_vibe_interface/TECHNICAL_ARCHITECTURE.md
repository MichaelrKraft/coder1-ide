# Technical Architecture
**Last Updated**: January 15, 2025  
**Version**: v1.0-stable

## 🏗️ **SYSTEM OVERVIEW**

Autonomous Vibe Interface (Coder1) is a full-stack AI-powered web development platform built with modern JavaScript/TypeScript technologies. The system follows a microservices-inspired architecture with clear separation of concerns between frontend, backend, and AI integration layers.

## 📊 **HIGH-LEVEL ARCHITECTURE**

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE LAYER                     │
├─────────────────────────────────────────────────────────────┤
│  PRD Generator (CANONICAL)  │  Monaco IDE (React/TypeScript) │
│  - Smart Questionnaire      │  - Code Editor                 │
│  - Wireframe Generation     │  - File Explorer               │
│  - Expert Consultation      │  - Terminal Integration        │
└─────────────────────────────────────────────────────────────┘
                               │
                    ┌─────────────────┐
                    │   EXPRESS.JS    │
                    │   WEB SERVER    │
                    │   (Port 3000)   │
                    └─────────────────┘
                               │
├─────────────────────────────────────────────────────────────┤
│                     API LAYER                               │
├─────────────────────────────────────────────────────────────┤
│  Agent Routes  │  Terminal API  │  File System  │  WebSocket │
│  - PRD Gen     │  - PTY Mgmt    │  - Virtual FS  │  - Real-time│
│  - AI Services │  - SafePty     │  - Projects    │  - Terminal │
│  - Claude Code │  - Commands    │  - Sessions    │  - Voice    │
└─────────────────────────────────────────────────────────────┘
                               │
├─────────────────────────────────────────────────────────────┤
│                AI INTELLIGENCE LAYER                        │
├─────────────────────────────────────────────────────────────┤
│  Context      │  Memory        │  Command       │  Proactive │
│  Builder      │  System        │  Parser        │  Intel     │
│  - File Watch │  - JSON Store  │  - NLP         │  - Suggest │
│  - Patterns   │  - Learning    │  - Patterns    │  - Analyze │
└─────────────────────────────────────────────────────────────┘
                               │
├─────────────────────────────────────────────────────────────┤
│                 EXTERNAL INTEGRATIONS                       │
├─────────────────────────────────────────────────────────────┤
│  Claude Code   │  Anthropic     │  OpenAI        │  GitHub    │
│  CLI           │  Claude API    │  GPT API       │  Integration│
│  - Terminal    │  - PRD Gen     │  - Fallback    │  - Push/PR  │
│  - Commands    │  - AI Logic    │  - Enhanced    │  - Rules    │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 **CORE COMPONENTS**

### **1. Frontend Layer**

#### **PRD Generator** (`/CANONICAL/`)
- **Technology**: Vanilla JavaScript + HTML5 + CSS3
- **Features**: 7-step AI-guided requirements gathering
- **Key Files**:
  - `index.html` - Main landing page and PRD interface
  - `product-creation-hub.js` - Core PRD generation logic
  - `product-creation-hub.css` - CODER1 orange branding styles
  - `utils.js` - Shared utility functions

#### **Monaco IDE** (`/coder1-ide/coder1-ide-source/`)
- **Technology**: React 18.2+ with TypeScript 4.9+
- **Architecture**: Component-based with hooks and context
- **Key Components**:
  ```typescript
  App.tsx                    // Main application shell
  ├── ThreePanelLayout.tsx   // Layout management (15% | 70% | 15%)
  ├── Explorer.tsx           // File tree and navigation
  ├── CodeEditor.tsx         // Monaco Editor integration
  ├── Terminal.tsx           // xterm.js terminal component
  └── MagicCommandBar.tsx    // AI component generation
  ```

### **2. Backend Layer** (`/src/`)

#### **Express.js Server** (`app.js`)
- **Framework**: Express.js 4.18+ with ES6 modules
- **Architecture**: Modular routing with middleware chain
- **Key Features**:
  - Static file serving from `/CANONICAL/` and `/public/ide/`
  - WebSocket integration via Socket.IO
  - Rate limiting and security middleware
  - Friend access authentication system

#### **API Routes** (`/src/routes/`)
```javascript
agent-simple.js        // PRD generation and AI agent coordination
terminal-safe.js       // PTY management with SafePtyManager  
claude-buttons.js      // Claude Code CLI integration
natural-commands.js    // Natural language command processing
wireframes.js          // AI wireframe generation
personas.js            // Expert consultation system
magic.js               // AI component generation
hooks.js               // Claude Code hooks management
```

#### **Integrations** (`/src/integrations/`)
```javascript
enhanced-claude-bridge.js    // Master AI orchestration service
claude-code-api.js          // Claude Code CLI wrapper
anthropic-direct.js         // Direct Anthropic API calls
react-bits-client.js        // Component generation service
21st-magic-client.js        // 21st.dev integration
```

### **3. AI Intelligence Layer** (`/src/services/`)

#### **8 Core Intelligence Systems**
```typescript
ai-enhancement/
├── ContextBuilder.js         // File watching and project analysis
├── ConversationThread.js     // Session continuity management
├── MemorySystem.js          // Persistent JSON-based learning
├── CommandParser.js         // Natural language processing
├── ProactiveIntelligence.js // Smart suggestion generation
├── ApprovalWorkflows.js     // Action authorization system
├── PerformanceOptimizer.js  // Resource management
└── EnhancedClaudeBridge.js  // Master AI orchestration
```

## 🔌 **DATA FLOW ARCHITECTURE**

### **1. PRD Generation Flow**
```
User Input → Intelligent Questioner → AI Processing → Enhanced Brief → 
localStorage → IDE Integration → CLAUDE.md Creation → Development Ready
```

### **2. Terminal Integration Flow**  
```
Terminal UI → WebSocket → SafePtyManager → Real PTY → 
Claude Code CLI → AI Processing → Response → Terminal Display
```

### **3. AI Intelligence Flow**
```
User Action → Context Builder → Memory System → Enhanced Prompt → 
AI Service → Response Processing → Proactive Suggestions → User Interface
```

## 💾 **DATA PERSISTENCE**

### **Session Storage**
- **Technology**: Express sessions with in-memory store
- **Duration**: 24-hour sessions with activity tracking
- **Data**: Authentication, preferences, temporary state

### **Project Storage**
- **Location**: `/coder1-ide/projects/` (virtual file system)
- **Structure**: User-based project directories with metadata
- **Format**: JSON project definitions with file trees

### **AI Memory System**
- **Technology**: JSON-based persistent storage
- **Location**: `/.coder1/memory/` (hidden directory)
- **Components**:
  ```json
  {
    "conversations": [],     // Chat history and context
    "insights": [],         // Learning and patterns  
    "taskOutcomes": [],     // Success/failure tracking
    "userPreferences": {},  // Personalization data
    "projectPatterns": []   // Code analysis results
  }
  ```

## 🌐 **NETWORK ARCHITECTURE**

### **HTTP Endpoints**
```
GET  /                     // PRD Generator homepage
GET  /ide                  // Monaco IDE interface  
GET  /health               // System health check
POST /api/agent/*          // AI agent coordination
POST /api/terminal/*       // Terminal session management
GET  /api/wireframes/*     // Wireframe generation
POST /api/claude/*         // Claude Code integration
```

### **WebSocket Connections**
```
/terminal              // Real-time terminal I/O
/voice                // Voice interface (future)
/ai-updates           // Live AI processing updates
```

### **Authentication & Security**
- **Friend Access**: Invite code system with session management
- **Rate Limiting**: Tiered limits for different API endpoints
- **CORS**: Configured for development and production origins
- **Input Validation**: Express-validator middleware on all endpoints

## 🎨 **FRONTEND ARCHITECTURE**

### **React Component Hierarchy**
```typescript
<App>
├── <AuthProvider>          // Authentication context
├── <ThemeProvider>         // Design system context  
├── <ThreePanelLayout>      // Main layout container
│   ├── <Explorer>          // File navigation (15% width)
│   ├── <EditorTerminalSplit> // Main content (70% width)
│   │   ├── <CodeEditor>    // Monaco Editor integration
│   │   └── <Terminal>      // xterm.js terminal
│   └── <Sidebar>          // AI tools (15% width)
├── <MagicCommandBar>      // AI component generation
├── <VoiceInterface>       // Voice commands (future)
└── <StatusBar>            // System status display
```

### **State Management Strategy**
- **Global State**: React Context for authentication, theme, file system
- **Component State**: useState/useReducer for local UI state
- **Server State**: Custom hooks for API integration
- **Persistent State**: localStorage for PRD data, sessionStorage for UI preferences

### **Performance Optimizations**
- **Code Splitting**: Dynamic imports for heavy components
- **Memoization**: React.memo for expensive renders  
- **Virtual Scrolling**: For large file trees and terminal output
- **Debounced API Calls**: For search and autocomplete
- **Monaco Worker**: Web workers for syntax highlighting

## 🔄 **BUILD & DEPLOYMENT**

### **Development Workflow**
```bash
# Backend Development (Port 3000)
npm run dev                 # Express server with nodemon

# Frontend Development (Port 3001)  
cd coder1-ide/coder1-ide-source
npm start                   # React development server

# Production Build
npm run build               # Build React app
cp -r build/* ../../public/ide/  # Deploy to production location
```

### **Production Architecture**
- **Platform**: Render.com with automatic GitHub deployment
- **Server**: Express.js serving static files + API endpoints
- **CDN**: Static assets served via Render's edge network
- **Database**: JSON file-based storage (plans for PostgreSQL)
- **Monitoring**: Health checks + performance metrics

### **Environment Configuration**
```bash
# Required Environment Variables
ANTHROPIC_API_KEY           # Primary AI service
CLAUDE_CODE_API_KEY         # Claude Code CLI integration
SESSION_SECRET              # Session encryption
PORT                        # Server port (default: 3000)

# Optional Configuration  
OPENAI_API_KEY             # Fallback AI service
BYPASS_FRIEND_AUTH         # Development auth bypass
NODE_ENV                   # Environment mode
```

## 🧪 **TESTING ARCHITECTURE**

### **Testing Strategy**
- **Unit Tests**: Jest + React Testing Library for components
- **Integration Tests**: API endpoint testing with supertest
- **E2E Tests**: Browser automation for critical user flows
- **AI Testing**: Mock AI responses for consistent testing

### **Quality Assurance**
- **TypeScript**: Compile-time type checking
- **ESLint**: Code quality and consistency
- **Prettier**: Automated code formatting
- **Husky**: Pre-commit hooks for quality gates

## 📈 **SCALABILITY CONSIDERATIONS**

### **Current Architecture Limits**
- **Concurrent Users**: ~100 with current in-memory sessions
- **File System**: Virtual FS suitable for demo/prototype use
- **AI Rate Limits**: Managed by intelligent rate limiting middleware
- **Storage**: JSON-based system suitable for small to medium datasets

### **Future Scaling Plans**
- **Database**: Migrate to PostgreSQL for user/project data
- **Caching**: Redis for session storage and API response caching  
- **Load Balancing**: Multiple Express instances behind nginx
- **CDN**: Dedicated CDN for static assets and media files

## 🔒 **SECURITY ARCHITECTURE**

### **Current Security Measures**
- **Authentication**: Session-based with secure cookies
- **Authorization**: Role-based access control via friend codes
- **Input Validation**: Comprehensive validation on all endpoints
- **Rate Limiting**: Tiered limits to prevent abuse
- **CORS**: Strict origin controls for API access

### **Security Best Practices**
- **Environment Variables**: All secrets via environment configuration
- **No Client Secrets**: API keys never exposed to frontend
- **Secure Headers**: HTTPS enforcement and security headers
- **Session Security**: Secure cookie configuration with expiration

---

**📚 Related Documentation**:
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) - Complete project overview
- [IDE_STANDARDIZATION.md](./IDE_STANDARDIZATION.md) - IDE implementation details
- [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) - Deployment configuration

**🔄 Architecture Version**: v1.0-stable (January 2025)  
**📊 Complexity Score**: Moderate (well-organized, clear separation of concerns)  
**🚀 Deployment Ready**: ✅ Production-tested architecture