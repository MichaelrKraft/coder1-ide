# Service Dependency Analysis - Alpha Launch Preparation
*Generated: September 3, 2025*

## 🎯 Executive Summary

This comprehensive analysis maps all service dependencies across the Coder1 IDE platform to accelerate alpha launch preparation. It identifies critical vs optional endpoints, creates dependency trees for health checks, and documents potential single points of failure.

---

## 🏗️ Core Architecture Overview

### Primary Services
1. **Express Backend** (Port 3000) - Core API and WebSocket server
2. **Next.js Frontend** (Port 3001) - IDE Interface and UI
3. **Terminal System** - SafePTYManager + WebSocket integration
4. **AI Services** - Claude/OpenAI integration layer
5. **File System** - Project management and code editing

### Service Communication Flow
```
User Browser (3001) ←→ Next.js Frontend ←→ Express Backend (3000)
                                              ↓
                                         Terminal WebSocket
                                              ↓
                                         SafePTYManager (PTY Sessions)
                                              ↓
                                         AI Supervision Engine
```

---

## 📊 Express Backend API Dependency Map

### 🔴 CRITICAL ENDPOINTS (Alpha blockers if failing)

#### Core System Health
- `GET /health` - System health check (no dependencies)
- `POST /admin/clear-rate-limit` - Rate limit reset (dev tool)

#### Terminal System (Core IDE functionality)
- `/api/terminal/*` - Terminal session management
  - **Dependencies**: SafePTYManager, node-pty, Socket.IO
  - **Critical Path**: Terminal creation → PTY spawn → WebSocket connection
  - **Failure Impact**: Complete IDE terminal failure

#### File Operations (Essential for coding)
- `/api/files/*` - File read/write/tree operations
  - **Dependencies**: File system access, path validation
  - **Critical Path**: File explorer → File operations → Editor sync
  - **Failure Impact**: Cannot edit or save files

#### Session Management
- `/api/claude/session-summary` - Session state preservation
- `/api/sessions/*` - Session persistence
  - **Dependencies**: File system, AI services (fallback available)
  - **Critical Path**: Work preservation for handoffs
  - **Failure Impact**: Lost work context between sessions

#### WebSocket Infrastructure
- Socket.IO connections for terminal, file activity, agent dashboard
  - **Dependencies**: HTTP server, WebSocket transport
  - **Critical Path**: Real-time IDE updates
  - **Failure Impact**: IDE becomes unresponsive

### 🟡 HIGH PRIORITY (Degrades user experience)

#### AI Integration
- `/api/anthropic/*` - Claude API integration
- `/api/openai/*` - OpenAI fallback
  - **Dependencies**: External API keys, rate limiting
  - **Fallback**: Mock responses available
  - **Failure Impact**: No AI assistance, but IDE still functional

#### Authentication & Access
- `/api/beta-access` - Friend access system
- Session middleware with FileStore
  - **Dependencies**: Session file storage
  - **Fallback**: BYPASS_FRIEND_AUTH mode
  - **Failure Impact**: Cannot access system

#### Enhanced Features  
- `/api/agent/*` - AI agent orchestration
- `/api/hooks/*` - Claude Code hooks management
- `/api/error-doctor/*` - AI error analysis
  - **Dependencies**: AI services, complex state management
  - **Failure Impact**: Reduced but not broken functionality

### 🟢 MEDIUM PRIORITY (Nice-to-have features)

#### Dashboard & Analytics
- `/api/dashboard/*` - Metrics and observability
- `/api/analytics/*` - Usage analytics
- `/api/vibe-flow/*` - Development flow tracking
  - **Dependencies**: Data aggregation, storage
  - **Failure Impact**: No visibility, but core IDE works

#### Documentation & Intelligence
- `/api/docs/*` - Documentation intelligence system
- `/api/codebase/*` - Codebase search and analysis
- `/api/repository-intelligence/*` - Code insights
  - **Dependencies**: File indexing, AI services
  - **Failure Impact**: Reduced discoverability

#### Advanced Integrations
- `/api/magic/*` - Component generation
- `/api/github/*` - Git integrations
- `/api/containers/*` - Container management
  - **Dependencies**: External services, complex setup
  - **Failure Impact**: Advanced workflows unavailable

### 🔵 LOW PRIORITY (Beta/experimental features)

#### Experimental Features
- `/api/experimental/*` - Tmux orchestrator
- `/api/tmux-lab` - Laboratory environment
- `/api/sharing/*` - Session sharing (slash commands)
  - **Dependencies**: Complex orchestration systems
  - **Failure Impact**: Beta features unavailable

---

## 🔄 Next.js Frontend Dependency Analysis

### Core API Routes (coder1-ide-next/app/api)

#### Essential Routes
- `/api/health` - Frontend health check
- `/api/claude/session-summary` - Session preservation (with Express fallback)
- `/api/terminal-rest/sessions` - REST terminal management
- `/api/checkpoint` - Work state management

#### Supporting Routes  
- `/api/agents/*` - Agent management UI
- `/api/ai-team/*` - Multi-agent orchestration UI
- `/api/containers/*` - Container UI integration
- `/api/sandbox/*` - Sandbox environment UI

### Frontend-Backend Communication Pattern
```typescript
Next.js Route → Express Backend API → Service Layer
             ↘ Local Processing (fallback) → User Response
```

---

## 🌐 WebSocket Event Dependency Tree

### Terminal WebSocket Events (Critical Path)
```
Client Connection → 'terminal:create' → SafePTYManager
                 ↓
              'terminal:created' ← Session established  
                 ↓
              'terminal:input' → PTY process
                 ↓
              'terminal:output' ← Real-time response
```

**Dependencies**: Socket.IO transport, SafePTYManager, node-pty
**Failure Points**: WebSocket upgrade, PTY spawn, process communication

### File Activity WebSocket (Development feedback)
```
File Change → Claude File Tracker → WebSocket broadcast → UI update
```

**Dependencies**: File system watching, WebSocket clients
**Impact**: Reduced development experience feedback

### Agent Dashboard WebSocket (Observability)
```
Agent Action → Observer pattern → WebSocket broadcast → Dashboard update
```

**Dependencies**: Agent execution tracking
**Impact**: No real-time agent monitoring

---

## ⚠️ Single Points of Failure Analysis

### 1. **SafePTYManager** (Critical)
- **Risk**: Terminal system completely dependent on this service
- **Mitigation**: Comprehensive error handling, session recovery
- **Health Check**: `GET /api/terminal/sessions/status`

### 2. **Socket.IO Server** (Critical)  
- **Risk**: Real-time features depend on WebSocket transport
- **Mitigation**: Graceful degradation to HTTP polling
- **Health Check**: WebSocket connection test

### 3. **File System Access** (Critical)
- **Risk**: Core IDE functionality requires file operations
- **Mitigation**: Permission validation, error boundaries
- **Health Check**: File operation test suite

### 4. **Express Backend Port 3000** (Critical)
- **Risk**: All API communication depends on this service
- **Mitigation**: Port validation on startup, restart procedures  
- **Health Check**: `GET /health` endpoint

### 5. **External AI APIs** (High Impact)
- **Risk**: AI features depend on external service availability
- **Mitigation**: Mock fallbacks, local error handling
- **Health Check**: API key validation, service ping

---

## 🔧 Health Check Strategy Design

### Tier 1: System Essentials (Run every 30 seconds)
```bash
# Critical path validation
curl -f http://localhost:3000/health
curl -f http://localhost:3001/api/health  
curl -f http://localhost:3000/api/terminal/sessions/status
```

### Tier 2: Core Features (Run every 2 minutes)
```bash  
# File operations test
curl -X POST http://localhost:3000/api/files/test
# WebSocket connection test
wscat -c ws://localhost:3000 --wait 5
# AI services test (with fallback)
curl -X POST http://localhost:3000/api/anthropic/test
```

### Tier 3: Enhanced Features (Run every 5 minutes)
```bash
# Agent system test
curl -f http://localhost:3000/api/agent/health
# Documentation system test  
curl -f http://localhost:3000/api/docs/health
# Dashboard metrics test
curl -f http://localhost:3000/api/dashboard/health
```

### Cascade Failure Detection
```bash
# If Tier 1 fails → Immediate alert + auto-recovery
# If Tier 2 fails → Graceful degradation mode
# If Tier 3 fails → Log warning, continue operation
```

---

## 📋 Implementation Priorities for Alpha Launch

### Phase 1: Critical Infrastructure (Week 1)
1. Implement Tier 1 health checks
2. Add SafePTYManager monitoring and recovery
3. Create WebSocket connection resilience  
4. Validate file system permissions and access

### Phase 2: Service Resilience (Week 2)
1. Add Tier 2 health monitoring
2. Implement graceful degradation for AI services
3. Create session recovery mechanisms
4. Add automated restart procedures

### Phase 3: Advanced Monitoring (Week 3)
1. Full observability dashboard
2. Performance metrics collection
3. Predictive failure detection
4. Comprehensive logging and alerting

---

## 🚨 Critical Risks for Alpha Launch

### Highest Risk
1. **Terminal System Failure** - Core IDE becomes unusable
2. **WebSocket Connection Issues** - Real-time features break
3. **File Operation Errors** - Cannot save work
4. **Port Conflicts** - Services fail to start

### Mitigation Strategies
1. **Redundant Health Checks** - Multiple validation layers
2. **Automatic Recovery** - Self-healing system components
3. **Graceful Degradation** - Fallback modes for all features
4. **Clear Error Messages** - User-friendly failure communication

---

## 📈 Success Metrics for Alpha

### System Reliability
- **Uptime Target**: 99.5% during alpha period
- **Recovery Time**: <30 seconds for critical failures
- **Health Check Success**: >95% success rate across all tiers

### User Experience
- **Terminal Startup**: <2 seconds to first prompt
- **File Operations**: <500ms response time
- **AI Features**: <10 seconds response time (with fallback)

---

## 🔄 Continuous Monitoring Strategy

### Real-time Alerts
```javascript
// Critical failure: Immediate notification
if (healthCheck.tier1.failed) {
  sendAlert('CRITICAL', 'Core system failure detected');
  triggerAutoRecovery();
}

// Performance degradation: Warning notification  
if (healthCheck.responseTime > thresholds.warning) {
  sendAlert('WARNING', 'System performance degraded');
  enableDegradationMode();
}
```

### Dashboard Integration
- Real-time service status visualization
- Historical performance trends
- Failure pattern analysis
- Capacity planning metrics

---

## ✅ Next Steps

This analysis enables:

1. **Targeted Health Check Implementation** - Focus on critical paths first
2. **Risk-Based Testing Strategy** - Test failure scenarios systematically  
3. **Monitoring Priority Matrix** - Allocate monitoring resources efficiently
4. **Graceful Degradation Design** - Maintain functionality during partial failures
5. **Recovery Automation** - Implement self-healing capabilities

The service dependency map provides the foundation for building a robust, production-ready alpha launch with comprehensive monitoring, health checks, and failure recovery systems.