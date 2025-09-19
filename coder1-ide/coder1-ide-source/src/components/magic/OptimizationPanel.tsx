import React, { useState, useEffect } from 'react';
import './OptimizationPanel.css';

interface OptimizationPanelProps {
  code: string;
  isVisible: boolean;
  onClose: () => void;
  onApplyOptimizations: (optimizedCode: string) => void;
}

interface OptimizationScore {
  accessibility: number;
  performance: number;
  issues: {
    accessibility: Array<{
      type: 'error' | 'warning' | 'info';
      rule: string;
      description: string;
      fix: string;
    }>;
    performance: Array<{
      severity: 'high' | 'medium' | 'low';
      description: string;
      suggestion: string;
    }>;
  };
  improvements: string[];
}

const OptimizationPanel: React.FC<OptimizationPanelProps> = ({
  code,
  isVisible,
  onClose,
  onApplyOptimizations
}) => {
  const [scores, setScores] = useState<OptimizationScore | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedCode, setOptimizedCode] = useState('');
  const [activeTab, setActiveTab] = useState<'accessibility' | 'performance'>('accessibility');

  useEffect(() => {
    if (isVisible && code) {
      analyzeCode();
    }
  }, [isVisible, code]);

  const analyzeCode = async () => {
    setIsOptimizing(true);
    
    // Import AIOptimizer dynamically
    const { default: aiOptimizer } = await import('../../services/magic/AIOptimizer');
    
    try {
      // Analyze accessibility and performance
      const accessibilityAnalysis = aiOptimizer.analyzeAccessibility(code);
      const performanceAnalysis = aiOptimizer.analyzePerformance(code);
      
      // Optimize the code
      const optimizationResult = await aiOptimizer.optimizeComponent(code);
      
      setScores({
        accessibility: accessibilityAnalysis.score,
        performance: performanceAnalysis.score,
        issues: {
          accessibility: accessibilityAnalysis.issues,
          performance: performanceAnalysis.issues
        },
        improvements: optimizationResult.improvements
      });
      
      setOptimizedCode(optimizationResult.optimizedCode);
    } catch (error) {
      console.error('Failed to analyze code:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#10b981';
    if (score >= 70) return '#f59e0b';
    return '#ef4444';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
      case 'error':
        return '🔴';
      case 'medium':
      case 'warning':
        return '🟡';
      case 'low':
      case 'info':
        return '🟢';
      default:
        return '⚪';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="optimization-panel-overlay">
      <div className="optimization-panel">
        <div className="optimization-header">
          <div className="header-left">
            <h3>🔧 Component Optimization</h3>
            <p>AI-powered accessibility and performance analysis</p>
          </div>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        {isOptimizing ? (
          <div className="optimization-loading">
            <div className="loading-spinner"></div>
            <p>Analyzing component...</p>
          </div>
        ) : scores ? (
          <>
            <div className="scores-container">
              <div className="score-card">
                <div className="score-icon">♿</div>
                <div className="score-content">
                  <div className="score-label">Accessibility</div>
                  <div 
                    className="score-value" 
                    style={{ color: getScoreColor(scores.accessibility) }}
                  >
                    {scores.accessibility}/100
                  </div>
                </div>
                <div 
                  className="score-bar"
                  style={{ 
                    background: `linear-gradient(to right, ${getScoreColor(scores.accessibility)} ${scores.accessibility}%, #e5e7eb ${scores.accessibility}%)`
                  }}
                />
              </div>

              <div className="score-card">
                <div className="score-icon">⚡</div>
                <div className="score-content">
                  <div className="score-label">Performance</div>
                  <div 
                    className="score-value"
                    style={{ color: getScoreColor(scores.performance) }}
                  >
                    {scores.performance}/100
                  </div>
                </div>
                <div 
                  className="score-bar"
                  style={{ 
                    background: `linear-gradient(to right, ${getScoreColor(scores.performance)} ${scores.performance}%, #e5e7eb ${scores.performance}%)`
                  }}
                />
              </div>
            </div>

            <div className="optimization-tabs">
              <button
                className={`tab-btn ${activeTab === 'accessibility' ? 'active' : ''}`}
                onClick={() => setActiveTab('accessibility')}
              >
                ♿ Accessibility ({scores.issues.accessibility.length})
              </button>
              <button
                className={`tab-btn ${activeTab === 'performance' ? 'active' : ''}`}
                onClick={() => setActiveTab('performance')}
              >
                ⚡ Performance ({scores.issues.performance.length})
              </button>
            </div>

            <div className="issues-container">
              {activeTab === 'accessibility' ? (
                <div className="issues-list">
                  {scores.issues.accessibility.length === 0 ? (
                    <div className="no-issues">
                      <span className="success-icon">✅</span>
                      <p>No accessibility issues found!</p>
                    </div>
                  ) : (
                    scores.issues.accessibility.map((issue, index) => (
                      <div key={index} className="issue-card">
                        <div className="issue-header">
                          <span className="issue-icon">{getSeverityIcon(issue.type)}</span>
                          <span className="issue-rule">{issue.rule}</span>
                        </div>
                        <p className="issue-description">{issue.description}</p>
                        <div className="issue-fix">
                          <span className="fix-icon">💡</span>
                          <span>{issue.fix}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="issues-list">
                  {scores.issues.performance.length === 0 ? (
                    <div className="no-issues">
                      <span className="success-icon">✅</span>
                      <p>No performance issues found!</p>
                    </div>
                  ) : (
                    scores.issues.performance.map((issue, index) => (
                      <div key={index} className="issue-card">
                        <div className="issue-header">
                          <span className="issue-icon">{getSeverityIcon(issue.severity)}</span>
                          <span className="issue-severity">{issue.severity.toUpperCase()}</span>
                        </div>
                        <p className="issue-description">{issue.description}</p>
                        <div className="issue-fix">
                          <span className="fix-icon">💡</span>
                          <span>{issue.suggestion}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {scores.improvements.length > 0 && (
              <div className="improvements-section">
                <h4>✨ Auto-applied Improvements</h4>
                <ul className="improvements-list">
                  {scores.improvements.map((improvement, index) => (
                    <li key={index}>
                      <span className="improvement-icon">✓</span>
                      {improvement}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="optimization-actions">
              <button 
                className="action-btn secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button 
                className="action-btn primary"
                onClick={() => {
                  onApplyOptimizations(optimizedCode);
                  onClose();
                }}
                disabled={!optimizedCode || optimizedCode === code}
              >
                Apply Optimizations
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default OptimizationPanel;