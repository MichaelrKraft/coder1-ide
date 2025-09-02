/**
 * Advanced Persona Service - SuperClaude Multi-Persona Integration
 * 
 * Provides specialized AI personas for expert project insights:
 * - Frontend Architect: UI/UX expertise
 * - Backend Engineer: System architecture and APIs
 * - Security Expert: Security analysis and recommendations
 * - Performance Specialist: Optimization strategies
 * - Business Analyst: Market and business insights
 * - DevOps Engineer: Deployment and infrastructure
 */

interface PersonaConfig {
    id: string;
    name: string;
    expertise: string[];
    systemPrompt: string;
    iconClass: string;
    color: string;
}

interface PersonaInsight {
    personaId: string;
    personaName: string;
    insights: string[];
    recommendations: string[];
    risks: string[];
    priority: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    estimatedImpact: string;
}

interface ProjectContext {
    projectType: string;
    requirements: string[];
    features: string[];
    complexity: string;
    timeline: string;
    budget?: string;
}

class AdvancedPersonaService {
    private personas: Map<string, PersonaConfig>;
    private activeConsultations: Map<string, PersonaInsight[]>;

    constructor() {
        this.personas = new Map();
        this.activeConsultations = new Map();
        this.initializePersonas();
    }

    private initializePersonas(): void {
        const personaConfigs: PersonaConfig[] = [
            {
                id: 'frontend-architect',
                name: 'Frontend Architect',
                expertise: ['UI/UX Design', 'React/Vue/Angular', 'Responsive Design', 'Performance Optimization', 'Accessibility'],
                systemPrompt: `You are a Senior Frontend Architect with 10+ years of experience. You specialize in creating exceptional user experiences, modern frontend frameworks, and performance optimization. Analyze projects from a user-centric perspective and provide actionable recommendations for UI/UX, component architecture, and frontend performance.`,
                iconClass: 'fas fa-paint-brush',
                color: '#8b5cf6'
            },
            {
                id: 'backend-engineer',
                name: 'Backend Engineer',
                expertise: ['System Architecture', 'APIs', 'Databases', 'Microservices', 'Scalability'],
                systemPrompt: `You are a Senior Backend Engineer with expertise in scalable system design, API architecture, and database optimization. Analyze projects for backend requirements, suggest appropriate technologies, and identify potential scaling challenges. Focus on reliability, performance, and maintainability.`,
                iconClass: 'fas fa-server',
                color: '#06b6d4'
            },
            {
                id: 'security-expert',
                name: 'Security Expert',
                expertise: ['Application Security', 'Data Protection', 'Authentication', 'Compliance', 'Threat Analysis'],
                systemPrompt: `You are a Cybersecurity Expert specializing in application security and data protection. Analyze projects for security vulnerabilities, compliance requirements, and recommend security best practices. Focus on authentication, authorization, data encryption, and threat mitigation.`,
                iconClass: 'fas fa-shield-alt',
                color: '#ef4444'
            },
            {
                id: 'performance-specialist',
                name: 'Performance Specialist',
                expertise: ['Performance Optimization', 'Caching', 'Load Testing', 'Monitoring', 'CDN'],
                systemPrompt: `You are a Performance Engineering Specialist focused on application speed, scalability, and resource optimization. Analyze projects for performance bottlenecks, suggest caching strategies, and recommend monitoring solutions. Emphasize Core Web Vitals and user experience metrics.`,
                iconClass: 'fas fa-tachometer-alt',
                color: '#10b981'
            },
            {
                id: 'business-analyst',
                name: 'Business Analyst',
                expertise: ['Market Analysis', 'User Research', 'Business Strategy', 'ROI Analysis', 'Feature Prioritization'],
                systemPrompt: `You are a Senior Business Analyst with expertise in market research, user behavior analysis, and business strategy. Analyze projects from a business perspective, identify market opportunities, suggest feature prioritization, and estimate business impact. Focus on user value and competitive advantages.`,
                iconClass: 'fas fa-chart-line',
                color: '#f59e0b'
            },
            {
                id: 'devops-engineer',
                name: 'DevOps Engineer',
                expertise: ['CI/CD', 'Cloud Infrastructure', 'Containerization', 'Monitoring', 'Deployment'],
                systemPrompt: `You are a Senior DevOps Engineer specializing in cloud infrastructure, automated deployments, and system reliability. Analyze projects for deployment strategies, infrastructure requirements, and operational considerations. Focus on scalability, reliability, and cost optimization.`,
                iconClass: 'fas fa-cloud',
                color: '#3b82f6'
            }
        ];

        personaConfigs.forEach(config => {
            this.personas.set(config.id, config);
        });
    }

    /**
     * Get all available personas
     */
    public getAvailablePersonas(): PersonaConfig[] {
        return Array.from(this.personas.values());
    }

    /**
     * Get specific persona by ID
     */
    public getPersona(personaId: string): PersonaConfig | null {
        return this.personas.get(personaId) || null;
    }

    /**
     * Conduct multi-persona consultation for a project
     */
    public async conductMultiPersonaConsultation(
        projectId: string,
        projectContext: ProjectContext,
        selectedPersonas: string[] = []
    ): Promise<PersonaInsight[]> {
        const personasToConsult = selectedPersonas.length > 0 
            ? selectedPersonas 
            : Array.from(this.personas.keys());

        const insights: PersonaInsight[] = [];

        for (const personaId of personasToConsult) {
            const persona = this.personas.get(personaId);
            if (!persona) continue;

            try {
                const insight = await this.getPersonaInsight(persona, projectContext);
                insights.push(insight);
            } catch (error) {
                console.error(`Error getting insight from persona ${personaId}:`, error);
                // Continue with other personas even if one fails
            }
        }

        // Cache the insights for this project
        this.activeConsultations.set(projectId, insights);

        return insights;
    }

    /**
     * Get insight from a specific persona
     */
    private async getPersonaInsight(
        persona: PersonaConfig,
        projectContext: ProjectContext
    ): Promise<PersonaInsight> {
        // Simulate AI analysis (in production, this would call Claude API)
        const analysisPrompt = this.buildAnalysisPrompt(persona, projectContext);
        
        // For MVP, we'll use realistic mock insights based on persona expertise
        const mockInsight = this.generateMockInsight(persona, projectContext);

        return mockInsight;
    }

    /**
     * Build analysis prompt for persona
     */
    private buildAnalysisPrompt(persona: PersonaConfig, context: ProjectContext): string {
        return `
${persona.systemPrompt}

Project Context:
- Type: ${context.projectType}
- Requirements: ${context.requirements.join(', ')}
- Features: ${context.features.join(', ')}
- Complexity: ${context.complexity}
- Timeline: ${context.timeline}

Please analyze this project from your expertise perspective and provide:
1. Key insights and observations
2. Specific recommendations
3. Potential risks or challenges
4. Priority level for your recommendations
5. Estimated impact of implementing your suggestions

Format your response as structured recommendations that can help improve the project's success in your domain.
        `.trim();
    }

    /**
     * Generate realistic mock insights (for MVP - replace with actual AI calls in production)
     */
    private generateMockInsight(persona: PersonaConfig, context: ProjectContext): PersonaInsight {
        const insightTemplates = {
            'frontend-architect': {
                insights: [
                    `For ${context.projectType} projects, implementing a component-based architecture will improve maintainability`,
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
                ]
            },
            'backend-engineer': {
                insights: [
                    `${context.projectType} applications typically require robust data modeling and API design`,
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
                ]
            },
            'security-expert': {
                insights: [
                    'Security considerations must be integrated from the beginning of development',
                    `${context.projectType} applications handle sensitive data requiring robust protection measures`,
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
                ]
            },
            'performance-specialist': {
                insights: [
                    'Performance optimization should be considered during architecture design phase',
                    `${context.projectType} applications benefit from aggressive caching strategies`,
                    'Core Web Vitals compliance directly impacts user engagement and SEO'
                ],
                recommendations: [
                    'Implement lazy loading for images and non-critical resources',
                    'Use CDN for static asset delivery and global performance',
                    'Optimize database queries and implement connection pooling',
                    'Consider implementing service worker for offline functionality'
                ],
                risks: [
                    'Performance degradation as user base and data volume grow',
                    'Third-party dependencies impacting page load times',
                    'Insufficient monitoring leading to undetected performance issues'
                ]
            },
            'business-analyst': {
                insights: [
                    `${context.projectType} market shows strong growth potential with emerging user needs`,
                    'Feature prioritization should focus on core user value propositions',
                    'Competitive analysis reveals opportunities for differentiation'
                ],
                recommendations: [
                    'Implement analytics to track user behavior and feature adoption',
                    'Consider freemium model to lower user acquisition barriers',
                    'Plan A/B testing framework for feature optimization',
                    'Develop clear KPIs and success metrics for business outcomes'
                ],
                risks: [
                    'Market saturation affecting user acquisition costs',
                    'Feature bloat reducing core value proposition clarity',
                    'Insufficient user research leading to poor product-market fit'
                ]
            },
            'devops-engineer': {
                insights: [
                    'Deployment strategy should support rapid iteration and rollback capabilities',
                    `${context.projectType} applications benefit from containerized deployment for consistency`,
                    'Infrastructure as Code (IaC) ensures reproducible and scalable deployments'
                ],
                recommendations: [
                    'Implement CI/CD pipeline with automated testing and deployment',
                    'Use container orchestration (Kubernetes) for production scalability',
                    'Implement comprehensive monitoring and alerting systems',
                    'Plan for disaster recovery and backup strategies'
                ],
                risks: [
                    'Infrastructure costs scaling faster than user growth',
                    'Deployment failures causing extended downtime',
                    'Insufficient monitoring leading to undetected system issues'
                ]
            }
        };

        const template = insightTemplates[persona.id] || {
            insights: ['General analysis based on project requirements'],
            recommendations: ['Follow industry best practices for implementation'],
            risks: ['Consider standard project risks for this domain']
        };

        // Calculate priority based on project complexity and persona relevance
        const priority = this.calculatePriority(persona, context);
        const confidence = Math.floor(Math.random() * 30) + 70; // 70-100% confidence

        return {
            personaId: persona.id,
            personaName: persona.name,
            insights: template.insights,
            recommendations: template.recommendations,
            risks: template.risks,
            priority,
            confidence,
            estimatedImpact: this.calculateEstimatedImpact(priority, confidence)
        };
    }

    /**
     * Calculate priority based on project context and persona expertise
     */
    private calculatePriority(persona: PersonaConfig, context: ProjectContext): 'low' | 'medium' | 'high' | 'critical' {
        // Frontend architect is critical for user-facing applications
        if (persona.id === 'frontend-architect' && ['website', 'web-app', 'mobile-app'].includes(context.projectType)) {
            return 'critical';
        }

        // Security expert is critical for applications handling sensitive data
        if (persona.id === 'security-expert' && context.features.some(f => 
            f.includes('auth') || f.includes('payment') || f.includes('user data')
        )) {
            return 'critical';
        }

        // Backend engineer is critical for data-intensive applications
        if (persona.id === 'backend-engineer' && ['api', 'database', 'platform'].includes(context.projectType)) {
            return 'critical';
        }

        // High priority for core technical roles
        if (['frontend-architect', 'backend-engineer', 'security-expert'].includes(persona.id)) {
            return 'high';
        }

        // Medium priority for supporting roles
        return 'medium';
    }

    /**
     * Calculate estimated impact based on priority and confidence
     */
    private calculateEstimatedImpact(priority: string, confidence: number): string {
        if (priority === 'critical' && confidence > 85) return 'Very High - Immediate attention required';
        if (priority === 'critical') return 'High - Critical area needs focus';
        if (priority === 'high' && confidence > 80) return 'High - Significant improvement potential';
        if (priority === 'high') return 'Medium-High - Important considerations';
        if (priority === 'medium' && confidence > 75) return 'Medium - Valuable optimizations available';
        return 'Low-Medium - Nice to have improvements';
    }

    /**
     * Get cached consultation results
     */
    public getCachedConsultation(projectId: string): PersonaInsight[] | null {
        return this.activeConsultations.get(projectId) || null;
    }

    /**
     * Clear cached consultation
     */
    public clearConsultation(projectId: string): void {
        this.activeConsultations.delete(projectId);
    }

    /**
     * Get consultation summary for dashboard
     */
    public getConsultationSummary(projectId: string): {
        totalPersonas: number;
        criticalInsights: number;
        highPriorityRecommendations: number;
        averageConfidence: number;
        topRisks: string[];
    } | null {
        const consultation = this.activeConsultations.get(projectId);
        if (!consultation) return null;

        const criticalInsights = consultation.filter(i => i.priority === 'critical').length;
        const highPriorityRecommendations = consultation.filter(i => 
            i.priority === 'high' || i.priority === 'critical'
        ).length;
        const averageConfidence = consultation.reduce((sum, i) => sum + i.confidence, 0) / consultation.length;
        
        // Get top 3 most mentioned risks
        const allRisks = consultation.flatMap(i => i.risks);
        const riskCounts = allRisks.reduce((acc, risk) => {
            acc[risk] = (acc[risk] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const topRisks = Object.entries(riskCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([risk]) => risk);

        return {
            totalPersonas: consultation.length,
            criticalInsights,
            highPriorityRecommendations,
            averageConfidence: Math.round(averageConfidence),
            topRisks
        };
    }

    /**
     * Export consultation report
     */
    public exportConsultationReport(projectId: string): string {
        const consultation = this.activeConsultations.get(projectId);
        if (!consultation) return '';

        const summary = this.getConsultationSummary(projectId);
        let report = `# Multi-Persona Consultation Report\n\n`;
        
        if (summary) {
            report += `## Executive Summary\n`;
            report += `- **Total Expert Personas Consulted**: ${summary.totalPersonas}\n`;
            report += `- **Critical Insights Identified**: ${summary.criticalInsights}\n`;
            report += `- **High Priority Recommendations**: ${summary.highPriorityRecommendations}\n`;
            report += `- **Average Confidence Level**: ${summary.averageConfidence}%\n\n`;
            
            if (summary.topRisks.length > 0) {
                report += `## Top Risk Areas\n`;
                summary.topRisks.forEach((risk, index) => {
                    report += `${index + 1}. ${risk}\n`;
                });
                report += `\n`;
            }
        }

        consultation.forEach(insight => {
            report += `## ${insight.personaName} Analysis\n`;
            report += `**Priority**: ${insight.priority.toUpperCase()} | **Confidence**: ${insight.confidence}%\n\n`;
            
            report += `### Key Insights\n`;
            insight.insights.forEach(item => report += `- ${item}\n`);
            report += `\n`;

            report += `### Recommendations\n`;
            insight.recommendations.forEach(item => report += `- ${item}\n`);
            report += `\n`;

            report += `### Risk Considerations\n`;
            insight.risks.forEach(item => report += `- ${item}\n`);
            report += `\n`;

            report += `**Estimated Impact**: ${insight.estimatedImpact}\n\n`;
            report += `---\n\n`;
        });

        return report;
    }
}

export { AdvancedPersonaService, PersonaConfig, PersonaInsight, ProjectContext };