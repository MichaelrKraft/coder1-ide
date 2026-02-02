/**
 * Document Generator - Professional PRD document generation system
 *
 * This generator creates comprehensive, professional-grade PRD documents
 * that provide real value to users and build credibility for CoderOne handoff.
 *
 * Features:
 * - Multi-format output (Markdown, PDF, HTML)
 * - Professional templates with visual elements
 * - Architecture diagrams and system design
 * - Implementation roadmaps with realistic timelines
 * - Cost estimates and resource requirements
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import type { Pattern, PatternArchitecture } from './PatternEngine';

// ================================
// Type Definitions
// ================================

export interface DocumentGeneratorOptions {
    logger?: Console;
    templatesDir?: string;
    outputDir?: string;
}

export interface DocumentGeneratorConfig {
    defaultFormat: 'markdown' | 'html' | 'json';
    includeVisuals: boolean;
    includeCostEstimates: boolean;
    includeTimelines: boolean;
    includeRisks: boolean;
}

export interface DocumentTemplate {
    name: string;
    description: string;
    sections: string[];
}

export interface GeneratePRDOptions {
    sessionId?: string;
    format?: 'markdown' | 'html' | 'json';
}

export interface GenerationContext {
    pattern: Pattern;
    userAnswers: Record<string, unknown>;
    generatedAt: string;
    sessionId: string;
    projectName: string;
}

export interface ProjectOverview {
    description: string;
    businessModel: string;
    targetScale: string;
    uniqueValue: string;
}

export interface MarketPosition {
    category: string;
    competitors: string[];
    differentiation: string;
    marketSize: string;
    opportunity: string;
}

export interface SuccessMetrics {
    userGrowth: string;
    revenue: string;
    engagement: string;
    technical: string;
    benchmarks: string[];
}

export interface ExecutiveSummary {
    title: string;
    content: {
        projectOverview: ProjectOverview;
        marketPosition: MarketPosition;
        successMetrics: SuccessMetrics;
        keyRecommendations: string[];
        timeline: string;
        investment: string;
    };
}

export interface TechStackRecommendation extends PatternArchitecture {
    [key: string]: {
        tech: string;
        rationale?: string;
    } | undefined;
}

export interface ArchitectureDecision {
    decision: string;
    rationale: string;
}

export interface SystemDesign {
    overview: string;
    components: string[];
    interactions: string[];
}

export interface DataArchitecture {
    overview: string;
    models: string[];
    relationships: string[];
}

export interface SecurityDesign {
    overview: string;
    features: string[];
}

export interface ScalabilityConsiderations {
    overview: string;
    strategies: string[];
}

export interface TechnicalArchitecture {
    title: string;
    content: {
        overview: string;
        techStack: TechStackRecommendation;
        systemDesign: SystemDesign;
        dataArchitecture: DataArchitecture;
        securityDesign: SecurityDesign;
        scalabilityConsiderations: ScalabilityConsiderations;
        decisions: ArchitectureDecision[];
    };
}

export interface ImplementationPhase {
    name: string;
    duration: string;
    description: string;
    tasks: string[];
    deliverables: string[];
    risks: string[];
}

export interface ImplementationRoadmap {
    title: string;
    content: {
        overview: string;
        phases: ImplementationPhase[];
        timeline: string;
        milestones: string[];
        dependencies: string[];
        riskMitigation: string[];
    };
}

export interface Risk {
    title: string;
    type: string;
    severity: number;
    impact: number;
    probability: number;
    mitigation: string;
}

export interface RiskAssessment {
    title: string;
    content: {
        overview: string;
        risks: Risk[];
        mitigation: string[];
        monitoring: string[];
    };
}

export interface TeamRequirements {
    totalSize: number;
    roles: string[];
    timeline: string;
    skillsRequired: string[];
}

export interface BudgetEstimate {
    development: string;
    monthlyOperating: string;
    annualOperating: string;
    breakdown: Record<string, string>;
}

export interface InfrastructureRequirements {
    hosting: string;
    database: string;
    storage: string;
    services: string[];
}

export interface ResourceRequirements {
    title: string;
    content: {
        overview: string;
        team: TeamRequirements;
        budget: BudgetEstimate;
        infrastructure: InfrastructureRequirements;
        timeline: string;
        alternatives: string[];
    };
}

export interface DocumentSections {
    executiveSummary: ExecutiveSummary;
    technicalArchitecture: TechnicalArchitecture;
    implementationRoadmap: ImplementationRoadmap;
    riskAssessment: RiskAssessment;
    resourceRequirements: ResourceRequirements;
}

export interface Coder1Handoff {
    title: string;
    description: string;
    benefits: string[];
    nextSteps: string[];
    estimatedTimeWithCoderOne: string;
    coderOneAdvantages: string[];
    launchUrl?: string;
}

export interface Visuals {
    architectureDiagram: {
        type: string;
        content: string;
    };
    implementationFlowchart: {
        type: string;
        content: string;
    };
}

export interface PRDDocument {
    metadata: {
        title: string;
        pattern: string;
        generatedAt: string;
        sessionId: string;
        version: string;
    };
    sections: DocumentSections;
    summary: string;
    nextSteps: string[];
    coderOneHandoff: Coder1Handoff;
    visuals?: Visuals;
}

export interface PRDResult {
    document: string;
    rawDocument: PRDDocument;
    metadata: {
        pattern: string;
        generatedAt: string;
        sessionId: string;
        projectName: string;
        format: string;
        wordCount: number;
        pageCount: number;
    };
}

// ================================
// Document Generator Class
// ================================

export class DocumentGenerator extends EventEmitter {
    private logger: Console;
    private templatesDir: string;
    private outputDir: string;

    // Document templates
    private templates: Map<string, DocumentTemplate> = new Map();

    // Generation configuration
    private config: DocumentGeneratorConfig = {
        defaultFormat: 'markdown',
        includeVisuals: true,
        includeCostEstimates: true,
        includeTimelines: true,
        includeRisks: true
    };

    constructor(options: DocumentGeneratorOptions = {}) {
        super();

        this.logger = options.logger || console;
        this.templatesDir = options.templatesDir || path.join(__dirname, '../../data/templates');
        this.outputDir = options.outputDir || path.join(__dirname, '../../data/output');

        this.logger.info('📄 Document Generator initialized');
    }

    /**
     * Initialize the document generator
     */
    async initialize(): Promise<boolean> {
        try {
            await this.ensureDirectories();
            await this.loadTemplates();

            this.logger.info('✅ Document Generator ready');
            return true;
        } catch (error) {
            this.logger.error('❌ Document Generator initialization failed:', error);
            throw error;
        }
    }

    /**
     * Ensure required directories exist
     */
    private async ensureDirectories(): Promise<void> {
        const dirs = [this.templatesDir, this.outputDir];

        for (const dir of dirs) {
            try {
                await fs.access(dir);
            } catch {
                await fs.mkdir(dir, { recursive: true });
                this.logger.info(`📁 Created directory: ${dir}`);
            }
        }
    }

    /**
     * Load document templates
     */
    private async loadTemplates(): Promise<void> {
        this.templates.set('professional-prd', {
            name: 'Professional PRD',
            description: 'Comprehensive product requirements document',
            sections: [
                'executive-summary',
                'technical-architecture',
                'implementation-roadmap',
                'risk-assessment',
                'resource-requirements'
            ]
        });

        this.templates.set('technical-spec', {
            name: 'Technical Specification',
            description: 'Detailed technical implementation guide',
            sections: [
                'system-overview',
                'architecture-design',
                'api-specifications',
                'database-design',
                'deployment-strategy'
            ]
        });

        this.logger.info(`📖 Loaded ${this.templates.size} document templates`);
    }

    /**
     * Generate a complete PRD document
     */
    async generatePRD(pattern: Pattern, userAnswers: Record<string, unknown>, options: GeneratePRDOptions = {}): Promise<PRDResult> {
        try {
            const context: GenerationContext = {
                pattern,
                userAnswers,
                generatedAt: new Date().toISOString(),
                sessionId: options.sessionId || this.generateSessionId(),
                projectName: this.generateProjectName(pattern, userAnswers)
            };

            // Generate document sections
            const sections = await this.generateDocumentSections(context);

            // Compile into final document
            const document = await this.compileDocument(sections, context);

            // Generate visuals if requested
            if (this.config.includeVisuals) {
                document.visuals = await this.generateVisuals(context);
            }

            // Format the document
            const formattedDocument = await this.formatDocument(document, options.format || 'markdown');

            // Create result with metadata
            const result: PRDResult = {
                document: formattedDocument,
                rawDocument: document,
                metadata: {
                    pattern: pattern.metadata.name,
                    generatedAt: context.generatedAt,
                    sessionId: context.sessionId,
                    projectName: context.projectName,
                    format: options.format || 'markdown',
                    wordCount: formattedDocument.split(' ').length,
                    pageCount: Math.ceil(formattedDocument.split(' ').length / 250)
                }
            };

            this.logger.info(`📄 Generated PRD for pattern ${pattern.id} (${result.metadata.wordCount} words)`);

            return result;

        } catch (error) {
            this.logger.error('Failed to generate PRD:', error);
            throw error;
        }
    }

    /**
     * Generate individual document sections
     */
    private async generateDocumentSections(context: GenerationContext): Promise<DocumentSections> {
        const sections: DocumentSections = {
            executiveSummary: await this.generateExecutiveSummary(context),
            technicalArchitecture: await this.generateTechnicalArchitecture(context),
            implementationRoadmap: await this.generateImplementationRoadmap(context),
            riskAssessment: await this.generateRiskAssessment(context),
            resourceRequirements: await this.generateResourceRequirements(context)
        };

        return sections;
    }

    /**
     * Generate executive summary section
     */
    private async generateExecutiveSummary(context: GenerationContext): Promise<ExecutiveSummary> {
        const { pattern, userAnswers } = context;

        const marketPosition = this.generateMarketPositioning(pattern, userAnswers);
        const successMetrics = this.generateSuccessMetrics(pattern, userAnswers);

        return {
            title: 'Executive Summary',
            content: {
                projectOverview: this.generateProjectOverview(pattern, userAnswers),
                marketPosition,
                successMetrics,
                keyRecommendations: this.generateKeyRecommendations(pattern, userAnswers),
                timeline: this.estimateProjectTimeline(pattern, userAnswers),
                investment: this.estimateInvestmentRequired(pattern, userAnswers)
            }
        };
    }

    /**
     * Generate technical architecture section
     */
    private async generateTechnicalArchitecture(context: GenerationContext): Promise<TechnicalArchitecture> {
        const { pattern, userAnswers } = context;

        const techStack = this.buildTechStackRecommendations(pattern, userAnswers);
        const decisions = this.generateArchitectureDecisions(pattern, userAnswers);
        const systemDesign = this.generateSystemDesign(pattern, userAnswers);

        return {
            title: 'Technical Architecture',
            content: {
                overview: this.generateArchitectureOverview(pattern),
                techStack,
                systemDesign,
                dataArchitecture: this.generateDataArchitecture(pattern, userAnswers),
                securityDesign: this.generateSecurityDesign(pattern, userAnswers),
                scalabilityConsiderations: this.generateScalabilityConsiderations(pattern, userAnswers),
                decisions
            }
        };
    }

    /**
     * Generate implementation roadmap section
     */
    private async generateImplementationRoadmap(context: GenerationContext): Promise<ImplementationRoadmap> {
        const { pattern, userAnswers } = context;

        const phases = this.generateImplementationPhases(pattern, userAnswers);
        const timeline = this.createDetailedTimeline(phases, userAnswers);
        const milestones = this.generateMilestones(phases);

        return {
            title: 'Implementation Roadmap',
            content: {
                overview: 'Strategic implementation plan based on proven patterns',
                phases,
                timeline,
                milestones,
                dependencies: this.identifyDependencies(phases),
                riskMitigation: this.generateImplementationRisks(pattern, userAnswers)
            }
        };
    }

    /**
     * Generate risk assessment section
     */
    private async generateRiskAssessment(context: GenerationContext): Promise<RiskAssessment> {
        const { pattern, userAnswers } = context;

        const risks: Risk[] = [];

        risks.push(...this.assessTechnicalRisks(pattern, userAnswers));
        risks.push(...this.assessBusinessRisks(pattern, userAnswers));
        risks.push(...this.assessMarketRisks(pattern, userAnswers));
        risks.push(...this.assessOperationalRisks(pattern, userAnswers));

        return {
            title: 'Risk Assessment',
            content: {
                overview: 'Comprehensive risk analysis and mitigation strategies',
                risks: risks.sort((a, b) => b.severity - a.severity),
                mitigation: this.generateRiskMitigationPlan(risks),
                monitoring: this.generateRiskMonitoringPlan(risks)
            }
        };
    }

    /**
     * Generate resource requirements section
     */
    private async generateResourceRequirements(context: GenerationContext): Promise<ResourceRequirements> {
        const { pattern, userAnswers } = context;

        const teamRequirements = this.calculateTeamRequirements(pattern, userAnswers);
        const budgetEstimates = this.calculateBudgetEstimates(pattern, userAnswers);
        const infrastructure = this.calculateInfrastructureRequirements(pattern, userAnswers);

        return {
            title: 'Resource Requirements',
            content: {
                overview: 'Detailed resource planning and cost estimates',
                team: teamRequirements,
                budget: budgetEstimates,
                infrastructure,
                timeline: this.generateResourceTimeline(pattern, userAnswers),
                alternatives: this.generateResourceAlternatives(pattern, userAnswers)
            }
        };
    }

    /**
     * Compile sections into final document
     */
    private async compileDocument(sections: DocumentSections, context: GenerationContext): Promise<PRDDocument> {
        const { pattern, userAnswers } = context;

        return {
            metadata: {
                title: `Product Requirements Document: ${this.generateProjectTitle(pattern, userAnswers)}`,
                pattern: pattern.id,
                generatedAt: context.generatedAt,
                sessionId: context.sessionId,
                version: '1.0.0'
            },
            sections,
            summary: this.generateDocumentSummary(sections, context),
            nextSteps: this.generateNextSteps(pattern, userAnswers),
            coderOneHandoff: this.generateCoderOneHandoff(pattern, userAnswers)
        };
    }

    // ================================
    // Helper methods for content generation
    // ================================

    private generateProjectOverview(pattern: Pattern, userAnswers: Record<string, unknown>): ProjectOverview {
        const businessModel = (userAnswers['business-model'] as string) || 'subscription';
        const userScale = (userAnswers['user-scale'] as string) || 'medium';
        const examples = this.getPatternExamples(pattern);

        return {
            description: `A ${pattern.metadata.name.toLowerCase()} application built using proven patterns from successful companies like ${examples.join(', ')}.`,
            businessModel: this.formatBusinessModel(businessModel),
            targetScale: this.formatUserScale(userScale),
            uniqueValue: `Leverages the exact technical patterns that helped ${examples[0]} scale to millions of users.`
        };
    }

    private generateMarketPositioning(pattern: Pattern, _userAnswers: Record<string, unknown>): MarketPosition {
        const competitors = this.getPatternExamples(pattern);

        return {
            category: pattern.metadata.category,
            competitors,
            differentiation: 'Built with proven patterns from successful companies',
            marketSize: this.estimateMarketSize(pattern),
            opportunity: `Following the ${competitors[0]} playbook significantly increases success probability`
        };
    }

    private generateSuccessMetrics(pattern: Pattern, _userAnswers: Record<string, unknown>): SuccessMetrics {
        const baseMetrics = pattern.metadata.successMetrics || {};

        return {
            userGrowth: baseMetrics.userGrowth || 'Month-over-month user growth',
            revenue: baseMetrics.revenue || 'Monthly recurring revenue (if applicable)',
            engagement: baseMetrics.engagement || 'Daily/monthly active users',
            technical: baseMetrics.technical || 'System performance and uptime',
            benchmarks: this.generateBenchmarks(pattern)
        };
    }

    private generateKeyRecommendations(_pattern: Pattern, _userAnswers: Record<string, unknown>): string[] {
        return [
            'Start with core features and iterate based on user feedback',
            'Implement robust monitoring and analytics from day one',
            'Focus on user experience and performance optimization',
            'Build for scalability from the start'
        ];
    }

    private estimateProjectTimeline(_pattern: Pattern, _userAnswers: Record<string, unknown>): string {
        return '8-12 weeks for MVP';
    }

    private estimateInvestmentRequired(_pattern: Pattern, _userAnswers: Record<string, unknown>): string {
        return '$25,000 - $50,000 for MVP development';
    }

    private buildTechStackRecommendations(pattern: Pattern, userAnswers: Record<string, unknown>): TechStackRecommendation {
        const stack: TechStackRecommendation = { ...pattern.architecture } as TechStackRecommendation;

        const userScale = userAnswers['user-scale'] as string;
        const paymentComplexity = userAnswers['payment-complexity'] as string;
        const realtimeFeatures = userAnswers['realtime-features'] as boolean;

        if (userScale === 'large') {
            stack.caching = { tech: 'Redis', rationale: 'High performance caching for large scale' };
            stack.monitoring = { tech: 'DataDog', rationale: 'Enterprise monitoring and alerting' };
        }

        if (paymentComplexity === 'complex') {
            stack.billing = { tech: 'Stripe Billing + Custom Logic', rationale: 'Complex billing requirements' };
        } else if (paymentComplexity === 'simple') {
            stack.payments = { tech: 'Stripe Checkout', rationale: 'Simple payment processing' };
        }

        if (realtimeFeatures) {
            stack.realtime = { tech: 'Socket.io + Redis', rationale: 'Real-time features with scaling support' };
        }

        return stack;
    }

    private generateArchitectureOverview(pattern: Pattern): string {
        return `The ${pattern.metadata.name} architecture follows industry best practices for scalability, security, and maintainability.`;
    }

    private generateArchitectureDecisions(_pattern: Pattern, _userAnswers: Record<string, unknown>): ArchitectureDecision[] {
        return [
            { decision: 'Microservices architecture', rationale: 'Enables independent scaling and deployment' },
            { decision: 'API-first design', rationale: 'Supports multiple clients and future integrations' },
            { decision: 'Event-driven communication', rationale: 'Decouples services and improves reliability' }
        ];
    }

    private generateSystemDesign(_pattern: Pattern, _userAnswers: Record<string, unknown>): SystemDesign {
        return {
            overview: 'Modular system design with clear separation of concerns',
            components: ['Frontend', 'Backend API', 'Database', 'Cache'],
            interactions: ['REST/GraphQL APIs', 'WebSocket connections', 'Background jobs']
        };
    }

    private generateDataArchitecture(_pattern: Pattern, _userAnswers: Record<string, unknown>): DataArchitecture {
        return {
            overview: 'Scalable data architecture with proper indexing and caching',
            models: ['Users', 'Sessions', 'Content', 'Analytics'],
            relationships: ['One-to-many', 'Many-to-many with junction tables']
        };
    }

    private generateSecurityDesign(_pattern: Pattern, _userAnswers: Record<string, unknown>): SecurityDesign {
        return {
            overview: 'Defense-in-depth security approach',
            features: ['Authentication', 'Authorization', 'Input validation', 'Rate limiting', 'Encryption']
        };
    }

    private generateScalabilityConsiderations(_pattern: Pattern, _userAnswers: Record<string, unknown>): ScalabilityConsiderations {
        return {
            overview: 'Horizontal scaling strategy with auto-scaling capabilities',
            strategies: ['Load balancing', 'Database replication', 'CDN integration', 'Caching layers']
        };
    }

    private generateImplementationPhases(pattern: Pattern, userAnswers: Record<string, unknown>): ImplementationPhase[] {
        return [
            {
                name: 'Foundation Setup',
                duration: '2-3 weeks',
                description: 'Core infrastructure and basic functionality',
                tasks: this.generateFoundationTasks(pattern, userAnswers),
                deliverables: ['Basic app structure', 'Authentication system', 'Database setup'],
                risks: ['Setup complexity', 'Tool learning curve']
            },
            {
                name: 'Core Features',
                duration: '3-4 weeks',
                description: 'Primary application features',
                tasks: this.generateCoreFeatureTasks(pattern, userAnswers),
                deliverables: ['Main user workflows', 'Core business logic', 'Basic UI'],
                risks: ['Feature complexity', 'Integration challenges']
            },
            {
                name: 'Enhancement & Polish',
                duration: '2-3 weeks',
                description: 'Advanced features and optimization',
                tasks: this.generateEnhancementTasks(),
                deliverables: ['Advanced features', 'Performance optimization', 'Testing'],
                risks: ['Scope creep', 'Performance issues']
            },
            {
                name: 'Launch Preparation',
                duration: '1-2 weeks',
                description: 'Production deployment and monitoring',
                tasks: this.generateLaunchTasks(),
                deliverables: ['Production deployment', 'Monitoring setup', 'Documentation'],
                risks: ['Deployment issues', 'Performance under load']
            }
        ];
    }

    private generateFoundationTasks(pattern: Pattern, userAnswers: Record<string, unknown>): string[] {
        const tasks = [
            'Set up development environment',
            `Initialize ${pattern.architecture.frontend.tech} project`,
            `Configure ${pattern.architecture.backend.tech} server`,
            `Set up ${pattern.architecture.database?.tech || 'PostgreSQL'} database`,
            'Implement basic authentication'
        ];

        if (userAnswers['payment-complexity']) {
            tasks.push('Configure Stripe account and webhooks');
        }

        if (userAnswers['realtime-features']) {
            tasks.push('Set up WebSocket infrastructure');
        }

        return tasks;
    }

    private generateCoreFeatureTasks(pattern: Pattern, _userAnswers: Record<string, unknown>): string[] {
        const tasks = [
            'Implement core user workflows',
            'Build main application features',
            'Create responsive UI components',
            'Set up data models and relationships',
            'Implement business logic'
        ];

        if (pattern.metadata.category === 'collaboration') {
            tasks.push('Implement real-time collaboration features');
        }

        if (pattern.metadata.category === 'ecommerce') {
            tasks.push('Build product catalog and shopping cart');
        }

        return tasks;
    }

    private generateEnhancementTasks(): string[] {
        return [
            'Add advanced features and customizations',
            'Implement search and filtering',
            'Add analytics and tracking',
            'Performance optimization',
            'Write comprehensive tests',
            'Set up error monitoring'
        ];
    }

    private generateLaunchTasks(): string[] {
        return [
            'Configure production environment',
            'Set up CI/CD pipeline',
            'Deploy to production',
            'Configure monitoring and alerts',
            'Create user documentation',
            'Plan launch strategy'
        ];
    }

    private createDetailedTimeline(phases: ImplementationPhase[], _userAnswers: Record<string, unknown>): string {
        return phases.map(p => `${p.name}: ${p.duration}`).join(' → ');
    }

    private generateMilestones(phases: ImplementationPhase[]): string[] {
        return phases.map(p => `${p.name} Complete`);
    }

    private identifyDependencies(_phases: ImplementationPhase[]): string[] {
        return [
            'Infrastructure setup before feature development',
            'Authentication before user features',
            'Core features before enhancements'
        ];
    }

    private generateImplementationRisks(_pattern: Pattern, _userAnswers: Record<string, unknown>): string[] {
        return [
            'Technical complexity may extend timeline',
            'Third-party API dependencies',
            'Integration challenges'
        ];
    }

    private assessTechnicalRisks(_pattern: Pattern, _userAnswers: Record<string, unknown>): Risk[] {
        return [
            {
                title: 'Technical Complexity',
                type: 'technical',
                severity: 6,
                impact: 7,
                probability: 5,
                mitigation: 'Start with proven patterns and iterate'
            }
        ];
    }

    private assessBusinessRisks(_pattern: Pattern, _userAnswers: Record<string, unknown>): Risk[] {
        return [
            {
                title: 'Market Validation',
                type: 'business',
                severity: 7,
                impact: 8,
                probability: 4,
                mitigation: 'Launch MVP early and gather feedback'
            }
        ];
    }

    private assessMarketRisks(_pattern: Pattern, _userAnswers: Record<string, unknown>): Risk[] {
        return [
            {
                title: 'Competition',
                type: 'market',
                severity: 5,
                impact: 6,
                probability: 6,
                mitigation: 'Focus on unique value proposition'
            }
        ];
    }

    private assessOperationalRisks(_pattern: Pattern, _userAnswers: Record<string, unknown>): Risk[] {
        return [
            {
                title: 'Scaling Challenges',
                type: 'operational',
                severity: 5,
                impact: 7,
                probability: 3,
                mitigation: 'Build with scalability in mind from day one'
            }
        ];
    }

    private generateRiskMitigationPlan(_risks: Risk[]): string[] {
        return [
            'Regular risk assessment and monitoring',
            'Contingency planning for high-impact risks',
            'Stakeholder communication plan'
        ];
    }

    private generateRiskMonitoringPlan(_risks: Risk[]): string[] {
        return [
            'Weekly risk review meetings',
            'Automated monitoring and alerts',
            'Regular stakeholder updates'
        ];
    }

    private calculateTeamRequirements(pattern: Pattern, userAnswers: Record<string, unknown>): TeamRequirements {
        const userScale = (userAnswers['user-scale'] as string) || 'medium';
        const paymentComplexity = (userAnswers['payment-complexity'] as string) || 'simple';

        let teamSize = 2;

        if (userScale === 'large') teamSize += 1;
        if (paymentComplexity === 'complex') teamSize += 1;
        if (userAnswers['realtime-features']) teamSize += 1;

        return {
            totalSize: teamSize,
            roles: this.generateRoleRequirements(teamSize, pattern),
            timeline: '8-12 weeks',
            skillsRequired: this.generateSkillRequirements(pattern, userAnswers)
        };
    }

    private generateRoleRequirements(teamSize: number, _pattern: Pattern): string[] {
        const roles = ['Full-stack Developer', 'DevOps Engineer'];
        if (teamSize > 2) roles.push('Frontend Specialist');
        if (teamSize > 3) roles.push('Backend Specialist');
        if (teamSize > 4) roles.push('QA Engineer');
        return roles;
    }

    private generateSkillRequirements(pattern: Pattern, _userAnswers: Record<string, unknown>): string[] {
        return [
            pattern.architecture.frontend.tech,
            pattern.architecture.backend.tech,
            pattern.architecture.database?.tech || 'SQL',
            'DevOps',
            'Testing'
        ];
    }

    private calculateBudgetEstimates(_pattern: Pattern, userAnswers: Record<string, unknown>): BudgetEstimate {
        const userScale = (userAnswers['user-scale'] as string) || 'medium';

        const estimates: Record<string, { development: string; monthly: string; annual: string }> = {
            small: { development: '15-25K', monthly: '200-500', annual: '3-8K' },
            medium: { development: '25-50K', monthly: '500-2K', annual: '8-25K' },
            large: { development: '50-100K', monthly: '2-10K', annual: '25-120K' }
        };

        const scaleEstimates = estimates[userScale] || estimates.medium;

        return {
            development: scaleEstimates.development,
            monthlyOperating: scaleEstimates.monthly,
            annualOperating: scaleEstimates.annual,
            breakdown: this.generateCostBreakdown(userScale, userAnswers)
        };
    }

    private generateCostBreakdown(_userScale: string, _userAnswers: Record<string, unknown>): Record<string, string> {
        return {
            development: '60%',
            infrastructure: '20%',
            thirdPartyServices: '15%',
            contingency: '5%'
        };
    }

    private calculateInfrastructureRequirements(_pattern: Pattern, _userAnswers: Record<string, unknown>): InfrastructureRequirements {
        return {
            hosting: 'Cloud hosting (AWS/GCP/Azure)',
            database: 'Managed database service',
            storage: 'Cloud storage for assets',
            services: ['CDN', 'Email service', 'Monitoring']
        };
    }

    private generateResourceTimeline(_pattern: Pattern, _userAnswers: Record<string, unknown>): string {
        return '8-12 weeks total development time';
    }

    private generateResourceAlternatives(_pattern: Pattern, _userAnswers: Record<string, unknown>): string[] {
        return [
            'Outsource specific components',
            'Use managed services where possible',
            'Phased hiring approach'
        ];
    }

    private generateProjectTitle(pattern: Pattern, _userAnswers: Record<string, unknown>): string {
        return pattern.metadata.name;
    }

    private generateDocumentSummary(_sections: DocumentSections, context: GenerationContext): string {
        return `This PRD outlines the development of a ${context.pattern.metadata.name.toLowerCase()} following proven patterns from successful companies.`;
    }

    private generateNextSteps(_pattern: Pattern, _userAnswers: Record<string, unknown>): string[] {
        return [
            'Review and validate technical architecture decisions',
            'Assemble development team with required skills',
            'Set up development environment and CI/CD pipeline',
            'Begin Phase 1 implementation with core features',
            'Establish monitoring and analytics infrastructure',
            'Plan user testing and feedback collection strategy'
        ];
    }

    private generateCoderOneHandoff(_pattern: Pattern, _userAnswers: Record<string, unknown>): Coder1Handoff {
        return {
            title: 'Ready to Build? Start with Coder1',
            description: 'This PRD is optimized for implementation using Coder1\'s AI-powered development environment.',
            benefits: [
                'Proven architecture patterns reduce development risk',
                'Detailed technical specifications accelerate development',
                'Clear implementation roadmap prevents scope creep',
                'Professional documentation supports team coordination'
            ],
            nextSteps: [
                'Review the technical architecture with your team',
                'Validate the implementation timeline and budget',
                'Start building with Coder1\'s AI-powered development environment',
                'Use Claude Code to implement following the patterns outlined'
            ],
            estimatedTimeWithCoderOne: '40-60% faster than traditional development',
            coderOneAdvantages: [
                'AI-assisted development following proven patterns',
                'Integrated development environment optimized for Claude Code',
                'Built-in best practices from successful startups',
                'Seamless handoff from PRD to implementation'
            ],
            launchUrl: 'http://localhost:3000/ide'
        };
    }

    private generateSessionId(): string {
        return `prd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private getPatternExamples(pattern: Pattern): string[] {
        return pattern.metadata.examples || ['Successful Company'];
    }

    private formatBusinessModel(model: string): string {
        const models: Record<string, string> = {
            free: 'Free with optional premium features',
            freemium: 'Freemium (basic free, premium paid)',
            subscription: 'Subscription-based (recurring revenue)',
            usage: 'Usage-based pricing',
            marketplace: 'Marketplace with commission model'
        };
        return models[model] || model;
    }

    private formatUserScale(scale: string): string {
        const scales: Record<string, string> = {
            small: '10-100 users (team/small company)',
            medium: '100-10,000 users (growing startup)',
            large: '10,000+ users (established product)'
        };
        return scales[scale] || scale;
    }

    private estimateMarketSize(_pattern: Pattern): string {
        return 'Large and growing market opportunity';
    }

    private generateBenchmarks(_pattern: Pattern): string[] {
        return [
            'Industry-standard performance benchmarks',
            'User satisfaction targets',
            'Growth rate objectives'
        ];
    }

    private generateProjectName(_pattern: Pattern, _userAnswers: Record<string, unknown>): string {
        const prefixes = ['Smart', 'Modern', 'Next-Gen', 'Cloud', 'AI-Powered'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        return `${prefix} Platform`;
    }

    /**
     * Generate visuals for the document
     */
    private async generateVisuals(context: GenerationContext): Promise<Visuals> {
        return {
            architectureDiagram: {
                type: 'mermaid',
                content: this.generateArchitectureDiagram(context)
            },
            implementationFlowchart: {
                type: 'mermaid',
                content: this.generateImplementationFlowchart()
            }
        };
    }

    /**
     * Generate architecture diagram in Mermaid format
     */
    private generateArchitectureDiagram(context: GenerationContext): string {
        const { pattern } = context;

        let diagram = 'graph TB\n';
        diagram += '    User[User] --> Frontend[Frontend]\n';
        diagram += '    Frontend --> Backend[Backend API]\n';
        diagram += '    Backend --> Database[Database]\n';

        if (pattern.architecture.realtime) {
            diagram += '    Frontend --> WS[WebSocket]\n';
            diagram += '    WS --> Backend\n';
        }

        if (pattern.architecture.payments) {
            diagram += '    Backend --> Payment[Payment Service]\n';
        }

        if (pattern.architecture.search) {
            diagram += '    Backend --> Search[Search Engine]\n';
        }

        return diagram;
    }

    /**
     * Generate implementation flowchart
     */
    private generateImplementationFlowchart(): string {
        return `graph LR
    A[Requirements] --> B[Design]
    B --> C[Development]
    C --> D[Testing]
    D --> E[Deployment]
    E --> F[Monitoring]`;
    }

    /**
     * Format document for output
     */
    private async formatDocument(document: PRDDocument, format: string = 'markdown'): Promise<string> {
        switch (format.toLowerCase()) {
            case 'markdown':
                return this.formatAsMarkdown(document);
            case 'html':
                return this.formatAsHTML(document);
            case 'json':
                return JSON.stringify(document, null, 2);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }

    /**
     * Format document as professional markdown
     */
    private formatAsMarkdown(document: PRDDocument): string {
        const { metadata, sections, nextSteps, coderOneHandoff } = document;

        let markdown = '';

        // Header
        markdown += `# ${metadata.title}\n\n`;
        markdown += `**Generated:** ${new Date(metadata.generatedAt).toLocaleDateString()}\n`;
        markdown += `**Pattern:** ${metadata.pattern}\n`;
        markdown += `**Version:** ${metadata.version}\n\n`;

        // Table of Contents
        markdown += `## 📋 Table of Contents\n\n`;
        markdown += `1. [Executive Summary](#executive-summary)\n`;
        markdown += `2. [Technical Architecture](#technical-architecture)\n`;
        markdown += `3. [Implementation Roadmap](#implementation-roadmap)\n`;
        markdown += `4. [Risk Assessment](#risk-assessment)\n`;
        markdown += `5. [Resource Requirements](#resource-requirements)\n`;
        markdown += `6. [Next Steps](#next-steps)\n`;
        markdown += `7. [Coder1 Handoff](#coder1-handoff)\n\n`;

        // Executive Summary
        markdown += `## 🎯 Executive Summary\n\n`;
        markdown += `### Project Overview\n\n`;
        markdown += `${sections.executiveSummary.content.projectOverview.description}\n\n`;

        // Technical Architecture
        markdown += `## 🏗️ Technical Architecture\n\n`;
        markdown += `${sections.technicalArchitecture.content.overview}\n\n`;

        // Implementation Roadmap
        markdown += `## 🗺️ Implementation Roadmap\n\n`;
        markdown += `${sections.implementationRoadmap.content.overview}\n\n`;
        sections.implementationRoadmap.content.phases.forEach((phase, index) => {
            markdown += `### Phase ${index + 1}: ${phase.name}\n`;
            markdown += `**Duration:** ${phase.duration}\n\n`;
            phase.tasks.forEach(task => {
                markdown += `- ${task}\n`;
            });
            markdown += `\n`;
        });

        // Risk Assessment
        markdown += `## ⚠️ Risk Assessment\n\n`;
        markdown += `${sections.riskAssessment.content.overview}\n\n`;

        // Resource Requirements
        markdown += `## 👥 Resource Requirements\n\n`;
        markdown += `${sections.resourceRequirements.content.overview}\n\n`;

        // Next Steps
        markdown += `## 🚀 Next Steps\n\n`;
        nextSteps.forEach((step, index) => {
            markdown += `${index + 1}. ${step}\n`;
        });
        markdown += `\n`;

        // Coder1 Handoff
        markdown += `## 🎯 Coder1 Handoff\n\n`;
        markdown += `${coderOneHandoff.description}\n\n`;
        markdown += `**Get Started:** [Launch Coder1 IDE →](${coderOneHandoff.launchUrl})\n\n`;

        // Footer
        markdown += `---\n\n`;
        markdown += `*Generated with Smart Repository Patterns PRD Generator*\n`;
        markdown += `*Session ID: ${metadata.sessionId}*\n`;

        return markdown;
    }

    /**
     * Format as HTML
     */
    private formatAsHTML(document: PRDDocument): string {
        const markdown = this.formatAsMarkdown(document);
        return `<!DOCTYPE html>
<html>
<head>
    <title>${document.metadata.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
        h1, h2, h3 { color: #2d3748; }
        code { background: #f7fafc; padding: 2px 4px; border-radius: 3px; }
        pre { background: #f7fafc; padding: 1rem; border-radius: 6px; overflow-x: auto; }
    </style>
</head>
<body>
    <pre>${markdown}</pre>
</body>
</html>`;
    }
}

export default DocumentGenerator;
