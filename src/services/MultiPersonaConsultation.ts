import { ClaudePersona, CodeAnalysis, DecisionResult, ProjectContext } from '../types/supervision';
import { CLAUDE_PERSONAS } from './SuperClaudeCommands';

export interface PersonaOpinion {
  persona: ClaudePersona;
  recommendation: 'approve' | 'reject' | 'request_improvement' | 'escalate';
  confidence: number;
  reasoning: string;
  concerns: string[];
  suggestions: string[];
  analysisTime: number;
}

export interface ConsultationResult {
  finalDecision: DecisionResult;
  consultedPersonas: ClaudePersona[];
  opinions: PersonaOpinion[];
  consensusLevel: number;
  conflictingViews: string[];
  synthesizedReasoning: string;
}

export interface ComplexScenario {
  codeAnalysis: CodeAnalysis;
  projectContext: ProjectContext;
  changeDescription: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresConsensus: boolean;
  minimumPersonas: number;
}

export class MultiPersonaConsultation {
  private consultationHistory: Map<string, ConsultationResult> = new Map();

  async consultPersonas(
    personas: ClaudePersona[],
    scenario: ComplexScenario
  ): Promise<ConsultationResult> {
    const opinions: PersonaOpinion[] = [];
    
    for (const persona of personas) {
      const opinion = await this.getPersonaOpinion(persona, scenario);
      opinions.push(opinion);
    }

    const finalDecision = await this.synthesizeOpinions(opinions, scenario);
    const consensusLevel = this.calculateConsensusLevel(opinions);
    const conflictingViews = this.identifyConflicts(opinions);

    const result: ConsultationResult = {
      finalDecision,
      consultedPersonas: personas,
      opinions,
      consensusLevel,
      conflictingViews,
      synthesizedReasoning: this.generateSynthesizedReasoning(opinions, finalDecision)
    };

    this.consultationHistory.set(
      `${scenario.projectContext.workspaceId}-${Date.now()}`,
      result
    );

    return result;
  }

  async getPersonaOpinion(
    persona: ClaudePersona,
    scenario: ComplexScenario
  ): Promise<PersonaOpinion> {
    const startTime = Date.now();
    const personaInfo = CLAUDE_PERSONAS[persona];
    
    if (!personaInfo) {
      throw new Error(`Unknown persona: ${persona}`);
    }

    const opinion = await this.analyzeWithPersona(persona, scenario, personaInfo);
    const analysisTime = Date.now() - startTime;

    return {
      ...opinion,
      persona,
      analysisTime
    };
  }

  private async analyzeWithPersona(
    persona: ClaudePersona,
    scenario: ComplexScenario,
    personaInfo: any
  ): Promise<Omit<PersonaOpinion, 'persona' | 'analysisTime'>> {
    const { codeAnalysis, projectContext, changeDescription, riskLevel } = scenario;

    switch (persona) {
      case 'security':
        return this.securityPersonaAnalysis(codeAnalysis, changeDescription, riskLevel);
      
      case 'architect':
        return this.architectPersonaAnalysis(codeAnalysis, projectContext, changeDescription);
      
      case 'qa':
        return this.qaPersonaAnalysis(codeAnalysis, changeDescription);
      
      case 'performance':
        return this.performancePersonaAnalysis(codeAnalysis, changeDescription);
      
      case 'frontend':
        return this.frontendPersonaAnalysis(codeAnalysis, projectContext, changeDescription);
      
      case 'backend':
        return this.backendPersonaAnalysis(codeAnalysis, projectContext, changeDescription);
      
      case 'analyzer':
        return this.analyzerPersonaAnalysis(codeAnalysis, changeDescription);
      
      default:
        return this.defaultPersonaAnalysis(codeAnalysis, changeDescription);
    }
  }

  private async securityPersonaAnalysis(
    analysis: CodeAnalysis,
    changeDescription: string,
    riskLevel: string
  ): Promise<Omit<PersonaOpinion, 'persona' | 'analysisTime'>> {
    const securityScore = analysis.securityAssessment.riskScore;
    const vulnerabilities = analysis.securityAssessment.vulnerabilities;

    if (securityScore > 70 || vulnerabilities.length > 0) {
      return {
        recommendation: 'reject',
        confidence: 90,
        reasoning: 'Security vulnerabilities detected that require immediate attention',
        concerns: vulnerabilities,
        suggestions: [
          'Fix identified security vulnerabilities',
          'Run OWASP security scan',
          'Implement input validation',
          'Add security headers'
        ]
      };
    }

    return {
      recommendation: securityScore > 30 ? 'request_improvement' : 'approve',
      confidence: 85,
      reasoning: 'Security assessment passed with acceptable risk level',
      concerns: securityScore > 30 ? ['Moderate security risk detected'] : [],
      suggestions: securityScore > 30 ? ['Consider additional security hardening'] : []
    };
  }

  private async architectPersonaAnalysis(
    analysis: CodeAnalysis,
    context: ProjectContext,
    changeDescription: string
  ): Promise<Omit<PersonaOpinion, 'persona' | 'analysisTime'>> {
    const architecturalReview = analysis.architecturalReview;
    
    if (!architecturalReview) {
      return {
        recommendation: 'request_improvement',
        confidence: 60,
        reasoning: 'Architectural review required for this change',
        concerns: ['Missing architectural assessment'],
        suggestions: ['Perform architectural impact analysis']
      };
    }

    if (architecturalReview.confidence < 70) {
      return {
        recommendation: 'escalate',
        confidence: architecturalReview.confidence,
        reasoning: architecturalReview.reasoning,
        concerns: ['Low confidence in architectural decision'],
        suggestions: architecturalReview.suggestions
      };
    }

    return {
      recommendation: 'approve',
      confidence: architecturalReview.confidence,
      reasoning: architecturalReview.reasoning,
      concerns: [],
      suggestions: architecturalReview.suggestions
    };
  }

  private async qaPersonaAnalysis(
    analysis: CodeAnalysis,
    changeDescription: string
  ): Promise<Omit<PersonaOpinion, 'persona' | 'analysisTime'>> {
    const testResults = analysis.testResults;
    const qualityScore = analysis.qualityScore;

    if (!testResults.passed) {
      return {
        recommendation: 'reject',
        confidence: 95,
        reasoning: 'Tests are failing and must pass before approval',
        concerns: ['Failing tests detected'],
        suggestions: [
          'Fix failing tests',
          'Add missing test coverage',
          'Verify edge cases'
        ]
      };
    }

    if (testResults.coverage < 70) {
      return {
        recommendation: 'request_improvement',
        confidence: 80,
        reasoning: 'Test coverage is below acceptable threshold',
        concerns: [`Test coverage is ${testResults.coverage}%, minimum is 70%`],
        suggestions: [
          'Add unit tests for new functionality',
          'Add integration tests',
          'Test error handling scenarios'
        ]
      };
    }

    return {
      recommendation: 'approve',
      confidence: 90,
      reasoning: 'All tests pass with good coverage',
      concerns: [],
      suggestions: qualityScore < 85 ? ['Consider additional quality improvements'] : []
    };
  }

  private async performancePersonaAnalysis(
    analysis: CodeAnalysis,
    changeDescription: string
  ): Promise<Omit<PersonaOpinion, 'persona' | 'analysisTime'>> {
    const performanceImpact = analysis.performanceImpact;

    if (performanceImpact.degradation > 25) {
      return {
        recommendation: 'reject',
        confidence: 85,
        reasoning: 'Significant performance degradation detected',
        concerns: performanceImpact.issues,
        suggestions: [
          'Optimize performance-critical code paths',
          'Add performance monitoring',
          'Consider caching strategies'
        ]
      };
    }

    if (performanceImpact.degradation > 10) {
      return {
        recommendation: 'request_improvement',
        confidence: 75,
        reasoning: 'Moderate performance impact requires optimization',
        concerns: performanceImpact.issues,
        suggestions: [
          'Profile performance bottlenecks',
          'Optimize algorithms',
          'Consider lazy loading'
        ]
      };
    }

    return {
      recommendation: 'approve',
      confidence: 90,
      reasoning: 'Performance impact is within acceptable limits',
      concerns: [],
      suggestions: []
    };
  }

  private async frontendPersonaAnalysis(
    analysis: CodeAnalysis,
    context: ProjectContext,
    changeDescription: string
  ): Promise<Omit<PersonaOpinion, 'persona' | 'analysisTime'>> {
    const qualityScore = analysis.qualityScore;

    return {
      recommendation: qualityScore > 80 ? 'approve' : 'request_improvement',
      confidence: 85,
      reasoning: 'Frontend code quality assessment completed',
      concerns: qualityScore <= 80 ? ['Code quality below frontend standards'] : [],
      suggestions: [
        'Ensure responsive design',
        'Add accessibility features',
        'Optimize bundle size',
        'Follow design system guidelines'
      ]
    };
  }

  private async backendPersonaAnalysis(
    analysis: CodeAnalysis,
    context: ProjectContext,
    changeDescription: string
  ): Promise<Omit<PersonaOpinion, 'persona' | 'analysisTime'>> {
    const qualityScore = analysis.qualityScore;
    const securityScore = analysis.securityAssessment.riskScore;

    if (securityScore > 50) {
      return {
        recommendation: 'reject',
        confidence: 90,
        reasoning: 'Backend security concerns must be addressed',
        concerns: ['High security risk for backend changes'],
        suggestions: [
          'Implement proper authentication',
          'Add input validation',
          'Use parameterized queries',
          'Add rate limiting'
        ]
      };
    }

    return {
      recommendation: qualityScore > 75 ? 'approve' : 'request_improvement',
      confidence: 85,
      reasoning: 'Backend code quality and security assessment completed',
      concerns: qualityScore <= 75 ? ['Backend code quality needs improvement'] : [],
      suggestions: [
        'Add error handling',
        'Implement logging',
        'Add monitoring',
        'Optimize database queries'
      ]
    };
  }

  private async analyzerPersonaAnalysis(
    analysis: CodeAnalysis,
    changeDescription: string
  ): Promise<Omit<PersonaOpinion, 'persona' | 'analysisTime'>> {
    const qualityScore = analysis.qualityScore;
    const issues = [
      ...analysis.securityAssessment.vulnerabilities,
      ...analysis.performanceImpact.issues
    ];

    return {
      recommendation: issues.length === 0 && qualityScore > 85 ? 'approve' : 'request_improvement',
      confidence: 80,
      reasoning: 'Comprehensive code analysis completed',
      concerns: issues,
      suggestions: [
        'Address identified issues',
        'Improve code documentation',
        'Add error handling',
        'Consider refactoring opportunities'
      ]
    };
  }

  private async defaultPersonaAnalysis(
    analysis: CodeAnalysis,
    changeDescription: string
  ): Promise<Omit<PersonaOpinion, 'persona' | 'analysisTime'>> {
    return {
      recommendation: analysis.qualityScore > 80 ? 'approve' : 'request_improvement',
      confidence: 70,
      reasoning: 'General code quality assessment',
      concerns: analysis.qualityScore <= 80 ? ['Code quality below standards'] : [],
      suggestions: ['Follow coding best practices']
    };
  }

  async synthesizeOpinions(
    opinions: PersonaOpinion[],
    scenario: ComplexScenario
  ): Promise<DecisionResult> {
    const approvals = opinions.filter(o => o.recommendation === 'approve');
    const rejections = opinions.filter(o => o.recommendation === 'reject');
    const improvements = opinions.filter(o => o.recommendation === 'request_improvement');
    const escalations = opinions.filter(o => o.recommendation === 'escalate');

    if (rejections.length > 0) {
      return {
        action: 'reject',
        confidence: Math.max(...rejections.map(r => r.confidence)),
        reason: `Rejected by ${rejections.map(r => r.persona).join(', ')}: ${rejections[0].reasoning}`,
        suggestions: this.mergeSuggestions(rejections),
        concerns: this.mergeConcerns(rejections),
        workspaceId: scenario.projectContext.workspaceId
      };
    }

    if (escalations.length > 0) {
      return {
        action: 'escalate_to_human',
        confidence: Math.max(...escalations.map(e => e.confidence)),
        reason: `Escalated by ${escalations.map(e => e.persona).join(', ')}: ${escalations[0].reasoning}`,
        suggestions: this.mergeSuggestions(escalations),
        concerns: this.mergeConcerns(escalations),
        workspaceId: scenario.projectContext.workspaceId
      };
    }

    if (improvements.length > approvals.length) {
      return {
        action: 'request_improvement',
        confidence: this.calculateAverageConfidence(improvements),
        reason: `Improvements requested by ${improvements.map(i => i.persona).join(', ')}`,
        suggestions: this.mergeSuggestions(improvements),
        concerns: this.mergeConcerns(improvements),
        workspaceId: scenario.projectContext.workspaceId
      };
    }

    return {
      action: 'approve',
      confidence: this.calculateAverageConfidence(approvals),
      reason: `Approved by ${approvals.map(a => a.persona).join(', ')}`,
      suggestions: this.mergeSuggestions(opinions),
      concerns: this.mergeConcerns(opinions.filter(o => o.concerns.length > 0)),
      workspaceId: scenario.projectContext.workspaceId
    };
  }

  private calculateConsensusLevel(opinions: PersonaOpinion[]): number {
    if (opinions.length === 0) return 0;

    const recommendationCounts = opinions.reduce((acc, opinion) => {
      acc[opinion.recommendation] = (acc[opinion.recommendation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const maxCount = Math.max(...Object.values(recommendationCounts));
    return (maxCount / opinions.length) * 100;
  }

  private identifyConflicts(opinions: PersonaOpinion[]): string[] {
    const conflicts: string[] = [];
    const recommendations = opinions.map(o => o.recommendation);
    const uniqueRecommendations = Array.from(new Set(recommendations));

    if (uniqueRecommendations.length > 1) {
      for (const rec of uniqueRecommendations) {
        const personas = opinions
          .filter(o => o.recommendation === rec)
          .map(o => o.persona);
        conflicts.push(`${rec}: ${personas.join(', ')}`);
      }
    }

    return conflicts;
  }

  private generateSynthesizedReasoning(
    opinions: PersonaOpinion[],
    finalDecision: DecisionResult
  ): string {
    const reasoningPoints = opinions.map(o => `${o.persona}: ${o.reasoning}`);
    return `Final decision: ${finalDecision.action}. ${reasoningPoints.join('; ')}`;
  }

  private mergeSuggestions(opinions: PersonaOpinion[]): string[] {
    const allSuggestions = opinions.flatMap(o => o.suggestions);
    return Array.from(new Set(allSuggestions));
  }

  private mergeConcerns(opinions: PersonaOpinion[]): string[] {
    const allConcerns = opinions.flatMap(o => o.concerns);
    return Array.from(new Set(allConcerns));
  }

  private calculateAverageConfidence(opinions: PersonaOpinion[]): number {
    if (opinions.length === 0) return 0;
    const totalConfidence = opinions.reduce((sum, o) => sum + o.confidence, 0);
    return Math.round(totalConfidence / opinions.length);
  }

  getConsultationHistory(workspaceId?: string): ConsultationResult[] {
    const results = Array.from(this.consultationHistory.values());
    
    if (workspaceId) {
      return results.filter(r => r.finalDecision.workspaceId === workspaceId);
    }
    
    return results;
  }

  clearConsultationHistory(workspaceId?: string): void {
    if (workspaceId) {
      Array.from(this.consultationHistory.entries()).forEach(([key, result]) => {
        if (result.finalDecision.workspaceId === workspaceId) {
          this.consultationHistory.delete(key);
        }
      });
    } else {
      this.consultationHistory.clear();
    }
  }
}
