import React, { useState, useEffect } from 'react';
import { SecurityService, SecurityScan, ComplianceCheck } from '../services/SecurityService';
import { PerformanceMonitor, PerformanceReport, PerformanceAlert } from '../services/PerformanceMonitor';
import { MCPServerManager, MCPServer } from '../services/MCPServerManager';
import './EnterpriseFeatures.css';

interface EnterpriseFeatureProps {
  workspaceId: string;
  isProPlan: boolean;
}

export const EnterpriseFeatures: React.FC<EnterpriseFeatureProps> = ({
  workspaceId,
  isProPlan
}) => {
  const [activeTab, setActiveTab] = useState<'security' | 'performance' | 'mcp'>('security');
  const [securityService] = useState(() => new SecurityService());
  const [performanceMonitor] = useState(() => new PerformanceMonitor());
  const [mcpManager] = useState(() => new MCPServerManager());

  if (!isProPlan) {
    return <ProPlanUpgrade />;
  }

  return (
    <div className="enterprise-features">
      <div className="enterprise-header">
        <h2>Enterprise Features</h2>
        <div className="enterprise-tabs">
          <button
            className={`tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            Security
          </button>
          <button
            className={`tab ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            Performance
          </button>
          <button
            className={`tab ${activeTab === 'mcp' ? 'active' : ''}`}
            onClick={() => setActiveTab('mcp')}
          >
            MCP Servers
          </button>
        </div>
      </div>

      <div className="enterprise-content">
        {activeTab === 'security' && (
          <SecurityDashboard 
            workspaceId={workspaceId} 
            securityService={securityService} 
          />
        )}
        {activeTab === 'performance' && (
          <PerformanceDashboard 
            workspaceId={workspaceId} 
            performanceMonitor={performanceMonitor} 
          />
        )}
        {activeTab === 'mcp' && (
          <MCPServerDashboard 
            workspaceId={workspaceId} 
            mcpManager={mcpManager} 
          />
        )}
      </div>
    </div>
  );
};

const SecurityDashboard: React.FC<{
  workspaceId: string;
  securityService: SecurityService;
}> = ({ workspaceId, securityService }) => {
  const [activeScans, setActiveScans] = useState<SecurityScan[]>([]);
  const [scanHistory, setScanHistory] = useState<SecurityScan[]>([]);
  const [complianceChecks, setComplianceChecks] = useState<ComplianceCheck[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    loadSecurityData();
  }, [workspaceId]);

  const loadSecurityData = async () => {
    const history = securityService.getScanHistory(workspaceId);
    setScanHistory(history);
    
    const compliance = securityService.getComplianceStatus(workspaceId);
    setComplianceChecks(compliance);
  };

  const startSecurityScan = async (scanType: SecurityScan['scanType']) => {
    setIsScanning(true);
    try {
      const scanId = await securityService.startSecurityScan(workspaceId, scanType);
      
      const checkScanStatus = () => {
        const scan = securityService.getScanStatus(scanId);
        if (scan) {
          if (scan.status === 'completed' || scan.status === 'failed') {
            setIsScanning(false);
            loadSecurityData();
          } else {
            setTimeout(checkScanStatus, 1000);
          }
        }
      };
      
      checkScanStatus();
    } catch (error) {
      console.error('Failed to start security scan:', error);
      setIsScanning(false);
    }
  };

  const runComplianceCheck = async (standard: ComplianceCheck['standard']) => {
    try {
      const check = await securityService.performComplianceCheck(workspaceId, standard);
      setComplianceChecks(prev => [...prev.filter(c => c.standard !== standard), check]);
    } catch (error) {
      console.error('Failed to run compliance check:', error);
    }
  };

  return (
    <div className="security-dashboard">
      <div className="security-actions">
        <h3>Security Scanning</h3>
        <div className="scan-buttons">
          <button 
            onClick={() => startSecurityScan('owasp')}
            disabled={isScanning}
          >
            OWASP Top 10 Scan
          </button>
          <button 
            onClick={() => startSecurityScan('cve')}
            disabled={isScanning}
          >
            CVE Scan
          </button>
          <button 
            onClick={() => startSecurityScan('dependency')}
            disabled={isScanning}
          >
            Dependency Scan
          </button>
          <button 
            onClick={() => startSecurityScan('full')}
            disabled={isScanning}
          >
            Full Security Scan
          </button>
        </div>
        {isScanning && <div className="scanning-indicator">Scanning in progress...</div>}
      </div>

      <div className="compliance-section">
        <h3>Compliance Checks</h3>
        <div className="compliance-buttons">
          <button onClick={() => runComplianceCheck('owasp_top_10')}>
            OWASP Top 10
          </button>
          <button onClick={() => runComplianceCheck('cwe_top_25')}>
            CWE Top 25
          </button>
          <button onClick={() => runComplianceCheck('pci_dss')}>
            PCI DSS
          </button>
        </div>
        
        <div className="compliance-results">
          {complianceChecks.map(check => (
            <div key={check.standard} className={`compliance-item ${check.status}`}>
              <h4>{check.standard.toUpperCase()}</h4>
              <span className={`status ${check.status}`}>{check.status}</span>
              <div className="requirements">
                {check.requirements.map(req => (
                  <div key={req.id} className={`requirement ${req.status}`}>
                    <span>{req.title}</span>
                    <span className={`req-status ${req.status}`}>{req.status}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="scan-history">
        <h3>Recent Scans</h3>
        <div className="scan-list">
          {scanHistory.slice(0, 5).map(scan => (
            <div key={scan.id} className={`scan-item ${scan.status}`}>
              <div className="scan-info">
                <span className="scan-type">{scan.scanType}</span>
                <span className="scan-time">{scan.startTime.toLocaleString()}</span>
                <span className={`scan-status ${scan.status}`}>{scan.status}</span>
              </div>
              <div className="scan-summary">
                <span className="critical">{scan.summary.criticalIssues} Critical</span>
                <span className="high">{scan.summary.highIssues} High</span>
                <span className="medium">{scan.summary.mediumIssues} Medium</span>
                <span className="low">{scan.summary.lowIssues} Low</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PerformanceDashboard: React.FC<{
  workspaceId: string;
  performanceMonitor: PerformanceMonitor;
}> = ({ workspaceId, performanceMonitor }) => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [performanceReport, setPerformanceReport] = useState<PerformanceReport | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);

  useEffect(() => {
    loadPerformanceData();
    const interval = setInterval(loadPerformanceData, 5000);
    return () => clearInterval(interval);
  }, [workspaceId]);

  const loadPerformanceData = () => {
    const report = performanceMonitor.generateReport(workspaceId, 'hour');
    setPerformanceReport(report);
    
    const currentAlerts = performanceMonitor.getAlerts(workspaceId, false);
    setAlerts(currentAlerts);
    
    setIsMonitoring(performanceMonitor.isMonitoringActive());
  };

  const toggleMonitoring = () => {
    if (isMonitoring) {
      performanceMonitor.stopMonitoring();
    } else {
      performanceMonitor.startMonitoring(workspaceId);
    }
    setIsMonitoring(!isMonitoring);
  };

  const resolveAlert = (alertId: string) => {
    performanceMonitor.resolveAlert(alertId);
    loadPerformanceData();
  };

  return (
    <div className="performance-dashboard">
      <div className="performance-controls">
        <h3>Performance Monitoring</h3>
        <button 
          className={`monitor-toggle ${isMonitoring ? 'active' : ''}`}
          onClick={toggleMonitoring}
        >
          {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
        </button>
      </div>

      {performanceReport && (
        <div className="performance-overview">
          <div className="performance-metrics">
            <div className="metric">
              <span className="metric-label">Performance Score</span>
              <span className={`metric-value score-${Math.floor(performanceReport.summary.performanceScore / 20)}`}>
                {performanceReport.summary.performanceScore}
              </span>
            </div>
            <div className="metric">
              <span className="metric-label">CPU Usage</span>
              <span className="metric-value">
                {performanceReport.summary.averageCpuUsage.toFixed(1)}%
              </span>
            </div>
            <div className="metric">
              <span className="metric-label">Memory Usage</span>
              <span className="metric-value">
                {performanceReport.summary.averageMemoryUsage.toFixed(1)}%
              </span>
            </div>
            <div className="metric">
              <span className="metric-label">Build Time</span>
              <span className="metric-value">
                {(performanceReport.summary.averageBuildTime / 1000).toFixed(1)}s
              </span>
            </div>
          </div>

          <div className="performance-trend">
            <span className="trend-label">Trend:</span>
            <span className={`trend-value ${performanceReport.summary.trend}`}>
              {performanceReport.summary.trend}
            </span>
          </div>
        </div>
      )}

      <div className="performance-alerts">
        <h3>Active Alerts ({alerts.length})</h3>
        <div className="alert-list">
          {alerts.map(alert => (
            <div key={alert.id} className={`alert-item ${alert.severity}`}>
              <div className="alert-content">
                <span className={`alert-severity ${alert.severity}`}>
                  {alert.severity.toUpperCase()}
                </span>
                <span className="alert-message">{alert.message}</span>
                <span className="alert-time">
                  {alert.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <button 
                className="resolve-alert"
                onClick={() => resolveAlert(alert.id)}
              >
                Resolve
              </button>
            </div>
          ))}
        </div>
        {alerts.length === 0 && (
          <div className="no-alerts">No active performance alerts</div>
        )}
      </div>

      {performanceReport && (
        <div className="performance-recommendations">
          <h3>Recommendations</h3>
          <ul>
            {performanceReport.recommendations.map((rec, index) => (
              <li key={index}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const MCPServerDashboard: React.FC<{
  workspaceId: string;
  mcpManager: MCPServerManager;
}> = ({ workspaceId, mcpManager }) => {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [healthStatus, setHealthStatus] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    loadServerData();
    const interval = setInterval(loadServerData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadServerData = async () => {
    const allServers = mcpManager.getAllServers();
    setServers(allServers);
    
    const health = await mcpManager.healthCheck();
    setHealthStatus(health);
  };

  const executeServerRequest = async (serverId: string, method: string) => {
    try {
      const response = await mcpManager.executeRequest(
        serverId,
        method,
        {},
        workspaceId
      );
      console.log('Server response:', response);
    } catch (error) {
      console.error('Server request failed:', error);
    }
  };

  return (
    <div className="mcp-dashboard">
      <div className="mcp-header">
        <h3>MCP Server Status</h3>
        <button onClick={loadServerData}>Refresh Status</button>
      </div>

      <div className="server-grid">
        {servers.map(server => (
          <div key={server.id} className={`server-card ${server.status}`}>
            <div className="server-header">
              <h4>{server.name}</h4>
              <span className={`server-status ${server.status}`}>
                {server.status}
              </span>
            </div>
            
            <div className="server-info">
              <div className="server-detail">
                <span>Type:</span>
                <span>{server.type}</span>
              </div>
              <div className="server-detail">
                <span>Response Time:</span>
                <span>{server.responseTime}ms</span>
              </div>
              <div className="server-detail">
                <span>Last Ping:</span>
                <span>{server.lastPing.toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="server-capabilities">
              <h5>Capabilities:</h5>
              <div className="capability-list">
                {server.capabilities.map(cap => (
                  <span key={cap} className="capability-tag">
                    {cap}
                  </span>
                ))}
              </div>
            </div>

            <div className="server-actions">
              <button 
                onClick={() => executeServerRequest(server.id, 'ping')}
                disabled={server.status !== 'active'}
              >
                Test Connection
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mcp-stats">
        <h3>Server Statistics</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Total Servers</span>
            <span className="stat-value">{servers.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Active Servers</span>
            <span className="stat-value">
              {servers.filter(s => s.status === 'active').length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Average Response Time</span>
            <span className="stat-value">
              {servers.length > 0 
                ? Math.round(servers.reduce((sum, s) => sum + s.responseTime, 0) / servers.length)
                : 0}ms
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProPlanUpgrade: React.FC = () => {
  return (
    <div className="pro-plan-upgrade">
      <div className="upgrade-content">
        <h2>Enterprise Features</h2>
        <p>Unlock advanced security scanning, performance monitoring, and MCP server management with Coder1 IDE Pro.</p>
        
        <div className="feature-list">
          <div className="feature-item">
            <span className="feature-icon">🔒</span>
            <div>
              <h4>Advanced Security Scanning</h4>
              <p>OWASP Top 10, CVE detection, and compliance checking</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">⚡</span>
            <div>
              <h4>Performance Monitoring</h4>
              <p>Real-time metrics, alerts, and optimization recommendations</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🔧</span>
            <div>
              <h4>MCP Server Management</h4>
              <p>Context7, Sequential, Magic, and Puppeteer server integration</p>
            </div>
          </div>
        </div>
        
        <button className="upgrade-button">Upgrade to Pro</button>
      </div>
    </div>
  );
};
