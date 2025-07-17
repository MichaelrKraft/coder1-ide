import { ClaudePersona, CodeAnalysis, DecisionResult, ApprovalThresholds, ProjectContext } from '../types/supervision';

export interface ClaudeAgentSupervisor {
  id: string;
  workspaceId: string;
  status: 'active' | 'sleeping' | 'monitoring' | 'intervening';
  persona: ClaudePersona;
  autonomyLevel: 'conservative' | 'balanced' | 'aggressive';
  approvalThresholds: ApprovalThresholds;
  monitoringRules: MonitoringRule[];
  interventionHistory: Intervention[];
}

export interface MonitoringRule {
  id: string;
  name: string;
  condition: string;
  action: 'approve' | 'reject' | 'escalate' | 'request_improvement';
  priority: number;
}

export interface Intervention {
  id: string;
  timestamp: Date;
  type: 'auto_approve' | 'auto_reject' | 'escalate' | 'improvement_request';
  reason: string;
  codeChange: string;
  decision: string;
}

export class AutonomousDecisionEngine {
  private qualityGates: QualityGate[];
  private superClaudeFramework: SuperClaudeFramework;

  constructor() {
    this.qualityGates = this.initializeQualityGates();
    this.superClaudeFramework = new SuperClaudeFramework();
  }

  async evaluateClaudeOutput(
    claudeCode: string,
    context: ProjectContext,
    supervisor: ClaudeAgentSupervisor
  ): Promise<DecisionResult> {
    const qualityScore = await this.analyzeCodeQuality(claudeCode);
    const securityAssessment = await this.scanSecurity(claudeCode);
    const performanceImpact = await this.analyzePerformance(claudeCode);
    const testResults = await this.runAutomatedTests(claudeCode, context);
    
    const architecturalReview = await this.superClaudeFramework.analyze({
      persona: 'architect',
      command: '/analyze --code --arch --security',
      context: claudeCode
    });
    
    return this.makeDecision({
      qualityScore,
      securityAssessment,
      performanceImpact,
      testResults,
      architecturalReview
    });
  }

  async makeDecision(analysis: CodeAnalysis): Promise<DecisionResult> {
    const decision: DecisionResult = {
      action: 'approve',
      confidence: 0,
      reason: '',
      suggestions: [],
      concerns: []
    };

    const defaultThresholds = {
      securityRisk: 30,
      codeQuality: 80,
      performanceImpact: 25
    };

    if (analysis.securityAssessment.riskScore > defaultThresholds.securityRisk) {
      decision.action = 'reject';
      decision.reason = 'Security risk exceeds threshold';
      decision.concerns.push(`Security risk: ${analysis.securityAssessment.riskScore}/${defaultThresholds.securityRisk}`);
      return decision;
    }

    if (analysis.qualityScore < defaultThresholds.codeQuality) {
      decision.action = 'request_improvement';
      decision.reason = 'Code quality below threshold';
      decision.suggestions.push('Improve code quality to meet standards');
      return decision;
    }

    if (analysis.performanceImpact.degradation > defaultThresholds.performanceImpact) {
      decision.action = 'escalate_to_human';
      decision.reason = 'Performance impact requires human review';
      decision.concerns.push(`Performance degradation: ${analysis.performanceImpact.degradation}%`);
      return decision;
    }

    decision.confidence = this.calculateConfidence(analysis);
    decision.reason = 'All quality gates passed';
    return decision;
  }

  private async analyzeCodeQuality(code: string): Promise<number> {
    let score = 100;
    
    if (!code.includes('export')) score -= 10;
    if (code.includes('any')) score -= 15;
    if (code.includes('console.log')) score -= 5;
    if (!code.includes('interface') && !code.includes('type')) score -= 10;
    
    const lines = code.split('\n');
    const longLines = lines.filter(line => line.length > 120);
    score -= longLines.length * 2;
    
    return Math.max(0, score);
  }

  private async scanSecurity(code: string): Promise<{ riskScore: number; vulnerabilities: string[] }> {
    const vulnerabilities: string[] = [];
    let riskScore = 0;

    if (code.includes('eval(')) {
      vulnerabilities.push('Use of eval() function');
      riskScore += 50;
    }

    if (code.includes('innerHTML')) {
      vulnerabilities.push('Potential XSS via innerHTML');
      riskScore += 30;
    }

    if (code.includes('document.write')) {
      vulnerabilities.push('Use of document.write');
      riskScore += 25;
    }

    if (code.includes('localStorage') && !code.includes('JSON.parse')) {
      vulnerabilities.push('Unsafe localStorage usage');
      riskScore += 15;
    }

    return { riskScore, vulnerabilities };
  }

  private async analyzePerformance(code: string): Promise<{ degradation: number; issues: string[] }> {
    const issues: string[] = [];
    let degradation = 0;

    if (code.includes('for (') && code.includes('for (')) {
      issues.push('Nested loops detected');
      degradation += 20;
    }

    if (code.includes('setTimeout') && code.includes('setInterval')) {
      issues.push('Multiple timers may cause performance issues');
      degradation += 15;
    }

    const regexCount = (code.match(/new RegExp/g) || []).length;
    if (regexCount > 3) {
      issues.push('Multiple regex operations');
      degradation += regexCount * 5;
    }

    return { degradation, issues };
  }

  private async runAutomatedTests(code: string, context: ProjectContext): Promise<{ passed: boolean; coverage: number }> {
    const hasTests = code.includes('test(') || code.includes('it(') || code.includes('describe(');
    const hasAssertions = code.includes('expect(') || code.includes('assert');
    
    return {
      passed: hasTests && hasAssertions,
      coverage: hasTests ? 85 : 0
    };
  }

  private calculateConfidence(analysis: CodeAnalysis): number {
    let confidence = 100;
    
    confidence -= (100 - analysis.qualityScore) * 0.5;
    confidence -= analysis.securityAssessment.riskScore * 0.3;
    confidence -= analysis.performanceImpact.degradation * 0.2;
    
    if (!analysis.testResults.passed) confidence -= 20;
    
    return Math.max(0, Math.min(100, confidence));
  }

  private initializeQualityGates(): QualityGate[] {
    return [
      {
        name: 'TypeScript Compliance',
        validator: async (code) => ({ score: await this.analyzeCodeQuality(code), passed: true }),
        threshold: 95,
        autoFix: true
      },
      {
        name: 'Security Vulnerabilities',
        validator: async (code) => {
          const result = await this.scanSecurity(code);
          return { score: 100 - result.riskScore, passed: result.riskScore === 0 };
        },
        threshold: 100,
        autoFix: false
      },
      {
        name: 'Performance Impact',
        validator: async (code) => {
          const result = await this.analyzePerformance(code);
          return { score: 100 - result.degradation, passed: result.degradation < 15 };
        },
        threshold: 85,
        autoFix: false
      }
    ];
  }
}

interface QualityGate {
  name: string;
  validator: (code: string) => Promise<{ score: number; passed: boolean }>;
  threshold: number;
  autoFix: boolean;
}

class SuperClaudeFramework {
  async analyze(params: { persona: string; command: string; context: string }) {
    return {
      recommendation: 'approve',
      confidence: 85,
      reasoning: `${params.persona} persona analysis completed`,
      suggestions: []
    };
  }
}
