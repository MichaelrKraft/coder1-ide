/**
 * Coder1 Context API - Infrastructure Experiment
 * 
 * This is a SEPARATE server from the production IDE
 * - Runs on port 3005 (production IDE on 3001)
 * - Completely isolated, safe to break
 * - Purpose: Validate infrastructure play with VS Code extension
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for MVP (will move to database later)
const memories = new Map();

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Coder1 Context API',
    version: '1.0.0',
    port: PORT,
    message: 'Infrastructure experiment running alongside production IDE'
  });
});

// ============================================================================
// MEMORY API (MVP)
// ============================================================================

/**
 * Create Memory
 * POST /api/v1/memory
 */
app.post('/api/v1/memory', (req, res) => {
  try {
    const memory = {
      id: `mem_${uuidv4()}`,
      version: '1.0',
      timestamp: new Date().toISOString(),
      ...req.body
    };
    
    memories.set(memory.id, memory);
    
    console.log(`✅ Memory created: ${memory.id}`);
    res.status(201).json(memory);
  } catch (error) {
    console.error('Error creating memory:', error);
    res.status(500).json({ error: 'Failed to create memory' });
  }
});

/**
 * Get Memory by ID
 * GET /api/v1/memory/:id
 */
app.get('/api/v1/memory/:id', (req, res) => {
  const memory = memories.get(req.params.id);
  
  if (!memory) {
    return res.status(404).json({ error: 'Memory not found' });
  }
  
  res.json(memory);
});

/**
 * Search Memories (Enhanced deep search)
 * POST /api/v1/memory/search
 */
app.post('/api/v1/memory/search', (req, res) => {
  const { query, limit = 20 } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Query required' });
  }
  
  const queryLower = query.toLowerCase();
  const results = [];
  
  for (const memory of memories.values()) {
    let score = 0;
    const matchedContent = [];
    
    // Title match (highest weight)
    if (memory.content?.title?.toLowerCase().includes(queryLower)) {
      score += 10;
      matchedContent.push({ type: 'title', text: memory.content.title });
    }
    
    // Description match
    if (memory.content?.description?.toLowerCase().includes(queryLower)) {
      score += 5;
      matchedContent.push({ type: 'description', text: memory.content.description });
    }
    
    // Tags match
    if (memory.tags?.some(tag => tag.toLowerCase().includes(queryLower))) {
      score += 3;
      matchedContent.push({ type: 'tags', text: memory.tags.join(', ') });
    }
    
    // File content match (for sessions with full files)
    if (memory.content?.files) {
      for (const file of memory.content.files) {
        if (file.content?.toLowerCase().includes(queryLower)) {
          score += 2;
          const lines = file.content.split('\n');
          const matchedLines = lines.filter(line => 
            line.toLowerCase().includes(queryLower)
          );
          matchedContent.push({
            type: 'file',
            path: file.path,
            matches: matchedLines.slice(0, 3)
          });
        }
      }
    }
    
    // Terminal commands match
    if (memory.content?.terminal?.commands) {
      const terminalText = memory.content.terminal.commands.join(' ').toLowerCase();
      if (terminalText.includes(queryLower)) {
        score += 4;
        const matchedCommands = memory.content.terminal.commands.filter(cmd =>
          cmd.toLowerCase().includes(queryLower)
        );
        matchedContent.push({
          type: 'terminal',
          commands: matchedCommands.slice(0, 5)
        });
      }
    }
    
    // Git commits match
    if (memory.content?.git?.commits) {
      const matchedCommits = memory.content.git.commits.filter(commit =>
        commit.message?.toLowerCase().includes(queryLower)
      );
      if (matchedCommits.length > 0) {
        score += 3;
        matchedContent.push({
          type: 'git',
          commits: matchedCommits.slice(0, 3)
        });
      }
    }
    
    // Code snippet match (for simple memories)
    if (memory.content?.codeSnippet?.code?.toLowerCase().includes(queryLower)) {
      score += 2;
      matchedContent.push({
        type: 'code',
        language: memory.content.codeSnippet.language,
        snippet: memory.content.codeSnippet.code
      });
    }
    
    if (score > 0) {
      results.push({
        ...memory,
        searchMeta: {
          score,
          matchedContent: matchedContent.slice(0, 5) // Limit to top 5 matches
        }
      });
    }
  }
  
  // Sort by score (highest first)
  results.sort((a, b) => b.searchMeta.score - a.searchMeta.score);
  
  res.json({
    query,
    count: results.length,
    results: results.slice(0, limit)
  });
});

/**
 * List All Memories
 * GET /api/v1/memory
 */
app.get('/api/v1/memory', (req, res) => {
  const allMemories = Array.from(memories.values());
  res.json({
    count: allMemories.length,
    memories: allMemories
  });
});

/**
 * Delete Memory
 * DELETE /api/v1/memory/:id
 */
app.delete('/api/v1/memory/:id', (req, res) => {
  const deleted = memories.delete(req.params.id);
  
  if (!deleted) {
    return res.status(404).json({ error: 'Memory not found' });
  }
  
  res.json({ success: true, message: 'Memory deleted' });
});

/**
 * Get Statistics
 * GET /api/v1/memory/stats
 */
app.get('/api/v1/memory/stats', (req, res) => {
  const allMemories = Array.from(memories.values());
  
  const stats = {
    total: allMemories.length,
    byType: {},
    sessions: 0,
    insights: 0,
    totalFiles: 0,
    totalCommands: 0,
    languages: new Set(),
    projects: new Set()
  };
  
  allMemories.forEach(memory => {
    // Count by type
    const type = memory.type || 'unknown';
    stats.byType[type] = (stats.byType[type] || 0) + 1;
    
    if (type === 'session') {
      stats.sessions++;
      if (memory.content?.files) {
        stats.totalFiles += memory.content.files.length;
        memory.content.files.forEach(f => {
          if (f.language) stats.languages.add(f.language);
        });
      }
      if (memory.content?.terminal?.commands) {
        stats.totalCommands += memory.content.terminal.commands.length;
      }
    } else if (type === 'insight') {
      stats.insights++;
    }
    
    if (memory.context?.project?.name) {
      stats.projects.add(memory.context.project.name);
    }
  });
  
  stats.languages = Array.from(stats.languages);
  stats.projects = Array.from(stats.projects);
  
  res.json(stats);
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log('\n🚀 ================================================');
  console.log('   CODER1 CONTEXT API - Infrastructure Experiment');
  console.log('================================================');
  console.log(`✅ Server running on: http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`📝 API docs: http://localhost:${PORT}/api/v1/memory`);
  console.log('\n💡 This is SEPARATE from production IDE (port 3001)');
  console.log('   Safe to experiment, break, and rebuild!\n');
  console.log('================================================\n');
});

module.exports = app;
