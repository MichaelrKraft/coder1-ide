/**
 * Product Creation Hub API Routes
 * 
 * Integrates all backend services for the Smart PRD & Wireframe Generator
 */

const express = require('express');
const archiver = require('archiver');
const { IntelligentQuestioner } = require('../requirements/intelligent-questioner');
const { PRDGenerationService } = require('../services/PRDGenerationService');
const { WireframeGenerationService } = require('../services/WireframeGenerationService');
const { MarketValidationEngine } = require('../services/MarketValidationEngine');
const { ProjectIntelligenceService } = require('../services/ProjectIntelligenceService');
const { ProjectAnalytics } = require('../services/ProjectAnalytics');
const { ProjectVersionManager } = require('../services/ProjectVersionManager.js');
const { AdvancedAnalyticsDashboard } = require('../services/AdvancedAnalyticsDashboard');
const { logger } = require('../monitoring/comprehensive-logger');

const router = express.Router();

// Initialize services
const questioner = new IntelligentQuestioner(process.env.CLAUDE_CODE_API_KEY);
const prdService = new PRDGenerationService();
const wireframeService = new WireframeGenerationService();
const marketEngine = new MarketValidationEngine();
const intelligenceService = new ProjectIntelligenceService();
const analytics = new ProjectAnalytics();
const versionManager = new ProjectVersionManager();
const analyticsDashboard = new AdvancedAnalyticsDashboard();

// Storage for active sessions (in production, use Redis or database)
const activeSessions = new Map();
const activeProjects = new Map();

/**
 * Analytics endpoints
 */

// Start analytics session
router.post('/analytics/start-session', async (req, res) => {
    try {
        const { sessionId, userContext } = req.body;
        
        const session = await analytics.startSession(sessionId, userContext);
        activeSessions.set(sessionId, session);
        
        res.json({
            success: true,
            sessionId: session.id,
            message: 'Analytics session started'
        });
    } catch (error) {
        logger.error('Failed to start analytics session', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start analytics session'
        });
    }
});

// Track analytics events
router.post('/analytics/event', async (req, res) => {
    try {
        const { sessionId, eventType, eventData } = req.body;
        
        await analytics.recordEvent(sessionId, eventType, eventData);
        
        res.json({
            success: true,
            message: 'Event tracked successfully'
        });
    } catch (error) {
        logger.error('Failed to track analytics event', error);
        res.status(500).json({
            success: false,
            error: 'Failed to track event'
        });
    }
});

/**
 * Project creation and requirements gathering
 */

// Analyze requirements and generate questions
router.post('/analyze-requirements', async (req, res) => {
    try {
        const { request, sessionId } = req.body;
        
        logger.info('📋 Analyzing requirements for Smart PRD Generator', { 
            requestLength: request.length,
            sessionId 
        });

        // Generate questions using IntelligentQuestioner
        const result = await questioner.analyzeAndGenerateQuestions(request);
        
        // Create project ID
        const projectId = `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Store project data
        const projectData = {
            id: projectId,
            sessionId,
            originalRequest: request,
            projectType: result.projectType,
            analysis: result.analysis,
            questions: result.questions,
            answers: [],
            createdAt: new Date().toISOString(),
            status: 'questioning'
        };
        
        activeProjects.set(projectId, projectData);
        
        // Track project creation in analytics
        // await analytics.trackProjectCreation(sessionId, projectData);

        res.json({
            success: true,
            projectId,
            projectType: result.projectType,
            analysis: result.analysis,
            questions: result.questions,
            estimatedComplexity: result.estimatedComplexity,
            message: `Detected ${result.projectType} project. Generated ${result.questions.length} questions.`
        });

    } catch (error) {
        logger.error('❌ Failed to analyze requirements', error);
        console.error('FULL ERROR:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to analyze requirements',
            details: error.message,
            stack: error.stack
        });
    }
});

// Submit answers for a project
router.post('/agent/submit-answers', async (req, res) => {
    try {
        const { projectId, answers, sessionId } = req.body;
        
        const project = activeProjects.get(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        // Update project with answers
        project.answers = answers;
        project.status = 'answers_completed';
        project.updatedAt = new Date().toISOString();
        
        // Track question answering
        for (let i = 0; i < answers.length; i++) {
            await analytics.trackQuestionAnswering(
                sessionId, 
                projectId, 
                project.questions[i], 
                answers[i]
            );
        }

        res.json({
            success: true,
            message: 'Answers submitted successfully',
            projectStatus: project.status
        });

    } catch (error) {
        logger.error('❌ Failed to submit answers', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit answers'
        });
    }
});

/**
 * PRD Generation endpoints
 */

// Generate PRD
router.post('/prd/generate', async (req, res) => {
    try {
        const { projectId, originalRequest, questions, answers, sessionId } = req.body;
        
        logger.info('📄 Generating PRD', { projectId });

        // Get project data
        let project = activeProjects.get(projectId);
        if (!project) {
            // Create project if it doesn't exist (for direct API calls)
            project = {
                id: projectId,
                originalRequest,
                projectType: 'website', // Default
                questions,
                answers
            };
        }

        // Update project with answers if provided
        if (answers) {
            project.answers = answers;
        }

        // Generate analysis for PRD
        const analysis = {
            projectType: project.projectType || 'website',
            complexity: 'moderate',
            targetAudience: 'General users',
            keyFeatures: [],
            technicalRequirements: []
        };

        // Generate PRD using PRDGenerationService
        const prdResult = await prdService.generateAndSavePRD(
            originalRequest,
            questions,
            answers,
            analysis,
            projectId,
            `${project.projectType} Project`
        );

        // Update project status
        project.prdDocument = prdResult.prdDocument;
        project.status = 'prd_generated';
        project.updatedAt = new Date().toISOString();
        activeProjects.set(projectId, project);

        // Track PRD generation
        await analytics.trackPRDGeneration(sessionId, projectId, prdResult.prdDocument);

        res.json({
            success: true,
            prdDocument: prdResult.prdDocument,
            projectSummary: prdResult.projectSummary,
            filePaths: prdResult.filePaths,
            message: 'PRD generated successfully'
        });

    } catch (error) {
        logger.error('❌ Failed to generate PRD', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate PRD',
            details: error.message
        });
    }
});

// Export PRD
router.get('/prd/export/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const format = req.query.format || 'markdown';
        
        const exportData = await prdService.exportPRD(projectId, format);
        
        res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
        res.setHeader('Content-Type', exportData.mimeType);
        res.send(exportData.content);

    } catch (error) {
        logger.error('❌ Failed to export PRD', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export PRD'
        });
    }
});

// Share PRD
router.post('/prd/share/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        
        const project = activeProjects.get(projectId);
        if (!project || !project.prdDocument) {
            return res.status(404).json({
                success: false,
                error: 'PRD not found'
            });
        }

        const shareData = prdService.generateShareableLink(projectId, project.prdDocument);
        
        res.json({
            success: true,
            shareUrl: `${req.protocol}://${req.get('host')}/prd/shared/${shareData.shareId}`,
            shareId: shareData.shareId
        });

    } catch (error) {
        logger.error('❌ Failed to create PRD share link', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create share link'
        });
    }
});

/**
 * Wireframe Generation endpoints
 */

// Generate wireframes
router.post('/wireframes/generate', async (req, res) => {
    try {
        const { projectId, prdDocument, sessionId } = req.body;
        
        logger.info('🎨 Generating wireframes', { projectId });

        const wireframes = await wireframeService.generateWireframes(prdDocument, projectId);
        
        // Update project status
        const project = activeProjects.get(projectId);
        if (project) {
            project.wireframes = wireframes;
            project.status = 'wireframes_generated';
            project.updatedAt = new Date().toISOString();
            activeProjects.set(projectId, project);
        }

        // Track wireframe generation
        await analytics.trackWireframeGeneration(sessionId, projectId, wireframes);

        res.json({
            success: true,
            wireframes,
            message: `Generated ${wireframes.wireframes.length} wireframe layouts`
        });

    } catch (error) {
        logger.error('❌ Failed to generate wireframes', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate wireframes',
            details: error.message
        });
    }
});

// Get wireframes for a project
router.get('/wireframes/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        
        const wireframes = await wireframeService.loadWireframes(projectId);
        
        res.json({
            success: true,
            wireframes
        });

    } catch (error) {
        logger.error('❌ Failed to load wireframes', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load wireframes'
        });
    }
});

/**
 * Market Intelligence endpoints
 */

// Get market insights
router.get('/market-insights/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        
        const project = activeProjects.get(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        const insights = await marketEngine.generateMarketInsights(
            project.originalRequest,
            project.projectType,
            { answers: project.answers }
        );

        res.json({
            success: true,
            insights
        });

    } catch (error) {
        logger.error('❌ Failed to get market insights', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get market insights'
        });
    }
});

/**
 * Project Intelligence endpoints
 */

// Get project intelligence analysis
router.get('/intelligence/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        
        const project = activeProjects.get(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        const projectData = {
            id: projectId,
            originalRequest: project.originalRequest,
            projectType: project.projectType,
            requirements: { essential: project.answers }
        };

        const intelligence = await intelligenceService.analyzeProject(projectData);

        res.json({
            success: true,
            intelligence
        });

    } catch (error) {
        logger.error('❌ Failed to get project intelligence', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get project intelligence'
        });
    }
});

/**
 * Project Management endpoints
 */

// Get project details
router.get('/project/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        
        const project = activeProjects.get(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        // Try to load additional data
        let prd = null;
        let wireframes = null;

        try {
            prd = await prdService.loadPRD(projectId);
        } catch (error) {
            // PRD might not exist yet
        }

        try {
            wireframes = await wireframeService.loadWireframes(projectId);
        } catch (error) {
            // Wireframes might not exist yet
        }

        res.json({
            success: true,
            project,
            prd,
            wireframes
        });

    } catch (error) {
        logger.error('❌ Failed to get project', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get project'
        });
    }
});

// Export complete project
router.get('/project/export/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        
        const project = activeProjects.get(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        // Create a ZIP file with all project assets
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${projectId}-complete-project.zip"`);
        
        archive.pipe(res);

        // Add project summary
        archive.append(JSON.stringify(project, null, 2), { name: 'project-summary.json' });

        // Add PRD if exists
        try {
            const prd = await prdService.loadPRD(projectId);
            archive.append(prd.content, { name: 'PRD.md' });
            archive.append(JSON.stringify(prd.metadata, null, 2), { name: 'PRD-metadata.json' });
        } catch (error) {
            // PRD doesn't exist
        }

        // Add wireframes if exist
        try {
            const wireframes = await wireframeService.loadWireframes(projectId);
            archive.append(JSON.stringify(wireframes, null, 2), { name: 'wireframes.json' });
            
            // Add HTML wireframes
            wireframes.wireframes.forEach((wireframe, index) => {
                archive.append(wireframe.html, { name: `wireframe-${wireframe.id}.html` });
            });
        } catch (error) {
            // Wireframes don't exist
        }

        archive.finalize();

    } catch (error) {
        logger.error('❌ Failed to export project', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export project'
        });
    }
});

// List all projects
router.get('/projects', async (req, res) => {
    try {
        const projects = Array.from(activeProjects.values()).map(project => ({
            id: project.id,
            originalRequest: project.originalRequest,
            projectType: project.projectType,
            status: project.status,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt
        }));

        res.json({
            success: true,
            projects: projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        });

    } catch (error) {
        logger.error('❌ Failed to list projects', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list projects'
        });
    }
});

/**
 * Multi-Persona Consultation endpoints
 */

// Get available personas
router.get('/personas/available', (req, res) => {
    try {
        // For MVP, return static persona configurations
        const personas = [
            {
                id: 'frontend-architect',
                name: 'Frontend Architect',
                expertise: ['UI/UX Design', 'React/Vue/Angular', 'Responsive Design', 'Performance Optimization', 'Accessibility'],
                iconClass: 'fas fa-paint-brush',
                color: '#8b5cf6'
            },
            {
                id: 'backend-engineer',
                name: 'Backend Engineer',
                expertise: ['System Architecture', 'APIs', 'Databases', 'Microservices', 'Scalability'],
                iconClass: 'fas fa-server',
                color: '#06b6d4'
            },
            {
                id: 'security-expert',
                name: 'Security Expert',
                expertise: ['Application Security', 'Data Protection', 'Authentication', 'Compliance', 'Threat Analysis'],
                iconClass: 'fas fa-shield-alt',
                color: '#ef4444'
            },
            {
                id: 'performance-specialist',
                name: 'Performance Specialist',
                expertise: ['Performance Optimization', 'Caching', 'Load Testing', 'Monitoring', 'CDN'],
                iconClass: 'fas fa-tachometer-alt',
                color: '#10b981'
            },
            {
                id: 'business-analyst',
                name: 'Business Analyst',
                expertise: ['Market Analysis', 'User Research', 'Business Strategy', 'ROI Analysis', 'Feature Prioritization'],
                iconClass: 'fas fa-chart-line',
                color: '#f59e0b'
            },
            {
                id: 'devops-engineer',
                name: 'DevOps Engineer',
                expertise: ['CI/CD', 'Cloud Infrastructure', 'Containerization', 'Monitoring', 'Deployment'],
                iconClass: 'fas fa-cloud',
                color: '#3b82f6'
            }
        ];

        res.json({
            success: true,
            personas
        });

    } catch (error) {
        logger.error('❌ Failed to get available personas', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get available personas'
        });
    }
});

// Conduct multi-persona consultation
router.post('/personas/consult', async (req, res) => {
    try {
        const { projectId, projectType, requirements, features, complexity, timeline, selectedPersonas } = req.body;
        
        logger.info('🧠 Conducting multi-persona consultation', { projectId, selectedPersonas });

        // For MVP, generate mock consultation results
        const consultationId = `consultation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const mockPersonaInsights = (selectedPersonas || ['frontend-architect', 'backend-engineer', 'security-expert']).map(personaId => {
            const personaTemplates = {
                'frontend-architect': {
                    name: 'Frontend Architect',
                    insights: [
                        `For ${projectType} projects, implementing a component-based architecture will improve maintainability`,
                        'Consider using Progressive Web App (PWA) features for better user engagement',
                        'Implement responsive design with mobile-first approach for optimal cross-device experience'
                    ],
                    recommendations: [
                        'Use modern CSS Grid and Flexbox for layout flexibility',
                        'Implement proper semantic HTML for accessibility compliance',
                        'Consider state management solution like Redux or Zustand for complex state',
                        'Plan for internationalization (i18n) if targeting global markets'
                    ],
                    risks: [
                        'Complex UI requirements may impact initial development timeline',
                        'Browser compatibility issues with older browsers',
                        'Performance challenges with large component trees'
                    ],
                    priority: 'critical',
                    confidence: 92
                },
                'backend-engineer': {
                    name: 'Backend Engineer',
                    insights: [
                        `${projectType} applications typically require robust data modeling and API design`,
                        'Consider microservices architecture for better scalability and maintainability',
                        'Database choice should align with data access patterns and consistency requirements'
                    ],
                    recommendations: [
                        'Implement RESTful API design with proper HTTP status codes',
                        'Use database migrations for schema version control',
                        'Consider caching strategies for frequently accessed data',
                        'Implement proper error handling and logging throughout the system'
                    ],
                    risks: [
                        'Data consistency challenges in distributed systems',
                        'API versioning complexity as the system evolves',
                        'Potential performance bottlenecks without proper indexing'
                    ],
                    priority: 'high',
                    confidence: 88
                },
                'security-expert': {
                    name: 'Security Expert',
                    insights: [
                        'Security considerations must be integrated from the beginning of development',
                        `${projectType} applications handle sensitive data requiring robust protection measures`,
                        'Regular security audits and penetration testing are essential'
                    ],
                    recommendations: [
                        'Implement OAuth 2.0 or similar for secure authentication',
                        'Use HTTPS everywhere and implement HSTS headers',
                        'Sanitize all user inputs to prevent XSS and injection attacks',
                        'Implement rate limiting to prevent abuse and DDoS attacks'
                    ],
                    risks: [
                        'Insufficient input validation leading to security vulnerabilities',
                        'Weak authentication mechanisms compromising user accounts',
                        'Data breaches due to inadequate encryption practices'
                    ],
                    priority: 'critical',
                    confidence: 95
                }
            };

            const template = personaTemplates[personaId] || {
                name: 'General Expert',
                insights: ['General analysis based on project requirements'],
                recommendations: ['Follow industry best practices for implementation'],
                risks: ['Consider standard project risks for this domain'],
                priority: 'medium',
                confidence: 75
            };

            return {
                personaId,
                personaName: template.name,
                insights: template.insights,
                recommendations: template.recommendations,
                risks: template.risks,
                priority: template.priority,
                confidence: template.confidence,
                estimatedImpact: template.priority === 'critical' ? 'Very High - Immediate attention required' : 'Medium-High - Important considerations'
            };
        });

        // Generate cross-persona analysis
        const agreements = [
            'Multiple experts agree: security should be prioritized from the start',
            'Performance optimization is crucial for user experience',
            'Scalable architecture design is essential for long-term success'
        ];

        const conflicts = [
            'Balance needed between security and performance priorities',
            'Trade-offs between development speed and code quality'
        ];

        const actionPlan = {
            immediate: [
                '[Security Expert] Implement OAuth 2.0 for secure authentication',
                '[Frontend Architect] Use modern CSS Grid and Flexbox for layout',
                '[Backend Engineer] Implement RESTful API design'
            ],
            shortTerm: [
                '[Security Expert] Use HTTPS everywhere and implement HSTS headers',
                '[Frontend Architect] Implement proper semantic HTML for accessibility',
                '[Backend Engineer] Use database migrations for schema version control'
            ],
            longTerm: [
                '[Frontend Architect] Plan for internationalization (i18n) if targeting global markets',
                '[Backend Engineer] Consider caching strategies for frequently accessed data',
                '[Security Expert] Regular security audits and penetration testing'
            ]
        };

        const riskMatrix = {
            technical: ['Performance challenges with large component trees', 'Data consistency challenges in distributed systems'],
            business: ['Complex UI requirements may impact initial development timeline'],
            operational: ['API versioning complexity as the system evolves'],
            security: ['Insufficient input validation leading to security vulnerabilities', 'Weak authentication mechanisms compromising user accounts']
        };

        const criticalFindings = mockPersonaInsights.filter(i => i.priority === 'critical').length;
        const averageConfidence = mockPersonaInsights.reduce((sum, i) => sum + i.confidence, 0) / mockPersonaInsights.length;

        const consultationResult = {
            projectId,
            consultationId,
            timestamp: new Date().toISOString(),
            summary: {
                totalPersonas: mockPersonaInsights.length,
                criticalFindings,
                highPriorityActions: mockPersonaInsights.filter(i => i.priority === 'high' || i.priority === 'critical').length,
                averageConfidence: Math.round(averageConfidence),
                consensusLevel: 85,
                estimatedSuccessProbability: 78
            },
            personaInsights: mockPersonaInsights,
            crossPersonaAnalysis: {
                agreements,
                conflicts,
                gaps: [],
                recommendations: ['Address all critical-priority items before proceeding', 'Prioritize high-confidence recommendations for quick wins']
            },
            actionPlan,
            riskMatrix
        };

        // Cache the consultation result
        activeProjects.set(projectId + '_consultation', consultationResult);

        res.json({
            success: true,
            consultation: consultationResult,
            message: `Multi-persona consultation completed with ${mockPersonaInsights.length} expert perspectives`
        });

    } catch (error) {
        logger.error('❌ Failed to conduct multi-persona consultation', error);
        res.status(500).json({
            success: false,
            error: 'Failed to conduct consultation',
            details: error.message
        });
    }
});

// Get consultation results
router.get('/personas/consultation/:projectId', (req, res) => {
    try {
        const { projectId } = req.params;
        
        const consultation = activeProjects.get(projectId + '_consultation');
        
        if (!consultation) {
            return res.status(404).json({
                success: false,
                error: 'Consultation not found'
            });
        }

        res.json({
            success: true,
            consultation
        });

    } catch (error) {
        logger.error('❌ Failed to get consultation results', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get consultation results'
        });
    }
});

// Export consultation report
router.get('/personas/consultation/:projectId/export', (req, res) => {
    try {
        const { projectId } = req.params;
        const format = req.query.format || 'markdown';
        
        const consultation = activeProjects.get(projectId + '_consultation');
        
        if (!consultation) {
            return res.status(404).json({
                success: false,
                error: 'Consultation not found'
            });
        }

        // Generate detailed report
        let report = `# Multi-Persona Consultation Report\n`;
        report += `**Project ID**: ${projectId}\n`;
        report += `**Consultation ID**: ${consultation.consultationId}\n`;
        report += `**Generated**: ${new Date(consultation.timestamp).toLocaleString()}\n\n`;

        // Executive Summary
        report += `## Executive Summary\n\n`;
        report += `- **Expert Personas Consulted**: ${consultation.summary.totalPersonas}\n`;
        report += `- **Critical Findings**: ${consultation.summary.criticalFindings}\n`;
        report += `- **High Priority Actions**: ${consultation.summary.highPriorityActions}\n`;
        report += `- **Average Confidence**: ${consultation.summary.averageConfidence}%\n`;
        report += `- **Expert Consensus**: ${consultation.summary.consensusLevel}%\n`;
        report += `- **Estimated Success Probability**: ${consultation.summary.estimatedSuccessProbability}%\n\n`;

        // Action Plan
        report += `## Recommended Action Plan\n\n`;
        
        if (consultation.actionPlan.immediate.length > 0) {
            report += `### Immediate Actions (Next 1-2 weeks)\n`;
            consultation.actionPlan.immediate.forEach(action => {
                report += `- ${action}\n`;
            });
            report += `\n`;
        }

        if (consultation.actionPlan.shortTerm.length > 0) {
            report += `### Short-term Actions (Next 1-2 months)\n`;
            consultation.actionPlan.shortTerm.forEach(action => {
                report += `- ${action}\n`;
            });
            report += `\n`;
        }

        if (consultation.actionPlan.longTerm.length > 0) {
            report += `### Long-term Considerations (3+ months)\n`;
            consultation.actionPlan.longTerm.forEach(action => {
                report += `- ${action}\n`;
            });
            report += `\n`;
        }

        // Individual Persona Insights
        report += `## Detailed Persona Insights\n\n`;
        consultation.personaInsights.forEach(insight => {
            report += `### ${insight.personaName}\n`;
            report += `**Priority**: ${insight.priority.toUpperCase()} | **Confidence**: ${insight.confidence}%\n\n`;
            
            report += `#### Key Insights\n`;
            insight.insights.forEach(item => report += `- ${item}\n`);
            report += `\n`;

            report += `#### Recommendations\n`;
            insight.recommendations.forEach(item => report += `- ${item}\n`);
            report += `\n`;

            report += `#### Risk Considerations\n`;
            insight.risks.forEach(item => report += `- ${item}\n`);
            report += `\n---\n\n`;
        });

        res.setHeader('Content-Disposition', `attachment; filename="consultation-report-${projectId}.md"`);
        res.setHeader('Content-Type', 'text/markdown');
        res.send(report);

    } catch (error) {
        logger.error('❌ Failed to export consultation report', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export consultation report'
        });
    }
});

/**
 * Advanced Project Templates endpoints
 */

// Get all templates with filtering
router.get('/templates', async (req, res) => {
    try {
        const { query, category, difficulty, tags, limit } = req.query;
        
        logger.info('📋 Fetching project templates', { query, category, difficulty });

        // For MVP, return mock template data
        const templates = [
            {
                id: 'ecommerce-jewelry',
                name: 'Jewelry E-commerce Store',
                description: 'Complete online store for handmade jewelry with product catalog, shopping cart, and payment processing',
                category: 'ecommerce',
                difficulty: 'intermediate',
                estimatedTime: '6-8 weeks',
                popularity: 95,
                tags: ['ecommerce', 'jewelry', 'handmade', 'stripe', 'inventory'],
                preview: {
                    thumbnail: '/templates/jewelry-ecommerce.jpg',
                    features: ['Product Catalog', 'Shopping Cart', 'User Accounts', 'Payment Processing', 'Order Tracking', 'Reviews'],
                    techStack: ['React', 'Node.js', 'Stripe', 'PostgreSQL', 'AWS S3']
                }
            },
            {
                id: 'saas-project-management',
                name: 'Project Management SaaS',
                description: 'Modern project management platform with team collaboration, task tracking, and reporting features',
                category: 'saas',
                difficulty: 'advanced',
                estimatedTime: '12-16 weeks',
                popularity: 88,
                tags: ['saas', 'project-management', 'collaboration', 'dashboard', 'analytics'],
                preview: {
                    thumbnail: '/templates/saas-pm.jpg',
                    features: ['Task Management', 'Team Collaboration', 'Time Tracking', 'Reports & Analytics', 'File Sharing', 'Integrations'],
                    techStack: ['React', 'Node.js', 'PostgreSQL', 'Redis', 'WebSocket', 'AWS']
                }
            },
            {
                id: 'landing-product-launch',
                name: 'Product Launch Landing Page',
                description: 'High-converting landing page for new product launches with email capture and social proof',
                category: 'landing',
                difficulty: 'beginner',
                estimatedTime: '1-2 weeks',
                popularity: 92,
                tags: ['landing-page', 'conversion', 'product-launch', 'marketing', 'lead-generation'],
                preview: {
                    thumbnail: '/templates/landing-product.jpg',
                    features: ['Hero Section', 'Feature Highlights', 'Social Proof', 'Email Capture', 'Countdown Timer', 'FAQ'],
                    techStack: ['HTML', 'CSS', 'JavaScript', 'Tailwind CSS', 'Analytics']
                }
            },
            {
                id: 'portfolio-creative',
                name: 'Creative Portfolio',
                description: 'Stunning portfolio website for designers, photographers, and creative professionals',
                category: 'portfolio',
                difficulty: 'beginner',
                estimatedTime: '2-3 weeks',
                popularity: 85,
                tags: ['portfolio', 'creative', 'photography', 'design', 'showcase'],
                preview: {
                    thumbnail: '/templates/portfolio-creative.jpg',
                    features: ['Gallery Showcase', 'About Section', 'Contact Form', 'Blog', 'Client Testimonials', 'Mobile Responsive'],
                    techStack: ['HTML', 'CSS', 'JavaScript', 'jQuery', 'Lightbox']
                }
            },
            {
                id: 'blog-lifestyle',
                name: 'Lifestyle Blog',
                description: 'Modern blog platform for lifestyle, travel, and personal content with SEO optimization',
                category: 'blog',
                difficulty: 'intermediate',
                estimatedTime: '4-6 weeks',
                popularity: 78,
                tags: ['blog', 'lifestyle', 'travel', 'seo', 'content-management'],
                preview: {
                    thumbnail: '/templates/blog-lifestyle.jpg',
                    features: ['Article Management', 'Categories & Tags', 'Search Functionality', 'Newsletter Signup', 'Social Sharing', 'Comments'],
                    techStack: ['WordPress', 'PHP', 'MySQL', 'SEO Tools']
                }
            },
            {
                id: 'marketplace-services',
                name: 'Service Marketplace',
                description: 'Two-sided marketplace connecting service providers with customers, including booking and payments',
                category: 'marketplace',
                difficulty: 'advanced',
                estimatedTime: '16-20 weeks',
                popularity: 82,
                tags: ['marketplace', 'services', 'booking', 'payments', 'reviews'],
                preview: {
                    thumbnail: '/templates/marketplace-services.jpg',
                    features: ['Provider Profiles', 'Service Listings', 'Booking System', 'Payment Processing', 'Reviews & Ratings', 'Messaging'],
                    techStack: ['React', 'Node.js', 'PostgreSQL', 'Stripe Connect', 'Socket.io']
                }
            }
        ];

        // Apply filtering
        let filteredTemplates = templates;

        if (query) {
            filteredTemplates = filteredTemplates.filter(template =>
                template.name.toLowerCase().includes(query.toLowerCase()) ||
                template.description.toLowerCase().includes(query.toLowerCase()) ||
                template.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
            );
        }

        if (category) {
            filteredTemplates = filteredTemplates.filter(template => template.category === category);
        }

        if (difficulty) {
            filteredTemplates = filteredTemplates.filter(template => template.difficulty === difficulty);
        }

        if (limit) {
            filteredTemplates = filteredTemplates.slice(0, parseInt(limit));
        }

        // Get categories for sidebar
        const categories = [
            { category: 'E-commerce', count: 1, icon: 'fas fa-shopping-cart' },
            { category: 'SaaS', count: 1, icon: 'fas fa-cloud' },
            { category: 'Landing', count: 1, icon: 'fas fa-rocket' },
            { category: 'Portfolio', count: 1, icon: 'fas fa-camera' },
            { category: 'Blog', count: 1, icon: 'fas fa-blog' },
            { category: 'Marketplace', count: 1, icon: 'fas fa-store' }
        ];

        res.json({
            success: true,
            templates: filteredTemplates,
            categories,
            total: filteredTemplates.length
        });

    } catch (error) {
        logger.error('❌ Failed to get templates', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get templates',
            details: error.message
        });
    }
});

// Get popular templates
router.get('/templates/popular', async (req, res) => {
    try {
        logger.info('🔥 Fetching popular templates');

        const popularTemplates = [
            {
                id: 'ecommerce-jewelry',
                name: 'Jewelry E-commerce Store',
                popularity: 95,
                category: 'ecommerce',
                estimatedTime: '6-8 weeks'
            },
            {
                id: 'landing-product-launch',
                name: 'Product Launch Landing Page',
                popularity: 92,
                category: 'landing',
                estimatedTime: '1-2 weeks'
            },
            {
                id: 'saas-project-management',
                name: 'Project Management SaaS',
                popularity: 88,
                category: 'saas',
                estimatedTime: '12-16 weeks'
            }
        ];

        res.json({
            success: true,
            templates: popularTemplates
        });

    } catch (error) {
        logger.error('❌ Failed to get popular templates', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get popular templates'
        });
    }
});

// Get template by ID
router.get('/templates/:templateId', async (req, res) => {
    try {
        const { templateId } = req.params;
        
        logger.info('📋 Fetching template details', { templateId });

        // For MVP, return detailed template data
        const templateDetails = {
            'ecommerce-jewelry': {
                id: 'ecommerce-jewelry',
                name: 'Jewelry E-commerce Store',
                description: 'Complete online store for handmade jewelry with product catalog, shopping cart, and payment processing',
                category: 'ecommerce',
                difficulty: 'intermediate',
                estimatedTime: '6-8 weeks',
                popularity: 95,
                tags: ['ecommerce', 'jewelry', 'handmade', 'stripe', 'inventory'],
                preview: {
                    thumbnail: '/templates/jewelry-ecommerce.jpg',
                    features: ['Product Catalog', 'Shopping Cart', 'User Accounts', 'Payment Processing', 'Order Tracking', 'Reviews'],
                    techStack: ['React', 'Node.js', 'Stripe', 'PostgreSQL', 'AWS S3']
                },
                template: {
                    projectType: 'ecommerce',
                    prefilledAnswers: [
                        {
                            questionId: 'target-audience',
                            answer: 'Jewelry enthusiasts and fashion-conscious consumers aged 25-45 who appreciate unique, handmade pieces'
                        },
                        {
                            questionId: 'essential-features',
                            answer: 'Product catalog with high-quality images, secure shopping cart, user accounts, payment processing via Stripe, order tracking, customer reviews, and wishlist functionality'
                        }
                    ],
                    marketingCopy: {
                        headlines: ['Unique Handmade Jewelry for Every Occasion', 'Discover One-of-a-Kind Artisan Pieces'],
                        taglines: ['Crafted with Love, Worn with Pride', 'Where Art Meets Jewelry'],
                        valuePropositions: ['100% Handmade Quality', 'Unique Designs You Won\'t Find Anywhere Else', 'Ethically Sourced Materials']
                    }
                }
            }
        };

        const template = templateDetails[templateId];
        
        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Template not found'
            });
        }

        res.json({
            success: true,
            template
        });

    } catch (error) {
        logger.error('❌ Failed to get template', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get template'
        });
    }
});

// Apply template for quick-start
router.post('/templates/apply', async (req, res) => {
    try {
        const { templateId, customizations, skipSteps, autoGenerate } = req.body;
        
        logger.info('🚀 Applying template for quick-start', { templateId, customizations });

        // Generate project ID
        const projectId = `template-project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // For MVP, create mock project data based on template
        const projectData = {
            id: projectId,
            templateId,
            templateName: templateId === 'ecommerce-jewelry' ? 'Jewelry E-commerce Store' : 'Template Project',
            projectType: templateId.includes('ecommerce') ? 'ecommerce' : 'website',
            createdAt: new Date().toISOString(),
            createdFrom: 'template',
            templateApplied: true,
            status: 'template-applied',
            customizations,
            skipSteps: skipSteps || [],
            autoGenerate: autoGenerate || false,
            
            // Pre-filled based on template
            questions: [
                {
                    id: 'target-audience',
                    question: 'Who is your target audience?',
                    category: 'business'
                },
                {
                    id: 'essential-features',
                    question: 'What are the essential features for your project?',
                    category: 'features'
                }
            ],
            
            answers: [
                `${customizations.targetAudience || 'Target audience'} interested in ${customizations.businessName || 'the business'} products and services`,
                `Essential features for ${customizations.businessName || 'the project'} including core functionality and user experience elements`
            ]
        };

        // Store project data
        activeProjects.set(projectId, projectData);

        res.json({
            success: true,
            projectData,
            projectId,
            message: `Template "${projectData.templateName}" applied successfully. Project ready for customization.`
        });

    } catch (error) {
        logger.error('❌ Failed to apply template', error);
        res.status(500).json({
            success: false,
            error: 'Failed to apply template',
            details: error.message
        });
    }
});

// Get template recommendations
router.post('/templates/recommend', async (req, res) => {
    try {
        const { userInput } = req.body;
        
        logger.info('🎯 Getting template recommendations', { userInputLength: userInput?.length });

        if (!userInput || userInput.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'User input is required'
            });
        }

        // Simple keyword-based recommendations for MVP
        const input = userInput.toLowerCase();
        const allTemplates = [
            { id: 'ecommerce-jewelry', name: 'Jewelry E-commerce Store', keywords: ['store', 'shop', 'ecommerce', 'jewelry', 'sell', 'products'] },
            { id: 'saas-project-management', name: 'Project Management SaaS', keywords: ['saas', 'project', 'management', 'collaboration', 'team', 'tasks'] },
            { id: 'landing-product-launch', name: 'Product Launch Landing Page', keywords: ['landing', 'launch', 'marketing', 'page', 'conversion'] },
            { id: 'portfolio-creative', name: 'Creative Portfolio', keywords: ['portfolio', 'creative', 'design', 'photography', 'showcase'] },
            { id: 'blog-lifestyle', name: 'Lifestyle Blog', keywords: ['blog', 'lifestyle', 'content', 'writing', 'articles'] }
        ];

        const recommendations = allTemplates
            .map(template => ({
                ...template,
                score: template.keywords.reduce((score, keyword) => 
                    input.includes(keyword) ? score + 1 : score, 0
                )
            }))
            .filter(template => template.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(({ keywords, score, ...template }) => template);

        res.json({
            success: true,
            recommendations,
            userInput
        });

    } catch (error) {
        logger.error('❌ Failed to get template recommendations', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get template recommendations'
        });
    }
});

/**
 * Project versioning and iteration tracking endpoints
 */

// Create initial version for a project
router.post('/versions/create-initial', async (req, res) => {
    try {
        const { projectId, projectData, createdBy, title } = req.body;
        
        const version = versionManager.createInitialVersion(
            projectId,
            projectData,
            createdBy,
            title
        );
        
        res.json({
            success: true,
            version: {
                id: version.id,
                versionNumber: version.versionNumber,
                title: version.title,
                createdAt: version.createdAt,
                isCurrentVersion: version.isCurrentVersion
            }
        });
    } catch (error) {
        logger.error('❌ Failed to create initial version', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create initial version'
        });
    }
});

// Create new version from changes
router.post('/versions/create', async (req, res) => {
    try {
        const { projectId, projectData, changeDescription, createdBy, iterationType, parentVersionId } = req.body;
        
        const version = versionManager.createVersion(
            projectId,
            projectData,
            changeDescription,
            createdBy,
            iterationType,
            parentVersionId
        );
        
        res.json({
            success: true,
            version: {
                id: version.id,
                versionNumber: version.versionNumber,
                title: version.title,
                description: version.description,
                createdAt: version.createdAt,
                changelog: version.changelog,
                confidence: version.metadata.confidence,
                approvalStatus: version.metadata.approvalStatus
            }
        });
    } catch (error) {
        logger.error('❌ Failed to create version', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create version'
        });
    }
});

// Get all versions for a project
router.get('/versions/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const versions = versionManager.getProjectVersions(projectId);
        
        const versionSummaries = versions.map(version => ({
            id: version.id,
            versionNumber: version.versionNumber,
            title: version.title,
            description: version.description,
            createdAt: version.createdAt,
            createdBy: version.createdBy,
            isCurrentVersion: version.isCurrentVersion,
            branchName: version.branchName,
            tags: version.tags,
            iterationType: version.metadata.iterationType,
            confidence: version.metadata.confidence,
            approvalStatus: version.metadata.approvalStatus,
            changeCount: version.changelog.length
        }));
        
        res.json({
            success: true,
            versions: versionSummaries,
            totalVersions: versions.length
        });
    } catch (error) {
        logger.error('❌ Failed to get project versions', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get project versions'
        });
    }
});

// Get current version for a project
router.get('/versions/:projectId/current', async (req, res) => {
    try {
        const { projectId } = req.params;
        const currentVersion = versionManager.getCurrentVersion(projectId);
        
        if (!currentVersion) {
            return res.status(404).json({
                success: false,
                error: 'No current version found for project'
            });
        }
        
        res.json({
            success: true,
            version: currentVersion
        });
    } catch (error) {
        logger.error('❌ Failed to get current version', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get current version'
        });
    }
});

// Get specific version by ID
router.get('/versions/by-id/:versionId', async (req, res) => {
    try {
        const { versionId } = req.params;
        const version = versionManager.getVersion(versionId);
        
        if (!version) {
            return res.status(404).json({
                success: false,
                error: 'Version not found'
            });
        }
        
        res.json({
            success: true,
            version
        });
    } catch (error) {
        logger.error('❌ Failed to get version', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get version'
        });
    }
});

// Rollback to a specific version
router.post('/versions/rollback', async (req, res) => {
    try {
        const { projectId, targetVersionId, rollbackBy } = req.body;
        
        const result = versionManager.rollbackToVersion(projectId, targetVersionId, rollbackBy);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        res.json(result);
    } catch (error) {
        logger.error('❌ Failed to rollback version', error);
        res.status(500).json({
            success: false,
            error: 'Failed to rollback version'
        });
    }
});

// Create a new branch
router.post('/versions/branch', async (req, res) => {
    try {
        const { versionId, branchName, createdBy, description } = req.body;
        
        const branchVersion = versionManager.createBranch(versionId, branchName, createdBy, description);
        
        if (!branchVersion) {
            return res.status(404).json({
                success: false,
                error: 'Source version not found'
            });
        }
        
        res.json({
            success: true,
            branchVersion: {
                id: branchVersion.id,
                versionNumber: branchVersion.versionNumber,
                branchName: branchVersion.branchName,
                title: branchVersion.title,
                createdAt: branchVersion.createdAt
            }
        });
    } catch (error) {
        logger.error('❌ Failed to create branch', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create branch'
        });
    }
});

// Compare two versions
router.post('/versions/compare', async (req, res) => {
    try {
        const { versionAId, versionBId } = req.body;
        
        const comparison = versionManager.compareVersions(versionAId, versionBId);
        
        if (!comparison) {
            return res.status(404).json({
                success: false,
                error: 'One or both versions not found'
            });
        }
        
        res.json({
            success: true,
            comparison
        });
    } catch (error) {
        logger.error('❌ Failed to compare versions', error);
        res.status(500).json({
            success: false,
            error: 'Failed to compare versions'
        });
    }
});

// Get version tree for visualization
router.get('/versions/:projectId/tree', async (req, res) => {
    try {
        const { projectId } = req.params;
        const tree = versionManager.getVersionTree(projectId);
        
        res.json({
            success: true,
            tree
        });
    } catch (error) {
        logger.error('❌ Failed to get version tree', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get version tree'
        });
    }
});

// Create iteration plan
router.post('/iterations/create', async (req, res) => {
    try {
        const { projectId, title, description, targetVersion, plannedChanges, timeline } = req.body;
        
        const plan = versionManager.createIterationPlan(
            projectId,
            title,
            description,
            targetVersion,
            plannedChanges,
            timeline
        );
        
        res.json({
            success: true,
            plan: {
                id: plan.id,
                title: plan.title,
                description: plan.description,
                targetVersion: plan.targetVersion,
                status: plan.status,
                timeline: plan.timeline,
                resources: plan.resources,
                plannedChanges: plan.plannedChanges.length
            }
        });
    } catch (error) {
        logger.error('❌ Failed to create iteration plan', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create iteration plan'
        });
    }
});

// Get iteration plans for a project
router.get('/iterations/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const plans = versionManager.getIterationPlans(projectId);
        
        const planSummaries = plans.map(plan => ({
            id: plan.id,
            title: plan.title,
            description: plan.description,
            targetVersion: plan.targetVersion,
            status: plan.status,
            timeline: plan.timeline,
            resources: plan.resources,
            plannedChangesCount: plan.plannedChanges.length,
            risksCount: plan.risks.length
        }));
        
        res.json({
            success: true,
            plans: planSummaries,
            totalPlans: plans.length
        });
    } catch (error) {
        logger.error('❌ Failed to get iteration plans', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get iteration plans'
        });
    }
});

// Update iteration plan status
router.patch('/iterations/:planId/status', async (req, res) => {
    try {
        const { planId } = req.params;
        const { status, completedMilestones } = req.body;
        
        const success = versionManager.updateIterationStatus(planId, status, completedMilestones);
        
        if (!success) {
            return res.status(404).json({
                success: false,
                error: 'Iteration plan not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Iteration status updated successfully'
        });
    } catch (error) {
        logger.error('❌ Failed to update iteration status', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update iteration status'
        });
    }
});

/**
 * Advanced Analytics Dashboard endpoints
 */

// Get comprehensive analytics dashboard
router.get('/analytics/dashboard', async (req, res) => {
    try {
        const { dateRange = 30 } = req.query;
        const dashboard = await analyticsDashboard.generateDashboard(parseInt(dateRange));
        
        res.json({
            success: true,
            dashboard,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        logger.error('❌ Failed to generate analytics dashboard', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate analytics dashboard'
        });
    }
});

// Record project creation for analytics
router.post('/analytics/project-created', async (req, res) => {
    try {
        const { projectData } = req.body;
        const metrics = await analyticsDashboard.recordProjectCreation(projectData);
        
        res.json({
            success: true,
            metrics
        });
    } catch (error) {
        logger.error('❌ Failed to record project creation analytics', error);
        res.status(500).json({
            success: false,
            error: 'Failed to record project creation analytics'
        });
    }
});

// Record phase completion
router.post('/analytics/phase-completed', async (req, res) => {
    try {
        const { projectId, phase, duration, quality } = req.body;
        const metrics = await analyticsDashboard.recordPhaseCompletion(projectId, phase, duration, quality);
        
        res.json({
            success: true,
            metrics
        });
    } catch (error) {
        logger.error('❌ Failed to record phase completion', error);
        res.status(500).json({
            success: false,
            error: 'Failed to record phase completion'
        });
    }
});

// Record user interaction
router.post('/analytics/interaction', async (req, res) => {
    try {
        const { projectId, interaction } = req.body;
        await analyticsDashboard.recordUserInteraction(projectId, interaction);
        
        res.json({
            success: true,
            message: 'Interaction recorded successfully'
        });
    } catch (error) {
        logger.error('❌ Failed to record user interaction', error);
        res.status(500).json({
            success: false,
            error: 'Failed to record user interaction'
        });
    }
});

// Get project analytics
router.get('/analytics/projects/:dateRange?', async (req, res) => {
    try {
        const { dateRange = 30 } = req.params;
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - (parseInt(dateRange) * 24 * 60 * 60 * 1000));
        
        const projectAnalytics = await analyticsDashboard.generateProjectAnalytics(startDate, endDate);
        
        res.json({
            success: true,
            analytics: projectAnalytics,
            dateRange: parseInt(dateRange)
        });
    } catch (error) {
        logger.error('❌ Failed to get project analytics', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get project analytics'
        });
    }
});

// Get user engagement metrics
router.get('/analytics/engagement/:dateRange?', async (req, res) => {
    try {
        const { dateRange = 30 } = req.params;
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - (parseInt(dateRange) * 24 * 60 * 60 * 1000));
        
        const engagement = await analyticsDashboard.generateUserEngagement(startDate, endDate);
        
        res.json({
            success: true,
            engagement,
            dateRange: parseInt(dateRange)
        });
    } catch (error) {
        logger.error('❌ Failed to get engagement metrics', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get engagement metrics'
        });
    }
});

// Get feature adoption analytics
router.get('/analytics/features/:dateRange?', async (req, res) => {
    try {
        const { dateRange = 30 } = req.params;
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - (parseInt(dateRange) * 24 * 60 * 60 * 1000));
        
        const featureAdoption = await analyticsDashboard.generateFeatureAdoption(startDate, endDate);
        
        res.json({
            success: true,
            featureAdoption,
            dateRange: parseInt(dateRange)
        });
    } catch (error) {
        logger.error('❌ Failed to get feature adoption analytics', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get feature adoption analytics'
        });
    }
});

// Get performance metrics
router.get('/analytics/performance', async (req, res) => {
    try {
        const { dateRange = 30 } = req.query;
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - (parseInt(dateRange) * 24 * 60 * 60 * 1000));
        
        const performance = await analyticsDashboard.generatePerformanceMetrics(startDate, endDate);
        
        res.json({
            success: true,
            performance
        });
    } catch (error) {
        logger.error('❌ Failed to get performance metrics', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get performance metrics'
        });
    }
});

// Get AI-generated insights
router.get('/analytics/insights/:dateRange?', async (req, res) => {
    try {
        const { dateRange = 30 } = req.params;
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - (parseInt(dateRange) * 24 * 60 * 60 * 1000));
        
        const insights = await analyticsDashboard.generateInsights(startDate, endDate);
        
        res.json({
            success: true,
            insights,
            dateRange: parseInt(dateRange)
        });
    } catch (error) {
        logger.error('❌ Failed to get insights', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get insights'
        });
    }
});

// Get recommendations
router.get('/analytics/recommendations', async (req, res) => {
    try {
        const recommendations = await analyticsDashboard.generateRecommendations();
        
        res.json({
            success: true,
            recommendations
        });
    } catch (error) {
        logger.error('❌ Failed to get recommendations', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get recommendations'
        });
    }
});

// Export analytics data
router.get('/analytics/export', async (req, res) => {
    try {
        const { format = 'json', dateRange = 30 } = req.query;
        const data = await analyticsDashboard.exportAnalytics(format, parseInt(dateRange));
        
        const filename = `analytics-${new Date().toISOString().split('T')[0]}.${format}`;
        
        if (format === 'json') {
            res.setHeader('Content-Type', 'application/json');
        } else if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
        }
        
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(data);
    } catch (error) {
        logger.error('❌ Failed to export analytics', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export analytics'
        });
    }
});

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        services: {
            questioner: !!questioner,
            prdService: !!prdService,
            wireframeService: !!wireframeService,
            marketEngine: !!marketEngine,
            intelligenceService: !!intelligenceService,
            analytics: !!analytics
        },
        activeSessions: activeSessions.size,
        activeProjects: activeProjects.size,
        timestamp: new Date().toISOString()
    });
});

module.exports = router;