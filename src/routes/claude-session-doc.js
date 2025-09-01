const express = require('express');
const router = express.Router();
const SessionDocCommand = require('../services/claude-commands/session-doc');

// Initialize the session documentation command handler
const sessionDoc = new SessionDocCommand();

/**
 * POST /api/claude/session-doc
 * 
 * Document the current Claude Code session with timestamp
 * This endpoint can be called by Claude Code via the /session-doc command
 */
router.post('/document', async (req, res) => {
    try {
        const { 
            title,
            messages = [],
            context = '',
            files = [],
            commands = [],
            errors = [],
            solutions = [],
            learnings = [],
            sessionData = {}
        } = req.body;

        // Combine all session data
        const fullSessionData = {
            messages,
            context,
            files,
            commands,
            errors,
            solutions,
            learnings,
            ...sessionData
        };

        // Handle the session documentation
        const result = await sessionDoc.handle(
            title ? [title] : [],
            fullSessionData
        );

        if (result.success) {
            console.log(`📚 [SESSION-DOC] Session documented: ${result.documentId}`);
            console.log(`   Title: ${result.title}`);
            console.log(`   Timestamp: ${result.timestamp}`);
            console.log('   Stats:', result.stats);
        }

        res.json(result);
    } catch (error) {
        console.error('❌ [SESSION-DOC] Error documenting session:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to document session'
        });
    }
});

/**
 * GET /api/claude/session-doc/search
 * 
 * Search through previously documented sessions
 */
router.get('/search', async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({
                error: 'Query parameter is required'
            });
        }

        const results = await sessionDoc.searchSessions(query);
        
        res.json({
            success: true,
            query,
            results,
            count: results.length
        });
    } catch (error) {
        console.error('❌ [SESSION-DOC] Search error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to search sessions'
        });
    }
});

/**
 * GET /api/claude/session-doc/list
 * 
 * List all documented sessions
 */
router.get('/list', async (req, res) => {
    try {
        const fs = require('fs').promises;
        const path = require('path');
        
        const sessionsDir = path.join(__dirname, '../../data/documentation/sessions');
        
        // Ensure directory exists
        try {
            await fs.access(sessionsDir);
        } catch {
            await fs.mkdir(sessionsDir, { recursive: true });
        }
        
        const files = await fs.readdir(sessionsDir);
        const sessionFiles = files.filter(file => file.endsWith('.json'));
        
        const sessions = [];
        for (const file of sessionFiles) {
            const filepath = path.join(sessionsDir, file);
            const content = await fs.readFile(filepath, 'utf8');
            const document = JSON.parse(content);
            
            sessions.push({
                id: document.id,
                title: document.title,
                timestamp: document.timestamp,
                formattedDate: document.formattedDate,
                metadata: document.metadata
            });
        }
        
        // Sort by timestamp (newest first)
        sessions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        res.json({
            success: true,
            sessions,
            count: sessions.length
        });
    } catch (error) {
        console.error('❌ [SESSION-DOC] List error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to list sessions'
        });
    }
});

/**
 * GET /api/claude/session-doc/:id
 * 
 * Get a specific documented session
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { format = 'json' } = req.query;
        
        const fs = require('fs').promises;
        const path = require('path');
        
        const sessionsDir = path.join(__dirname, '../../data/documentation/sessions');
        
        // Determine file extension based on format
        const extension = format === 'markdown' ? '.md' : '.json';
        const filepath = path.join(sessionsDir, `${id}${extension}`);
        
        // Check if file exists
        try {
            await fs.access(filepath);
        } catch {
            return res.status(404).json({
                error: 'Session document not found'
            });
        }
        
        const content = await fs.readFile(filepath, 'utf8');
        
        if (format === 'markdown') {
            res.type('text/markdown').send(content);
        } else {
            res.json(JSON.parse(content));
        }
    } catch (error) {
        console.error('❌ [SESSION-DOC] Get error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to retrieve session document'
        });
    }
});

/**
 * DELETE /api/claude/session-doc/:id
 * 
 * Delete a documented session
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const fs = require('fs').promises;
        const path = require('path');
        
        const sessionsDir = path.join(__dirname, '../../data/documentation/sessions');
        
        // Delete both JSON and markdown files
        const jsonPath = path.join(sessionsDir, `${id}.json`);
        const mdPath = path.join(sessionsDir, `${id}.md`);
        
        let deleted = false;
        
        try {
            await fs.unlink(jsonPath);
            deleted = true;
        } catch (error) {
            console.log('JSON file not found or already deleted');
        }
        
        try {
            await fs.unlink(mdPath);
            deleted = true;
        } catch (error) {
            console.log('Markdown file not found or already deleted');
        }
        
        if (!deleted) {
            return res.status(404).json({
                error: 'Session document not found'
            });
        }
        
        console.log(`🗑️ [SESSION-DOC] Deleted session: ${id}`);
        
        res.json({
            success: true,
            message: `Session document ${id} deleted successfully`
        });
    } catch (error) {
        console.error('❌ [SESSION-DOC] Delete error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to delete session document'
        });
    }
});

/**
 * POST /api/claude/session-doc/command
 * 
 * Handle the /session-doc slash command from Claude Code
 * This endpoint is specifically for processing slash commands
 */
router.post('/command', async (req, res) => {
    try {
        const { command, args = [], context = {} } = req.body;
        
        // Validate command
        if (command !== '/session-doc') {
            return res.status(400).json({
                error: 'Invalid command. Expected /session-doc'
            });
        }
        
        // Extract session data from context
        const sessionData = {
            messages: context.messages || [],
            context: context.currentContext || '',
            files: context.modifiedFiles || [],
            commands: context.executedCommands || [],
            errors: context.errors || [],
            solutions: context.solutions || [],
            learnings: context.learnings || []
        };
        
        // Handle the command
        const result = await sessionDoc.handle(args, sessionData);
        
        // Format response for Claude Code
        if (result.success) {
            const response = `✅ **Session Documented Successfully!**

📚 **Document ID:** ${result.documentId}
📝 **Title:** ${result.title}
🕒 **Timestamp:** ${result.timestamp}

**Summary:**
${result.summary}

**Statistics:**
- Messages Processed: ${result.stats.messagesProcessed}
- Files Documented: ${result.stats.filesDocumented}
- Errors Documented: ${result.stats.errorsDocumented}
- Solutions Documented: ${result.stats.solutionsDocumented}

**Files Saved:**
- JSON: ${result.paths.jsonPath}
- Markdown: ${result.paths.markdownPath}

You can search for this session later using: \`/session-search ${result.documentId}\``;
            
            res.json({
                success: true,
                message: response,
                data: result
            });
        } else {
            res.json({
                success: false,
                message: `❌ Failed to document session: ${result.message}`,
                error: result.error
            });
        }
    } catch (error) {
        console.error('❌ [SESSION-DOC] Command error:', error);
        res.status(500).json({
            success: false,
            message: '❌ Failed to process /session-doc command',
            error: error.message
        });
    }
});

module.exports = router;