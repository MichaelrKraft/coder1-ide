const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * /session-doc Command Handler
 * 
 * This command allows Claude Code to review the current session,
 * create a summary, and save it to the documentation system
 * with proper date/time stamps.
 * 
 * Usage: /session-doc [optional-title]
 * Example: /session-doc "Fixed terminal resize issue"
 */

class SessionDocCommand {
    constructor() {
        this.docsDir = path.join(__dirname, '../../../data/documentation');
        this.ensureDirectories();
    }

    async ensureDirectories() {
        try {
            await fs.access(this.docsDir);
        } catch {
            await fs.mkdir(this.docsDir, { recursive: true });
        }
    }

    /**
     * Generate a unique session document ID compatible with Documentation Intelligence
     */
    generateSessionId(timestamp) {
        const sessionUrl = `internal://session/${timestamp.toISOString()}`;
        return crypto.createHash('md5').update(sessionUrl).digest('hex');
    }

    /**
     * Format session data as Documentation Intelligence entry
     */
    formatSessionDocument(sessionData, title) {
        const timestamp = new Date();
        const formattedDate = timestamp.toLocaleString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
        });

        // Extract key information from session
        const {
            messages = [],
            context = '',
            files = [],
            commands = [],
            errors = [],
            solutions = [],
            learnings = []
        } = sessionData;

        const sessionTitle = title || `Claude Code Session - ${formattedDate}`;
        const sessionUrl = `internal://session/${timestamp.toISOString()}`;
        
        // Generate searchable content focused on key outcomes
        const searchableContent = this.generateSearchableContent(sessionData);
        
        // Create Documentation Intelligence compatible document
        const document = {
            // Documentation Intelligence required fields
            id: this.generateSessionId(timestamp),
            url: sessionUrl,
            name: sessionTitle,
            description: `Claude Code session: ${this.generateSummary(sessionData).substring(0, 200)}...`,
            title: sessionTitle,
            content: searchableContent,
            chunks: [],
            domain: 'claude-code-sessions',
            addedAt: timestamp.toISOString(),
            extractedAt: timestamp.toISOString(),
            lastUpdated: timestamp.toISOString(),
            
            // Session-specific fields
            type: 'session',
            wordCount: searchableContent.split(' ').length,
            sessionData: {
                timestamp: timestamp.toISOString(),
                formattedDate,
                summary: this.generateSummary(sessionData),
                context,
                timeline: this.createTimeline(messages),
                filesModified: files,
                commandsExecuted: commands,
                errorsEncountered: errors,
                solutionsImplemented: solutions,
                keyLearnings: learnings,
                fullTranscript: messages,
                metadata: {
                    type: 'session-documentation',
                    createdBy: 'Claude Code',
                    version: '1.0.0',
                    tags: ['session', 'documentation', 'claude-code']
                }
            }
        };

        // Create chunks for better search (same as Documentation Intelligence)
        document.chunks = this.createDocumentChunks(document.content);

        return document;
    }

    /**
     * Generate an intelligent summary of the session
     */
    generateSummary(sessionData) {
        const { messages = [], files = [], errors = [], solutions = [] } = sessionData;
        
        let summary = `## Session Overview\n\n`;
        summary += `This session involved ${messages.length} interactions`;
        
        if (files.length > 0) {
            summary += `, modified ${files.length} file${files.length > 1 ? 's' : ''}`;
        }
        
        if (errors.length > 0) {
            summary += `, encountered and resolved ${errors.length} error${errors.length > 1 ? 's' : ''}`;
        }
        
        if (solutions.length > 0) {
            summary += `.\n\n### Key Accomplishments:\n`;
            solutions.forEach((solution, index) => {
                summary += `${index + 1}. ${solution}\n`;
            });
        }

        return summary;
    }

    /**
     * Create a timeline of significant events
     */
    createTimeline(messages) {
        const timeline = [];
        const significantEvents = [];

        messages.forEach((msg, index) => {
            // Extract significant events (errors, fixes, completions)
            if (msg.toLowerCase().includes('error') || 
                msg.toLowerCase().includes('fixed') ||
                msg.toLowerCase().includes('completed') ||
                msg.toLowerCase().includes('success')) {
                
                significantEvents.push({
                    index,
                    time: new Date().toISOString(), // Would be actual message timestamp
                    event: msg.substring(0, 200),
                    type: this.classifyEvent(msg)
                });
            }
        });

        return significantEvents;
    }

    /**
     * Classify event type for better categorization
     */
    classifyEvent(message) {
        const lower = message.toLowerCase();
        if (lower.includes('error')) return 'error';
        if (lower.includes('fixed') || lower.includes('resolved')) return 'fix';
        if (lower.includes('completed') || lower.includes('success')) return 'success';
        if (lower.includes('warning')) return 'warning';
        if (lower.includes('created') || lower.includes('added')) return 'creation';
        if (lower.includes('deleted') || lower.includes('removed')) return 'deletion';
        return 'info';
    }

    /**
     * Generate optimized searchable content for Documentation Intelligence
     */
    generateSearchableContent(sessionData) {
        const {
            messages = [],
            context = '',
            files = [],
            commands = [],
            errors = [],
            solutions = [],
            learnings = []
        } = sessionData;
        
        let content = '';
        
        // Add context and summary for high-level searching
        if (context) content += `Context: ${context}\n\n`;
        
        // Add solutions and learnings (most valuable for future agents)
        if (solutions.length > 0) {
            content += `Solutions Implemented:\n`;
            solutions.forEach((solution, index) => {
                content += `${index + 1}. ${solution}\n`;
            });
            content += '\n';
        }
        
        if (learnings.length > 0) {
            content += `Key Learnings:\n`;
            learnings.forEach((learning, index) => {
                content += `• ${learning}\n`;
            });
            content += '\n';
        }
        
        // Add files modified for technical context
        if (files.length > 0) {
            content += `Files Modified: ${files.join(', ')}\n\n`;
        }
        
        // Add commands for reproducibility
        if (commands.length > 0) {
            content += `Commands Executed:\n`;
            commands.forEach(cmd => {
                content += `$ ${cmd}\n`;
            });
            content += '\n';
        }
        
        // Add errors and their resolution context
        if (errors.length > 0) {
            content += `Errors Encountered and Resolved:\n`;
            errors.forEach((error, index) => {
                content += `Error ${index + 1}: ${error}\n`;
            });
            content += '\n';
        }
        
        // Add selected key messages (avoid full transcript bloat)
        const significantMessages = messages.filter((msg, index) => {
            const msgLower = msg.toLowerCase();
            return msgLower.includes('fixed') ||
                   msgLower.includes('completed') ||
                   msgLower.includes('error') ||
                   msgLower.includes('solution') ||
                   msgLower.includes('implemented') ||
                   index < 3 || // First few messages for context
                   index > messages.length - 3; // Last few for conclusion
        });
        
        if (significantMessages.length > 0) {
            content += `Key Session Highlights:\n`;
            significantMessages.forEach((msg, index) => {
                const truncated = msg.length > 200 ? msg.substring(0, 200) + '...' : msg;
                content += `• ${truncated}\n`;
            });
        }
        
        return content.trim();
    }

    /**
     * Create document chunks for efficient searching (Documentation Intelligence compatible)
     */
    createDocumentChunks(content, maxChunkSize = 1000) {
        const words = content.split(' ');
        const chunks = [];
        
        for (let i = 0; i < words.length; i += maxChunkSize) {
            const chunk = words.slice(i, i + maxChunkSize).join(' ');
            chunks.push({
                content: chunk,
                startIndex: i,
                wordCount: chunk.split(' ').length,
                section: this.determineSectionFromIndex(i, words.length)
            });
        }
        
        return chunks;
    }

    /**
     * Determine which section a chunk belongs to
     */
    determineSectionFromIndex(index, totalLength) {
        const percentage = index / totalLength;
        if (percentage < 0.2) return 'introduction';
        if (percentage < 0.5) return 'middle';
        if (percentage < 0.8) return 'implementation';
        return 'conclusion';
    }

    /**
     * Save session document to Documentation Intelligence storage
     */
    async saveSessionDocument(document) {
        const filename = `${document.id}.json`;
        const filepath = path.join(this.docsDir, filename);
        
        await fs.writeFile(filepath, JSON.stringify(document, null, 2));
        
        // Also create a markdown version for easy reading
        const markdownContent = this.createMarkdownVersion(document);
        const markdownPath = path.join(this.docsDir, `${document.id}.md`);
        await fs.writeFile(markdownPath, markdownContent);
        
        return {
            jsonPath: filepath,
            markdownPath,
            documentId: document.id
        };
    }

    /**
     * Create a markdown version of the session document
     */
    createMarkdownVersion(document) {
        let markdown = `# ${document.title}\n\n`;
        markdown += `**Date:** ${document.sessionData.formattedDate}\n`;
        markdown += `**Session ID:** ${document.id}\n`;
        markdown += `**Type:** Claude Code Session\n`;
        markdown += `**Generated by:** Documentation Intelligence System\n\n`;
        
        markdown += `---\n\n`;
        markdown += document.sessionData.summary + '\n\n';
        
        if (document.sessionData.filesModified?.length > 0) {
            markdown += `## Files Modified\n\n`;
            document.sessionData.filesModified.forEach(file => {
                markdown += `- ${file}\n`;
            });
            markdown += '\n';
        }
        
        if (document.sessionData.commandsExecuted?.length > 0) {
            markdown += `## Commands Executed\n\n`;
            document.sessionData.commandsExecuted.forEach(cmd => {
                markdown += `\`\`\`bash\n${cmd}\n\`\`\`\n`;
            });
            markdown += '\n';
        }
        
        if (document.sessionData.errorsEncountered?.length > 0) {
            markdown += `## Errors Encountered\n\n`;
            document.sessionData.errorsEncountered.forEach((error, index) => {
                markdown += `### Error ${index + 1}\n`;
                markdown += `\`\`\`\n${error}\n\`\`\`\n\n`;
            });
        }
        
        if (document.sessionData.solutionsImplemented?.length > 0) {
            markdown += `## Solutions Implemented\n\n`;
            document.sessionData.solutionsImplemented.forEach((solution, index) => {
                markdown += `${index + 1}. ${solution}\n`;
            });
            markdown += '\n';
        }
        
        if (document.sessionData.keyLearnings?.length > 0) {
            markdown += `## Key Learnings\n\n`;
            document.sessionData.keyLearnings.forEach((learning, index) => {
                markdown += `- ${learning}\n`;
            });
            markdown += '\n';
        }
        
        if (document.sessionData.timeline?.length > 0) {
            markdown += `## Session Timeline\n\n`;
            document.sessionData.timeline.forEach(event => {
                const icon = this.getEventIcon(event.type);
                markdown += `- ${icon} **[${event.type}]** ${event.event}\n`;
            });
            markdown += '\n';
        }
        
        markdown += `---\n\n`;
        markdown += `*This session document was automatically generated by the Documentation Intelligence System.*\n`;
        markdown += `*Session documented on ${document.sessionData.formattedDate}*\n`;
        markdown += `*Stored in Documentation Intelligence for future agent reference.*\n`;
        
        return markdown;
    }

    /**
     * Get icon for event type
     */
    getEventIcon(type) {
        const icons = {
            'error': '❌',
            'fix': '✅',
            'success': '🎉',
            'warning': '⚠️',
            'creation': '➕',
            'deletion': '➖',
            'info': 'ℹ️'
        };
        return icons[type] || '•';
    }

    /**
     * Main handler for the /session-doc command
     */
    async handle(args, sessionData) {
        try {
            await this.ensureDirectories();
            
            // Parse title from arguments
            const title = args.join(' ').trim() || null;
            
            // Format the session document
            const document = this.formatSessionDocument(sessionData, title);
            
            // Save the document
            const paths = await this.saveSessionDocument(document);
            
            return {
                success: true,
                message: `Session documented successfully!`,
                documentId: document.id,
                title: document.title,
                timestamp: document.sessionData.formattedDate,
                paths,
                summary: document.sessionData.summary,
                stats: {
                    messagesProcessed: sessionData.messages?.length || 0,
                    filesDocumented: sessionData.files?.length || 0,
                    errorsDocumented: sessionData.errors?.length || 0,
                    solutionsDocumented: sessionData.solutions?.length || 0
                }
            };
        } catch (error) {
            console.error('Error documenting session:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to document session. Please check logs for details.'
            };
        }
    }

    /**
     * Search sessions is now handled by the main Documentation Intelligence System
     * Sessions are stored alongside external docs and searchable via /api/docs/search
     */
    async searchSessions(query) {
        console.log('Note: Session search is now integrated with Documentation Intelligence System');
        console.log('Use /api/docs/search to search all documentation including sessions');
        
        // For backward compatibility, we can still provide session-only search
        try {
            const files = await fs.readdir(this.docsDir);
            const sessionFiles = files.filter(file => file.endsWith('.json'));
            const results = [];
            
            for (const file of sessionFiles) {
                const filepath = path.join(this.docsDir, file);
                const content = await fs.readFile(filepath, 'utf8');
                const document = JSON.parse(content);
                
                // Only include session documents
                if (document.type === 'session' && document.content?.toLowerCase().includes(query.toLowerCase())) {
                    results.push({
                        id: document.id,
                        title: document.title,
                        timestamp: document.sessionData.timestamp,
                        formattedDate: document.sessionData.formattedDate,
                        relevance: this.calculateRelevance(query, document.content)
                    });
                }
            }
            
            // Sort by relevance
            results.sort((a, b) => b.relevance - a.relevance);
            
            return results.slice(0, 10);
        } catch (error) {
            console.error('Error searching sessions:', error);
            return [];
        }
    }

    /**
     * Calculate search relevance score
     */
    calculateRelevance(query, text) {
        const queryLower = query.toLowerCase();
        const textLower = text.toLowerCase();
        
        // Count occurrences
        const matches = (textLower.match(new RegExp(queryLower, 'g')) || []).length;
        
        // Bonus for exact phrase match
        const exactMatch = textLower.includes(queryLower) ? 10 : 0;
        
        return matches + exactMatch;
    }
}

module.exports = SessionDocCommand;