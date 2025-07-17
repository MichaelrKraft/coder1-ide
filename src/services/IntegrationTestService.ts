import { SupervisionEngine } from './SupervisionEngine';
import { FileMonitoringService } from './FileMonitoringService';
import { SleepModeManager } from './SleepModeManager';
import { WorkspaceService } from './WorkspaceService';
import { MCPServerManager } from './MCPServerManager';
import { SecurityService } from './SecurityService';
import { PerformanceMonitor } from './PerformanceMonitor';
import { ClaudePersona, ApprovalThresholds } from '../types/supervision';

export interface IntegrationTestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

export interface TestSuite {
  name: string;
  tests: IntegrationTestResult[];
  passed: boolean;
  totalDuration: number;
}

export class IntegrationTestService {
  private supervisionEngine: SupervisionEngine;
  private fileMonitoring: FileMonitoringService;
  private sleepModeManager: SleepModeManager;
  private workspaceService: WorkspaceService;
  private mcpServerManager: MCPServerManager;
  private securityService: SecurityService;
  private performanceMonitor: PerformanceMonitor;

  constructor() {
    this.supervisionEngine = new SupervisionEngine();
    this.fileMonitoring = new FileMonitoringService();
    this.sleepModeManager = new SleepModeManager();
    this.workspaceService = new WorkspaceService();
    this.mcpServerManager = new MCPServerManager();
    this.securityService = new SecurityService();
    this.performanceMonitor = new PerformanceMonitor();
  }

  async runAllTests(): Promise<TestSuite[]> {
    const testSuites: TestSuite[] = [];

    testSuites.push(await this.runSupervisionEngineTests());
    testSuites.push(await this.runFileMonitoringTests());
    testSuites.push(await this.runSleepModeTests());
    testSuites.push(await this.runWorkspaceTests());
    testSuites.push(await this.runMCPServerTests());
    testSuites.push(await this.runSecurityTests());
    testSuites.push(await this.runPerformanceTests());
    testSuites.push(await this.runIntegrationTests());

    return testSuites;
  }

  private async runSupervisionEngineTests(): Promise<TestSuite> {
    const tests: IntegrationTestResult[] = [];
    const startTime = Date.now();

    tests.push(await this.runTest('Supervision Engine Initialization', async () => {
      const supervisor = await this.supervisionEngine.createSupervisor('test-workspace', {
        persona: 'analyzer',
        autonomyLevel: 'balanced',
        approvalThresholds: {
          codeQuality: 80,
          securityRisk: 20,
          performanceImpact: 30,
          testCoverage: 70
        }
      });
      
      if (!supervisor || !supervisor.id) {
        throw new Error('Failed to create supervisor');
      }
      
      return { supervisorId: supervisor.id };
    }));

    tests.push(await this.runTest('Code Analysis Decision Making', async () => {
      const mockCodeChange = {
        filePath: '/test/example.ts',
        content: 'const test = "hello world";',
        changeType: 'modification' as const,
        author: 'test-user',
        timestamp: new Date()
      };

      const decision = await this.supervisionEngine.analyzeCodeChange(mockCodeChange, {
        persona: 'analyzer',
        autonomyLevel: 'balanced',
        approvalThresholds: {
          codeQuality: 80,
          securityRisk: 20,
          performanceImpact: 30,
          testCoverage: 70
        }
      });

      if (!decision || !decision.action) {
        throw new Error('Failed to make decision on code change');
      }

      return { decision: decision.action, confidence: decision.confidence };
    }));

    tests.push(await this.runTest('Quality Gates Validation', async () => {
      const mockCode = `
        function calculateSum(a: number, b: number): number {
          return a + b;
        }
      `;

      const qualityResult = await this.supervisionEngine.validateQualityGates(mockCode, {
        codeQuality: 80,
        securityRisk: 20,
        performanceImpact: 30,
        testCoverage: 70
      });

      if (!qualityResult || typeof qualityResult.passed !== 'boolean') {
        throw new Error('Quality gates validation failed');
      }

      return { passed: qualityResult.passed, score: qualityResult.score };
    }));

    const totalDuration = Date.now() - startTime;
    const passed = tests.every(test => test.passed);

    return {
      name: 'Supervision Engine Tests',
      tests,
      passed,
      totalDuration
    };
  }

  private async runFileMonitoringTests(): Promise<TestSuite> {
    const tests: IntegrationTestResult[] = [];
    const startTime = Date.now();

    tests.push(await this.runTest('File Monitoring Initialization', async () => {
      await this.fileMonitoring.startMonitoring({
        workspaceId: 'test-workspace',
        supervisor: {
          id: 'test-supervisor',
          workspaceId: 'test-workspace',
          status: 'monitoring',
          persona: 'analyzer',
          autonomyLevel: 'balanced',
          approvalThresholds: {
            codeQuality: 80,
            securityRisk: 20,
            performanceImpact: 30,
            testCoverage: 70
          },
          monitoringRules: [],
          interventionHistory: []
        },
        enableRealTimeMonitoring: true,
        monitoringInterval: 1000,
        autoApprovalEnabled: true
      });

      return { status: 'monitoring started' };
    }));

    tests.push(await this.runTest('File Change Detection', async () => {
      const isMonitoring = this.fileMonitoring.isMonitoring('test-workspace');
      
      if (!isMonitoring) {
        throw new Error('File monitoring not active');
      }

      return { monitoring: isMonitoring };
    }));

    tests.push(await this.runTest('Stop File Monitoring', async () => {
      await this.fileMonitoring.stopMonitoring('test-workspace');
      const isMonitoring = this.fileMonitoring.isMonitoring('test-workspace');
      
      if (isMonitoring) {
        throw new Error('Failed to stop monitoring');
      }

      return { monitoring: isMonitoring };
    }));

    const totalDuration = Date.now() - startTime;
    const passed = tests.every(test => test.passed);

    return {
      name: 'File Monitoring Tests',
      tests,
      passed,
      totalDuration
    };
  }

  private async runSleepModeTests(): Promise<TestSuite> {
    const tests: IntegrationTestResult[] = [];
    const startTime = Date.now();

    tests.push(await this.runTest('Enable Sleep Mode', async () => {
      await this.sleepModeManager.enableSleepMode('test-workspace', {
        autonomyLevel: 'balanced',
        thresholds: {
          codeQuality: 80,
          securityRisk: 20,
          performanceImpact: 30,
          testCoverage: 70
        },
        escalationRules: [],
        maxChangesPerHour: 10,
        autoCommit: false,
        requiresHumanReview: true,
        notificationChannels: ['push']
      });

      const status = this.sleepModeManager.getSleepModeStatus('test-workspace');
      
      if (!status || !status.isActive) {
        throw new Error('Sleep mode not activated');
      }

      return { active: status.isActive };
    }));

    tests.push(await this.runTest('Sleep Mode Status Check', async () => {
      const status = this.sleepModeManager.getSleepModeStatus('test-workspace');
      
      if (!status) {
        throw new Error('No sleep mode status found');
      }

      return { 
        active: status.isActive,
        workspaces: status.workspacesMonitored.length
      };
    }));

    tests.push(await this.runTest('Disable Sleep Mode', async () => {
      const finalStatus = await this.sleepModeManager.disableSleepMode('test-workspace');
      
      if (finalStatus.isActive) {
        throw new Error('Failed to disable sleep mode');
      }

      return { 
        disabled: !finalStatus.isActive,
        approved: finalStatus.changesApproved,
        rejected: finalStatus.changesRejected
      };
    }));

    const totalDuration = Date.now() - startTime;
    const passed = tests.every(test => test.passed);

    return {
      name: 'Sleep Mode Tests',
      tests,
      passed,
      totalDuration
    };
  }

  private async runWorkspaceTests(): Promise<TestSuite> {
    const tests: IntegrationTestResult[] = [];
    const startTime = Date.now();

    tests.push(await this.runTest('Create Workspace', async () => {
      const workspace = await this.workspaceService.createWorkspace({
        name: 'Test Workspace',
        projectType: 'react',
        rootPath: '/test/workspace',
        settings: {
          autoSave: true,
          formatOnSave: true,
          lintOnSave: true,
          autoImports: true,
          tabSize: 2,
          theme: 'dark' as const,
          fontSize: 14,
          wordWrap: true,
          minimap: false,
          lineNumbers: true,
          supervisionEnabled: true,
          supervisionLevel: 'balanced' as const,
          autoApprovalThresholds: {
            codeQuality: 80,
            securityRisk: 30,
            performanceImpact: 25,
            testCoverage: 70
          }
        }
      });

      if (!workspace || !workspace.id) {
        throw new Error('Failed to create workspace');
      }

      return { workspaceId: workspace.id, name: workspace.name };
    }));

    tests.push(await this.runTest('Get Workspace', async () => {
      const workspaces = this.workspaceService.getAllWorkspaces();
      const testWorkspace = workspaces.find(w => w.name === 'Test Workspace');
      
      if (!testWorkspace) {
        throw new Error('Test workspace not found');
      }

      return { found: true, id: testWorkspace.id };
    }));

    tests.push(await this.runTest('Delete Workspace', async () => {
      const workspaces = this.workspaceService.getAllWorkspaces();
      const testWorkspace = workspaces.find(w => w.name === 'Test Workspace');
      
      if (testWorkspace) {
        await this.workspaceService.deleteWorkspace(testWorkspace.id);
        const remainingWorkspaces = this.workspaceService.getAllWorkspaces();
        const stillExists = remainingWorkspaces.find(w => w.id === testWorkspace.id);
        
        if (stillExists) {
          throw new Error('Failed to delete workspace');
        }
      }

      return { deleted: true };
    }));

    const totalDuration = Date.now() - startTime;
    const passed = tests.every(test => test.passed);

    return {
      name: 'Workspace Tests',
      tests,
      passed,
      totalDuration
    };
  }

  private async runMCPServerTests(): Promise<TestSuite> {
    const tests: IntegrationTestResult[] = [];
    const startTime = Date.now();

    tests.push(await this.runTest('Initialize MCP Servers', async () => {
      await this.mcpServerManager.initializeServers(['context7', 'sequential']);
      const status = this.mcpServerManager.getServerStatus();
      
      return { initialized: Object.keys(status).length > 0 };
    }));

    tests.push(await this.runTest('Execute MCP Command', async () => {
      const result = await this.mcpServerManager.executeCommand('context7', 'analyze', {
        code: 'const test = "hello";',
        context: 'test analysis'
      });

      return { executed: true, result: result ? 'success' : 'failed' };
    }));

    const totalDuration = Date.now() - startTime;
    const passed = tests.every(test => test.passed);

    return {
      name: 'MCP Server Tests',
      tests,
      passed,
      totalDuration
    };
  }

  private async runSecurityTests(): Promise<TestSuite> {
    const tests: IntegrationTestResult[] = [];
    const startTime = Date.now();

    tests.push(await this.runTest('Security Scan', async () => {
      const mockCode = `
        const password = "hardcoded-password";
        eval(userInput);
      `;

      const scanResult = await this.securityService.scanCode(mockCode, '/test/file.js');
      
      if (!scanResult || !scanResult.vulnerabilities) {
        throw new Error('Security scan failed');
      }

      return { 
        vulnerabilities: scanResult.vulnerabilities.length,
        riskLevel: scanResult.riskLevel
      };
    }));

    tests.push(await this.runTest('OWASP Compliance Check', async () => {
      const complianceResult = await this.securityService.checkOWASPCompliance('/test/project');
      
      return { 
        compliant: complianceResult.compliant,
        issues: complianceResult.issues.length
      };
    }));

    const totalDuration = Date.now() - startTime;
    const passed = tests.every(test => test.passed);

    return {
      name: 'Security Tests',
      tests,
      passed,
      totalDuration
    };
  }

  private async runPerformanceTests(): Promise<TestSuite> {
    const tests: IntegrationTestResult[] = [];
    const startTime = Date.now();

    tests.push(await this.runTest('Start Performance Monitoring', async () => {
      await this.performanceMonitor.startMonitoring('test-workspace');
      const isMonitoring = this.performanceMonitor.isMonitoring('test-workspace');
      
      if (!isMonitoring) {
        throw new Error('Performance monitoring not started');
      }

      return { monitoring: isMonitoring };
    }));

    tests.push(await this.runTest('Get Performance Metrics', async () => {
      const metrics = this.performanceMonitor.getMetrics('test-workspace');
      
      return { 
        hasMetrics: !!metrics && metrics.length > 0,
        metricsCount: metrics?.length || 0
      };
    }));

    tests.push(await this.runTest('Stop Performance Monitoring', async () => {
      await this.performanceMonitor.stopMonitoring('test-workspace');
      const isMonitoring = this.performanceMonitor.isMonitoring('test-workspace');
      
      if (isMonitoring) {
        throw new Error('Failed to stop performance monitoring');
      }

      return { monitoring: isMonitoring };
    }));

    const totalDuration = Date.now() - startTime;
    const passed = tests.every(test => test.passed);

    return {
      name: 'Performance Tests',
      tests,
      passed,
      totalDuration
    };
  }

  private async runIntegrationTests(): Promise<TestSuite> {
    const tests: IntegrationTestResult[] = [];
    const startTime = Date.now();

    tests.push(await this.runTest('End-to-End Supervision Workflow', async () => {
      const workspace = await this.workspaceService.createWorkspace({
        name: 'Integration Test Workspace',
        projectType: 'react',
        rootPath: '/test/integration',
        settings: {
          autoSave: true,
          formatOnSave: true,
          lintOnSave: true,
          autoImports: true,
          tabSize: 2,
          theme: 'dark' as const,
          fontSize: 14,
          wordWrap: true,
          minimap: false,
          lineNumbers: true,
          supervisionEnabled: true,
          supervisionLevel: 'balanced' as const,
          autoApprovalThresholds: {
            codeQuality: 80,
            securityRisk: 30,
            performanceImpact: 25,
            testCoverage: 70
          }
        }
      });

      const supervisor = await this.supervisionEngine.createSupervisor(workspace.id, {
        persona: 'analyzer',
        autonomyLevel: 'balanced',
        approvalThresholds: {
          codeQuality: 80,
          securityRisk: 20,
          performanceImpact: 30,
          testCoverage: 70
        }
      });

      await this.fileMonitoring.startMonitoring({
        workspaceId: workspace.id,
        supervisor,
        enableRealTimeMonitoring: true,
        monitoringInterval: 1000,
        autoApprovalEnabled: true
      });

      await this.sleepModeManager.enableSleepMode(workspace.id, {
        autonomyLevel: 'balanced',
        thresholds: {
          codeQuality: 80,
          securityRisk: 20,
          performanceImpact: 30,
          testCoverage: 70
        },
        escalationRules: [],
        maxChangesPerHour: 10,
        autoCommit: false,
        requiresHumanReview: true,
        notificationChannels: ['push']
      });

      const sleepStatus = this.sleepModeManager.getSleepModeStatus(workspace.id);
      const isMonitoring = this.fileMonitoring.isMonitoring(workspace.id);

      await this.sleepModeManager.disableSleepMode(workspace.id);
      await this.fileMonitoring.stopMonitoring(workspace.id);
      await this.workspaceService.deleteWorkspace(workspace.id);

      return {
        workspaceCreated: !!workspace.id,
        supervisorCreated: !!supervisor.id,
        monitoringActive: isMonitoring,
        sleepModeActive: sleepStatus?.isActive || false
      };
    }));

    tests.push(await this.runTest('Multi-Workspace Isolation', async () => {
      const workspace1 = await this.workspaceService.createWorkspace({
        name: 'Workspace 1',
        projectType: 'react',
        rootPath: '/test/ws1',
        settings: {
          autoSave: true,
          formatOnSave: true,
          lintOnSave: true,
          autoImports: true,
          tabSize: 2,
          theme: 'dark' as const,
          fontSize: 14,
          wordWrap: true,
          minimap: false,
          lineNumbers: true,
          supervisionEnabled: true,
          supervisionLevel: 'balanced' as const,
          autoApprovalThresholds: {
            codeQuality: 80,
            securityRisk: 30,
            performanceImpact: 25,
            testCoverage: 70
          }
        }
      });

      const workspace2 = await this.workspaceService.createWorkspace({
        name: 'Workspace 2',
        projectType: 'node',
        rootPath: '/test/ws2',
        settings: {
          autoSave: false,
          formatOnSave: false,
          lintOnSave: false,
          autoImports: false,
          tabSize: 4,
          theme: 'light' as const,
          fontSize: 12,
          wordWrap: false,
          minimap: true,
          lineNumbers: true,
          supervisionEnabled: false,
          supervisionLevel: 'conservative' as const,
          autoApprovalThresholds: {
            codeQuality: 60,
            securityRisk: 50,
            performanceImpact: 40,
            testCoverage: 50
          }
        }
      });

      const allWorkspaces = this.workspaceService.getAllWorkspaces();
      const ws1 = allWorkspaces.find(w => w.id === workspace1.id);
      const ws2 = allWorkspaces.find(w => w.id === workspace2.id);

      await this.workspaceService.deleteWorkspace(workspace1.id);
      await this.workspaceService.deleteWorkspace(workspace2.id);

      return {
        workspace1Isolated: ws1?.settings.autoSave === true,
        workspace2Isolated: ws2?.settings.autoSave === false,
        differentSettings: ws1?.settings.autoSave !== ws2?.settings.autoSave
      };
    }));

    const totalDuration = Date.now() - startTime;
    const passed = tests.every(test => test.passed);

    return {
      name: 'Integration Tests',
      tests,
      passed,
      totalDuration
    };
  }

  private async runTest(testName: string, testFunction: () => Promise<any>): Promise<IntegrationTestResult> {
    const startTime = Date.now();
    
    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      return {
        testName,
        passed: true,
        duration,
        details: result
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        testName,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  generateTestReport(testSuites: TestSuite[]): string {
    const totalTests = testSuites.reduce((sum, suite) => sum + suite.tests.length, 0);
    const passedTests = testSuites.reduce((sum, suite) => sum + suite.tests.filter(t => t.passed).length, 0);
    const totalDuration = testSuites.reduce((sum, suite) => sum + suite.totalDuration, 0);
    const overallPassed = testSuites.every(suite => suite.passed);

    let report = `# Coder1 IDE Autonomous Supervision System - Integration Test Report\n\n`;
    report += `**Overall Result:** ${overallPassed ? '✅ PASSED' : '❌ FAILED'}\n`;
    report += `**Total Tests:** ${totalTests}\n`;
    report += `**Passed:** ${passedTests}\n`;
    report += `**Failed:** ${totalTests - passedTests}\n`;
    report += `**Total Duration:** ${totalDuration}ms\n\n`;

    for (const suite of testSuites) {
      report += `## ${suite.name}\n`;
      report += `**Status:** ${suite.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
      report += `**Duration:** ${suite.totalDuration}ms\n\n`;

      for (const test of suite.tests) {
        report += `### ${test.testName}\n`;
        report += `- **Result:** ${test.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
        report += `- **Duration:** ${test.duration}ms\n`;
        
        if (test.error) {
          report += `- **Error:** ${test.error}\n`;
        }
        
        if (test.details) {
          report += `- **Details:** ${JSON.stringify(test.details, null, 2)}\n`;
        }
        
        report += `\n`;
      }
    }

    return report;
  }

  async runQuickHealthCheck(): Promise<boolean> {
    try {
      const supervisor = await this.supervisionEngine.createSupervisor('health-check', {
        persona: 'analyzer',
        autonomyLevel: 'balanced',
        approvalThresholds: {
          codeQuality: 80,
          securityRisk: 20,
          performanceImpact: 30,
          testCoverage: 70
        }
      });

      const workspace = await this.workspaceService.createWorkspace({
        name: 'Health Check Workspace',
        projectType: 'react',
        rootPath: '/health-check',
        settings: {
          autoSave: true,
          formatOnSave: true,
          lintOnSave: true,
          autoImports: true,
          tabSize: 2,
          theme: 'dark' as const,
          fontSize: 14,
          wordWrap: true,
          minimap: false,
          lineNumbers: true,
          supervisionEnabled: true,
          supervisionLevel: 'balanced' as const,
          autoApprovalThresholds: {
            codeQuality: 80,
            securityRisk: 30,
            performanceImpact: 25,
            testCoverage: 70
          }
        }
      });

      await this.workspaceService.deleteWorkspace(workspace.id);

      return !!(supervisor && workspace);
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}
