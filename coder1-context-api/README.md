# 🚀 Coder1 Context API - Infrastructure Experiment

**Status:** Experimental - Safe to break, isolated from production  
**Purpose:** Validate infrastructure play with VS Code extension  
**Port:** 3005 (Production IDE on 3001)

---

## ⚡ Quick Start (2 Minutes)

### 1. Start the Context API Server

```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-context-api
npm run dev
```

You should see:
```
🚀 ================================================
   CODER1 CONTEXT API - Infrastructure Experiment
================================================
✅ Server running on: http://localhost:3005
```

### 2. Test It Works

Open a NEW terminal (keep server running):

```bash
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-context-api
npm test
```

You should see:
```
🧪 Testing Coder1 Context API...
✅ Health: ok
✅ Created: mem_...
✅ Retrieved: Test memory from SDK
✅ Found: 1 memories
✅ Total memories: 1
🎉 All tests passed!
```

### 3. Verify Production IDE Unaffected

```bash
# Check production IDE still works
curl http://localhost:3001/api/health

# Should return: {"status":"healthy",...}
```

---

## 📁 Project Structure

```
coder1-context-api/
├── server.js              # Context API server (port 3005)
├── test.js               # Simple tests
├── .env                  # Configuration
├── clients/
│   └── sdk/
│       └── index.js      # JavaScript SDK
├── services/             # Core services (add later)
├── api/
│   ├── rest/            # REST endpoints
│   └── graphql/         # GraphQL (future)
└── docs/                # Documentation
```

---

## 🎯 What This Does

### Current Features (MVP)
- ✅ Create memories via REST API
- ✅ Search memories (simple text search)
- ✅ Retrieve memories by ID
- ✅ List all memories
- ✅ Delete memories
- ✅ JavaScript SDK for easy integration

### What It Doesn't Do Yet
- ❌ Semantic search (no embeddings yet)
- ❌ Real-time sync (no WebSocket yet)
- ❌ Authentication (no API keys yet)
- ❌ Database (in-memory for now)
- ❌ UDMP protocol (just simple JSON)

**That's intentional!** We're starting minimal to validate demand.

---

## 🧪 API Examples

### Create Memory
```bash
curl -X POST http://localhost:3005/api/v1/memory \
  -H "Content-Type: application/json" \
  -d '{
    "type": "decision",
    "content": {
      "title": "Switched to React Context API",
      "description": "Redux was too complex for our needs",
      "reasoning": "Only 3 global state variables"
    },
    "tags": ["react", "state-management"]
  }'
```

### Search Memories
```bash
curl -X POST http://localhost:3005/api/v1/memory/search \
  -H "Content-Type: application/json" \
  -d '{"query": "react"}'
```

### List All Memories
```bash
curl http://localhost:3005/api/v1/memory
```

---

## 📱 Using the SDK

```javascript
const { Coder1Client } = require('./clients/sdk');

const client = new Coder1Client({
  apiUrl: 'http://localhost:3005'
});

// Create memory
const memory = await client.memories.create({
  type: 'insight',
  content: {
    title: 'Learned about async/await',
    description: 'Much cleaner than promise chains'
  }
});

// Search
const results = await client.memories.search('async');

// Get by ID
const memory = await client.memories.get('mem_123');
```

---

## 🎯 Next Steps

### This Week: VS Code Extension

The whole point of this Context API is to validate infrastructure demand.

**Next up:**
1. Build VS Code extension that uses this API
2. Test with 10 developers for 1 week
3. Survey: "Would you pay $9/month for this?"
4. If 70%+ say yes → Infrastructure validated!

### Week 2-3: VS Code Extension

```bash
# Install VS Code extension generator
npm install -g yo generator-code

# Create extension
cd clients
yo code
# Choose: TypeScript extension
# Name: coder1-memory

# Extension will use the SDK we just built
```

---

## 🔒 Safety Notes

### This Is Completely Isolated

- **Different port:** 3005 (production on 3001)
- **Different directory:** coder1-context-api/ (production in coder1-ide-next/)
- **Different database:** In-memory (production uses SQLite)
- **Safe to delete:** Won't affect production at all

### If Something Breaks

```bash
# Just kill the server
# Ctrl+C in the terminal running it

# Production IDE keeps working on port 3001
cd /Users/michaelkraft/autonomous_vibe_interface/coder1-ide-next
npm run dev
```

---

## 📊 Current Status

**Completed:**
- ✅ Basic Context API server
- ✅ REST endpoints for CRUD operations
- ✅ JavaScript SDK
- ✅ Simple test suite
- ✅ Running on separate port (3005)

**Next:**
- [ ] VS Code extension scaffold
- [ ] Extension UI (save/search commands)
- [ ] Beta testing with 10 developers
- [ ] Survey and validation

---

## 🎉 Success!

If you got here, you have:
1. Context API running on port 3005 ✅
2. Production IDE untouched on port 3001 ✅
3. SDK ready for VS Code extension ✅
4. Ready to build the validator ✅

**Next session:** Build the VS Code extension that proves this is worth $100B!

---

## 📞 Questions?

See the main vision documents:
- `../coder1-ide-next/INFRASTRUCTURE_VISION_THE_NEXT_GOOGLE.md`
- `../coder1-ide-next/MEMORY_SYSTEM_IMPROVEMENTS_ROADMAP.md`
- `../coder1-ide-next/PARALLEL_DEVELOPMENT_STRATEGY.md`
