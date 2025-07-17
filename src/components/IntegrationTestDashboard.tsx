import React, { useState, useEffect } from 'react';
import { IntegrationTestRunner, TestRunReport, TestResult, TestSuite } from '../services/IntegrationTestRunner';
import './IntegrationTestDashboard.css';

interface IntegrationTestDashboardProps {
  testRunner: IntegrationTestRunner;
}

export const IntegrationTestDashboard: React.FC<IntegrationTestDashboardProps> = ({
  testRunner
}) => {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [currentReport, setCurrentReport] = useState<TestRunReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  useEffect(() => {
    const initializeTests = async () => {
      await testRunner.initializeTestSuites();
      const suites = testRunner.getTestSuites();
      setTestSuites(suites);
    };

    initializeTests();
  }, [testRunner]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsRunning(testRunner.isTestRunning());
      
      if (selectedSuite) {
        const results = testRunner.getTestResults(selectedSuite);
        setTestResults(results);
      } else {
        const allResults = testRunner.getTestResults();
        setTestResults(allResults);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [testRunner, selectedSuite]);

  const handleRunAllTests = async () => {
    try {
      setIsRunning(true);
      const report = await testRunner.runAllTests();
      setCurrentReport(report);
    } catch (error) {
      console.error('Test run failed:', error);
      alert('Test run failed. Check console for details.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunSuite = async (suiteId: string) => {
    try {
      setIsRunning(true);
      const suite = testSuites.find(s => s.id === suiteId);
      if (suite) {
        const results = await testRunner.runTestSuite(suite);
        setTestResults(results);
      }
    } catch (error) {
      console.error('Suite run failed:', error);
      alert('Suite run failed. Check console for details.');
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return '#22c55e';
      case 'failed': return '#ef4444';
      case 'timeout': return '#f59e0b';
      case 'skipped': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'timeout': return '⏰';
      case 'skipped': return '⏭️';
      default: return '❓';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'supervision': return '#3b82f6';
      case 'sleep_mode': return '#8b5cf6';
      case 'multi_workspace': return '#06b6d4';
      case 'compliance': return '#f59e0b';
      case 'mcp': return '#10b981';
      case 'performance': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '📋';
      case 'low': return 'ℹ️';
      default: return '📋';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="integration-test-dashboard">
      <div className="dashboard-header">
        <h2>🧪 Integration Test Dashboard</h2>
        <div className="header-actions">
          <button 
            className="btn btn-primary"
            onClick={handleRunAllTests}
            disabled={isRunning}
          >
            {isRunning ? '⏳ Running Tests...' : '🚀 Run All Tests'}
          </button>
        </div>
      </div>

      {currentReport && (
        <div className="test-report-summary">
          <h3>Latest Test Report</h3>
          <div className="report-stats">
            <div className="stat-card">
              <div className="stat-number">{currentReport.totalTests}</div>
              <div className="stat-label">Total Tests</div>
            </div>
            <div className="stat-card passed">
              <div className="stat-number">{currentReport.passed}</div>
              <div className="stat-label">Passed</div>
            </div>
            <div className="stat-card failed">
              <div className="stat-number">{currentReport.failed}</div>
              <div className="stat-label">Failed</div>
            </div>
            <div className="stat-card timeout">
              <div className="stat-number">{currentReport.timeout}</div>
              <div className="stat-label">Timeout</div>
            </div>
            <div className="stat-card skipped">
              <div className="stat-number">{currentReport.skipped}</div>
              <div className="stat-label">Skipped</div>
            </div>
          </div>
          
          <div className="report-metrics">
            <div className="metric-item">
              <span className="metric-label">Duration:</span>
              <span className="metric-value">{formatDuration(currentReport.duration)}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Success Rate:</span>
              <span className="metric-value">
                {Math.round((currentReport.passed / currentReport.totalTests) * 100)}%
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Coverage:</span>
              <span className="metric-value">{Math.round(currentReport.coverage.overall)}%</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Avg Response Time:</span>
              <span className="metric-value">
                {Math.round(currentReport.performance.averageResponseTime)}ms
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="test-suites-section">
        <h3>Test Suites</h3>
        <div className="suite-filters">
          <button 
            className={`filter-btn ${selectedSuite === null ? 'active' : ''}`}
            onClick={() => setSelectedSuite(null)}
          >
            All Suites
          </button>
          {testSuites.map(suite => (
            <button 
              key={suite.id}
              className={`filter-btn ${selectedSuite === suite.id ? 'active' : ''}`}
              onClick={() => setSelectedSuite(suite.id)}
            >
              {suite.name}
            </button>
          ))}
        </div>

        <div className="suites-grid">
          {testSuites.map(suite => (
            <div key={suite.id} className="suite-card">
              <div className="suite-header">
                <div className="suite-info">
                  <h4>{suite.name}</h4>
                  <p className="suite-description">{suite.description}</p>
                </div>
                <button 
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleRunSuite(suite.id)}
                  disabled={isRunning}
                >
                  {isRunning ? '⏳' : '▶️'} Run Suite
                </button>
              </div>
              
              <div className="suite-stats">
                <div className="suite-stat">
                  <span className="stat-label">Tests:</span>
                  <span className="stat-value">{suite.tests.length}</span>
                </div>
                <div className="suite-stat">
                  <span className="stat-label">Critical:</span>
                  <span className="stat-value">
                    {suite.tests.filter(t => t.priority === 'critical').length}
                  </span>
                </div>
                <div className="suite-stat">
                  <span className="stat-label">High:</span>
                  <span className="stat-value">
                    {suite.tests.filter(t => t.priority === 'high').length}
                  </span>
                </div>
              </div>

              <div className="suite-tests">
                {suite.tests.slice(0, 3).map(test => (
                  <div key={test.id} className="test-preview">
                    <span 
                      className="test-category"
                      style={{ backgroundColor: getCategoryColor(test.category) }}
                    >
                      {test.category}
                    </span>
                    <span className="test-name">{test.name}</span>
                    <span className="test-priority">
                      {getPriorityIcon(test.priority)}
                    </span>
                  </div>
                ))}
                {suite.tests.length > 3 && (
                  <div className="test-preview more">
                    +{suite.tests.length - 3} more tests
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {testResults.length > 0 && (
        <div className="test-results-section">
          <h3>
            Test Results 
            {selectedSuite && (
              <span className="results-filter">
                - {testSuites.find(s => s.id === selectedSuite)?.name}
              </span>
            )}
          </h3>
          
          <div className="results-list">
            {testResults.map(result => (
              <div key={result.testId} className="result-card">
                <div className="result-header">
                  <div className="result-info">
                    <span 
                      className="result-status"
                      style={{ color: getStatusColor(result.status) }}
                    >
                      {getStatusIcon(result.status)} {result.status.toUpperCase()}
                    </span>
                    <h5>{result.testId}</h5>
                  </div>
                  <div className="result-metrics">
                    <span className="result-duration">
                      {formatDuration(result.duration)}
                    </span>
                  </div>
                </div>

                {result.message && (
                  <div className="result-message">
                    <p>{result.message}</p>
                  </div>
                )}

                {result.metrics && (
                  <div className="result-performance">
                    <div className="perf-metric">
                      <span className="perf-label">Memory:</span>
                      <span className="perf-value">
                        {Math.round(result.metrics.memoryUsage)}MB
                      </span>
                    </div>
                    <div className="perf-metric">
                      <span className="perf-label">CPU:</span>
                      <span className="perf-value">
                        {Math.round(result.metrics.cpuUsage)}%
                      </span>
                    </div>
                    <div className="perf-metric">
                      <span className="perf-label">Response:</span>
                      <span className="perf-value">
                        {Math.round(result.metrics.responseTime)}ms
                      </span>
                    </div>
                  </div>
                )}

                {result.error && (
                  <div className="result-error">
                    <h6>Error Details:</h6>
                    <pre>{result.error.message}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {testResults.length === 0 && !currentReport && (
        <div className="empty-state">
          <h3>No Test Results</h3>
          <p>Run tests to see results and performance metrics</p>
          <button 
            className="btn btn-primary"
            onClick={handleRunAllTests}
            disabled={isRunning}
          >
            🚀 Run First Test
          </button>
        </div>
      )}
    </div>
  );
};
