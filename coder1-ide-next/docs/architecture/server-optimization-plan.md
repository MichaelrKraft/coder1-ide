# 🔧 Server Optimization Technical Plan

## Memory Optimization Strategy for Render Deployment

**Target**: Run on Render Starter Plan ($7/month, 512MB RAM)  
**Current Usage**: 93-94% of available memory (crashes frequently)  
**Goal**: Reduce to <400MB stable usage

## Memory Profiling Results

### Current Memory Consumers
```
Claude CLI Processes: ~150MB each x 5 = 750MB
Session Data in RAM: ~100-200MB
Node Modules Loaded: ~150MB
Terminal Buffers: ~50MB
Total: ~900MB+ (causing crashes)
```

### After Optimization Targets
```
Process Pool (2 max): ~300MB
Session Data (disk): ~20MB active
Lazy Loaded Modules: ~50MB
Terminal Buffers: ~20MB
Total: ~390MB (comfortable margin)
```

## Process Pooling Architecture

### Current Problem: Multiple CLI Spawns
```javascript
// BEFORE: Each agent spawns new process
async spawnAgent(agentId) {
  const process = spawn('claude', [...]);  // New 150MB process
  return process;
}
```

### Solution: Shared Process Pool
```javascript
// AFTER: Reuse processes from pool
class ProcessPool {
  constructor() {
    this.pool = new Map();
    this.maxProcesses = 2;  // Hard limit for 512MB
    this.queue = [];
  }
  
  async getProcess() {
    // Reuse existing or queue if at limit
    const available = this.findAvailable();
    if (available) return available;
    
    if (this.pool.size < this.maxProcesses) {
      return this.createProcess();
    }
    
    // Queue request and notify user
    return this.queueRequest();
  }
}
```

## Stateless Session Design

### Current Problem: Everything in Memory
```javascript
// BEFORE: Session data stored in RAM
const sessions = new Map();
sessions.set(id, {
  history: [...],  // Full conversation history
  state: {...},    // Complete state object
  data: {...}      // All session data
});
```

### Solution: Disk Persistence
```javascript
// AFTER: Stream to disk, keep minimal in RAM
class StatelessSession {
  constructor(id) {
    this.id = id;
    this.dbPath = `./sessions/${id}.db`;
    this.activeContext = null;  // Only recent context
  }
  
  async addMessage(msg) {
    // Append to disk, not memory
    await fs.appendFile(this.dbPath, JSON.stringify(msg));
    this.updateActiveContext(msg);
  }
  
  async getHistory() {
    // Read from disk on demand
    return fs.readFile(this.dbPath);
  }
}
```

## Queue Management System

### Intelligent Request Queuing
```javascript
class SmartQueue {
  constructor() {
    this.queue = [];
    this.processing = 0;
    this.maxConcurrent = 2;
  }
  
  async addRequest(request) {
    const memStats = await getMemoryUsage();
    
    if (memStats.percentage > 85) {
      // Queue with user notification
      const position = this.queue.length + 1;
      const waitTime = this.estimateWaitTime();
      
      this.queue.push(request);
      
      return {
        status: 'queued',
        position,
        estimatedWait: `${waitTime} seconds`,
        message: `High demand - you're #${position} in queue`
      };
    }
    
    return this.processImmediately(request);
  }
}
```

## Graceful Degradation Strategy

### Feature Tiers Based on Memory
```javascript
const featureTiers = {
  // Always available (< 300MB)
  essential: {
    maxAgents: 1,
    features: ['basic-ide', 'single-agent', 'file-ops'],
    bufferSize: 10000
  },
  
  // Standard load (300-380MB)
  standard: {
    maxAgents: 2,
    features: ['two-agent-teams', 'session-summary'],
    bufferSize: 25000
  },
  
  // Only when resources available (< 300MB)
  premium: {
    maxAgents: 3,
    features: ['multi-agent', 'parallel-execution'],
    bufferSize: 50000
  }
};

function getCurrentTier() {
  const memUsage = process.memoryUsage().heapUsed / 1048576;
  if (memUsage < 300) return featureTiers.premium;
  if (memUsage < 380) return featureTiers.standard;
  return featureTiers.essential;
}
```

## Memory Monitoring & Cleanup

### Aggressive Cleanup Strategy
```javascript
class MemoryOptimizer {
  constructor() {
    this.warningThreshold = 300;  // MB
    this.panicThreshold = 380;    // MB
  }
  
  async checkMemory() {
    const usage = this.getMemoryUsage();
    
    if (usage > this.panicThreshold) {
      await this.panicCleanup();
    } else if (usage > this.warningThreshold) {
      await this.normalCleanup();
    }
  }
  
  async panicCleanup() {
    // Emergency measures
    await this.killIdleProcesses();
    await this.clearAllBuffers();
    await this.compactSessions();
    global.gc?.();  // Force GC if available
  }
}
```

## Deployment Configuration

### Render.yaml Configuration
```yaml
services:
  - type: web
    name: coder1-ide-alpha
    runtime: node
    plan: starter  # $7/month, 512MB RAM
    
    buildCommand: |
      npm install --production
      npm run build:alpha
      npm prune --production
      
    startCommand: |
      node --max-old-space-size=400 \
           --expose-gc \
           --optimize-for-size \
           server.js
           
    envVars:
      - key: NODE_ENV
        value: production
      - key: MEMORY_LIMIT_MB
        value: 400
      - key: MAX_CONCURRENT_AGENTS
        value: 2
      - key: ENABLE_AGGRESSIVE_CLEANUP
        value: true
```

### Environment Variables
```bash
# Memory Management
NODE_OPTIONS=--max-old-space-size=400
MEMORY_WARNING_THRESHOLD=300
MEMORY_PANIC_THRESHOLD=380

# Process Management
MAX_CLAUDE_PROCESSES=2
PROCESS_IDLE_TIMEOUT=120000
PROCESS_POOL_ENABLED=true

# Session Management
SESSION_PERSISTENCE=disk
MAX_ACTIVE_SESSIONS=3
SESSION_CLEANUP_INTERVAL=60000

# Feature Flags
ENABLE_GRACEFUL_DEGRADATION=true
ENABLE_QUEUE_MANAGEMENT=true
ENABLE_MEMORY_MONITORING=true
```

## Implementation Timeline

### Week 1: Core Optimizations
- [ ] Implement process pooling
- [ ] Add memory monitoring service
- [ ] Create queue management system
- [ ] Set up health endpoints

### Week 2: Session Management
- [ ] Implement disk persistence
- [ ] Add session streaming
- [ ] Create cleanup routines
- [ ] Test memory usage

### Week 3: Deployment Testing
- [ ] Deploy to Render Starter
- [ ] Load test with multiple users
- [ ] Monitor memory patterns
- [ ] Tune thresholds

### Week 4: Polish & Documentation
- [ ] Add user notifications
- [ ] Create status dashboard
- [ ] Document limitations
- [ ] Prepare for alpha users

## Success Criteria

### Memory Targets
- Idle: < 250MB
- Single user: < 350MB
- Peak (2 users): < 450MB
- Never exceed: 500MB

### Performance Targets
- Agent spawn: < 30 seconds
- Queue wait: < 2 minutes
- Response time: < 5 seconds
- Uptime: > 99%

## Monitoring & Alerts

### Health Check Endpoint
```javascript
GET /api/health

Response:
{
  "status": "healthy|warning|critical",
  "memory": {
    "used": 320,
    "limit": 400,
    "percentage": 80
  },
  "sessions": {
    "active": 2,
    "queued": 1,
    "max": 3
  },
  "processes": {
    "active": 1,
    "pool": 2,
    "queue": 0
  }
}
```

### Alert Thresholds
- Memory > 75%: Warning
- Memory > 85%: Critical
- Queue > 5: Warning
- Response > 10s: Alert

---
*Last Updated: September 10, 2025*
*Technical Lead: Development Team*