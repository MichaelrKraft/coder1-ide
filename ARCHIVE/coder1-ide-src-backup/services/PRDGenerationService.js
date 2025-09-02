/**
 * Product Requirements Document Generation Service
 * 
 * Handles PRD creation, formatting, export, and storage
 * Integrates with existing IntelligentQuestioner and Claude Code API
 */

const { logger } = require('../monitoring/comprehensive-logger');
const fs = require('fs').promises;
const path = require('path');

class PRDGenerationService {
    constructor(options = {}) {
        this.logger = options.logger || logger;
        this.projectsDir = options.projectsDir || path.join(__dirname, '../../projects');
    }

    /**
     * Generate PRD and save to project directory
     */
    async generateAndSavePRD(originalRequest, questions, answers, analysis, projectId, projectName = null) {
        try {
            this.logger.info('🔄 Generating PRD for project', { projectId });

            // Use IntelligentQuestioner to generate PRD
            const { IntelligentQuestioner } = require('../requirements/intelligent-questioner');
            
            // Debug API key
            const apiKey = process.env.CLAUDE_CODE_API_KEY;
            this.logger.info('🔑 PRD Generation - API Key check', { 
                hasApiKey: !!apiKey,
                keyLength: apiKey ? apiKey.length : 0,
                keyPrefix: apiKey ? apiKey.substring(0, 8) + '...' : 'none',
                isDemoMode: !apiKey || apiKey === 'demo_key_for_testing'
            });
            
            const questioner = new IntelligentQuestioner(apiKey);
            
            // Validate inputs before calling generatePRD
            this.logger.info('📋 PRD Generation inputs', {
                hasOriginalRequest: !!originalRequest,
                originalRequestType: typeof originalRequest,
                questionsCount: questions ? questions.length : 0,
                questionsType: typeof questions,
                answersCount: answers ? answers.length : 0,
                answersType: typeof answers,
                hasAnalysis: !!analysis,
                analysisType: typeof analysis,
                projectName: projectName || 'undefined'
            });
            
            // Ensure we have minimum required data
            if (!originalRequest || typeof originalRequest !== 'string') {
                throw new Error('originalRequest is required and must be a string');
            }
            
            if (!questions || !Array.isArray(questions)) {
                this.logger.warn('⚠️ Questions not provided as array, creating default questions');
                questions = [
                    { question: 'What is the main purpose of your project?', category: 'essential' },
                    { question: 'Who is your target audience?', category: 'essential' },
                    { question: 'What features do you need?', category: 'essential' },
                    { question: 'What is your preferred design style?', category: 'essential' },
                    { question: 'Do you have any specific requirements?', category: 'essential' }
                ];
            }
            
            if (!answers || !Array.isArray(answers)) {
                this.logger.warn('⚠️ Answers not provided as array, creating default answers');
                answers = questions.map(() => 'Not specified');
            }
            
            if (!analysis || typeof analysis !== 'object') {
                this.logger.warn('⚠️ Analysis not provided, creating default analysis');
                analysis = {
                    projectType: 'website',
                    complexity: 'moderate',
                    targetAudience: 'General users',
                    keyFeatures: [],
                    technicalRequirements: []
                };
            }
            
            // Check if generatePRD method exists
            if (typeof questioner.generatePRD !== 'function') {
                throw new Error('generatePRD method not found in IntelligentQuestioner');
            }
            
            this.logger.info('🚀 Calling generatePRD method...');
            
            // Call generatePRD with proper error handling
            let prdDocument;
            try {
                prdDocument = questioner.generatePRD(originalRequest, questions, answers, analysis, projectName);
                this.logger.info('✅ generatePRD completed successfully');
            } catch (generateError) {
                this.logger.error('❌ generatePRD method failed', { 
                    error: generateError.message,
                    stack: generateError.stack
                });
                throw new Error(`PRD generation failed: ${generateError.message}`);
            }
            
            // Ensure project directory exists
            const projectDir = path.join(this.projectsDir, projectId);
            await this.ensureDirectoryExists(projectDir);
            
            // Save PRD as markdown file
            const prdPath = path.join(projectDir, 'PRD.md');
            await fs.writeFile(prdPath, prdDocument.content, 'utf8');
            
            // Save PRD metadata as JSON
            const metadataPath = path.join(projectDir, 'PRD-metadata.json');
            await fs.writeFile(metadataPath, JSON.stringify(prdDocument.metadata, null, 2), 'utf8');
            
            // Create project summary file
            const summaryPath = path.join(projectDir, 'project-summary.json');
            const projectSummary = {
                id: projectId,
                title: prdDocument.title,
                originalRequest,
                projectType: analysis.projectType,
                complexity: analysis.complexity,
                confidence: prdDocument.metadata.confidence,
                createdAt: new Date().toISOString(),
                files: {
                    prd: 'PRD.md',
                    metadata: 'PRD-metadata.json',
                    enhancedPrompt: prdDocument.enhancedPrompt
                }
            };
            await fs.writeFile(summaryPath, JSON.stringify(projectSummary, null, 2), 'utf8');
            
            this.logger.info('✅ PRD generated and saved successfully', {
                projectId,
                title: prdDocument.title,
                prdPath,
                metadataPath
            });
            
            return {
                prdDocument,
                projectSummary,
                filePaths: {
                    prd: prdPath,
                    metadata: metadataPath,
                    summary: summaryPath
                }
            };
            
        } catch (error) {
            this.logger.error('❌ Failed to generate and save PRD', { 
                projectId, 
                error: error.message 
            });
            throw error;
        }
    }

    /**
     * Load existing PRD from project directory
     */
    async loadPRD(projectId) {
        try {
            const projectDir = path.join(this.projectsDir, projectId);
            
            // Load PRD content
            const prdPath = path.join(projectDir, 'PRD.md');
            const prdContent = await fs.readFile(prdPath, 'utf8');
            
            // Load metadata
            const metadataPath = path.join(projectDir, 'PRD-metadata.json');
            const metadataContent = await fs.readFile(metadataPath, 'utf8');
            const metadata = JSON.parse(metadataContent);
            
            // Load project summary
            const summaryPath = path.join(projectDir, 'project-summary.json');
            const summaryContent = await fs.readFile(summaryPath, 'utf8');
            const summary = JSON.parse(summaryContent);
            
            return {
                content: prdContent,
                metadata,
                summary
            };
            
        } catch (error) {
            this.logger.error('❌ Failed to load PRD', { projectId, error: error.message });
            throw error;
        }
    }

    /**
     * Export PRD in different formats
     */
    async exportPRD(projectId, format = 'markdown') {
        try {
            const prd = await this.loadPRD(projectId);
            
            switch (format.toLowerCase()) {
                case 'markdown':
                case 'md':
                    return {
                        content: prd.content,
                        filename: `${prd.summary.title.replace(/\s+/g, '-')}-PRD.md`,
                        mimeType: 'text/markdown'
                    };
                
                case 'json':
                    const jsonContent = {
                        title: prd.summary.title,
                        content: prd.content,
                        metadata: prd.metadata,
                        summary: prd.summary
                    };
                    return {
                        content: JSON.stringify(jsonContent, null, 2),
                        filename: `${prd.summary.title.replace(/\s+/g, '-')}-PRD.json`,
                        mimeType: 'application/json'
                    };
                
                case 'txt':
                    // Strip markdown formatting for plain text
                    const plainText = this.stripMarkdown(prd.content);
                    return {
                        content: plainText,
                        filename: `${prd.summary.title.replace(/\s+/g, '-')}-PRD.txt`,
                        mimeType: 'text/plain'
                    };
                
                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }
            
        } catch (error) {
            this.logger.error('❌ Failed to export PRD', { projectId, format, error: error.message });
            throw error;
        }
    }

    /**
     * Update PRD with new information
     */
    async updatePRD(projectId, updates) {
        try {
            const existingPRD = await this.loadPRD(projectId);
            
            // Update metadata
            const updatedMetadata = {
                ...existingPRD.metadata,
                ...updates.metadata,
                lastModified: new Date().toISOString()
            };
            
            // If content is being updated, regenerate the PRD
            if (updates.content || updates.requirements) {
                // This would require re-running PRD generation with updated inputs
                this.logger.info('PRD content update requested - this would require regeneration');
            }
            
            // Save updated metadata
            const metadataPath = path.join(this.projectsDir, projectId, 'PRD-metadata.json');
            await fs.writeFile(metadataPath, JSON.stringify(updatedMetadata, null, 2), 'utf8');
            
            this.logger.info('✅ PRD updated successfully', { projectId });
            
            return updatedMetadata;
            
        } catch (error) {
            this.logger.error('❌ Failed to update PRD', { projectId, error: error.message });
            throw error;
        }
    }

    /**
     * Get PRD quality score
     */
    calculatePRDQuality(prdDocument) {
        let score = 0;
        let maxScore = 0;
        
        // Check completeness
        maxScore += 20;
        if (prdDocument.metadata.answerCount >= 4) score += 20;
        else if (prdDocument.metadata.answerCount >= 3) score += 15;
        else if (prdDocument.metadata.answerCount >= 2) score += 10;
        
        // Check confidence level
        maxScore += 20;
        if (prdDocument.metadata.confidence === 'high') score += 20;
        else if (prdDocument.metadata.confidence === 'medium') score += 15;
        else score += 10;
        
        // Check content length (longer PRDs are generally more detailed)
        maxScore += 20;
        const contentLength = prdDocument.content.length;
        if (contentLength > 5000) score += 20;
        else if (contentLength > 3000) score += 15;
        else if (contentLength > 1500) score += 10;
        else score += 5;
        
        // Check for key sections
        maxScore += 20;
        const requiredSections = [
            'Executive Summary',
            'Target Audience',
            'Core Features',
            'Technical Requirements',
            'Success Metrics'
        ];
        const foundSections = requiredSections.filter(section => 
            prdDocument.content.includes(section)
        ).length;
        score += (foundSections / requiredSections.length) * 20;
        
        // Check project type specificity
        maxScore += 20;
        const projectTypeScore = prdDocument.metadata.projectType !== 'website' ? 20 : 15;
        score += projectTypeScore;
        
        return {
            score: Math.round(score),
            maxScore,
            percentage: Math.round((score / maxScore) * 100),
            breakdown: {
                completeness: Math.round((Math.min(prdDocument.metadata.answerCount, 4) / 4) * 100),
                confidence: prdDocument.metadata.confidence,
                detailLevel: contentLength > 3000 ? 'high' : contentLength > 1500 ? 'medium' : 'low',
                sectionsComplete: `${foundSections}/${requiredSections.length}`,
                projectSpecificity: prdDocument.metadata.projectType
            }
        };
    }

    /**
     * Generate shareable PRD link data
     */
    generateShareableLink(projectId, prdDocument) {
        const shareData = {
            id: projectId,
            title: prdDocument.title,
            projectType: prdDocument.metadata.projectType,
            complexity: prdDocument.metadata.complexity,
            confidence: prdDocument.metadata.confidence,
            createdAt: prdDocument.metadata.generatedAt,
            summary: this.extractPRDSummary(prdDocument.content)
        };
        
        // In a real implementation, this would generate a unique shareable ID
        const shareId = Buffer.from(JSON.stringify(shareData)).toString('base64url');
        
        return {
            shareId,
            url: `/prd/share/${shareId}`,
            data: shareData
        };
    }

    /**
     * Extract summary from PRD content
     */
    extractPRDSummary(content) {
        // Extract the executive summary section
        const summaryMatch = content.match(/## Executive Summary\s*\n(.*?)\n---/s);
        if (summaryMatch) {
            return summaryMatch[1].trim().substring(0, 300) + '...';
        }
        return content.substring(0, 300) + '...';
    }

    /**
     * Strip markdown formatting for plain text export
     */
    stripMarkdown(content) {
        return content
            .replace(/^#{1,6}\s+/gm, '') // Remove headers
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
            .replace(/\*(.*?)\*/g, '$1') // Remove italic
            .replace(/`(.*?)`/g, '$1') // Remove code
            .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
            .replace(/^-\s+/gm, '• ') // Convert list items
            .replace(/^\d+\.\s+/gm, '') // Remove numbered lists
            .replace(/---+/g, '') // Remove horizontal rules
            .replace(/\n{3,}/g, '\n\n'); // Normalize line breaks
    }

    /**
     * Ensure directory exists
     */
    async ensureDirectoryExists(dirPath) {
        try {
            await fs.access(dirPath);
        } catch {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }

    /**
     * List all PRDs in projects directory
     */
    async listAllPRDs() {
        try {
            const projects = await fs.readdir(this.projectsDir);
            const prds = [];
            
            for (const projectId of projects) {
                try {
                    const summaryPath = path.join(this.projectsDir, projectId, 'project-summary.json');
                    const summaryContent = await fs.readFile(summaryPath, 'utf8');
                    const summary = JSON.parse(summaryContent);
                    prds.push(summary);
                } catch (error) {
                    // Skip projects without PRDs
                    continue;
                }
            }
            
            return prds.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
        } catch (error) {
            this.logger.error('❌ Failed to list PRDs', { error: error.message });
            throw error;
        }
    }
}

module.exports = {
    PRDGenerationService
};