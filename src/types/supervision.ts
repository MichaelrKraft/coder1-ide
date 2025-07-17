export interface ClaudePersona {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  mcpServers: string[];
}

export interface CodeAnalysis {
  qualityScore: number;
  securityAssessment: SecurityAssessment;
  performanceImpact: PerformanceImpact;
  testResults: TestResults;
  architecturalReview?: ArchitecturalReview;
}

export interface SecurityAssessment {
  riskScore: number;
  vulnerabilities: string[];
}

export interface PerformanceImpact {
  degradation: number;
  issues: string[];
}

export interface TestResults {
  passed: boolean;
  coverage: number;
}

export interface ArchitecturalReview {
  recommendation: string;
  confidence: number;
  reasoning: string;
  suggestions: string[];
}

export interface DecisionResult {
  action: 'approve' | 'reject' | 'request_improvement' | 'escalate_to_human';
  confidence: number;
  reason: string;
  suggestions: string[];
  concerns: string[];
  workspaceId?: string;
  filePath?: string;
}

export interface ApprovalThresholds {
  codeQuality: number;
  securityRisk: number;
  performanceImpact: number;
  testCoverage: number;
}

export interface ProjectContext {
  workspaceId: string;
  projectType: string;
  dependencies: string[];
  testFramework: string;
  buildTool: string;
}

export interface QualityResult {
  gateName?: string;
  category?: 'security' | 'performance' | 'quality' | 'testing';
  threshold?: number;
  score: number;
  passed: boolean;
  issues: string[];
  suggestions?: string[];
  autoFixAvailable?: boolean;
}

export interface CodeChange {
  id: string;
  workspaceId: string;
  filePath: string;
  content: string;
  changeType: 'create' | 'modify' | 'delete';
  timestamp: Date;
  source: 'claude-code' | 'user' | 'system';
  metadata: {
    fileSize: number;
    linesChanged: number;
    changeReason: string;
  };
}

export interface FileChange {
  filePath: string;
  content: string;
  changeType: 'create' | 'modify' | 'delete';
  timestamp?: Date;
}
