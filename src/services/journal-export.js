/**
 * Journal Export Service
 * Converts JSON tracking data to human-readable markdown format
 * Inspired by Claude Conductor's JOURNAL.md approach
 */

const fs = require('fs').promises;
const path = require('path');

class JournalExportService {
    constructor(options = {}) {
        this.projectRoot = options.projectRoot || process.cwd();
        this.memoryDir = path.join(this.projectRoot, '.coder1', 'memory');
        this.logger = options.logger || console;
    }

    /**
     * Export current memory as markdown journal
     */
    async exportJournal(format = 'markdown') {
        try {
            const [insights, outcomes] = await Promise.all([
                this.loadMemoryFile('agent-insights.json'),
                this.loadMemoryFile('task-outcomes.json')
            ]);

            const journalData = this.combineAndSortEntries(insights, outcomes);
            
            switch (format) {
            case 'markdown':
                return this.formatAsMarkdown(journalData);
            case 'json':
                return JSON.stringify(journalData, null, 2);
            default:
                throw new Error(`Unsupported format: ${format}`);
            }
        } catch (error) {
            this.logger.error('Failed to export journal:', error);
            throw error;
        }
    }

    /**
     * Load memory file with error handling
     */
    async loadMemoryFile(filename) {
        try {
            const filePath = path.join(this.memoryDir, filename);
            const content = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            this.logger.warn(`Failed to load ${filename}, using empty array:`, error.message);
            return [];
        }
    }

    /**
     * Combine and sort entries chronologically
     */
    combineAndSortEntries(insights, outcomes) {
        const entries = [];
        
        // Process insights
        insights.forEach(insight => {
            entries.push({
                timestamp: insight.createdAt || insight.lastUsed || Date.now(),
                type: 'insight',
                agentType: insight.agentType,
                content: insight.content,
                confidence: insight.confidence,
                usageCount: insight.usageCount,
                metadata: insight.metadata,
                source: 'agent-insights'
            });
        });
        
        // Process outcomes
        outcomes.forEach(outcome => {
            entries.push({
                timestamp: outcome.timestamp || outcome.createdAt || Date.now(),
                type: 'outcome', 
                status: outcome.status,
                content: outcome.description || outcome.content,
                metadata: outcome.metadata,
                source: 'task-outcomes'
            });
        });
        
        // Sort by timestamp (newest first)
        return entries.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Format entries as human-readable markdown
     */
    formatAsMarkdown(entries) {
        const now = new Date();
        const header = this.generateMarkdownHeader(now, entries.length);
        const sections = this.groupEntriesByDate(entries);
        
        let markdown = header + '\n\n';
        
        // Add table of contents
        markdown += '## 📋 Recent Activity Summary\n\n';
        markdown += this.generateActivitySummary(entries) + '\n\n';
        
        // Add daily sections
        Object.entries(sections).forEach(([date, dayEntries]) => {
            markdown += `## 📅 ${date}\n\n`;
            
            dayEntries.forEach(entry => {
                markdown += this.formatEntry(entry) + '\n\n';
            });
        });
        
        // Add footer
        markdown += this.generateFooter();
        
        return markdown;
    }

    /**
     * Generate markdown header
     */
    generateMarkdownHeader(date, entryCount) {
        return `# 🧠 Coder One Development Journal

**Generated**: ${date.toISOString().split('T')[0]} at ${date.toTimeString().split(' ')[0]}  
**Total Entries**: ${entryCount}  
**Export Type**: Complete memory dump from JSON tracking

---

> This journal provides a human-readable view of your Coder One development session history.
> It includes AI agent insights, task outcomes, and development activities.`;
    }

    /**
     * Generate activity summary
     */
    generateActivitySummary(entries) {
        const stats = this.calculateStats(entries);
        
        return `| Metric | Count |
|--------|--------|
| 🤖 **Agent Insights** | ${stats.insights} |
| ✅ **Task Outcomes** | ${stats.outcomes} |
| 🔥 **High Confidence Items** | ${stats.highConfidence} |
| 📈 **Most Active Agent** | ${stats.mostActiveAgent} |
| 🕒 **Days Tracked** | ${stats.daysTracked} |`;
    }

    /**
     * Calculate statistics for summary
     */
    calculateStats(entries) {
        const insightCount = entries.filter(e => e.type === 'insight').length;
        const outcomeCount = entries.filter(e => e.type === 'outcome').length;
        const highConfidence = entries.filter(e => e.confidence && e.confidence > 0.8).length;
        
        // Find most active agent
        const agentCounts = {};
        entries.forEach(entry => {
            if (entry.agentType) {
                agentCounts[entry.agentType] = (agentCounts[entry.agentType] || 0) + (entry.usageCount || 1);
            }
        });
        
        const mostActiveAgent = Object.entries(agentCounts)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None';
        
        const uniqueDates = [...new Set(entries.map(e => 
            new Date(e.timestamp).toISOString().split('T')[0]
        ))];
        
        return {
            insights: insightCount,
            outcomes: outcomeCount, 
            highConfidence,
            mostActiveAgent,
            daysTracked: uniqueDates.length
        };
    }

    /**
     * Group entries by date
     */
    groupEntriesByDate(entries) {
        const grouped = {};
        
        entries.forEach(entry => {
            const date = new Date(entry.timestamp).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric', 
                month: 'long',
                day: 'numeric'
            });
            
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(entry);
        });
        
        return grouped;
    }

    /**
     * Format a single entry
     */
    formatEntry(entry) {
        const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        let icon = '📝';
        if (entry.type === 'insight') {
            if (entry.agentType === 'proactive-intelligence') icon = '🧠';
            else if (entry.agentType === 'context-builder') icon = '🔍';
            else icon = '💡';
        } else if (entry.type === 'outcome') {
            if (entry.status === 'completed') icon = '✅';
            else if (entry.status === 'failed') icon = '❌'; 
            else icon = '⏳';
        }
        
        let markdown = `### ${icon} ${time} - ${this.getEntryTitle(entry)}\n`;
        markdown += `${entry.content}\n`;
        
        // Add metadata if relevant
        if (entry.confidence) {
            const confidenceIcon = entry.confidence > 0.8 ? '🔥' : entry.confidence > 0.6 ? '👍' : '🤔';
            markdown += `\n**Confidence**: ${confidenceIcon} ${(entry.confidence * 100).toFixed(0)}%`;
        }
        
        if (entry.usageCount && entry.usageCount > 1) {
            markdown += `  \n**Usage**: ${entry.usageCount} times`;
        }
        
        if (entry.metadata?.category) {
            markdown += `  \n**Category**: ${entry.metadata.category}`;
        }
        
        if (entry.metadata?.priority) {
            const priorityIcon = entry.metadata.priority === 'high' ? '🚨' : 
                entry.metadata.priority === 'medium' ? '⚠️' : 'ℹ️';
            markdown += `  \n**Priority**: ${priorityIcon} ${entry.metadata.priority}`;
        }
        
        return markdown;
    }

    /**
     * Get entry title based on type and metadata
     */
    getEntryTitle(entry) {
        if (entry.type === 'insight') {
            if (entry.agentType === 'proactive-intelligence') {
                return `AI Suggestion (${entry.metadata?.type || 'general'})`;
            } else if (entry.agentType === 'context-builder') {
                return 'Context Update';
            }
            return 'Agent Insight';
        } else if (entry.type === 'outcome') {
            return `Task ${entry.status || 'Update'}`;
        }
        return 'Development Activity';
    }

    /**
     * Generate footer with metadata
     */
    generateFooter() {
        return `---

## 🔗 Related Files

- **Raw Data**: \`.coder1/memory/agent-insights.json\`
- **Task History**: \`.coder1/memory/task-outcomes.json\`  
- **Templates**: \`.coder1/agents/templates.json\`
- **Agent Configs**: \`.coder1/agents/*.json\`

## 📚 About This Journal

This journal is automatically generated from Coder One's memory system. It provides a human-readable view of:

- **Agent Insights**: Proactive suggestions and context updates from the AI system
- **Task Outcomes**: Results and progress from development activities  
- **Development Patterns**: Learning and optimization recommendations

*Generated by Coder One Journal Export Service*`;
    }

    /**
     * Save journal to file
     */
    async saveJournalToFile(content, filename = 'JOURNAL.md') {
        const outputPath = path.join(this.projectRoot, filename);
        await fs.writeFile(outputPath, content, 'utf-8');
        return outputPath;
    }

    /**
     * Get journal file stats for auto-archiving
     */
    async getJournalStats(filename = 'JOURNAL.md') {
        try {
            const filePath = path.join(this.projectRoot, filename);
            const content = await fs.readFile(filePath, 'utf-8');
            const lines = content.split('\n').length;
            const words = content.split(/\s+/).length;
            const size = Buffer.byteLength(content, 'utf-8');
            
            return { lines, words, size, path: filePath };
        } catch (error) {
            return { lines: 0, words: 0, size: 0, path: null };
        }
    }
}

module.exports = JournalExportService;