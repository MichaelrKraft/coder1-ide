# 🔧 Coder1 Enterprise Skills Suite - Technical Specifications

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Audience**: Engineering Team, Technical Architects  
**Related**: See `ENTERPRISE_SKILLS_STRATEGY.md` for business strategy

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [SDK Technical Specifications](#sdk-technical-specifications)
3. [Individual Skill Specifications](#individual-skill-specifications)
4. [Integration Points](#integration-points)
5. [Security & Compliance](#security--compliance)
6. [Performance Requirements](#performance-requirements)
7. [Deployment Architecture](#deployment-architecture)

---

## Architecture Overview

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                    Coder1 IDE (Client)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Skills Panel │  │   Monaco     │  │   Terminal   │         │
│  │      UI      │  │   Editor     │  │   (PTY)      │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                 │
│         └──────────────────┼──────────────────┘                 │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │ WebSocket + REST
┌────────────────────────────┼─────────────────────────────────────┐
│                  Coder1 Unified Server (Node.js)                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Skills Execution Engine                      │   │
│  │  ┌────────────┐  ┌────────────┐  ┌─────────────┐       │   │
│  │  │  License   │  │  Resource  │  │  Telemetry  │       │   │
│  │  │ Validator  │  │   Loader   │  │  Collector  │       │   │
│  │  └────────────┘  └────────────┘  └─────────────┘       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            │                                     │
│  ┌───────────────┬─────────┴──────────┬───────────────┐        │
│  │ Eternal Memory│ Session Summaries  │ Terminal Sup. │        │
│  └───────────────┴────────────────────┴───────────────┘        │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│              Coder1 Skills Infrastructure                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   License    │  │    Skills    │  │  Analytics   │         │
│  │ Validation   │  │     CDN      │  │   Pipeline   │         │
│  │   Service    │  │   (S3/CF)    │  │  (DataDog)   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         PostgreSQL Database                               │  │
│  │  - Licenses           - Usage metrics                     │  │
│  │  - Customer accounts  - Skill metadata                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                    External Services                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Claude API  │  │    Stripe    │  │   Auth0/     │         │
│  │  (Anthropic) │  │  (Payments)  │  │   Okta SSO   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└──────────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend**:
- React 18+ (Skills Panel UI)
- TypeScript 5+
- Tailwind CSS (styling)
- Monaco Editor (code viewing)
- Zustand (state management)

**Backend**:
- Node.js 20+ (Coder1 Unified Server)
- Express.js (REST API)
- Socket.IO (WebSocket)
- TypeScript 5+
- PostgreSQL 15+ (primary database)
- Redis 7+ (caching layer)

**Infrastructure**:
- AWS S3 (skill storage and distribution)
- AWS CloudFront (CDN)
- AWS Lambda (serverless functions)
- Docker (containerization)
- Kubernetes (orchestration, optional)
- GitHub Actions (CI/CD)

**Monitoring & Analytics**:
- Datadog (APM, monitoring)
- Sentry (error tracking)
- Mixpanel (product analytics)
- PostHog (feature flags, A/B testing)

---

## SDK Technical Specifications

### Coder1 Skills SDK Architecture

**Package Name**: `@coder1/skills-sdk`  
**Version**: 1.0.0  
**License**: Proprietary (internal use only)

#### Core Modules

##### 1. Authentication Module

**Purpose**: Validate licenses and manage authentication tokens

**API**:
```typescript
interface AuthConfig {
  licenseKey: string;
  apiEndpoint?: string;
  offlineGracePeriod?: number; // days
}

interface LicenseResponse {
  valid: boolean;
  customer: string;
  seats: number;
  expires: string; // ISO date
  skills: string[]; // allowed skill IDs
  features: string[]; // enabled features
  tier: 'professional' | 'business' | 'enterprise' | 'strategic';
}

class AuthClient {
  constructor(config: AuthConfig);
  
  async validateLicense(): Promise<LicenseResponse>;
  async refreshToken(): Promise<string>;
  async checkSkillPermission(skillId: string): Promise<boolean>;
  isOfflineMode(): boolean;
  getOfflineGraceDaysRemaining(): number;
}
```

**Implementation Details**:
```typescript
// License validation flow
class AuthClient {
  private tokenCache: Map<string, { token: string; expires: number }>;
  private lastValidation: number;
  private validationInterval = 24 * 60 * 60 * 1000; // 24 hours
  
  async validateLicense(): Promise<LicenseResponse> {
    // Check cache first
    if (this.lastValidation && 
        Date.now() - this.lastValidation < this.validationInterval) {
      return this.getCachedLicense();
    }
    
    try {
      // Call license validation API
      const response = await fetch(`${this.apiEndpoint}/v1/licenses/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-License-Key': this.licenseKey,
          'X-SDK-Version': SDK_VERSION,
          'X-Platform': process.platform
        },
        body: JSON.stringify({
          machineId: this.getMachineId(),
          timestamp: Date.now()
        })
      });
      
      if (!response.ok) {
        throw new Error(`License validation failed: ${response.status}`);
      }
      
      const license = await response.json();
      
      // Cache validation result
      this.cacheLicense(license);
      this.lastValidation = Date.now();
      
      return license;
    } catch (error) {
      // Offline mode handling
      if (this.isOfflineGracePeriodValid()) {
        return this.getCachedLicense();
      }
      throw error;
    }
  }
  
  private getMachineId(): string {
    // Generate unique machine identifier
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    const mac = Object.values(nets)
      .flat()
      .find(net => net && !net.internal && net.mac !== '00:00:00:00:00:00')
      ?.mac || 'unknown';
    return crypto.createHash('sha256').update(mac).digest('hex');
  }
}
```

---

##### 2. Resource Loader Module

**Purpose**: Progressive loading of skill resources (metadata → instructions → resources)

**API**:
```typescript
interface SkillMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  tokensEstimate: number;
}

interface SkillInstructions {
  markdown: string;
  tokensUsed: number;
}

interface SkillResource {
  path: string;
  type: 'script' | 'data' | 'template' | 'binary';
  size: number;
  checksum: string;
}

class ResourceLoader {
  async loadMetadata(skillId: string): Promise<SkillMetadata>;
  async loadInstructions(skillId: string): Promise<SkillInstructions>;
  async loadResource(skillId: string, resourcePath: string): Promise<Buffer>;
  async executeScript(scriptPath: string, args: any[]): Promise<any>;
  getCacheStats(): { hits: number; misses: number; size: number };
}
```

**Implementation Details**:
```typescript
class ResourceLoader {
  private cache: LRUCache<string, any>;
  private cdnBaseUrl: string;
  
  constructor(config: { cdnBaseUrl: string; cacheSize: number }) {
    this.cdnBaseUrl = config.cdnBaseUrl;
    this.cache = new LRUCache({ max: config.cacheSize });
  }
  
  async loadMetadata(skillId: string): Promise<SkillMetadata> {
    const cacheKey = `metadata:${skillId}`;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    // Load from CDN
    const url = `${this.cdnBaseUrl}/skills/${skillId}/SKILL.md`;
    const response = await fetch(url);
    const content = await response.text();
    
    // Parse YAML frontmatter
    const metadata = this.parseMetadata(content);
    
    // Cache result
    this.cache.set(cacheKey, metadata);
    
    return metadata;
  }
  
  private parseMetadata(markdown: string): SkillMetadata {
    const yamlRegex = /^---\n([\s\S]*?)\n---/;
    const match = markdown.match(yamlRegex);
    
    if (!match) {
      throw new Error('Invalid SKILL.md: missing YAML frontmatter');
    }
    
    const yaml = require('js-yaml');
    return yaml.load(match[1]);
  }
  
  async executeScript(scriptPath: string, args: any[]): Promise<any> {
    // Load script content
    const scriptContent = await this.loadResource(skillId, scriptPath);
    
    // Execute in sandbox
    const sandbox = new ScriptExecutor({
      timeout: 30000, // 30 second timeout
      memory: 256 * 1024 * 1024, // 256MB memory limit
      allowNetworkAccess: false
    });
    
    return await sandbox.execute(scriptContent.toString(), args);
  }
}
```

---

##### 3. Execution Runtime Module

**Purpose**: Secure sandbox for executing skill scripts with resource limits

**API**:
```typescript
interface ExecutionConfig {
  timeout: number; // milliseconds
  memory: number; // bytes
  allowNetworkAccess: boolean;
  allowFileSystemAccess: boolean;
  allowedPaths?: string[];
}

interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  memoryUsed: number;
}

class ScriptExecutor {
  constructor(config: ExecutionConfig);
  
  async execute(scriptContent: string, args: any[]): Promise<ExecutionResult>;
  async executeBash(command: string, env?: Record<string, string>): Promise<ExecutionResult>;
  terminate(): void;
}
```

**Implementation Details**:
```typescript
class ScriptExecutor {
  private config: ExecutionConfig;
  private childProcess: ChildProcess | null = null;
  
  async executeBash(command: string, env?: Record<string, string>): Promise<ExecutionResult> {
    const startTime = Date.now();
    const memoryStart = process.memoryUsage().heapUsed;
    
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      
      // Spawn process
      this.childProcess = spawn('bash', ['-c', command], {
        env: { ...process.env, ...env },
        timeout: this.config.timeout,
        maxBuffer: this.config.memory,
        cwd: this.config.allowedPaths?.[0] || process.cwd()
      });
      
      // Collect output
      this.childProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      this.childProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      // Handle completion
      this.childProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        const memoryUsed = process.memoryUsage().heapUsed - memoryStart;
        
        resolve({
          stdout,
          stderr,
          exitCode: code || 0,
          duration,
          memoryUsed
        });
      });
      
      // Handle errors
      this.childProcess.on('error', (error) => {
        reject(error);
      });
      
      // Enforce timeout
      setTimeout(() => {
        if (this.childProcess && !this.childProcess.killed) {
          this.childProcess.kill('SIGTERM');
          reject(new Error(`Script execution timeout after ${this.config.timeout}ms`));
        }
      }, this.config.timeout);
    });
  }
  
  terminate(): void {
    if (this.childProcess && !this.childProcess.killed) {
      this.childProcess.kill('SIGKILL');
    }
  }
}
```

---

##### 4. Telemetry Module

**Purpose**: Collect usage metrics and performance data for analytics

**API**:
```typescript
interface TelemetryEvent {
  eventType: 'skill_invocation' | 'skill_execution' | 'skill_error' | 'license_validation';
  skillId?: string;
  duration?: number;
  success: boolean;
  metadata?: Record<string, any>;
  timestamp: number;
}

class TelemetryCollector {
  constructor(config: { apiEndpoint: string; batchSize: number; flushInterval: number });
  
  trackEvent(event: TelemetryEvent): void;
  async flush(): Promise<void>;
  getStats(): { eventCount: number; lastFlush: number };
}
```

**Implementation Details**:
```typescript
class TelemetryCollector {
  private eventQueue: TelemetryEvent[] = [];
  private config: { apiEndpoint: string; batchSize: number; flushInterval: number };
  private flushTimer: NodeJS.Timeout;
  
  constructor(config) {
    this.config = config;
    
    // Auto-flush on interval
    this.flushTimer = setInterval(() => {
      this.flush();
    }, config.flushInterval);
  }
  
  trackEvent(event: TelemetryEvent): void {
    this.eventQueue.push({
      ...event,
      timestamp: Date.now()
    });
    
    // Flush if batch size reached
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush();
    }
  }
  
  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;
    
    const events = this.eventQueue.splice(0, this.config.batchSize);
    
    try {
      await fetch(`${this.config.apiEndpoint}/v1/telemetry/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events })
      });
    } catch (error) {
      console.error('Failed to flush telemetry:', error);
      // Re-queue events on failure
      this.eventQueue.unshift(...events);
    }
  }
}
```

---

##### 5. Integration Module

**Purpose**: Connect with Coder1 IDE features (Eternal Memory, Session Summary, Terminal)

**API**:
```typescript
interface EternalMemoryContext {
  sessionId: string;
  memories: Array<{
    type: 'architectural_decision' | 'bug_pattern' | 'team_convention';
    content: string;
    confidence: number;
    timestamp: number;
  }>;
}

interface SessionSummary {
  sessionId: string;
  startTime: number;
  endTime: number;
  filesModified: string[];
  commandsExecuted: string[];
  keyDecisions: string[];
}

interface TerminalContext {
  currentDirectory: string;
  recentCommands: string[];
  environment: Record<string, string>;
}

class Coder1Integration {
  async getEternalMemory(sessionId: string): Promise<EternalMemoryContext>;
  async getCurrentSession(): Promise<SessionSummary>;
  async getTerminalContext(): Promise<TerminalContext>;
  async storeMemory(memory: EternalMemoryContext['memories'][0]): Promise<void>;
}
```

---

### SDK Usage Example

```typescript
import { Coder1SkillSDK } from '@coder1/skills-sdk';

// Initialize skill with SDK
const skill = new Coder1SkillSDK({
  skillId: 'institutional-memory-skill',
  version: '1.0.0',
  licenseKey: process.env.CODER1_LICENSE_KEY,
  requireCoder1Platform: false, // Works elsewhere, but limited
  telemetryEnabled: true,
  config: {
    cdnBaseUrl: 'https://cdn.coder1.dev',
    apiEndpoint: 'https://api.coder1.dev',
    cacheSize: 100 * 1024 * 1024 // 100MB
  }
});

// Initialize and validate license
await skill.initialize();

// Check if running in Coder1 IDE (full features)
if (skill.isPlatform('coder1-ide')) {
  // Access Coder1-specific integrations
  const memory = await skill.integration.getEternalMemory();
  const session = await skill.integration.getCurrentSession();
  const terminal = await skill.integration.getTerminalContext();
  
  console.log('Running in Coder1 IDE with full features');
} else {
  console.log('Running in standard Claude environment (limited features)');
}

// Load and execute skill logic
const metadata = await skill.resources.loadMetadata();
const instructions = await skill.resources.loadInstructions();

// Execute skill-specific script
const result = await skill.runtime.executeBash(
  'analyze-architecture.sh',
  { cwd: '/path/to/codebase' }
);

console.log('Architecture Analysis:', result.stdout);

// Track usage for analytics
skill.telemetry.trackEvent({
  eventType: 'skill_execution',
  skillId: 'institutional-memory-skill',
  duration: result.duration,
  success: result.exitCode === 0
});

export default skill;
```

---

## Individual Skill Specifications

### Skill Structure Template

Every skill follows this standard structure:

```
skill-name/
├── SKILL.md                  # Metadata + instructions (YAML frontmatter + markdown)
├── resources/                # Scripts, templates, data files
│   ├── scripts/              # Executable bash/python/node scripts
│   ├── templates/            # Template files
│   ├── data/                 # Static data files
│   └── docs/                 # Additional documentation
├── tests/                    # Skill-specific tests
├── README.md                 # User-facing documentation
└── package.json              # Dependencies (if needed)
```

**SKILL.md Format**:
```yaml
---
name: skill-name
version: 1.0.0
description: Brief description (max 1024 chars)
author: Coder1, Inc.
license: Proprietary
tokensEstimate: 100
requiresCoder1: false
requiredFeatures: []
---

# Skill Name

## Overview
[Markdown content with instructions]

## Usage
[How to use this skill]

## Examples
[Code examples]
```

---

### 1. Institutional Memory Skill

**Skill ID**: `institutional-memory-skill`  
**Version**: 1.0.0  
**Token Economics**: ~100 tokens (metadata), up to 50K tokens (resources, loaded on-demand)

#### Purpose
Captures and provides instant access to company's technical history, architectural decisions, tribal knowledge, and failed experiments.

#### File Structure
```
institutional-memory-skill/
├── SKILL.md
├── resources/
│   ├── architecture-decisions/
│   │   ├── index.json (searchable index)
│   │   ├── 2015-microservices-migration.md
│   │   ├── 2017-database-sharding-decision.md
│   │   └── [more ADRs]
│   ├── failed-experiments/
│   │   ├── index.json
│   │   ├── nosql-migration-lessons.md
│   │   └── [more postmortems]
│   ├── legacy-system-context/
│   │   └── [system documentation]
│   ├── tribal-knowledge/
│   │   └── [unwritten knowledge]
│   └── scripts/
│       ├── search-memory.sh (keyword search)
│       ├── find-similar-decision.sh (semantic search)
│       └── add-memory.sh (capture new knowledge)
├── tests/
│   └── search-tests.sh
└── README.md
```

#### Key Scripts

**search-memory.sh**:
```bash
#!/bin/bash
# Searches institutional memory for relevant context
# Usage: search-memory.sh "microservices" "database"

KEYWORDS="$@"
MEMORY_DIR="$(dirname "$0")/../resources"

echo "Searching institutional memory for: $KEYWORDS"

# Search architecture decisions
grep -r -i "$KEYWORDS" "$MEMORY_DIR/architecture-decisions/" | head -10

# Search failed experiments
grep -r -i "$KEYWORDS" "$MEMORY_DIR/failed-experiments/" | head -10

# Search tribal knowledge
grep -r -i "$KEYWORDS" "$MEMORY_DIR/tribal-knowledge/" | head -10
```

**find-similar-decision.sh**:
```bash
#!/bin/bash
# Finds similar architectural decisions using semantic search
# Requires Coder1 platform for embeddings API

QUERY="$1"
API_ENDPOINT="${CODER1_API_ENDPOINT:-https://api.coder1.dev}"

# Generate embedding for query
QUERY_EMBEDDING=$(curl -s "$API_ENDPOINT/v1/embeddings" \
  -H "Authorization: Bearer $CODER1_API_KEY" \
  -d "{\"text\": \"$QUERY\"}" | jq -r '.embedding')

# Search for similar decisions
curl -s "$API_ENDPOINT/v1/skills/institutional-memory/search" \
  -H "Authorization: Bearer $CODER1_API_KEY" \
  -d "{\"embedding\": $QUERY_EMBEDDING, \"limit\": 5}"
```

#### Customization Process

1. **Initial Setup** (1-2 weeks):
   - Interview 3-5 senior engineers
   - Extract ADRs from existing documentation
   - Document major architectural decisions (last 5 years)
   - Capture failed experiments and lessons learned

2. **Knowledge Capture Template**:
```markdown
# Decision: [Title]

**Date**: 2023-05-15  
**Decision Maker**: Jane Smith (CTO)  
**Context**: Why this decision was needed

## Problem
[What problem were we solving?]

## Options Considered
1. Option A: [description]
   - Pros: [...]
   - Cons: [...]
2. Option B: [description]
   - Pros: [...]
   - Cons: [...]

## Decision
[What we decided and why]

## Consequences
- [Positive consequence 1]
- [Negative consequence 1]

## Lessons Learned (2 years later)
[What we learned after living with this decision]
```

3. **Continuous Updates**:
   - Quarterly review sessions
   - Capture new major decisions
   - Update lessons learned section
   - Retire outdated information

---

### 2. Compliance Guardian Skill

**Skill ID**: `compliance-guardian-skill`  
**Version**: 1.0.0  
**Token Economics**: ~100 tokens (metadata), up to 20K tokens (regulations, loaded on-demand)

#### Purpose
Real-time enforcement of regulatory requirements (HIPAA, PCI-DSS, GDPR, SOX) to prevent compliance violations before code is committed.

#### File Structure
```
compliance-guardian-skill/
├── SKILL.md
├── resources/
│   ├── regulations/
│   │   ├── hipaa-rules.md
│   │   ├── pci-dss-requirements.md
│   │   ├── gdpr-constraints.md
│   │   └── sox-controls.md
│   ├── validators/
│   │   ├── check-pii-exposure.sh
│   │   ├── validate-encryption.sh
│   │   ├── audit-data-retention.sh
│   │   └── verify-access-controls.sh
│   ├── patterns/
│   │   ├── compliant-logging.md
│   │   ├── secure-api-design.md
│   │   └── data-anonymization.md
│   └── audit-templates/
│       ├── change-control-documentation.md
│       └── security-impact-assessment.md
└── README.md
```

#### Key Validators

**check-pii-exposure.sh**:
```bash
#!/bin/bash
# Scans code for potential PII exposure (logging, error messages, etc.)

CODE_FILE="$1"

# Patterns that indicate PII exposure
PII_PATTERNS=(
  "email"
  "ssn"
  "social_security"
  "credit_card"
  "phone_number"
  "date_of_birth"
  "address"
  "password"
  "driver_license"
)

echo "Scanning for PII exposure in: $CODE_FILE"

VIOLATIONS=()

for pattern in "${PII_PATTERNS[@]}"; do
  # Check for logging statements with PII
  if grep -i "console\.log.*$pattern\|logger\..*$pattern\|print.*$pattern" "$CODE_FILE"; then
    VIOLATIONS+=("Potential PII exposure in logs: $pattern")
  fi
  
  # Check for error messages with PII
  if grep -i "throw.*$pattern\|error.*$pattern" "$CODE_FILE"; then
    VIOLATIONS+=("Potential PII in error messages: $pattern")
  fi
done

if [ ${#VIOLATIONS[@]} -gt 0 ]; then
  echo "❌ COMPLIANCE VIOLATIONS FOUND:"
  printf '%s\n' "${VIOLATIONS[@]}"
  exit 1
else
  echo "✅ No PII exposure detected"
  exit 0
fi
```

**validate-encryption.sh**:
```bash
#!/bin/bash
# Validates that sensitive data is encrypted before storage

CODE_FILE="$1"

# Check for database operations without encryption
if grep -E "(INSERT|UPDATE).*INTO.*(users|patients|customers)" "$CODE_FILE"; then
  if ! grep -i "encrypt\|aes\|crypto" "$CODE_FILE"; then
    echo "❌ HIPAA VIOLATION: Database operation without encryption detected"
    exit 1
  fi
fi

# Check for file writes without encryption
if grep -E "writeFile\|fs\.write\|createWriteStream" "$CODE_FILE"; then
  if ! grep -i "encrypt\|cipher" "$CODE_FILE"; then
    echo "⚠️  WARNING: File write without encryption"
    exit 1
  fi
fi

echo "✅ Encryption checks passed"
exit 0
```

#### Regulatory Frameworks

**HIPAA Rules Summary** (`regulations/hipaa-rules.md`):
```markdown
# HIPAA Privacy and Security Rules

## Protected Health Information (PHI)
Any information that can identify a patient:
- Name, address, phone, email
- SSN, medical record numbers
- Dates (birth, admission, discharge, death)
- Biometric identifiers
- Photos

## Required Controls
1. **Access Controls**: Role-based access, minimum necessary
2. **Audit Controls**: Log all PHI access
3. **Integrity Controls**: Protect from improper alteration
4. **Transmission Security**: Encrypt PHI in transit

## Prohibited Actions
- ❌ Logging PHI to standard logs
- ❌ Displaying PHI in error messages
- ❌ Transmitting PHI over unencrypted connections
- ❌ Storing PHI without encryption at rest
- ❌ Sharing PHI without patient authorization

## Compliant Patterns
✅ Use tokenization for PHI
✅ Encrypt at rest and in transit
✅ Separate logs for PHI (with restricted access)
✅ Audit all PHI access
✅ Implement automatic session timeouts
```

---

### 3. Legacy Archaeologist Skill

**Skill ID**: `legacy-archaeologist-skill`  
**Version**: 1.0.0

#### Purpose
Understands and documents legacy systems, capturing business logic embedded in cryptic code and providing safe modernization paths.

#### File Structure
```
legacy-archaeologist-skill/
├── SKILL.md
├── resources/
│   ├── business-rules/
│   │   ├── fee-calculation-history.md
│   │   ├── tax-logic-evolution.md
│   │   └── discount-algorithm-quirks.md
│   ├── code-mappings/
│   │   ├── cryptic-variable-dictionary.md
│   │   ├── function-purpose-guide.md
│   │   └── module-responsibility-map.md
│   ├── edge-cases/
│   │   ├── leap-year-bugs.md
│   │   ├── timezone-handling-quirks.md
│   │   └── floating-point-workarounds.md
│   ├── modernization-guides/
│   │   ├── safe-refactoring-paths.md
│   │   ├── test-harness-strategies.md
│   │   └── incremental-migration-plan.md
│   └── analysis-scripts/
│       ├── detect-dead-code.sh
│       ├── find-business-logic.sh
│       ├── map-dependencies.sh
│       └── generate-call-graph.sh
└── README.md
```

#### Key Analysis Scripts

**find-business-logic.sh**:
```bash
#!/bin/bash
# Identifies potential business logic by looking for mathematical operations,
# conditional logic, and magic numbers

CODE_DIR="$1"

echo "Analyzing codebase for business logic patterns..."

# Find files with complex conditional logic
echo -e "\n=== Complex Conditional Logic ==="
find "$CODE_DIR" -name "*.java" -o -name "*.js" -o -name "*.py" | while read file; do
  IF_COUNT=$(grep -c "if\|switch\|case" "$file")
  if [ "$IF_COUNT" -gt 10 ]; then
    echo "$file: $IF_COUNT conditional statements"
  fi
done

# Find magic numbers (likely business constants)
echo -e "\n=== Potential Business Constants (Magic Numbers) ==="
grep -rn "[^0-9][0-9]\{2,\}\.[0-9]\+[^0-9]" "$CODE_DIR" --include="*.java" --include="*.js" | head -20

# Find calculation functions
echo -e "\n=== Calculation Functions ==="
grep -rn "calculate\|compute\|total\|sum\|fee\|tax\|discount" "$CODE_DIR" --include="*.java" --include="*.js" | head -20
```

**detect-dead-code.sh**:
```bash
#!/bin/bash
# Identifies potentially dead code (unused functions, variables)

CODE_DIR="$1"

echo "Detecting potentially dead code..."

# Find functions that are defined but never called
echo -e "\n=== Potentially Unused Functions ==="

# For JavaScript/TypeScript
find "$CODE_DIR" -name "*.js" -o -name "*.ts" | while read file; do
  # Extract function names
  grep -oP "function \K\w+" "$file" | while read func; do
    # Search for calls to this function
    CALLS=$(grep -r "$func" "$CODE_DIR" --include="*.js" --include="*.ts" | wc -l)
    if [ "$CALLS" -eq 1 ]; then
      echo "$file: function $func() appears unused"
    fi
  done
done
```

---

### 4. Codebase Intelligence Skill

**Skill ID**: `codebase-intelligence-skill`  
**Version**: 1.0.0  
**Token Economics**: ~100 tokens (metadata), script outputs only (500-2000 tokens)

#### Purpose
Analyzes codebase without loading files into context, providing architectural summaries, dependency analysis, and performance metrics through efficient script execution.

#### File Structure
```
codebase-intelligence-skill/
├── SKILL.md
├── resources/
│   └── scripts/
│       ├── analyze-architecture.sh
│       ├── check-dependencies.sh
│       ├── test-status.sh
│       ├── performance-metrics.sh
│       ├── security-audit.sh
│       ├── code-quality-report.sh
│       └── find-tech-debt.sh
└── README.md
```

#### Key Scripts

**analyze-architecture.sh**:
```bash
#!/bin/bash
# Generates architectural summary without loading files

PROJECT_DIR="${1:-.}"

echo "📊 Codebase Architecture Analysis"
echo "=================================="
echo ""

# Language distribution
echo "Language Distribution:"
cloc "$PROJECT_DIR" --json | jq -r '.SUM | "\(.nFiles) files, \(.code) lines of code, \(.comment) comments"'
echo ""

# Project structure
echo "Project Structure:"
tree "$PROJECT_DIR" -d -L 2 -I 'node_modules|dist|build|.git'
echo ""

# Key directories and their purpose
echo "Key Components:"
find "$PROJECT_DIR" -type d -name "src" -o -name "lib" -o -name "components" -o -name "services" | while read dir; do
  FILE_COUNT=$(find "$dir" -type f | wc -l)
  echo "  - $dir: $FILE_COUNT files"
done
echo ""

# Identify architecture patterns
echo "Architecture Patterns Detected:"
if [ -d "$PROJECT_DIR/components" ]; then
  echo "  ✓ Component-based architecture"
fi
if [ -d "$PROJECT_DIR/services" ]; then
  echo "  ✓ Service-oriented architecture"
fi
if [ -f "$PROJECT_DIR/docker-compose.yml" ]; then
  echo "  ✓ Microservices (Docker Compose)"
fi
echo ""

# Entry points
echo "Entry Points:"
find "$PROJECT_DIR" -name "index.js" -o -name "main.py" -o -name "app.ts" -o -name "server.js" | head -5
echo ""

# Key dependencies
echo "Key Dependencies:"
if [ -f "$PROJECT_DIR/package.json" ]; then
  jq -r '.dependencies | keys[]' "$PROJECT_DIR/package.json" | head -10
fi
```

**check-dependencies.sh**:
```bash
#!/bin/bash
# Analyzes project dependencies for vulnerabilities and outdated packages

PROJECT_DIR="${1:-.}"

echo "🔍 Dependency Analysis"
echo "====================="
echo ""

# Check for security vulnerabilities
echo "Security Vulnerabilities:"
if [ -f "$PROJECT_DIR/package.json" ]; then
  npm audit --prefix="$PROJECT_DIR" --json | jq -r '.metadata | "Critical: \(.vulnerabilities.critical), High: \(.vulnerabilities.high), Moderate: \(.vulnerabilities.moderate)"'
fi
echo ""

# Outdated dependencies
echo "Outdated Dependencies:"
if [ -f "$PROJECT_DIR/package.json" ]; then
  npm outdated --prefix="$PROJECT_DIR" | head -10
fi
echo ""

# Dependency tree depth (complexity indicator)
echo "Dependency Complexity:"
if [ -f "$PROJECT_DIR/package.json" ]; then
  DEPTH=$(npm ls --prefix="$PROJECT_DIR" --all --depth=0 2>/dev/null | wc -l)
  echo "  Direct dependencies: $DEPTH"
fi
```

**performance-metrics.sh**:
```bash
#!/bin/bash
# Gathers performance-related metrics without running the application

PROJECT_DIR="${1:-.}"

echo "⚡ Performance Metrics"
echo "===================="
echo ""

# Bundle size analysis (for web projects)
if [ -d "$PROJECT_DIR/dist" ] || [ -d "$PROJECT_DIR/build" ]; then
  echo "Build Size:"
  du -sh "$PROJECT_DIR/dist" "$PROJECT_DIR/build" 2>/dev/null
  echo ""
  
  echo "Largest Files:"
  find "$PROJECT_DIR/dist" "$PROJECT_DIR/build" -type f 2>/dev/null | xargs du -h | sort -hr | head -10
fi
echo ""

# Code complexity (cyclomatic complexity)
echo "Code Complexity:"
if command -v lizard &> /dev/null; then
  lizard "$PROJECT_DIR" -l javascript -l typescript -l python | head -20
else
  echo "  (Install 'lizard' for complexity analysis)"
fi
echo ""

# Test coverage
echo "Test Coverage:"
if [ -f "$PROJECT_DIR/coverage/coverage-summary.json" ]; then
  jq -r '.total | "Lines: \(.lines.pct)%, Statements: \(.statements.pct)%, Functions: \(.functions.pct)%"' "$PROJECT_DIR/coverage/coverage-summary.json"
else
  echo "  (No coverage data found - run tests with coverage)"
fi
```

---

### 5-10. Additional Skills

Due to document length constraints, the remaining skills (Smart File Loader, Documentation Oracle, Team Protocol, Production War Room, API Contract Oracle, Merge Conflict Oracle) follow similar patterns:

1. **Standard structure** (SKILL.md + resources + scripts)
2. **Script-based execution** (minimize token usage)
3. **Progressive resource loading** (metadata → instructions → resources)
4. **Coder1 integration hooks** (optional enhanced features)

Full specifications for these skills available in dedicated technical documentation.

---

## Integration Points

### Coder1 IDE Integration

#### 1. Skills Panel UI

**Location**: Right sidebar panel in Coder1 IDE  
**Features**:
- Browse available skills (installed + marketplace)
- Install/uninstall skills
- Configure skill settings
- View usage analytics
- Search skills by category/tag

**Implementation** (`/coder1-ide-next/components/SkillsPanel.tsx`):
```typescript
interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  installed: boolean;
  enabled: boolean;
  category: string;
  tokensEstimate: number;
  usageCount: number;
}

export function SkillsPanel() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  
  // Load skills from API
  useEffect(() => {
    fetch('/api/skills/list')
      .then(res => res.json())
      .then(data => setSkills(data.skills));
  }, []);
  
  const installSkill = async (skillId: string) => {
    await fetch(`/api/skills/install`, {
      method: 'POST',
      body: JSON.stringify({ skillId })
    });
    // Refresh skills list
  };
  
  return (
    <div className="skills-panel">
      <SkillsList 
        skills={skills} 
        onSelect={setSelectedSkill}
        onInstall={installSkill}
      />
      {selectedSkill && (
        <SkillDetails skill={selectedSkill} />
      )}
    </div>
  );
}
```

#### 2. Skills API Endpoints

**Base Path**: `/api/skills/*`

```typescript
// GET /api/skills/list - List all available skills
GET /api/skills/list
Response: {
  skills: Skill[],
  installed: string[],
  marketplace: string[]
}

// POST /api/skills/install - Install a skill
POST /api/skills/install
Body: { skillId: string }
Response: { success: boolean, skill: Skill }

// DELETE /api/skills/:skillId - Uninstall a skill
DELETE /api/skills/:skillId
Response: { success: boolean }

// GET /api/skills/:skillId/metadata - Get skill metadata
GET /api/skills/:skillId/metadata
Response: SkillMetadata

// POST /api/skills/:skillId/execute - Execute a skill
POST /api/skills/:skillId/execute
Body: { context: any }
Response: { result: any, tokensUsed: number }

// GET /api/skills/:skillId/analytics - Get usage analytics
GET /api/skills/:skillId/analytics
Response: { invocations: number, avgDuration: number, successRate: number }
```

#### 3. Eternal Memory Integration

Skills can read from and write to Eternal Memory for persistent context:

```typescript
// Read from Eternal Memory
const memory = await skill.integration.getEternalMemory();

// Relevant memories are automatically loaded based on current context
const relevantMemories = memory.memories.filter(m => 
  m.type === 'architectural_decision' && m.confidence > 0.8
);

// Store new memory
await skill.integration.storeMemory({
  type: 'architectural_decision',
  content: 'Decided to use PostgreSQL for better ACID guarantees',
  confidence: 0.95,
  timestamp: Date.now()
});
```

#### 4. Session Summary Integration

Skills contribute to session summaries:

```typescript
// Get current session data
const session = await skill.integration.getCurrentSession();

// Add skill execution to session
await skill.integration.addSessionEvent({
  type: 'skill_execution',
  skillId: 'codebase-intelligence-skill',
  result: 'Generated architecture summary',
  impact: 'high'
});

// Skills appear in session summary export
```

#### 5. Terminal Supervision Integration

Skills can monitor terminal activity and provide proactive suggestions:

```typescript
// Get terminal context
const terminal = await skill.integration.getTerminalContext();

// Monitor for specific patterns
terminal.on('command', (cmd) => {
  if (cmd.includes('git commit') && !cmd.includes('-m')) {
    // Suggest using Compliance Guardian to validate commit
    skill.suggest('Run compliance check before committing');
  }
});
```

---

## Security & Compliance

### Security Architecture

#### 1. License Validation Security

**Threat**: License key theft or sharing  
**Mitigation**:
- Machine ID binding (hardware fingerprinting)
- Rate limiting on validation API
- Audit logging of all license checks
- Periodic revalidation (every 24 hours)
- Offline grace period (7 days max)

**Implementation**:
```typescript
// License validation includes machine fingerprint
interface LicenseValidationRequest {
  licenseKey: string;
  machineId: string; // SHA-256 hash of MAC address
  timestamp: number;
  signature: string; // HMAC of request
}

// Server validates and rate limits
const validateLicense = async (req: LicenseValidationRequest) => {
  // Check rate limit (max 10 validations per hour per machine)
  const rateLimitKey = `license:${req.licenseKey}:${req.machineId}`;
  const count = await redis.incr(rateLimitKey);
  await redis.expire(rateLimitKey, 3600);
  
  if (count > 10) {
    throw new Error('Rate limit exceeded');
  }
  
  // Validate signature
  const expectedSignature = crypto
    .createHmac('sha256', LICENSE_SECRET)
    .update(`${req.licenseKey}${req.machineId}${req.timestamp}`)
    .digest('hex');
  
  if (req.signature !== expectedSignature) {
    throw new Error('Invalid signature');
  }
  
  // Check license in database
  const license = await db.licenses.findOne({ key: req.licenseKey });
  
  if (!license || license.expires < new Date()) {
    throw new Error('Invalid or expired license');
  }
  
  // Log validation for audit
  await db.auditLog.insert({
    event: 'license_validation',
    licenseKey: req.licenseKey,
    machineId: req.machineId,
    timestamp: new Date()
  });
  
  return license;
};
```

#### 2. Skill Execution Sandbox

**Threat**: Malicious skills executing arbitrary code  
**Mitigation**:
- Containerized execution (Docker)
- Resource limits (CPU, memory, disk)
- Network isolation (no internet access by default)
- File system restrictions (read-only mounts)
- Timeout enforcement (30 second max)

**Implementation**:
```typescript
class SkillSandbox {
  async execute(skillId: string, scriptPath: string, args: any[]): Promise<any> {
    // Create isolated Docker container
    const container = await docker.createContainer({
      Image: 'coder1/skill-runner:latest',
      Cmd: ['bash', scriptPath, ...args],
      HostConfig: {
        Memory: 256 * 1024 * 1024, // 256MB
        MemorySwap: 256 * 1024 * 1024,
        CpuPeriod: 100000,
        CpuQuota: 50000, // 50% CPU
        NetworkMode: 'none', // No network access
        ReadonlyRootfs: true,
        Binds: [
          `${skillPath}:/skill:ro`, // Read-only skill files
          `/tmp/${skillId}:/tmp:rw` // Writable temp directory
        ]
      },
      Env: [
        `SKILL_ID=${skillId}`,
        `CODER1_API_ENDPOINT=${API_ENDPOINT}`
      ]
    });
    
    // Start and wait for completion (with timeout)
    await container.start();
    
    const result = await Promise.race([
      container.wait(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 30000)
      )
    ]);
    
    // Collect logs
    const logs = await container.logs({ stdout: true, stderr: true });
    
    // Cleanup
    await container.remove();
    
    return {
      exitCode: result.StatusCode,
      stdout: logs.toString(),
      stderr: logs.stderr?.toString()
    };
  }
}
```

#### 3. Data Security

**Encryption at Rest**:
- Skill resources encrypted in S3 (AES-256)
- License database encrypted (PostgreSQL TDE)
- Analytics data encrypted (field-level encryption)

**Encryption in Transit**:
- TLS 1.3 for all API communication
- Certificate pinning for SDK
- Mutual TLS for skill execution

**Data Isolation**:
- Multi-tenant database with row-level security
- Customer data segregation (separate schemas)
- Skills cannot access other customers' data

---

### Compliance Certifications

#### SOC 2 Type II (Priority 1)

**Controls Required**:
1. **Access Controls**: Role-based access, MFA, SSO
2. **Change Management**: All code changes logged and reviewed
3. **Data Protection**: Encryption at rest and in transit
4. **Incident Response**: 24/7 monitoring, incident playbooks
5. **Vendor Management**: Third-party security assessments

**Timeline**: 6-9 months  
**Cost**: $50K-$100K  
**Auditor**: Prescient Assurance, Johanson Group, or similar

---

## Performance Requirements

### Latency Targets

| Operation | p50 | p95 | p99 | Max |
|-----------|-----|-----|-----|-----|
| License Validation | 100ms | 200ms | 300ms | 500ms |
| Skill Metadata Load | 50ms | 100ms | 150ms | 200ms |
| Skill Execution (script) | 1s | 5s | 10s | 30s |
| API Endpoint Response | 200ms | 500ms | 1s | 2s |
| WebSocket Message | 50ms | 100ms | 200ms | 500ms |

### Throughput Targets

| Metric | Target | Peak |
|--------|--------|------|
| API Requests/sec | 1,000 | 5,000 |
| License Validations/sec | 100 | 500 |
| Skill Executions/sec | 50 | 200 |
| WebSocket Connections | 10,000 | 50,000 |

### Resource Limits

**Per Skill Execution**:
- CPU: 0.5 cores max
- Memory: 256MB max
- Disk: 100MB temp space
- Network: None (isolated)
- Execution Time: 30 seconds max

**Per Customer**:
- API Rate Limit: 1,000 requests/hour
- Concurrent Skill Executions: 10
- Storage: 10GB (skills + data)

---

## Deployment Architecture

### Production Infrastructure

```
┌─────────────────────────────────────────────────────────────────┐
│                     CloudFlare (CDN + DDoS)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                    AWS Application Load Balancer                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────┴────────┐  ┌───────┴────────┐  ┌───────┴────────┐
│   Coder1 IDE   │  │   Coder1 IDE   │  │   Coder1 IDE   │
│   Server (1)   │  │   Server (2)   │  │   Server (3)   │
│   (ECS/K8s)    │  │   (ECS/K8s)    │  │   (ECS/K8s)    │
└────────────────┘  └────────────────┘  └────────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────┴────────┐  ┌───────┴────────┐  ┌───────┴────────┐
│  PostgreSQL    │  │     Redis      │  │   S3 Bucket    │
│  (RDS Multi-   │  │  (ElastiCache) │  │  (Skills CDN)  │
│     AZ)        │  │                │  │                │
└────────────────┘  └────────────────┘  └────────────────┘
```

### Scaling Strategy

**Horizontal Scaling**:
- Auto-scaling groups (min 3, max 20 instances)
- Scale based on CPU (>70%) and request rate (>800 req/sec)
- WebSocket session affinity (sticky sessions)

**Vertical Scaling**:
- Instance types: t3.large (dev), m5.2xlarge (prod)
- Database: db.r5.4xlarge (16 vCPU, 128GB RAM)
- Redis: cache.r5.2xlarge (8 vCPU, 52GB RAM)

**Geographic Distribution**:
- Primary: us-east-1 (N. Virginia)
- Secondary: eu-west-1 (Ireland)
- Tertiary: ap-southeast-1 (Singapore)
- CloudFront edge locations (global)

---

## Monitoring & Observability

### Metrics Dashboard

**System Metrics**:
- CPU, Memory, Disk utilization
- Network throughput
- Request rate and latency
- Error rate and types

**Application Metrics**:
- Skill execution count and duration
- License validation success rate
- API endpoint performance
- WebSocket connection count

**Business Metrics**:
- Active users
- Skill adoption rate
- Token savings (calculated)
- Customer satisfaction (NPS)

### Alerting Rules

```yaml
alerts:
  - name: HighErrorRate
    condition: error_rate > 1% for 5 minutes
    severity: critical
    action: page oncall engineer
    
  - name: HighLatency
    condition: p95_latency > 1s for 10 minutes
    severity: warning
    action: notify team slack
    
  - name: LowSkillAdoption
    condition: skill_usage < 50% for 24 hours
    severity: info
    action: notify customer success
    
  - name: LicenseValidationFailure
    condition: license_validation_failure_rate > 5%
    severity: critical
    action: page oncall + notify leadership
```

---

## Appendix: Tool Versions & Dependencies

### Required Software

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ | Runtime |
| TypeScript | 5+ | Language |
| PostgreSQL | 15+ | Database |
| Redis | 7+ | Cache |
| Docker | 24+ | Containerization |
| AWS CLI | 2+ | Deployment |

### SDK Dependencies

```json
{
  "dependencies": {
    "node-fetch": "^3.3.0",
    "js-yaml": "^4.1.0",
    "lru-cache": "^10.0.0",
    "crypto": "built-in",
    "os": "built-in"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.10.0",
    "vitest": "^1.0.0"
  }
}
```

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Maintained By**: Coder1 Engineering Team

**Next Review**: March 2025 (or when architecture changes significantly)
