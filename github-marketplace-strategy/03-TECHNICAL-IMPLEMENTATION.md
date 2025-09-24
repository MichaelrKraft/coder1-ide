# 🔧 Technical Implementation Guide

> **Complete Technical Architecture for GitHub Marketplace Integration**

*Last Updated: September 24, 2025*

---

## 📋 Table of Contents

1. [Current Architecture](#current-architecture)
2. [Required Integrations](#required-integrations)
3. [Implementation Phases](#implementation-phases)
4. [API Endpoints](#api-endpoints)
5. [Database Schema](#database-schema)
6. [Security Considerations](#security-considerations)
7. [Performance Optimization](#performance-optimization)
8. [Deployment Strategy](#deployment-strategy)

---

## 🏗️ Current Architecture

### What We Have
```
┌─────────────────────────────────────────┐
│    Next.js Custom Server (Port 3001)    │
├─────────────────────────────────────────┤
│ • Next.js Pages & API Routes            │
│ • Monaco Editor (VSCode engine)         │
│ • Terminal PTY Sessions                 │
│ • WebSocket Server (Socket.IO)          │
│ • File Operations API                   │
│ • Memory Persistence System             │
│ • Google OAuth (existing)               │
│ • PRD Generator (CANONICAL/)            │
└─────────────────────────────────────────┘
```

### Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Node.js custom server
- **Database**: SQLite (better-sqlite3)
- **Real-time**: Socket.IO
- **Editor**: Monaco Editor
- **Terminal**: node-pty
- **Auth**: JWT + Google OAuth

---

## 🔌 Required Integrations

### 1. GitHub OAuth
```typescript
// New files needed:
/app/api/auth/github/route.ts
/app/api/auth/github/callback/route.ts
/lib/auth/github-oauth.ts
/lib/auth/github-marketplace.ts
```

### 2. GitHub Apps
```typescript
// GitHub App configurations:
{
  name: "coder1-ide",
  description: "AI-powered IDE with Eternal Memory",
  permissions: {
    contents: "read",
    metadata: "read",
    administration: "read" // For subscription check
  },
  events: ["marketplace_purchase"],
  oauth: true
}
```

### 3. Custom Protocol Handler
```typescript
// Protocol: coder1://
/app/api/protocol/route.ts
/lib/protocol/handler.ts
```

### 4. Browser Extension
```
/browser-extension/
├── manifest.json (Chrome)
├── manifest-firefox.json
├── content-script.js
├── background.js
└── popup.html
```

---

## 🚀 Implementation Phases

### Phase 1: Authentication (Week 1)

#### GitHub OAuth Implementation
```typescript
// /lib/auth/github-oauth.ts
import { Octokit } from '@octokit/rest';

export interface GitHubUser {
  id: number;
  login: string;
  email: string;
  name: string;
  avatar_url: string;
  html_url: string;
}

export const GITHUB_OAUTH_CONFIG = {
  clientId: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  redirectUri: process.env.NEXT_PUBLIC_APP_URL 
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`
    : 'http://localhost:3001/api/auth/github/callback',
  scope: 'user:email repo'
};

export function getGitHubOAuthURL(state: string): string {
  const params = new URLSearchParams({
    client_id: GITHUB_OAUTH_CONFIG.clientId,
    redirect_uri: GITHUB_OAUTH_CONFIG.redirectUri,
    scope: GITHUB_OAUTH_CONFIG.scope,
    state
  });
  
  return `https://github.com/login/oauth/authorize?${params}`;
}

export async function exchangeCodeForToken(code: string) {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: GITHUB_OAUTH_CONFIG.clientId,
      client_secret: GITHUB_OAUTH_CONFIG.clientSecret,
      code,
      redirect_uri: GITHUB_OAUTH_CONFIG.redirectUri
    })
  });
  
  return response.json();
}
```

#### Marketplace Subscription Check
```typescript
// /lib/auth/github-marketplace.ts
export async function checkMarketplaceSubscription(
  accessToken: string,
  username: string
): Promise<{
  hasSubscription: boolean;
  plan?: string;
  seats?: number;
}> {
  const octokit = new Octokit({ auth: accessToken });
  
  try {
    const { data } = await octokit.apps.getSubscriptionPlanForAccount({
      account_type: 'User',
      account_id: username
    });
    
    return {
      hasSubscription: true,
      plan: data.plan.name,
      seats: data.plan.seats
    };
  } catch (error) {
    return { hasSubscription: false };
  }
}
```

### Phase 2: Demo Mode (Week 2)

#### Demo Mode Configuration
```typescript
// /lib/demo/config.ts
export const DEMO_CONFIG = {
  enabled: process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
  sessionDuration: 30 * 60 * 1000, // 30 minutes
  features: {
    claudeInteractions: 10,
    memoryPersistence: false,
    fileOperations: true,
    prdGenerator: true
  },
  sampleProject: {
    name: 'Todo App Demo',
    files: [
      { path: 'index.html', content: '...' },
      { path: 'app.js', content: '...' },
      { path: 'styles.css', content: '...' }
    ]
  }
};
```

#### Demo Session Manager
```typescript
// /lib/demo/session-manager.ts
export class DemoSessionManager {
  private sessions = new Map<string, DemoSession>();
  
  createSession(): string {
    const sessionId = generateId();
    const session = {
      id: sessionId,
      startTime: Date.now(),
      interactions: 0,
      files: [...DEMO_CONFIG.sampleProject.files]
    };
    
    this.sessions.set(sessionId, session);
    setTimeout(() => this.endSession(sessionId), DEMO_CONFIG.sessionDuration);
    
    return sessionId;
  }
  
  async processRequest(sessionId: string, request: any) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Demo session expired');
    
    if (session.interactions >= DEMO_CONFIG.features.claudeInteractions) {
      return {
        error: 'Demo limit reached',
        upgrade: true,
        message: 'Upgrade to continue using Claude'
      };
    }
    
    session.interactions++;
    // Process request...
  }
}
```

### Phase 3: Protocol Handler (Week 2)

#### Custom Protocol Registration
```typescript
// /app/api/protocol/route.ts
export async function GET(request: Request) {
  const url = new URL(request.url);
  const protocol = url.searchParams.get('url');
  
  if (!protocol?.startsWith('coder1://')) {
    return Response.json({ error: 'Invalid protocol' }, { status: 400 });
  }
  
  // Parse: coder1://open?repo=user/repo&branch=main&file=README.md
  const action = protocol.match(/coder1:\/\/([^?]+)/)?.[1];
  const params = new URLSearchParams(protocol.split('?')[1]);
  
  switch (action) {
    case 'open':
      const repo = params.get('repo');
      const branch = params.get('branch') || 'main';
      const file = params.get('file');
      
      // Clone repo and open in IDE
      const projectId = await importGitHubRepo(repo, branch);
      
      return Response.redirect(`/ide?project=${projectId}&file=${file}`);
      
    default:
      return Response.json({ error: 'Unknown action' }, { status: 400 });
  }
}
```

### Phase 4: Browser Extension (Week 3)

#### Chrome Extension Manifest
```json
// /browser-extension/manifest.json
{
  "manifest_version": 3,
  "name": "Coder1 IDE - Open in IDE",
  "version": "1.0.0",
  "description": "Open any GitHub repo in Coder1 IDE",
  "permissions": [
    "activeTab",
    "storage"
  ],
  "host_permissions": [
    "https://github.com/*"
  ],
  "content_scripts": [{
    "matches": ["https://github.com/*"],
    "js": ["content-script.js"],
    "css": ["styles.css"]
  }],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icon16.png",
      "48": "icon48.png",
      "128": "icon128.png"
    }
  }
}
```

#### Content Script
```javascript
// /browser-extension/content-script.js
(function() {
  // Detect if on repo page
  const repoPattern = /github\.com\/([^\/]+)\/([^\/]+)/;
  const match = window.location.href.match(repoPattern);
  
  if (match) {
    const [, owner, repo] = match;
    
    // Add "Open in Coder1" button
    const fileNavigation = document.querySelector('.file-navigation');
    if (fileNavigation && !document.querySelector('.coder1-button')) {
      const button = document.createElement('a');
      button.className = 'btn btn-sm coder1-button';
      button.innerHTML = '⚡ Open in Coder1';
      button.href = `coder1://open?repo=${owner}/${repo}`;
      button.style.marginLeft = '8px';
      
      // Alternative: Direct web link
      button.onclick = (e) => {
        e.preventDefault();
        window.open(`https://coder1.dev/import?repo=${owner}/${repo}`, '_blank');
      };
      
      fileNavigation.appendChild(button);
    }
  }
})();
```

---

## 🔐 API Endpoints

### Authentication Endpoints
```typescript
// GitHub OAuth
GET  /api/auth/github                 // Initiate OAuth flow
GET  /api/auth/github/callback        // OAuth callback
POST /api/auth/github/refresh         // Refresh token
POST /api/auth/logout                 // Logout

// Session Management
GET  /api/auth/session                // Get current session
POST /api/auth/session/validate       // Validate session

// Subscription
GET  /api/subscription/status         // Check subscription
POST /api/subscription/upgrade        // Initiate upgrade
POST /api/subscription/cancel         // Cancel subscription
```

### IDE Endpoints
```typescript
// Project Management
POST /api/projects/import             // Import from GitHub
GET  /api/projects/:id                // Get project details
PUT  /api/projects/:id                // Update project
DELETE /api/projects/:id              // Delete project

// Memory Persistence
GET  /api/memory/:projectId           // Get memories
POST /api/memory/:projectId           // Save memory
DELETE /api/memory/:projectId/:id     // Delete memory

// PRD Generator
POST /api/prd/generate                // Generate PRD
GET  /api/prd/:id                    // Get PRD
POST /api/prd/:id/share              // Share PRD
```

---

## 💾 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  github_id INTEGER UNIQUE,
  username TEXT UNIQUE,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Sessions Table
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  github_access_token TEXT,
  refresh_token TEXT,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Projects Table
```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  name TEXT,
  github_repo TEXT,
  github_branch TEXT,
  last_opened DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Memories Table
```sql
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  project_id TEXT REFERENCES projects(id),
  session_id TEXT,
  content TEXT,
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Only Pro users can access old memories
  INDEX idx_user_tier (user_id, created_at)
);
```

---

## 🔒 Security Considerations

### OAuth Security
- Use state parameter to prevent CSRF
- Validate redirect URLs
- Secure token storage (encrypted)
- Implement token refresh
- Rate limiting on auth endpoints

### API Security
```typescript
// Middleware for API protection
export async function requireAuth(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) throw new Error('Unauthorized');
  
  const session = await validateSession(token);
  if (!session) throw new Error('Invalid session');
  
  return session;
}

// Subscription validation
export async function requirePro(session: Session) {
  if (session.user.subscription_tier !== 'pro') {
    throw new Error('Pro subscription required');
  }
}
```

### Content Security Policy
```typescript
// CSP Headers
const CSP = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://github.com"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'connect-src': ["'self'", "https://api.github.com", "wss:"],
  'img-src': ["'self'", "data:", "https:"],
  'frame-ancestors': ["'none'"]
};
```

---

## ⚡ Performance Optimization

### Caching Strategy
```typescript
// Redis caching for session data
const cache = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

// Cache user subscription status
await cache.setex(
  `sub:${userId}`,
  3600, // 1 hour
  JSON.stringify(subscriptionData)
);
```

### Database Optimization
```sql
-- Indexes for performance
CREATE INDEX idx_users_github_id ON users(github_id);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_memories_user_project ON memories(user_id, project_id);

-- Memory cleanup for free users
DELETE FROM memories 
WHERE user_id IN (
  SELECT id FROM users WHERE subscription_tier = 'free'
)
AND created_at < datetime('now', '-24 hours');
```

---

## 🚢 Deployment Strategy

### Environment Variables
```env
# GitHub OAuth
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
GITHUB_APP_ID=xxx
GITHUB_APP_PRIVATE_KEY=xxx

# Database
DATABASE_URL=file:./data.db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Stripe (for payments)
STRIPE_SECRET_KEY=xxx
STRIPE_WEBHOOK_SECRET=xxx

# Demo Mode
NEXT_PUBLIC_DEMO_MODE=true

# Production
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://coder1.dev
```

### Deployment Checklist
- [ ] SSL certificates configured
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] Redis cache initialized
- [ ] GitHub App approved
- [ ] OAuth credentials configured
- [ ] Stripe webhooks set up
- [ ] CSP headers configured
- [ ] Rate limiting enabled
- [ ] Monitoring configured

---

## 📊 Monitoring & Analytics

### Key Metrics to Track
```typescript
// User analytics
track('user.signup', { source: 'github_marketplace' });
track('user.upgrade', { plan: 'pro', revenue: 29 });
track('demo.started', { referrer: request.headers.referer });
track('repo.imported', { repo: `${owner}/${name}` });

// Performance metrics
monitor('api.latency', { endpoint, duration });
monitor('memory.usage', { used: process.memoryUsage() });
monitor('websocket.connections', { count: io.engine.clientsCount });
```

---

## 🎯 Success Criteria

### Week 1 Deliverables
- ✅ GitHub OAuth working
- ✅ User sessions persisted
- ✅ Subscription status checking
- ✅ Basic API endpoints

### Week 2 Deliverables
- ✅ Demo mode live
- ✅ Protocol handler registered
- ✅ Repository import working
- ✅ Memory limitations enforced

### Week 3 Deliverables
- ✅ Browser extension published
- ✅ Attribution system active
- ✅ Analytics tracking
- ✅ Performance optimized

---

## 💡 Key Technical Decisions

1. **Next.js Custom Server**: Already built, provides flexibility
2. **SQLite Database**: Simple, sufficient for early stage
3. **JWT Auth**: Stateless, scalable
4. **Socket.IO**: Real-time terminal already working
5. **Monaco Editor**: VSCode quality editing experience

---

*"Code is like humor. When you have to explain it, it's bad." - But documentation is essential.*

**Build fast. Ship faster. Scale fastest.**