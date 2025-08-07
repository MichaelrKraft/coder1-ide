/**
 * Multi-Persona Consultation Service
 * 
 * Orchestrates consultations between multiple AI personas to provide
 * comprehensive project analysis and recommendations
 */

import { AdvancedPersonaService, PersonaInsight, ProjectContext } from './AdvancedPersonaService';

interface ConsultationRequest {
    projectId: string;
    projectType: string;
    requirements: string[];
    features: string[];
    complexity: 'low' | 'medium' | 'high';
    timeline: string;
    budget?: string;
    selectedPersonas?: string[];
    focusAreas?: string[];
}

interface ConsultationResult {
    projectId: string;
    consultationId: string;
    timestamp: string;
    summary: {
        totalPersonas: number;
        criticalFindings: number;
        highPriorityActions: number;
        averageConfidence: number;
        consensusLevel: number;
        estimatedSuccessProbability: number;
    };
    personaInsights: PersonaInsight[];
    crossPersonaAnalysis: {
        agreements: string[];
        conflicts: string[];
        gaps: string[];
        recommendations: string[];
    };
    actionPlan: {
        immediate: string[];
        shortTerm: string[];
        longTerm: string[];
    };
    riskMatrix: {
        technical: string[];
        business: string[];
        operational: string[];
        security: string[];
    };
}

class MultiPersonaConsultation {
    private personaService: AdvancedPersonaService;
    private activeConsultations: Map<string, ConsultationResult>;

    constructor() {
        this.personaService = new AdvancedPersonaService();
        this.activeConsultations = new Map();
    }

    /**
     * Conduct comprehensive multi-persona consultation
     */
    public async conductConsultation(request: ConsultationRequest): Promise<ConsultationResult> {
        const consultationId = `consultation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Build project context
        const projectContext: ProjectContext = {
            projectType: request.projectType,
            requirements: request.requirements,
            features: request.features,
            complexity: request.complexity,
            timeline: request.timeline,
            budget: request.budget
        };

        // Get persona insights
        const personaInsights = await this.personaService.conductMultiPersonaConsultation(
            request.projectId,
            projectContext,
            request.selectedPersonas
        );

        // Perform cross-persona analysis
        const crossPersonaAnalysis = this.performCrossPersonaAnalysis(personaInsights);
        
        // Generate action plan
        const actionPlan = this.generateActionPlan(personaInsights, crossPersonaAnalysis);
        
        // Create risk matrix
        const riskMatrix = this.createRiskMatrix(personaInsights);
        
        // Calculate summary metrics
        const summary = this.calculateSummaryMetrics(personaInsights, crossPersonaAnalysis);

        const result: ConsultationResult = {
            projectId: request.projectId,
            consultationId,
            timestamp: new Date().toISOString(),
            summary,
            personaInsights,
            crossPersonaAnalysis,
            actionPlan,
            riskMatrix
        };

        // Cache the result
        this.activeConsultations.set(request.projectId, result);

        return result;
    }

    /**
     * Perform cross-persona analysis to identify agreements, conflicts, and gaps
     */
    private performCrossPersonaAnalysis(insights: PersonaInsight[]): {
        agreements: string[];
        conflicts: string[];
        gaps: string[];
        recommendations: string[];
    } {
        const analysis = {
            agreements: [] as string[],
            conflicts: [] as string[],
            gaps: [] as string[],
            recommendations: [] as string[]
        };

        // Analyze for common themes and agreements
        const allRecommendations = insights.flatMap(i => i.recommendations);
        const recommendationCounts = allRecommendations.reduce((acc, rec) => {
            const key = rec.toLowerCase();
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Find agreements (recommendations mentioned by multiple personas)
        Object.entries(recommendationCounts).forEach(([rec, count]) => {
            if (count > 1) {
                analysis.agreements.push(`Multiple experts agree: ${rec}`);
            }
        });

        // Identify potential conflicts (opposing priorities)
        const conflictPairs = [
            ['security', 'performance'],
            ['speed', 'quality'],
            ['features', 'simplicity'],
            ['cost', 'scalability']
        ];

        conflictPairs.forEach(([area1, area2]) => {
            const hasArea1 = insights.some(i => 
                i.recommendations.some(r => r.toLowerCase().includes(area1))
            );
            const hasArea2 = insights.some(i => 
                i.recommendations.some(r => r.toLowerCase().includes(area2))
            );

            if (hasArea1 && hasArea2) {
                analysis.conflicts.push(`Balance needed between ${area1} and ${area2} priorities`);
            }
        });

        // Identify gaps (missing persona perspectives)
        const representedAreas = insights.map(i => i.personaId);
        const allPersonas = this.personaService.getAvailablePersonas().map(p => p.id);
        const missingPersonas = allPersonas.filter(p => !representedAreas.includes(p));

        if (missingPersonas.length > 0) {
            const personaNames = missingPersonas.map(id => 
                this.personaService.getPersona(id)?.name || id
            );
            analysis.gaps.push(`Consider consulting: ${personaNames.join(', ')}`);
        }

        // Generate synthesis recommendations
        const criticalInsights = insights.filter(i => i.priority === 'critical');
        if (criticalInsights.length > 0) {
            analysis.recommendations.push('Address all critical-priority items before proceeding');
        }

        const highConfidenceItems = insights.filter(i => i.confidence > 85);
        if (highConfidenceItems.length > 0) {
            analysis.recommendations.push('Prioritize high-confidence recommendations for quick wins');
        }

        if (analysis.conflicts.length > 0) {
            analysis.recommendations.push('Develop a balanced approach to resolve conflicting priorities');
        }

        return analysis;
    }

    /**
     * Generate structured action plan based on persona insights
     */
    private generateActionPlan(
        insights: PersonaInsight[],
        analysis: { agreements: string[]; conflicts: string[]; gaps: string[]; recommendations: string[] }
    ): { immediate: string[]; shortTerm: string[]; longTerm: string[] } {
        const actionPlan = {
            immediate: [] as string[],
            shortTerm: [] as string[],
            longTerm: [] as string[]
        };

        // Immediate actions (critical and high priority items)
        const criticalInsights = insights.filter(i => i.priority === 'critical');
        criticalInsights.forEach(insight => {
            insight.recommendations.slice(0, 2).forEach(rec => {
                actionPlan.immediate.push(`[${insight.personaName}] ${rec}`);
            });
        });

        // Short-term actions (high priority items)
        const highPriorityInsights = insights.filter(i => i.priority === 'high');
        highPriorityInsights.forEach(insight => {
            insight.recommendations.slice(0, 1).forEach(rec => {
                actionPlan.shortTerm.push(`[${insight.personaName}] ${rec}`);
            });
        });

        // Long-term actions (medium priority and optimization items)
        const mediumPriorityInsights = insights.filter(i => i.priority === 'medium');
        mediumPriorityInsights.forEach(insight => {
            insight.recommendations.slice(0, 1).forEach(rec => {
                actionPlan.longTerm.push(`[${insight.personaName}] ${rec}`);
            });
        });

        // Add cross-analysis recommendations
        analysis.recommendations.forEach(rec => {
            if (rec.includes('critical') || rec.includes('Address')) {
                actionPlan.immediate.push(`[Synthesis] ${rec}`);
            } else if (rec.includes('quick wins') || rec.includes('Prioritize')) {
                actionPlan.shortTerm.push(`[Synthesis] ${rec}`);
            } else {
                actionPlan.longTerm.push(`[Synthesis] ${rec}`);
            }
        });

        return actionPlan;
    }

    /**
     * Create risk matrix categorized by domain
     */
    private createRiskMatrix(insights: PersonaInsight[]): {
        technical: string[];
        business: string[];
        operational: string[];
        security: string[];
    } {
        const riskMatrix = {
            technical: [] as string[],
            business: [] as string[],
            operational: [] as string[],
            security: [] as string[]
        };

        insights.forEach(insight => {
            insight.risks.forEach(risk => {
                const riskLower = risk.toLowerCase();

                if (riskLower.includes('security') || riskLower.includes('vulnerability') || 
                    riskLower.includes('attack') || riskLower.includes('breach')) {
                    riskMatrix.security.push(`[${insight.personaName}] ${risk}`);
                } else if (riskLower.includes('performance') || riskLower.includes('scalability') || 
                          riskLower.includes('technical') || riskLower.includes('compatibility')) {
                    riskMatrix.technical.push(`[${insight.personaName}] ${risk}`);
                } else if (riskLower.includes('market') || riskLower.includes('business') || 
                          riskLower.includes('user') || riskLower.includes('revenue')) {
                    riskMatrix.business.push(`[${insight.personaName}] ${risk}`);
                } else {
                    riskMatrix.operational.push(`[${insight.personaName}] ${risk}`);
                }
            });
        });

        return riskMatrix;
    }

    /**
     * Calculate comprehensive summary metrics
     */
    private calculateSummaryMetrics(
        insights: PersonaInsight[],
        analysis: { agreements: string[]; conflicts: string[]; gaps: string[]; recommendations: string[] }
    ): {
        totalPersonas: number;
        criticalFindings: number;
        highPriorityActions: number;
        averageConfidence: number;
        consensusLevel: number;
        estimatedSuccessProbability: number;
    } {
        const totalPersonas = insights.length;
        const criticalFindings = insights.filter(i => i.priority === 'critical').length;
        const highPriorityActions = insights.filter(i => 
            i.priority === 'high' || i.priority === 'critical'
        ).length;
        const averageConfidence = insights.reduce((sum, i) => sum + i.confidence, 0) / totalPersonas;

        // Calculate consensus level based on agreements vs conflicts
        const totalRecommendations = insights.reduce((sum, i) => sum + i.recommendations.length, 0);
        const consensusLevel = Math.max(0, 100 - (analysis.conflicts.length / totalRecommendations * 100));

        // Estimate success probability based on multiple factors
        let successProbability = 70; // Base probability

        // Adjust for confidence level
        if (averageConfidence > 85) successProbability += 15;
        else if (averageConfidence > 70) successProbability += 10;
        else if (averageConfidence < 60) successProbability -= 10;

        // Adjust for consensus level
        if (consensusLevel > 80) successProbability += 10;
        else if (consensusLevel < 60) successProbability -= 15;

        // Adjust for critical findings
        if (criticalFindings === 0) successProbability += 5;
        else if (criticalFindings > 2) successProbability -= 10;

        // Adjust for coverage gaps
        if (analysis.gaps.length > 0) successProbability -= 5;

        // Cap at reasonable bounds
        successProbability = Math.max(20, Math.min(95, successProbability));

        return {
            totalPersonas,
            criticalFindings,
            highPriorityActions,
            averageConfidence: Math.round(averageConfidence),
            consensusLevel: Math.round(consensusLevel),
            estimatedSuccessProbability: successProbability
        };
    }

    /**
     * Get consultation result
     */
    public getConsultationResult(projectId: string): ConsultationResult | null {
        return this.activeConsultations.get(projectId) || null;
    }

    /**
     * Update consultation with new insights
     */
    public async updateConsultation(
        projectId: string,
        additionalPersonas: string[]
    ): Promise<ConsultationResult | null> {
        const existingResult = this.activeConsultations.get(projectId);
        if (!existingResult) return null;

        // Get additional insights
        const projectContext: ProjectContext = {
            projectType: 'website', // This would come from the original request
            requirements: [],
            features: [],
            complexity: 'medium',
            timeline: '6 weeks'
        };

        const additionalInsights = await this.personaService.conductMultiPersonaConsultation(
            projectId,
            projectContext,
            additionalPersonas
        );

        // Merge with existing insights
        const allInsights = [...existingResult.personaInsights, ...additionalInsights];
        
        // Regenerate analysis with combined insights
        const crossPersonaAnalysis = this.performCrossPersonaAnalysis(allInsights);
        const actionPlan = this.generateActionPlan(allInsights, crossPersonaAnalysis);
        const riskMatrix = this.createRiskMatrix(allInsights);
        const summary = this.calculateSummaryMetrics(allInsights, crossPersonaAnalysis);

        const updatedResult: ConsultationResult = {
            ...existingResult,
            summary,
            personaInsights: allInsights,
            crossPersonaAnalysis,
            actionPlan,
            riskMatrix,
            timestamp: new Date().toISOString()
        };

        this.activeConsultations.set(projectId, updatedResult);
        return updatedResult;
    }

    /**
     * Export detailed consultation report
     */
    public exportDetailedReport(projectId: string): string {
        const result = this.activeConsultations.get(projectId);
        if (!result) return '';

        let report = `# Multi-Persona Consultation Report\n`;
        report += `**Project ID**: ${projectId}\n`;
        report += `**Consultation ID**: ${result.consultationId}\n`;
        report += `**Generated**: ${new Date(result.timestamp).toLocaleString()}\n\n`;

        // Executive Summary
        report += `## Executive Summary\n\n`;
        report += `- **Expert Personas Consulted**: ${result.summary.totalPersonas}\n`;
        report += `- **Critical Findings**: ${result.summary.criticalFindings}\n`;
        report += `- **High Priority Actions**: ${result.summary.highPriorityActions}\n`;
        report += `- **Average Confidence**: ${result.summary.averageConfidence}%\n`;
        report += `- **Expert Consensus**: ${result.summary.consensusLevel}%\n`;
        report += `- **Estimated Success Probability**: ${result.summary.estimatedSuccessProbability}%\n\n`;

        // Cross-Persona Analysis
        report += `## Cross-Persona Analysis\n\n`;
        
        if (result.crossPersonaAnalysis.agreements.length > 0) {
            report += `### Expert Agreements\n`;
            result.crossPersonaAnalysis.agreements.forEach(agreement => {
                report += `- ${agreement}\n`;
            });
            report += `\n`;
        }

        if (result.crossPersonaAnalysis.conflicts.length > 0) {
            report += `### Areas Requiring Balance\n`;
            result.crossPersonaAnalysis.conflicts.forEach(conflict => {
                report += `- ${conflict}\n`;
            });
            report += `\n`;
        }

        // Action Plan
        report += `## Recommended Action Plan\n\n`;
        
        if (result.actionPlan.immediate.length > 0) {
            report += `### Immediate Actions (Next 1-2 weeks)\n`;
            result.actionPlan.immediate.forEach(action => {
                report += `- ${action}\n`;
            });
            report += `\n`;
        }

        if (result.actionPlan.shortTerm.length > 0) {
            report += `### Short-term Actions (Next 1-2 months)\n`;
            result.actionPlan.shortTerm.forEach(action => {
                report += `- ${action}\n`;
            });
            report += `\n`;
        }

        if (result.actionPlan.longTerm.length > 0) {
            report += `### Long-term Considerations (3+ months)\n`;
            result.actionPlan.longTerm.forEach(action => {
                report += `- ${action}\n`;
            });
            report += `\n`;
        }

        // Risk Matrix
        report += `## Risk Analysis Matrix\n\n`;
        
        if (result.riskMatrix.security.length > 0) {
            report += `### Security Risks\n`;
            result.riskMatrix.security.forEach(risk => report += `- ${risk}\n`);
            report += `\n`;
        }

        if (result.riskMatrix.technical.length > 0) {
            report += `### Technical Risks\n`;
            result.riskMatrix.technical.forEach(risk => report += `- ${risk}\n`);
            report += `\n`;
        }

        if (result.riskMatrix.business.length > 0) {
            report += `### Business Risks\n`;
            result.riskMatrix.business.forEach(risk => report += `- ${risk}\n`);
            report += `\n`;
        }

        if (result.riskMatrix.operational.length > 0) {
            report += `### Operational Risks\n`;
            result.riskMatrix.operational.forEach(risk => report += `- ${risk}\n`);
            report += `\n`;
        }

        // Individual Persona Insights
        report += `## Detailed Persona Insights\n\n`;
        result.personaInsights.forEach(insight => {
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
            report += `\n`;

            report += `**Estimated Impact**: ${insight.estimatedImpact}\n\n`;
            report += `---\n\n`;
        });

        return report;
    }

    /**
     * Clear consultation data
     */
    public clearConsultation(projectId: string): void {
        this.activeConsultations.delete(projectId);
    }

    /**
     * Get available personas for selection
     */
    public getAvailablePersonas() {
        return this.personaService.getAvailablePersonas();
    }
}

export { MultiPersonaConsultation, ConsultationRequest, ConsultationResult };