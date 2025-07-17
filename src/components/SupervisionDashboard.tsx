import { React, useState, useEffect } from '../utils/react-stubs';
import { Shield, Activity, CheckCircle, XCircle, AlertTriangle, Moon } from '../utils/icon-stubs';
import './SupervisionDashboard.css';

interface SupervisionDashboardProps {
  isVisible: boolean;
  onClose: () => void;
}

interface WorkspaceStatus {
  id: string;
  name: string;
  supervisionActive: boolean;
  persona: string;
  lastActivity: Date;
  approvalRate: number;
}

interface Decision {
  id: string;
  timestamp: Date;
  action: 'approve' | 'reject' | 'escalate';
  filePath: string;
  reason: string;
  confidence: number;
}

interface QualityMetrics {
  codeQuality: number;
  securityScore: number;
  performanceScore: number;
  testCoverage: number;
}

export const SupervisionDashboard: React.FC<SupervisionDashboardProps> = ({ 
  isVisible, 
  onClose 
}) => {
  const [workspaces, setWorkspaces] = useState<WorkspaceStatus[]>([
    {
      id: 'workspace-1',
      name: 'Main Project',
      supervisionActive: true,
      persona: 'analyzer',
      lastActivity: new Date(),
      approvalRate: 87
    }
  ]);

  const [recentDecisions, setRecentDecisions] = useState<Decision[]>([
    {
      id: 'decision-1',
      timestamp: new Date(Date.now() - 300000),
      action: 'approve',
      filePath: 'src/components/Button.tsx',
      reason: 'All quality gates passed',
      confidence: 92
    },
    {
      id: 'decision-2',
      timestamp: new Date(Date.now() - 600000),
      action: 'reject',
      filePath: 'src/utils/api.ts',
      reason: 'Security vulnerability detected',
      confidence: 95
    }
  ]);

  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics>({
    codeQuality: 89,
    securityScore: 94,
    performanceScore: 82,
    testCoverage: 76
  });

  const [sleepModeActive, setSleepModeActive] = useState(false);

  if (!isVisible) return null;

  return (
    <div className="supervision-dashboard">
      <div className="dashboard-header">
        <div className="header-left">
          <Shield size={20} />
          <h2>Claude Agent Supervision</h2>
        </div>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="dashboard-content">
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-header">
              <CheckCircle size={16} className="metric-icon success" />
              <span>Code Quality</span>
            </div>
            <div className="metric-value">{qualityMetrics.codeQuality}%</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <Shield size={16} className="metric-icon security" />
              <span>Security Score</span>
            </div>
            <div className="metric-value">{qualityMetrics.securityScore}%</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <Activity size={16} className="metric-icon performance" />
              <span>Performance</span>
            </div>
            <div className="metric-value">{qualityMetrics.performanceScore}%</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <CheckCircle size={16} className="metric-icon coverage" />
              <span>Test Coverage</span>
            </div>
            <div className="metric-value">{qualityMetrics.testCoverage}%</div>
          </div>
        </div>

        <div className="dashboard-sections">
          <div className="section">
            <h3>Workspace Status</h3>
            <div className="workspace-list">
              {workspaces.map(workspace => (
                <div key={workspace.id} className="workspace-item">
                  <div className="workspace-info">
                    <span className="workspace-name">{workspace.name}</span>
                    <span className="workspace-persona">Persona: {workspace.persona}</span>
                  </div>
                  <div className="workspace-status">
                    <span className={`status-badge ${workspace.supervisionActive ? 'active' : 'inactive'}`}>
                      {workspace.supervisionActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="approval-rate">{workspace.approvalRate}% approved</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="section">
            <h3>Recent Decisions</h3>
            <div className="decisions-list">
              {recentDecisions.map(decision => (
                <div key={decision.id} className="decision-item">
                  <div className="decision-icon">
                    {decision.action === 'approve' && <CheckCircle size={16} className="approve" />}
                    {decision.action === 'reject' && <XCircle size={16} className="reject" />}
                    {decision.action === 'escalate' && <AlertTriangle size={16} className="escalate" />}
                  </div>
                  <div className="decision-info">
                    <span className="decision-file">{decision.filePath}</span>
                    <span className="decision-reason">{decision.reason}</span>
                    <span className="decision-time">{decision.timestamp.toLocaleTimeString()}</span>
                  </div>
                  <div className="decision-confidence">
                    {decision.confidence}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="section">
            <h3>Sleep Mode</h3>
            <div className="sleep-mode-section">
              <div className="sleep-mode-status">
                <Moon size={16} />
                <span>24/7 Autonomous Supervision</span>
                <span className={`status-badge ${sleepModeActive ? 'active' : 'inactive'}`}>
                  {sleepModeActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <button 
                className="sleep-mode-btn"
                onClick={() => setSleepModeActive(!sleepModeActive)}
              >
                {sleepModeActive ? 'Disable Sleep Mode' : 'Enable Sleep Mode (Pro)'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
