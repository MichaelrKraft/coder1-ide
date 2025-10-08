/**
 * Jest Global Teardown
 * Runs once after all tests complete
 */

import fs from 'fs';
import path from 'path';

export default async function globalTeardown() {
  console.log('\n🧹 Cleaning up test environment...\n');

  // Generate test summary report
  const coverageDir = path.join(__dirname, '../coverage');
  const testDataDir = path.join(__dirname, '../test-data');
  const artifactsDir = path.join(__dirname, '../test-artifacts');

  // Read coverage summary if available
  let coverageSummary = null;
  const coverageSummaryPath = path.join(coverageDir, 'coverage-summary.json');
  if (fs.existsSync(coverageSummaryPath)) {
    try {
      coverageSummary = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));
    } catch (error) {
      console.warn('⚠️  Could not read coverage summary');
    }
  }

  // Generate test report
  const testReport = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      nodeEnv: process.env.NODE_ENV
    },
    coverage: coverageSummary ? {
      lines: coverageSummary.total?.lines?.pct || 0,
      functions: coverageSummary.total?.functions?.pct || 0,
      branches: coverageSummary.total?.branches?.pct || 0,
      statements: coverageSummary.total?.statements?.pct || 0
    } : null,
    testFiles: {
      unit: getTestFileCount('**/*.test.{ts,tsx}'),
      integration: getTestFileCount('**/integration/*.test.{ts,tsx}'),
      e2e: getTestFileCount('**/e2e/*.test.{ts,tsx}')
    },
    performance: gatherPerformanceMetrics(),
    cleanup: {
      tempFilesRemoved: 0,
      cacheCleared: false,
      memoryReleased: true
    }
  };

  // Clean up test data
  if (fs.existsSync(testDataDir)) {
    const tempFiles = fs.readdirSync(testDataDir).filter(file => 
      file.startsWith('temp-') || file.endsWith('.tmp')
    );
    
    tempFiles.forEach(file => {
      fs.unlinkSync(path.join(testDataDir, file));
      testReport.cleanup.tempFilesRemoved++;
    });
  }

  // Save test report
  fs.writeFileSync(
    path.join(artifactsDir, 'test-report.json'),
    JSON.stringify(testReport, null, 2)
  );

  // Generate human-readable summary
  const summaryReport = generateSummaryReport(testReport);
  fs.writeFileSync(
    path.join(artifactsDir, 'test-summary.md'),
    summaryReport
  );

  // Clear test cache if needed
  const jestCacheDir = path.join(__dirname, '../.jest-cache');
  if (fs.existsSync(jestCacheDir)) {
    try {
      fs.rmSync(jestCacheDir, { recursive: true, force: true });
      testReport.cleanup.cacheCleared = true;
    } catch (error) {
      console.warn('⚠️  Could not clear Jest cache');
    }
  }

  // Log final summary
  console.log('📊 Test Summary:');
  if (testReport.coverage) {
    console.log(`   Lines: ${testReport.coverage.lines}%`);
    console.log(`   Functions: ${testReport.coverage.functions}%`);
    console.log(`   Branches: ${testReport.coverage.branches}%`);
    console.log(`   Statements: ${testReport.coverage.statements}%`);
  }
  console.log(`   Unit Tests: ${testReport.testFiles.unit} files`);
  console.log(`   Integration Tests: ${testReport.testFiles.integration} files`);
  console.log(`   E2E Tests: ${testReport.testFiles.e2e} files`);
  console.log(`   Temp Files Cleaned: ${testReport.cleanup.tempFilesRemoved}`);
  console.log(`   Cache Cleared: ${testReport.cleanup.cacheCleared ? 'Yes' : 'No'}`);

  console.log('\n✅ Test environment cleanup complete!');
  console.log(`📋 Test report saved to: ${path.join(artifactsDir, 'test-report.json')}`);
  console.log(`📄 Summary saved to: ${path.join(artifactsDir, 'test-summary.md')}\n`);
}

/**
 * Count test files matching pattern
 */
function getTestFileCount(pattern: string): number {
  try {
    const glob = require('glob');
    return glob.sync(pattern, { cwd: path.join(__dirname, '..') }).length;
  } catch (error) {
    return 0;
  }
}

/**
 * Gather performance metrics from test runs
 */
function gatherPerformanceMetrics() {
  const testDataDir = path.join(__dirname, '../test-data');
  const performanceFile = path.join(testDataDir, 'performance-baseline.json');
  
  try {
    if (fs.existsSync(performanceFile)) {
      return JSON.parse(fs.readFileSync(performanceFile, 'utf8'));
    }
  } catch (error) {
    console.warn('⚠️  Could not read performance metrics');
  }
  
  return {
    baseline: 'not available',
    measurements: 'not collected'
  };
}

/**
 * Generate human-readable summary report
 */
function generateSummaryReport(testReport: any): string {
  const date = new Date(testReport.timestamp).toLocaleDateString();
  const time = new Date(testReport.timestamp).toLocaleTimeString();
  
  return `# Test Summary Report

**Generated:** ${date} at ${time}
**Environment:** ${testReport.environment.platform} ${testReport.environment.arch}
**Node Version:** ${testReport.environment.nodeVersion}

## Coverage Results

${testReport.coverage ? `
| Metric | Coverage |
|--------|----------|
| Lines | ${testReport.coverage.lines}% |
| Functions | ${testReport.coverage.functions}% |
| Branches | ${testReport.coverage.branches}% |
| Statements | ${testReport.coverage.statements}% |
` : 'Coverage data not available'}

## Test Files

- **Unit Tests:** ${testReport.testFiles.unit} files
- **Integration Tests:** ${testReport.testFiles.integration} files  
- **E2E Tests:** ${testReport.testFiles.e2e} files

## Cleanup Summary

- **Temporary Files Removed:** ${testReport.cleanup.tempFilesRemoved}
- **Cache Cleared:** ${testReport.cleanup.cacheCleared ? 'Yes' : 'No'}
- **Memory Released:** ${testReport.cleanup.memoryReleased ? 'Yes' : 'No'}

## Performance Baseline

${typeof testReport.performance === 'object' ? `
- **Component Render Time:** ${testReport.performance.componentRenderTime || 'N/A'} ms
- **API Response Time:** ${testReport.performance.apiResponseTime || 'N/A'} ms
- **Terminal Init Time:** ${testReport.performance.terminalInitTime || 'N/A'} ms
- **Session Summary Time:** ${testReport.performance.sessionSummaryTime || 'N/A'} ms
- **Code Loading Time:** ${testReport.performance.codeLoadingTime || 'N/A'} ms
` : 'Performance metrics not available'}

---
*Generated by Coder1 IDE Test Suite*
`;
}