import React, { useState, useEffect } from 'react';
import { EnterpriseComplianceService, ComplianceFramework, ComplianceReport, ComplianceFinding } from '../services/EnterpriseComplianceService';
import './ComplianceDashboard.css';

interface ComplianceDashboardProps {
  workspaceId: string;
  complianceService: EnterpriseComplianceService;
}

export const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({
  workspaceId,
  complianceService
}) => {
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([]);
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([]);
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ComplianceReport | null>(null);
  const [autoFixInProgress, setAutoFixInProgress] = useState<string[]>([]);

  useEffect(() => {
    const loadData = () => {
      const availableFrameworks = complianceService.getComplianceFrameworks();
      setFrameworks(availableFrameworks);
      
      const workspaceReports = complianceService.getComplianceReports(workspaceId);
      setReports(workspaceReports);
      
      const enabledFrameworks = availableFrameworks
        .filter(f => f.enabled)
        .map(f => f.id);
      setSelectedFrameworks(enabledFrameworks);
    };

    loadData();
    const interval = setInterval(loadData, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [workspaceId, complianceService]);

  const handleRunAudit = async () => {
    if (selectedFrameworks.length === 0) {
      alert('Please select at least one compliance framework');
      return;
    }

    setIsRunningAudit(true);
    try {
      const report = await complianceService.runComplianceAudit(workspaceId, selectedFrameworks);
      setReports(prev => [report, ...prev]);
      setSelectedReport(report);
    } catch (error) {
      console.error('Compliance audit failed:', error);
      alert('Compliance audit failed. Please try again.');
    } finally {
      setIsRunningAudit(false);
    }
  };

  const handleToggleFramework = async (frameworkId: string, enabled: boolean) => {
    try {
      if (enabled) {
        await complianceService.enableFramework(frameworkId);
      } else {
        await complianceService.disableFramework(frameworkId);
      }
      
      const updatedFrameworks = complianceService.getComplianceFrameworks();
      setFrameworks(updatedFrameworks);
      
      if (enabled) {
        setSelectedFrameworks(prev => [...prev, frameworkId]);
      } else {
        setSelectedFrameworks(prev => prev.filter(id => id !== frameworkId));
      }
    } catch (error) {
      console.error('Failed to toggle framework:', error);
    }
  };

  const handleAutoFix = async (findingIds: string[]) => {
    setAutoFixInProgress(findingIds);
    try {
      const result = await complianceService.autoFixCompliance(workspaceId, findingIds);
      
      if (result.fixed.length > 0) {
        alert(`Successfully fixed ${result.fixed.length} compliance issues`);
      }
      if (result.failed.length > 0) {
        alert(`Failed to fix ${result.failed.length} compliance issues`);
      }
      
      const workspaceReports = complianceService.getComplianceReports(workspaceId);
      setReports(workspaceReports);
    } catch (error) {
      console.error('Auto-fix failed:', error);
      alert('Auto-fix failed. Please try again.');
    } finally {
      setAutoFixInProgress([]);
    }
  };

  const getComplianceScoreColor = (score: number) => {
    if (score >= 90) return '#22c55e';
    if (score >= 70) return '#f59e0b';
    if (score >= 50) return '#ef4444';
    return '#dc2626';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return 'ℹ️';
      default: return 'ℹ️';
    }
  };

  return (
    <div className="compliance-dashboard">
      <div className="dashboard-header">
        <h2>🛡️ Enterprise Compliance Dashboard</h2>
        <div className="header-actions">
          <button 
            className="btn btn-primary"
            onClick={handleRunAudit}
            disabled={isRunningAudit || selectedFrameworks.length === 0}
          >
            {isRunningAudit ? '⏳ Running Audit...' : '🔍 Run Compliance Audit'}
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="frameworks-section">
          <h3>Compliance Frameworks</h3>
          <div className="frameworks-grid">
            {frameworks.map(framework => (
              <div key={framework.id} className="framework-card">
                <div className="framework-header">
                  <div className="framework-info">
                    <h4>{framework.name}</h4>
                    <span className="framework-version">v{framework.version}</span>
                  </div>
                  <label className="framework-toggle">
                    <input
                      type="checkbox"
                      checked={framework.enabled}
                      onChange={(e) => handleToggleFramework(framework.id, e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div className="framework-details">
                  <div className="framework-stat">
                    <span className="stat-label">Requirements:</span>
                    <span className="stat-value">{framework.requirements.length}</span>
                  </div>
                  <div className="framework-stat">
                    <span className="stat-label">Last Audit:</span>
                    <span className="stat-value">
                      {framework.lastAudit.toLocaleDateString()}
                    </span>
                  </div>
                  <div className="framework-stat">
                    <span className="stat-label">Next Audit:</span>
                    <span className="stat-value">
                      {framework.nextAudit.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="reports-section">
          <h3>Compliance Reports</h3>
          {reports.length === 0 ? (
            <div className="empty-state">
              <p>No compliance reports available</p>
              <p>Run your first audit to get started</p>
            </div>
          ) : (
            <div className="reports-list">
              {reports.slice(0, 5).map(report => (
                <div 
                  key={report.id} 
                  className={`report-card ${selectedReport?.id === report.id ? 'selected' : ''}`}
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="report-header">
                    <div className="report-info">
                      <h4>Audit Report</h4>
                      <span className="report-date">
                        {report.generatedAt.toLocaleString()}
                      </span>
                    </div>
                    <div 
                      className="compliance-score"
                      style={{ color: getComplianceScoreColor(report.overallScore) }}
                    >
                      {report.overallScore}%
                    </div>
                  </div>
                  <div className="report-summary">
                    <div className="summary-stat">
                      <span className="stat-label">Frameworks:</span>
                      <span className="stat-value">{report.frameworks.length}</span>
                    </div>
                    <div className="summary-stat">
                      <span className="stat-label">Issues:</span>
                      <span className="stat-value critical">{report.summary.criticalIssues}</span>
                      <span className="stat-value high">{report.summary.highIssues}</span>
                      <span className="stat-value medium">{report.summary.mediumIssues}</span>
                      <span className="stat-value low">{report.summary.lowIssues}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedReport && (
          <div className="report-details">
            <div className="details-header">
              <h3>Report Details</h3>
              <button 
                className="btn btn-secondary"
                onClick={() => setSelectedReport(null)}
              >
                ✕ Close
              </button>
            </div>

            <div className="report-overview">
              <div className="overview-stats">
                <div className="overview-stat">
                  <div className="stat-number">{selectedReport.overallScore}%</div>
                  <div className="stat-label">Overall Score</div>
                </div>
                <div className="overview-stat">
                  <div className="stat-number">{selectedReport.summary.totalRequirements}</div>
                  <div className="stat-label">Total Requirements</div>
                </div>
                <div className="overview-stat">
                  <div className="stat-number">{selectedReport.summary.compliantRequirements}</div>
                  <div className="stat-label">Compliant</div>
                </div>
                <div className="overview-stat">
                  <div className="stat-number">{selectedReport.summary.nonCompliantRequirements}</div>
                  <div className="stat-label">Non-Compliant</div>
                </div>
              </div>
            </div>

            <div className="findings-section">
              <div className="findings-header">
                <h4>Compliance Findings ({selectedReport.findings.length})</h4>
                {selectedReport.findings.some(f => f.autoFixAvailable) && (
                  <button 
                    className="btn btn-warning"
                    onClick={() => handleAutoFix(
                      selectedReport.findings
                        .filter(f => f.autoFixAvailable)
                        .map(f => f.id)
                    )}
                    disabled={autoFixInProgress.length > 0}
                  >
                    {autoFixInProgress.length > 0 ? '⏳ Fixing...' : '🔧 Auto-Fix Available Issues'}
                  </button>
                )}
              </div>

              <div className="findings-list">
                {selectedReport.findings.map(finding => (
                  <div key={finding.id} className="finding-card">
                    <div className="finding-header">
                      <div className="finding-info">
                        <span 
                          className="severity-badge"
                          style={{ backgroundColor: getSeverityColor(finding.severity) }}
                        >
                          {getSeverityIcon(finding.severity)} {finding.severity.toUpperCase()}
                        </span>
                        <h5>{finding.title}</h5>
                      </div>
                      {finding.autoFixAvailable && (
                        <button 
                          className="btn btn-sm btn-warning"
                          onClick={() => handleAutoFix([finding.id])}
                          disabled={autoFixInProgress.includes(finding.id)}
                        >
                          {autoFixInProgress.includes(finding.id) ? '⏳' : '🔧 Auto-Fix'}
                        </button>
                      )}
                    </div>
                    <div className="finding-content">
                      <p className="finding-description">{finding.description}</p>
                      <div className="finding-details">
                        <div className="finding-detail">
                          <span className="detail-label">Location:</span>
                          <span className="detail-value">{finding.location}</span>
                        </div>
                        <div className="finding-detail">
                          <span className="detail-label">Recommendation:</span>
                          <span className="detail-value">{finding.recommendation}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedReport.recommendations.length > 0 && (
              <div className="recommendations-section">
                <h4>Recommendations</h4>
                <ul className="recommendations-list">
                  {selectedReport.recommendations.map((recommendation, index) => (
                    <li key={index} className="recommendation-item">
                      {recommendation}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
