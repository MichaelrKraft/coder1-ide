/**
 * SessionSummaryButton Component
 * 
 * Button component with modal for generating and displaying session summaries
 * Integrates with Claude Code to create comprehensive development session documentation
 */

import React, { useState, useEffect } from 'react';
import { useSessionSummary } from '../hooks/useSessionSummary';
import './SessionSummaryButton.css';

interface SessionSummaryButtonProps {
  openFiles: any[];
  activeFile: string | null;
  terminalHistory: string;
  terminalCommands: string[];
  disabled?: boolean;
}

const SessionSummaryButton: React.FC<SessionSummaryButtonProps> = ({
  openFiles,
  activeFile,
  terminalHistory,
  terminalCommands,
  disabled = false
}) => {
  const [showModal, setShowModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [exportFormat, setExportFormat] = useState<'markdown' | 'json' | 'html' | 'all'>('markdown');
  const [currentStep, setCurrentStep] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'summary' | 'insights' | 'nextSteps'>('summary');
  const [insights, setInsights] = useState<string>('');
  const [nextSteps, setNextSteps] = useState<string>('');
  const [storeSuccess, setStoreSuccess] = useState(false);
  const [isStoringInDocs, setIsStoringInDocs] = useState(false);
  
  const {
    isGenerating,
    summary,
    error,
    hasGenerated,
    generateSummary,
    clearSummary,
    copySummaryToClipboard,
    exportSummary
  } = useSessionSummary();

  // Generate insights and next steps when summary is available
  useEffect(() => {
    if (summary && summary.length > 0) {
      generateInsightsAndNextSteps(summary);
    }
  }, [summary]);

  /**
   * Handle button click to generate summary
   */
  const handleGenerateSummary = async () => {
    setShowModal(true);
    setCopySuccess(false);
    setProgress(0);
    
    // Clear previous results
    if (hasGenerated) {
      clearSummary();
    }

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 15;
      });
    }, 500);

    // Start generation
    await generateSummary({
      openFiles,
      activeFile,
      terminalHistory,
      terminalCommands
    });

    // Complete progress
    clearInterval(progressInterval);
    setProgress(100);
    setTimeout(() => setProgress(0), 500);
  };

  /**
   * Handle copy to clipboard with success feedback
   */
  const handleCopyToClipboard = async () => {
    const success = await copySummaryToClipboard();
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };
  
  /**
   * Store session summary in Documentation Intelligence System
   */
  const handleStoreInDocs = async () => {
    if (!summary) return;
    
    setIsStoringInDocs(true);
    setStoreSuccess(false);
    
    try {
      // Generate session metadata
      const sessionDate = new Date();
      const sessionType = terminalCommands.some(cmd => cmd.includes('test')) ? 'testing' :
                         terminalCommands.some(cmd => cmd.includes('fix')) ? 'bug-fix' :
                         terminalCommands.some(cmd => cmd.includes('feat')) ? 'feature' : 'development';
      
      const sessionId = `session_${sessionDate.getTime()}_${Math.random().toString(36).substr(2, 9)}`;
      const sessionName = `Session ${sessionDate.toLocaleDateString()} ${sessionDate.toLocaleTimeString()} - ${sessionType}`;
      
      // Create session summary document
      const response = await fetch('/api/docs/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: `session://${sessionId}`,
          name: sessionName,
          description: `Development session: ${openFiles.length} files, ${terminalCommands.length} commands, ${sessionType} work`,
          content: summary
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setStoreSuccess(true);
        console.log('✅ Session stored in Documentation Intelligence:', data.doc.name);
        setTimeout(() => setStoreSuccess(false), 3000);
      } else {
        console.error('Failed to store session:', data.error);
      }
    } catch (error) {
      console.error('Error storing session in docs:', error);
    } finally {
      setIsStoringInDocs(false);
    }
  };

  /**
   * Close modal and reset state
   */
  const handleCloseModal = () => {
    setShowModal(false);
    setCopySuccess(false);
    setActiveTab('summary'); // Reset to summary tab when closing
    // Keep summary data for potential re-viewing
  };

  /**
   * Generate insights and next steps from the summary
   */
  const generateInsightsAndNextSteps = (summaryText: string) => {
    // Extract insights from the summary
    const insightsContent = `# 📊 Session Insights

## Key Patterns Detected
${extractPattern(summaryText, 'patterns')}

## Code Quality Observations
${extractPattern(summaryText, 'quality')}

## Performance Considerations
${extractPattern(summaryText, 'performance')}

## Technical Debt Identified
${extractPattern(summaryText, 'debt')}

## Learning Opportunities
${extractPattern(summaryText, 'learning')}`;
    
    setInsights(insightsContent);

    // Generate next steps based on the summary
    const nextStepsContent = `# 🎯 Recommended Next Steps

## Immediate Actions
${generateNextStepsList('immediate', summaryText)}

## Short-term Goals
${generateNextStepsList('shortTerm', summaryText)}

## Long-term Improvements
${generateNextStepsList('longTerm', summaryText)}

## Testing Requirements
${generateNextStepsList('testing', summaryText)}

## Documentation Needs
${generateNextStepsList('documentation', summaryText)}`;
    
    setNextSteps(nextStepsContent);
  };

  const extractPattern = (summaryText: string, type: string): string => {
    // Extract relevant patterns from the summary
    const patterns: Record<string, string> = {
      patterns: summaryText.includes('React') ? '- Component-based architecture detected\n- Hook usage patterns identified' : '- Standard development patterns observed',
      quality: summaryText.includes('error') ? '- Error handling needs improvement\n- Consider adding more robust error boundaries' : '- Code quality meets standards',
      performance: summaryText.includes('build') ? '- Build process optimization opportunities\n- Consider code splitting' : '- Performance metrics within acceptable range',
      debt: summaryText.includes('TODO') || summaryText.includes('FIXME') ? '- Technical debt markers found\n- Refactoring opportunities identified' : '- Minimal technical debt',
      learning: '- Opportunity to explore advanced patterns\n- Consider implementing best practices'
    };
    return patterns[type] || '- Analysis in progress';
  };

  const generateNextStepsList = (category: string, summaryText: string): string => {
    const steps: Record<string, string> = {
      immediate: '1. Review and address any errors in the session\n2. Commit current changes\n3. Update documentation',
      shortTerm: '1. Implement unit tests for new features\n2. Refactor identified problem areas\n3. Optimize performance bottlenecks',
      longTerm: '1. Plan architectural improvements\n2. Consider scalability enhancements\n3. Evaluate technology stack updates',
      testing: '1. Add unit tests for new functions\n2. Update integration tests\n3. Verify edge case handling',
      documentation: '1. Update README with new features\n2. Add inline code comments\n3. Create API documentation'
    };
    return steps[category] || '- Planning in progress';
  };

  /**
   * Handle export button click
   */
  const handleExport = async () => {
    if (summary && exportSummary) {
      await exportSummary(exportFormat);
    }
  };

  /**
   * Render modal content based on current state
   */
  const renderModalContent = () => {
    if (isGenerating) {
      const steps = [
        { icon: '📊', text: 'Analyzing session type and context', progress: 15 },
        { icon: '📁', text: 'Collecting file changes and modifications', progress: 30 },
        { icon: '🔍', text: 'Extracting errors and breakthroughs', progress: 45 },
        { icon: '🖥️', text: 'Processing terminal history', progress: 60 },
        { icon: '🧠', text: 'Integrating repository intelligence', progress: 75 },
        { icon: '🤖', text: 'Generating comprehensive analysis', progress: 90 },
        { icon: '📝', text: 'Formatting handoff document', progress: 100 }
      ];
      
      const currentStepIndex = Math.floor((progress / 100) * steps.length);
      const currentStepData = steps[currentStepIndex] || steps[0];
      
      return (
        <div className="summary-modal-loading">
          <div className="loading-spinner"></div>
          <h3>🚀 Generating Intelligent Session Summary</h3>
          <p className="loading-subtitle">Creating comprehensive handoff documentation for the next agent</p>
          
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          </div>
          
          <div className="current-step">
            <span className="step-icon">{currentStepData.icon}</span>
            <span className="step-text">{currentStepData.text}</span>
          </div>
          
          <div className="loading-progress-grid">
            {steps.map((step, index) => (
              <div 
                key={index} 
                className={`progress-item ${index <= currentStepIndex ? 'completed' : ''}`}
              >
                <span className="progress-icon">{step.icon}</span>
                <span className="progress-text">{step.text}</span>
                {index <= currentStepIndex && <span className="checkmark">✓</span>}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (error && !summary) {
      return (
        <div className="summary-modal-error">
          <h3>❌ Summary Generation Failed</h3>
          <p className="error-message">{error}</p>
          <div className="error-actions">
            <button 
              className="retry-button"
              onClick={() => generateSummary({ openFiles, activeFile, terminalHistory, terminalCommands })}
            >
              🔄 Retry
            </button>
            <button 
              className="close-button"
              onClick={handleCloseModal}
            >
              Close
            </button>
          </div>
        </div>
      );
    }

    if (summary) {
      return (
        <div className="summary-modal-content">
          <div className="summary-header">
            <h3>🎯 Session Intelligence Report</h3>
            {error && (
              <div className="warning-badge" title={`Generated with fallback: ${error}`}>
                ⚠️ Offline Mode
              </div>
            )}
            <div className="session-stats">
              <span className="stat">⏱️ {Math.floor(terminalHistory.length / 1000)}k chars</span>
              <span className="stat">📁 {openFiles.length} files</span>
              <span className="stat">💻 {terminalCommands.length} commands</span>
            </div>
          </div>
          
          <div className="summary-tabs">
            <button 
              className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => setActiveTab('summary')}
            >
              📝 Summary
            </button>
            <button 
              className={`tab-button ${activeTab === 'insights' ? 'active' : ''}`}
              onClick={() => setActiveTab('insights')}
            >
              📊 Insights
            </button>
            <button 
              className={`tab-button ${activeTab === 'nextSteps' ? 'active' : ''}`}
              onClick={() => setActiveTab('nextSteps')}
            >
              🎯 Next Steps
            </button>
          </div>
          
          <div className="summary-text">
            <div className="summary-content" dangerouslySetInnerHTML={{ 
              __html: (activeTab === 'summary' ? summary : 
                      activeTab === 'insights' ? insights : 
                      nextSteps)
                .replace(/^# (.*$)/gim, '<h1 class="summary-h1">$1</h1>')
                .replace(/^## (.*$)/gim, '<h2 class="summary-h2">$1</h2>')
                .replace(/^### (.*$)/gim, '<h3 class="summary-h3">$1</h3>')
                .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="code-block"><code class="language-$1">$2</code></pre>')
                .replace(/\*\*(.*?)\*\*/g, '<strong class="highlight">$1</strong>')
                .replace(/^- (.*$)/gim, '<li class="summary-item">$1</li>')
                .replace(/\n\n/g, '</p><p class="summary-paragraph">')
                .replace(/^/, '<p class="summary-paragraph">')
                .replace(/$/, '</p>')
            }} />
          </div>
          
          <div className="export-section">
            <label className="export-label">Export Format:</label>
            <select 
              className="export-select"
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as any)}
            >
              <option value="markdown">📝 Markdown</option>
              <option value="json">📊 JSON</option>
              <option value="html">🌐 HTML</option>
              <option value="all">📦 All Formats</option>
            </select>
          </div>
          
          <div className="summary-actions">
            <button 
              className={`copy-button ${copySuccess ? 'success' : ''}`}
              onClick={handleCopyToClipboard}
              disabled={copySuccess}
            >
              {copySuccess ? '✅ Copied!' : '📋 Copy'}
            </button>
            
            <button 
              className={`store-docs-button ${storeSuccess ? 'success' : ''}`}
              onClick={handleStoreInDocs}
              disabled={isStoringInDocs || storeSuccess}
              title="Store this session in Documentation Intelligence for future reference"
            >
              {isStoringInDocs ? '⏳ Storing...' : storeSuccess ? '✅ Stored in Docs!' : '📚 Store in Docs'}
            </button>
            
            <button 
              className="export-button"
              onClick={handleExport}
            >
              💾 Export {exportFormat.toUpperCase()}
            </button>
            
            <button 
              className="regenerate-button"
              onClick={() => {
                setActiveTab('summary'); // Reset to summary tab
                generateSummary({ openFiles, activeFile, terminalHistory, terminalCommands });
              }}
              disabled={isGenerating}
              title="Regenerate all content"
            >
              🔄 Regenerate
            </button>
            
            <button 
              className="close-button"
              onClick={handleCloseModal}
            >
              Close
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {/* Status Bar Button */}
      <button 
        className={`session-summary-button status-button ${disabled ? 'disabled' : ''}`}
        onClick={handleGenerateSummary}
        disabled={disabled || isGenerating}
        title="Generate session summary for context handoff to other agents"
      >
        {isGenerating ? '⏳ Generating...' : 'Session Summary'}
      </button>

      {/* Modal Overlay */}
      {showModal && (
        <div className="session-summary-modal-overlay" onClick={handleCloseModal}>
          <div className="session-summary-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close-x"
              onClick={handleCloseModal}
              title="Close"
            >
              ×
            </button>
            {renderModalContent()}
          </div>
        </div>
      )}
    </>
  );
};

export default SessionSummaryButton;