/**
 * AGENTS.md Context Integration Service
 * 
 * This service integrates AGENTS.md file content with Claude Code sessions,
 * providing automatic project context enhancement for AI-assisted development.
 */

const fs = require('fs').promises;
const path = require('path');

class AgentsContextIntegration {
    constructor() {
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
        this.contextCache = new Map();
    }

    // ==========================================
    // MAIN CONTEXT INTEGRATION METHODS
    // ==========================================

    /**
     * Enhance a Claude Code prompt with AGENTS.md context
     */
    async enhanceClaudeCodePrompt(originalPrompt, workingDirectory = process.cwd()) {
        try {
            console.log(`[AgentsContext] Enhancing prompt for directory: ${workingDirectory}`);
            
            const agentsContext = await this.findAndParseAgentsFile(workingDirectory);
            
            if (!agentsContext) {
                console.log('[AgentsContext] No AGENTS.md file found, returning original prompt');
                return {
                    prompt: originalPrompt,
                    enhanced: false,
                    context: null
                };
            }

            const enhancedPrompt = this.buildEnhancedPrompt(originalPrompt, agentsContext);
            
            console.log(`[AgentsContext] Successfully enhanced prompt with context from: ${agentsContext.filePath}`);
            
            return {
                prompt: enhancedPrompt,
                enhanced: true,
                context: agentsContext,
                metadata: {
                    agentsFilePath: agentsContext.filePath,
                    projectName: agentsContext.overview.projectName,
                    framework: agentsContext.overview.framework,
                    contextSections: Object.keys(agentsContext.sections).length,
                    buildCommands: agentsContext.buildCommands.length
                }
            };
            
        } catch (error) {
            console.error('[AgentsContext] Error enhancing prompt:', error);
            return {
                prompt: originalPrompt,
                enhanced: false,
                error: error.message,
                context: null
            };
        }
    }

    /**
     * Find the nearest AGENTS.md file in the directory hierarchy
     */
    async findAndParseAgentsFile(startDirectory) {
        const cacheKey = startDirectory;
        const cached = this.contextCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            console.log('[AgentsContext] Using cached AGENTS.md context');
            return cached.context;
        }

        let currentDir = path.resolve(startDirectory);
        const rootDir = path.parse(currentDir).root;
        
        while (currentDir !== rootDir) {
            const agentsPath = path.join(currentDir, 'AGENTS.md');
            
            try {
                await fs.access(agentsPath);
                console.log(`[AgentsContext] Found AGENTS.md at: ${agentsPath}`);
                
                const context = await this.parseAgentsFile(agentsPath);
                
                // Cache the result
                this.contextCache.set(cacheKey, {
                    context,
                    timestamp: Date.now()
                });
                
                return context;
                
            } catch (error) {
                // File doesn't exist, try parent directory
                const parentDir = path.dirname(currentDir);
                if (parentDir === currentDir) break; // Reached root
                currentDir = parentDir;
            }
        }
        
        console.log('[AgentsContext] No AGENTS.md file found in directory hierarchy');
        return null;
    }

    /**
     * Parse AGENTS.md file content into structured data
     */
    async parseAgentsFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            
            const context = {
                filePath,
                rawContent: content,
                overview: this.extractOverview(content),
                buildCommands: this.extractBuildCommands(content),
                projectStructure: this.extractProjectStructure(content),
                guidelines: this.extractGuidelines(content),
                sections: this.extractAllSections(content),
                metadata: {
                    parsedAt: Date.now(),
                    contentLength: content.length,
                    hasOverview: content.toLowerCase().includes('## overview'),
                    hasBuildCommands: content.toLowerCase().includes('## build commands'),
                    hasGuidelines: content.toLowerCase().includes('## guidelines')
                }
            };
            
            console.log(`[AgentsContext] Successfully parsed AGENTS.md (${context.metadata.contentLength} chars)`);
            return context;
            
        } catch (error) {
            console.error(`[AgentsContext] Error parsing AGENTS.md file: ${error.message}`);
            throw error;
        }
    }

    // ==========================================
    // CONTENT EXTRACTION METHODS
    // ==========================================

    extractOverview(content) {
        const overview = {
            projectName: 'Unknown Project',
            description: '',
            framework: 'Unknown',
            language: 'Unknown',
            type: 'Unknown'
        };

        // Extract project name from first heading or title
        const titleMatch = content.match(/^#\s+(.+)$/m);
        if (titleMatch) {
            overview.projectName = titleMatch[1].trim();
        }

        // Extract overview section
        const overviewMatch = content.match(/##\s*(?:Overview|Project Overview)\s*\n([\s\S]*?)(?=\n##|\n#|$)/i);
        if (overviewMatch) {
            overview.description = overviewMatch[1].trim();
            
            // Extract framework/technology information
            const desc = overview.description.toLowerCase();
            if (desc.includes('react')) overview.framework = 'React';
            else if (desc.includes('vue')) overview.framework = 'Vue.js';
            else if (desc.includes('angular')) overview.framework = 'Angular';
            else if (desc.includes('next.js') || desc.includes('nextjs')) overview.framework = 'Next.js';
            else if (desc.includes('express')) overview.framework = 'Express.js';
            else if (desc.includes('fastapi')) overview.framework = 'FastAPI';
            else if (desc.includes('django')) overview.framework = 'Django';
            
            if (desc.includes('typescript')) overview.language = 'TypeScript';
            else if (desc.includes('javascript')) overview.language = 'JavaScript';
            else if (desc.includes('python')) overview.language = 'Python';
            else if (desc.includes('java')) overview.language = 'Java';
            
            if (desc.includes('web app') || desc.includes('website')) overview.type = 'Web Application';
            else if (desc.includes('api') || desc.includes('backend')) overview.type = 'API/Backend';
            else if (desc.includes('mobile')) overview.type = 'Mobile Application';
            else if (desc.includes('desktop')) overview.type = 'Desktop Application';
        }

        return overview;
    }

    extractBuildCommands(content) {
        const commands = [];
        const buildMatch = content.match(/##\s*Build Commands\s*\n([\s\S]*?)(?=\n##|\n#|$)/i);
        
        if (buildMatch) {
            const buildSection = buildMatch[1];
            
            // Extract command lines (lines starting with $ or npm/yarn/pnpm)
            const commandLines = buildSection.split('\n').filter(line => {
                const trimmed = line.trim();
                return trimmed.startsWith('$') || 
                       trimmed.startsWith('npm ') ||
                       trimmed.startsWith('yarn ') ||
                       trimmed.startsWith('pnpm ') ||
                       trimmed.startsWith('python ') ||
                       trimmed.startsWith('java ') ||
                       trimmed.startsWith('cargo ') ||
                       trimmed.startsWith('go ');
            });

            commandLines.forEach(line => {
                let command = line.trim();
                if (command.startsWith('$ ')) {
                    command = command.substring(2);
                }
                
                if (command) {
                    commands.push({
                        command,
                        type: this.categorizeCommand(command)
                    });
                }
            });
        }

        return commands;
    }

    extractProjectStructure(content) {
        const structureMatch = content.match(/##\s*(?:Project Structure|Directory Structure|File Structure)\s*\n([\s\S]*?)(?=\n##|\n#|$)/i);
        
        if (structureMatch) {
            return structureMatch[1].trim();
        }
        
        return '';
    }

    extractGuidelines(content) {
        const guidelines = [];
        const guidelinesMatch = content.match(/##\s*(?:Guidelines|Development Guidelines|Coding Guidelines)\s*\n([\s\S]*?)(?=\n##|\n#|$)/i);
        
        if (guidelinesMatch) {
            const guidelinesSection = guidelinesMatch[1];
            
            // Extract bullet points and numbered lists
            const lines = guidelinesSection.split('\n');
            lines.forEach(line => {
                const trimmed = line.trim();
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
                    let guideline = trimmed.replace(/^[-*]\s/, '').replace(/^\d+\.\s/, '');
                    if (guideline) {
                        guidelines.push(guideline);
                    }
                }
            });
        }

        return guidelines;
    }

    extractAllSections(content) {
        const sections = {};
        const sectionRegex = /^##\s+(.+?)\s*\n([\s\S]*?)(?=\n##|\n#|$)/gm;
        let match;

        while ((match = sectionRegex.exec(content)) !== null) {
            const sectionTitle = match[1].trim();
            const sectionContent = match[2].trim();
            sections[sectionTitle] = sectionContent;
        }

        return sections;
    }

    categorizeCommand(command) {
        const cmd = command.toLowerCase();
        
        if (cmd.includes('install') || cmd.includes('add')) return 'install';
        if (cmd.includes('build') || cmd.includes('compile')) return 'build';
        if (cmd.includes('dev') || cmd.includes('serve') || cmd.includes('start')) return 'dev';
        if (cmd.includes('test')) return 'test';
        if (cmd.includes('lint') || cmd.includes('format')) return 'quality';
        if (cmd.includes('deploy')) return 'deploy';
        
        return 'other';
    }

    // ==========================================
    // PROMPT ENHANCEMENT METHODS
    // ==========================================

    buildEnhancedPrompt(originalPrompt, agentsContext) {
        const sections = [];

        // Add context header
        sections.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        sections.push(`🤖 AI AGENT CONTEXT (from ${path.basename(agentsContext.filePath)})`);
        sections.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        sections.push('');

        // Add project overview if available
        if (agentsContext.overview.description) {
            sections.push('📋 PROJECT CONTEXT');
            sections.push('━━━━━━━━━━━━━━━━━━━━━━━━');
            sections.push(`Project: ${agentsContext.overview.projectName}`);
            sections.push(`Framework: ${agentsContext.overview.framework}`);
            sections.push(`Language: ${agentsContext.overview.language}`);
            sections.push(`Type: ${agentsContext.overview.type}`);
            sections.push('');
            sections.push(agentsContext.overview.description);
            sections.push('');
        }

        // Add build commands if available
        if (agentsContext.buildCommands.length > 0) {
            sections.push('🔧 BUILD COMMANDS');
            sections.push('━━━━━━━━━━━━━━━━━━━');
            agentsContext.buildCommands.forEach(cmd => {
                sections.push(`• ${cmd.command} (${cmd.type})`);
            });
            sections.push('');
        }

        // Add project structure if available
        if (agentsContext.projectStructure) {
            sections.push('📁 PROJECT STRUCTURE');
            sections.push('━━━━━━━━━━━━━━━━━━━━━');
            sections.push(agentsContext.projectStructure);
            sections.push('');
        }

        // Add guidelines if available
        if (agentsContext.guidelines.length > 0) {
            sections.push('📝 DEVELOPMENT GUIDELINES');
            sections.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            agentsContext.guidelines.forEach(guideline => {
                sections.push(`• ${guideline}`);
            });
            sections.push('');
        }

        // Add separator before original prompt
        sections.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        sections.push('🎯 USER REQUEST');
        sections.push('━━━━━━━━━━━━━━━━━━━');
        sections.push('');

        // Add original prompt
        sections.push(originalPrompt);

        sections.push('');
        sections.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        sections.push('');
        sections.push('Please use the project context above to provide more accurate and relevant assistance.');
        sections.push('Follow the build commands, project structure, and guidelines specified in the AGENTS.md file.');

        return sections.join('\n');
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    /**
     * Get a summary of available AGENTS.md context for display
     */
    async getContextSummary(workingDirectory = process.cwd()) {
        try {
            const agentsContext = await this.findAndParseAgentsFile(workingDirectory);
            
            if (!agentsContext) {
                return {
                    hasContext: false,
                    message: 'No AGENTS.md file found in project hierarchy'
                };
            }

            return {
                hasContext: true,
                projectName: agentsContext.overview.projectName,
                framework: agentsContext.overview.framework,
                language: agentsContext.overview.language,
                buildCommandsCount: agentsContext.buildCommands.length,
                guidelinesCount: agentsContext.guidelines.length,
                filePath: agentsContext.filePath,
                sections: Object.keys(agentsContext.sections)
            };
            
        } catch (error) {
            return {
                hasContext: false,
                error: error.message
            };
        }
    }

    /**
     * Clear the context cache
     */
    clearCache() {
        this.contextCache.clear();
        console.log('[AgentsContext] Context cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            entriesCount: this.contextCache.size,
            cacheTimeout: this.cacheTimeout,
            entries: Array.from(this.contextCache.keys())
        };
    }

    // ==========================================
    // INTEGRATION WITH EXISTING SYSTEMS
    // ==========================================

    /**
     * Integrate with the existing Claude Code Integration service
     */
    async enhanceClaudeCodeIntegrationPrompt(synthesis, userContext, expertPlans = [], workingDirectory = process.cwd()) {
        console.log('[AgentsContext] Enhancing Claude Code Integration with AGENTS.md context');
        
        const agentsContext = await this.findAndParseAgentsFile(workingDirectory);
        
        if (!agentsContext) {
            return { synthesis, userContext, expertPlans, enhanced: false };
        }

        // Enhance user context with AGENTS.md information
        const enhancedUserContext = {
            ...userContext,
            // Add or enhance existing fields with AGENTS.md data
            projectDescription: userContext.projectDescription || agentsContext.overview.description,
            framework: userContext.framework || agentsContext.overview.framework,
            language: userContext.language || agentsContext.overview.language,
            buildCommands: agentsContext.buildCommands,
            guidelines: agentsContext.guidelines,
            projectStructure: agentsContext.projectStructure,
            agentsContext: true // Flag to indicate context was enhanced
        };

        // Add AGENTS.md context as an expert plan
        const agentsExpertPlan = {
            expertType: 'AGENTS.md Context',
            expertName: 'Project Documentation',
            content: `Project context from AGENTS.md:\n\n${agentsContext.rawContent}`,
            metadata: {
                source: 'AGENTS.md',
                filePath: agentsContext.filePath,
                sections: Object.keys(agentsContext.sections).length
            }
        };

        const enhancedExpertPlans = [...expertPlans, agentsExpertPlan];

        return {
            synthesis,
            userContext: enhancedUserContext,
            expertPlans: enhancedExpertPlans,
            enhanced: true,
            agentsContext
        };
    }
}

module.exports = AgentsContextIntegration;