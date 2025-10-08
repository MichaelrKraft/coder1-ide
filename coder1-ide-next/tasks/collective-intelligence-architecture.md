# 🏗️ Collective Intelligence - Technical Architecture

**Date:** October 4, 2025  
**Status:** Design Phase  
**Principle:** Non-invasive, parallel infrastructure

---

## 🎯 Architecture Overview

### Design Principles

1. **Separation of Concerns** - Intelligence layer is completely separate from core IDE
2. **Graceful Degradation** - IDE works perfectly even if intelligence services fail
3. **Opt-In Philosophy** - Users explicitly choose to participate
4. **Privacy First** - Anonymous pattern capture, no personal data
5. **Performance Isolated** - Background processing, zero impact on IDE responsiveness

---

## 🏢 System Architecture

### Current Architecture (Protected - Do Not Modify)

```
┌─────────────────────────────────────────┐
│       Coder1 IDE (Port 3001)            │
│  ┌──────────────────────────────────┐   │
│  │  Next.js App Router              │   │
│  │  - /ide → IDE interface          │   │
│  │  - /api/claude → AI endpoints    │   │
│  │  - /api/sessions → Session mgmt  │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │  Core Services                   │   │
│  │  - Monaco Editor                 │   │
│  │  - Terminal (PTY)                │   │
│  │  - Session Summaries             │   │
│  │  - Claude CLI Integration        │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │  Database: sessions.db           │   │
│  │  - User sessions                 │   │
│  │  - Terminal history              │   │
│  │  - File changes                  │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### New Architecture (Additive - Built In Parallel)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Coder1 Platform Ecosystem                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │   Core IDE       │  │   Intelligence   │  │  Launchpad   │  │
│  │   (Port 3001)    │  │   Service        │  │  Service     │  │
│  │                  │  │   (Port 3002)    │  │  (Port 3003) │  │
│  │  UNCHANGED       │  │   NEW            │  │  NEW         │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘  │
│           │                     │                    │          │
│           ├─────────────────────┴────────────────────┘          │
│           │           Optional API Calls                        │
│           │        (can fail without breaking IDE)              │
│           │                                                      │
│  ┌────────▼──────────────────────────────────────────────────┐  │
│  │              Message Queue (Redis/RabbitMQ)                │  │
│  │  - Session events                                          │  │
│  │  - Pattern discovery                                       │  │
│  │  - Community updates                                       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ sessions.db  │  │intelligence.db│  │   launchpad.db       │  │
│  │ (existing)   │  │   (new)       │  │   (new)              │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Intelligence Service Architecture

### Service Components

```
intelligence-service/
├── src/
│   ├── capture/
│   │   ├── SessionListener.ts       # Listens to session events
│   │   ├── PatternExtractor.ts      # Extracts patterns from sessions
│   │   └── DNABuilder.ts            # Creates App DNA structure
│   │
│   ├── analysis/
│   │   ├── PatternAnalyzer.ts       # Analyzes patterns for insights
│   │   ├── SuccessPredictor.ts      # Predicts success probability
│   │   └── RecommendationEngine.ts  # Generates recommendations
│   │
│   ├── storage/
│   │   ├── PatternDB.ts             # Pattern database interface
│   │   ├── InsightsCache.ts         # Redis cache for quick lookups
│   │   └── DNAStorage.ts            # App DNA persistence
│   │
│   ├── api/
│   │   ├── routes/
│   │   │   ├── recommendations.ts   # GET /recommendations
│   │   │   ├── patterns.ts          # GET /patterns/:category
│   │   │   └── dna.ts               # POST /dna/generate
│   │   └── middleware/
│   │       ├── auth.ts              # Verify requests from IDE
│   │       └── rateLimit.ts         # Prevent abuse
│   │
│   └── workers/
│       ├── PatternMiner.ts          # Background pattern discovery
│       ├── InsightGenerator.ts      # Generates collective insights
│       └── SuccessCorrelator.ts     # Finds success patterns
│
├── database/
│   ├── schema.sql                   # Database schema
│   └── migrations/                  # Database migrations
│
└── config/
    ├── intelligence.config.ts       # Service configuration
    └── privacy.config.ts            # Privacy settings
```

### Data Flow

```
1. Session Completed (in Core IDE)
   ↓
2. SessionSummaryService generates summary
   ↓
3. Optional event emitted to Message Queue
   ↓
4. Intelligence Service picks up event
   ↓
5. PatternExtractor processes:
   - App category detected
   - Features identified
   - Success indicators extracted
   - Timeline analyzed
   ↓
6. Pattern stored in intelligence.db (anonymized)
   ↓
7. PatternAnalyzer runs (background)
   ↓
8. Insights updated in cache
   ↓
9. Available via API for future queries
```

---

## 💾 Database Schema

### Intelligence Database (intelligence.db)

```sql
-- Apps table (anonymized metadata)
CREATE TABLE apps (
  id UUID PRIMARY KEY,
  category VARCHAR(100),
  sub_category VARCHAR(100),
  created_at TIMESTAMP,
  success_indicators JSONB,
  failure_signals JSONB,
  development_duration_hours INTEGER,
  feature_count INTEGER,
  tech_stack JSONB,
  user_persona VARCHAR(100),  -- e.g., "elderly users", "busy parents"
  anonymous_dna JSONB         -- Complete journey without personal info
);

-- Patterns table (discovered insights)
CREATE TABLE patterns (
  id UUID PRIMARY KEY,
  pattern_type VARCHAR(50),   -- 'success', 'failure', 'correlation'
  category VARCHAR(100),
  description TEXT,
  confidence_score FLOAT,     -- 0.0 to 1.0
  supporting_apps_count INTEGER,
  supporting_app_ids UUID[],
  discovered_at TIMESTAMP,
  pattern_data JSONB
);

-- Success correlations (what leads to success)
CREATE TABLE success_correlations (
  id UUID PRIMARY KEY,
  feature_name VARCHAR(200),
  category VARCHAR(100),
  correlation_strength FLOAT, -- -1.0 to 1.0
  success_rate_with FLOAT,    -- Success rate when present
  success_rate_without FLOAT, -- Success rate when absent
  sample_size INTEGER,
  last_updated TIMESTAMP
);

-- Recommendations cache
CREATE TABLE recommendations (
  id UUID PRIMARY KEY,
  app_category VARCHAR(100),
  recommendation_type VARCHAR(50),
  recommendation_text TEXT,
  supporting_evidence JSONB,
  confidence FLOAT,
  created_at TIMESTAMP,
  expires_at TIMESTAMP
);

-- Meta insights (cross-category patterns)
CREATE TABLE meta_insights (
  id UUID PRIMARY KEY,
  insight_type VARCHAR(100),  -- e.g., "elderly_user_preference"
  description TEXT,
  applicable_categories VARCHAR[],
  supporting_patterns UUID[],
  confidence FLOAT,
  discovered_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_apps_category ON apps(category);
CREATE INDEX idx_patterns_category ON patterns(category);
CREATE INDEX idx_correlations_category ON success_correlations(category);
CREATE INDEX idx_recommendations_category ON recommendations(app_category);
```

### Launchpad Database (launchpad.db)

```sql
-- Launched apps
CREATE TABLE launched_apps (
  id UUID PRIMARY KEY,
  maker_id UUID,
  app_name VARCHAR(200),
  description TEXT,
  category VARCHAR(100),
  live_url VARCHAR(500),
  screenshot_url VARCHAR(500),
  dna_id UUID,                -- Links to intelligence.apps
  submitted_at TIMESTAMP,
  upvotes INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  success_metrics JSONB       -- Revenue, users, etc.
);

-- Makers
CREATE TABLE makers (
  id UUID PRIMARY KEY,
  github_id VARCHAR(100),
  username VARCHAR(100),
  email VARCHAR(200),
  bio TEXT,
  apps_launched INTEGER DEFAULT 0,
  total_upvotes INTEGER DEFAULT 0,
  joined_at TIMESTAMP
);

-- Upvotes
CREATE TABLE app_upvotes (
  app_id UUID,
  user_id UUID,
  created_at TIMESTAMP,
  PRIMARY KEY (app_id, user_id)
);

-- Comments
CREATE TABLE app_comments (
  id UUID PRIMARY KEY,
  app_id UUID,
  user_id UUID,
  comment_text TEXT,
  created_at TIMESTAMP
);

-- Success tracking
CREATE TABLE app_success_metrics (
  app_id UUID PRIMARY KEY,
  users_count INTEGER,
  revenue_monthly DECIMAL(10, 2),
  retention_rate FLOAT,
  nps_score INTEGER,
  last_updated TIMESTAMP
);
```

---

## 🔌 API Design

### Intelligence Service APIs

**1. Get Recommendations**
```typescript
GET /api/intelligence/recommendations

Query Params:
  - category: string (e.g., "dog-walking-app")
  - features: string[] (current features)
  - userPersona: string (optional, e.g., "elderly-users")

Response:
{
  recommendations: [
    {
      type: "feature",
      suggestion: "Add SMS notifications",
      reason: "Apps with SMS have 3.2x better retention for elderly users",
      confidence: 0.87,
      basedOnApps: 342,
      estimatedImpact: {
        successProbabilityIncrease: 0.15,
        retentionIncrease: 2.2
      }
    }
  ],
  currentSuccessProbability: 0.58,
  withRecommendations: 0.73
}
```

**2. Generate App DNA**
```typescript
POST /api/intelligence/dna/generate

Body:
{
  sessionId: string,
  appDescription: string,
  category: string
}

Response:
{
  dnaId: string,
  timeline: [
    {
      day: 1,
      event: "Initial frustration: elderly mom forgets to walk dog",
      type: "motivation"
    },
    {
      day: 3,
      event: "BREAKTHROUGH: SMS is the solution (not push notifications)",
      type: "insight",
      reasoning: "Elderly users read texts but ignore apps"
    }
  ],
  keyDecisions: [...],
  nearFailures: [...],
  successFactors: [...]
}
```

**3. Get Category Intelligence**
```typescript
GET /api/intelligence/patterns/:category

Response:
{
  category: "dog-walking-app",
  totalApps: 547,
  successRate: 0.38,
  topFeatures: [
    {
      name: "SMS reminders",
      adoptionRate: 0.72,
      successCorrelation: 0.81
    }
  ],
  commonFailures: [
    {
      name: "Complex scheduling UI",
      failureRate: 0.65,
      reason: "Users abandon during setup"
    }
  ],
  recommendedStack: [...],
  avgTimeToSuccess: "14 days"
}
```

### Launchpad Service APIs

**1. Submit App**
```typescript
POST /api/launchpad/submit

Body:
{
  appName: string,
  description: string,
  category: string,
  liveUrl: string,
  screenshot: File,
  dnaEnabled: boolean  // Show DNA story publicly?
}

Response:
{
  appId: string,
  launchpadUrl: string,
  dnaStoryUrl?: string
}
```

**2. Get Showcase**
```typescript
GET /api/launchpad/apps

Query Params:
  - filter: "trending" | "new" | "top-rated"
  - category?: string
  - limit?: number

Response:
{
  apps: [
    {
      id: string,
      name: string,
      description: string,
      screenshot: string,
      upvotes: number,
      makerName: string,
      category: string,
      hasDNA: boolean
    }
  ],
  total: number
}
```

---

## 🔐 Security & Privacy

### Privacy Protection

**1. Anonymization Pipeline**
```typescript
// Before storing in intelligence.db
class PrivacyGuard {
  anonymize(sessionData: SessionData): AnonymousPattern {
    return {
      category: this.detectCategory(sessionData),
      features: this.extractFeatures(sessionData),
      successIndicators: this.extractSuccessSignals(sessionData),
      // NO personal info:
      // - No user ID
      // - No email
      // - No API keys
      // - No file paths
      // - No personal data
    };
  }
}
```

**2. User Control**
```typescript
// Settings in IDE
interface IntelligenceSettings {
  captureEnabled: boolean;           // Default: false
  sharePatterns: boolean;             // Default: false
  showRecommendations: boolean;       // Default: false
  allowDNAStory: boolean;             // Default: false
  dataRetentionDays: number;          // Default: 90
}
```

**3. Data Deletion**
```typescript
// User can delete anytime
POST /api/intelligence/data/delete
{
  userId: string,
  confirmDeletion: boolean
}

// Hard deletes all:
// - App patterns
// - DNA stories
// - Recommendations
// - Any traces
```

### Security Measures

**1. API Authentication**
```typescript
// All intelligence APIs require valid JWT
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization;
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const user = await verifyJWT(token);
    req.user = user;
    next();
  } catch {
    return res.status(403).json({ error: 'Invalid token' });
  }
};
```

**2. Rate Limiting**
```typescript
// Prevent abuse
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // Max 100 requests per window
  message: 'Too many requests'
});
```

**3. Data Encryption**
```typescript
// All sensitive data encrypted at rest
const encryptSensitiveData = (data: any) => {
  return encrypt(data, process.env.ENCRYPTION_KEY);
};
```

---

## ⚡ Performance Optimization

### Background Processing

**1. Worker Queue System**
```typescript
// Use Bull or BullMQ for background jobs
import Queue from 'bull';

const patternAnalysisQueue = new Queue('pattern-analysis', {
  redis: { port: 6379, host: 'localhost' }
});

// Add job (non-blocking)
patternAnalysisQueue.add({
  sessionId: 'session-123',
  priority: 'low'
});

// Process in background
patternAnalysisQueue.process(async (job) => {
  const patterns = await analyzePatterns(job.data.sessionId);
  await storePatterns(patterns);
});
```

**2. Caching Strategy**
```typescript
// Redis cache for frequently accessed data
class IntelligenceCache {
  async getRecommendations(category: string) {
    const cached = await redis.get(`recs:${category}`);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    const fresh = await db.getRecommendations(category);
    await redis.setex(`recs:${category}`, 3600, JSON.stringify(fresh));
    
    return fresh;
  }
}
```

**3. Database Optimization**
```sql
-- Materialized views for common queries
CREATE MATERIALIZED VIEW category_stats AS
SELECT 
  category,
  COUNT(*) as total_apps,
  AVG(CASE WHEN success_indicators->>'succeeded' = 'true' THEN 1 ELSE 0 END) as success_rate,
  ARRAY_AGG(DISTINCT tech_stack) as common_stacks
FROM apps
GROUP BY category;

-- Refresh periodically (not real-time)
REFRESH MATERIALIZED VIEW category_stats;
```

---

## 🚀 Deployment Architecture

### Development Environment
```yaml
services:
  ide:
    image: coder1-ide:latest
    ports:
      - "3001:3001"
    depends_on:
      - postgres
  
  intelligence:
    image: coder1-intelligence:latest
    ports:
      - "3002:3002"
    environment:
      - DB_URL=postgresql://intelligence_db
      - REDIS_URL=redis://cache
    depends_on:
      - postgres
      - redis
  
  launchpad:
    image: coder1-launchpad:latest
    ports:
      - "3003:3003"
    depends_on:
      - postgres
  
  postgres:
    image: postgres:14
    volumes:
      - db_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
```

### Production Scaling
```
                    Load Balancer
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
    ┌───▼───┐        ┌───▼───┐        ┌───▼───┐
    │ IDE 1 │        │ IDE 2 │        │ IDE 3 │
    └───┬───┘        └───┬───┘        └───┬───┘
        │                 │                 │
        └─────────────────┴─────────────────┘
                          │
                  Message Queue (Redis)
                          │
        ┌─────────────────┴─────────────────┐
        │                                    │
    ┌───▼────────────┐            ┌────────▼────────┐
    │ Intelligence   │            │   Launchpad     │
    │ Workers (3x)   │            │   Service (2x)  │
    └───┬────────────┘            └────────┬────────┘
        │                                    │
        └─────────────────┬──────────────────┘
                          │
                   PostgreSQL (RDS)
```

---

## 📊 Monitoring & Observability

### Key Metrics to Track

**IDE Performance (Must Not Degrade)**
```typescript
// Monitor these continuously
metrics.track('ide.page_load_time');       // Target: <2s
metrics.track('ide.terminal_latency');     // Target: <100ms
metrics.track('ide.editor_responsiveness'); // Target: <50ms
metrics.track('ide.session_summary_time'); // Target: <5s
```

**Intelligence Service Performance**
```typescript
metrics.track('intelligence.pattern_extraction_time');  // Target: <30s
metrics.track('intelligence.recommendation_latency');    // Target: <500ms
metrics.track('intelligence.cache_hit_rate');           // Target: >80%
metrics.track('intelligence.worker_queue_depth');       // Target: <100
```

**Business Metrics**
```typescript
metrics.track('apps.launched_daily');           // Growth metric
metrics.track('apps.success_rate');             // Core value prop
metrics.track('recommendations.acceptance');     // Feature adoption
metrics.track('revenue.success_tax_monthly');   // Revenue tracking
```

---

## 🎯 Integration Points with Core IDE

### Minimal Touch Points

**1. Session Summary Service** (ONE line added)
```typescript
// File: services/SessionSummaryService.ts
// Line: ~157 (after summary generation)

async generateSummary(sessionId: string) {
  const summary = await this.buildSummary(sessionId);
  
  // NEW: Optional intelligence capture (default: disabled)
  if (process.env.INTELLIGENCE_CAPTURE_ENABLED === 'true') {
    await IntelligenceEventBus.emit('session:completed', { 
      sessionId, 
      summary: this.anonymize(summary) 
    });
  }
  
  return summary;
}
```

**2. Settings Component** (Add intelligence toggle)
```typescript
// File: components/SettingsModal.tsx
// Add to settings UI (collapsible, bottom section)

<Collapsible title="Intelligence Features (Beta)">
  <Toggle
    label="Enable AI recommendations"
    checked={settings.intelligence.enabled}
    onChange={(val) => settings.setIntelligence({ enabled: val })}
    description="Get suggestions based on collective patterns (opt-in)"
  />
  
  <Toggle
    label="Share anonymous patterns"
    checked={settings.intelligence.sharePatterns}
    onChange={(val) => settings.setIntelligence({ sharePatterns: val })}
    description="Help improve AI for everyone (fully anonymous)"
  />
</Collapsible>
```

**3. StatusBar** (Optional launch button)
```typescript
// File: components/status-bar/StatusBarActions.tsx
// Add after existing buttons (far right)

{settings.intelligence.enabled && (
  <button
    onClick={handleLaunchApp}
    className="px-3 py-1.5 bg-purple-600 text-white rounded-md"
    title="Share your app (optional)"
  >
    <RocketIcon className="w-4 h-4" />
  </button>
)}
```

**That's it. Three touch points. Everything else is separate.**

---

## ✅ Testing Strategy

### Unit Tests
```typescript
// Intelligence service tests
describe('PatternExtractor', () => {
  it('anonymizes session data', () => {
    const session = createMockSession({ userId: '123', email: 'test@example.com' });
    const pattern = PatternExtractor.extract(session);
    
    expect(pattern.userId).toBeUndefined();
    expect(pattern.email).toBeUndefined();
    expect(pattern.category).toBeDefined();
  });
  
  it('extracts features correctly', () => {
    const session = createMockSession({ features: ['SMS', 'scheduling'] });
    const pattern = PatternExtractor.extract(session);
    
    expect(pattern.features).toEqual(['SMS', 'scheduling']);
  });
});
```

### Integration Tests
```typescript
// Test IDE → Intelligence communication
describe('Intelligence Integration', () => {
  it('IDE works when intelligence service is down', async () => {
    // Stop intelligence service
    await intelligenceService.stop();
    
    // IDE should still work
    const summary = await SessionSummaryService.generateSummary('test-session');
    expect(summary).toBeDefined();
  });
  
  it('captures patterns when service is up', async () => {
    const session = await createSession();
    await SessionSummaryService.generateSummary(session.id);
    
    // Pattern should be captured
    const patterns = await intelligenceDB.getPatterns({ sessionId: session.id });
    expect(patterns.length).toBeGreaterThan(0);
  });
});
```

### Performance Tests
```typescript
// Ensure zero impact on IDE
describe('Performance Impact', () => {
  it('intelligence capture adds <50ms latency', async () => {
    const start = Date.now();
    await SessionSummaryService.generateSummary('test');
    const withIntelligence = Date.now() - start;
    
    expect(withIntelligence).toBeLessThan(5050); // 5s summary + 50ms max overhead
  });
});
```

---

## 🎯 Success Criteria

### Technical Success
- ✅ Intelligence service runs independently (can stop without affecting IDE)
- ✅ Pattern capture adds <50ms latency
- ✅ Cache hit rate >80% for recommendations
- ✅ Worker queue processes 1000+ sessions/hour
- ✅ Zero data leaks (all patterns anonymized)

### Business Success
- ✅ 1000+ sessions captured without errors
- ✅ 500+ apps launched on Launchpad
- ✅ Success rate improves to 25%+ (vs 5% baseline)
- ✅ User feedback: "This didn't slow down my IDE"
- ✅ Revenue: First $10k from intelligence features

---

*Technical architecture documented: October 4, 2025*  
*Ready for implementation in parallel with core IDE development*
