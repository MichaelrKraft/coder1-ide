import React, { useState, useEffect } from 'react';
import './IntegrationsPanel.css';

interface IntegrationsPanelProps {
  componentCode: string;
  componentName: string;
  isVisible: boolean;
  onClose: () => void;
}

const IntegrationsPanel: React.FC<IntegrationsPanelProps> = ({
  componentCode,
  componentName,
  isVisible,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'figma' | 'testing' | 'docs'>('figma');
  const [figmaConnected, setFigmaConnected] = useState(false);
  const [figmaApiKey, setFigmaApiKey] = useState('');
  const [figmaFileId, setFigmaFileId] = useState('');
  const [testResults, setTestResults] = useState<any>(null);
  const [documentation, setDocumentation] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Import services dynamically
  const loadFigmaIntegration = async () => {
    const { default: FigmaIntegration } = await import('../../services/magic/FigmaIntegration');
    return new FigmaIntegration();
  };

  const loadTestingFramework = async () => {
    const { default: TestingFramework } = await import('../../services/magic/TestingFramework');
    return new TestingFramework();
  };

  const loadDocumentationGenerator = async () => {
    const { default: DocumentationGenerator } = await import('../../services/magic/DocumentationGenerator');
    return new DocumentationGenerator();
  };

  // Connect to Figma
  const handleFigmaConnect = async () => {
    if (!figmaApiKey || !figmaFileId) {
      alert('Please enter both API key and File ID');
      return;
    }

    try {
      const figma = await loadFigmaIntegration();
      const connected = await figma.connect(figmaApiKey, figmaFileId);
      setFigmaConnected(connected);
      
      if (connected) {
        alert('Successfully connected to Figma!');
      } else {
        alert('Failed to connect to Figma. Please check your credentials.');
      }
    } catch (error) {
      console.error('Figma connection error:', error);
      alert('Error connecting to Figma');
    }
  };

  // Import from Figma
  const handleFigmaImport = async () => {
    setIsGenerating(true);
    try {
      const figma = await loadFigmaIntegration();
      const tokens = await figma.importDesignTokens();
      
      if (tokens) {
        const updatedCode = figma.syncDesignTokens(componentCode, tokens);
        
        // Dispatch event to update component code
        window.dispatchEvent(new CustomEvent('updateComponentCode', {
          detail: { code: updatedCode }
        }));
        
        alert('Design tokens imported successfully!');
      }
    } catch (error) {
      console.error('Figma import error:', error);
      alert('Error importing from Figma');
    } finally {
      setIsGenerating(false);
    }
  };

  // Export to Figma
  const handleFigmaExport = async () => {
    setIsGenerating(true);
    try {
      const figma = await loadFigmaIntegration();
      const figmaComponent = figma.exportToFigma(componentCode);
      
      // In a real implementation, this would send to Figma API
      console.log('Exported to Figma:', figmaComponent);
      
      // Copy to clipboard as JSON
      await navigator.clipboard.writeText(JSON.stringify(figmaComponent, null, 2));
      alert('Component exported! Figma format copied to clipboard.');
    } catch (error) {
      console.error('Figma export error:', error);
      alert('Error exporting to Figma');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate tests
  const handleGenerateTests = async () => {
    setIsGenerating(true);
    try {
      const testing = await loadTestingFramework();
      const suite = testing.generateTestSuite(componentCode, componentName);
      
      // Run tests
      const results = await testing.runTestSuite(suite.id);
      setTestResults(results);
      
      // Generate test file
      const testFile = testing.exportTestFile(suite.id);
      
      // Copy to clipboard
      await navigator.clipboard.writeText(testFile);
      alert('Tests generated and copied to clipboard!');
    } catch (error) {
      console.error('Test generation error:', error);
      alert('Error generating tests');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate documentation
  const handleGenerateDocumentation = async () => {
    setIsGenerating(true);
    try {
      const docGen = await loadDocumentationGenerator();
      const doc = docGen.generateDocumentation(componentCode, {
        includeExamples: true,
        includeBestPractices: true,
        includeAccessibility: true,
        includePerformance: true
      });
      
      const markdown = docGen.generateMarkdown(doc);
      setDocumentation(markdown);
      
      // Also generate JSDoc
      const jsdoc = docGen.generateJSDoc(doc);
      console.log('Generated JSDoc:', jsdoc);
      
      // Generate Storybook stories
      const stories = docGen.generateStorybookStories(doc);
      console.log('Generated Storybook stories:', stories);
    } catch (error) {
      console.error('Documentation generation error:', error);
      alert('Error generating documentation');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy documentation to clipboard
  const handleCopyDocumentation = async () => {
    if (documentation) {
      await navigator.clipboard.writeText(documentation);
      alert('Documentation copied to clipboard!');
    }
  };

  if (!isVisible) return null;

  return (
    <div className="integrations-panel-overlay">
      <div className="integrations-panel">
        <div className="integrations-header">
          <h3>🔧 Advanced Integrations</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="integrations-tabs">
          <button
            className={`tab-btn ${activeTab === 'figma' ? 'active' : ''}`}
            onClick={() => setActiveTab('figma')}
          >
            🎨 Figma
          </button>
          <button
            className={`tab-btn ${activeTab === 'testing' ? 'active' : ''}`}
            onClick={() => setActiveTab('testing')}
          >
            🧪 Testing
          </button>
          <button
            className={`tab-btn ${activeTab === 'docs' ? 'active' : ''}`}
            onClick={() => setActiveTab('docs')}
          >
            📚 Documentation
          </button>
        </div>

        <div className="integrations-content">
          {activeTab === 'figma' && (
            <div className="figma-integration">
              <h4>Figma Integration</h4>
              
              {!figmaConnected ? (
                <div className="figma-connect">
                  <p>Connect to Figma to sync designs with your components</p>
                  
                  <div className="input-group">
                    <label>Figma API Key</label>
                    <input
                      type="password"
                      value={figmaApiKey}
                      onChange={(e) => setFigmaApiKey(e.target.value)}
                      placeholder="Enter your Figma API key"
                    />
                  </div>
                  
                  <div className="input-group">
                    <label>Figma File ID</label>
                    <input
                      type="text"
                      value={figmaFileId}
                      onChange={(e) => setFigmaFileId(e.target.value)}
                      placeholder="Enter Figma file ID"
                    />
                  </div>
                  
                  <button 
                    className="primary-btn"
                    onClick={handleFigmaConnect}
                    disabled={isGenerating}
                  >
                    Connect to Figma
                  </button>
                  
                  <div className="info-box">
                    <p>💡 To get your Figma API key:</p>
                    <ol>
                      <li>Go to Figma → Account Settings</li>
                      <li>Find "Personal Access Tokens"</li>
                      <li>Create a new token</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="figma-actions">
                  <p className="success-message">✅ Connected to Figma</p>
                  
                  <div className="action-buttons">
                    <button
                      className="action-btn"
                      onClick={handleFigmaImport}
                      disabled={isGenerating}
                    >
                      {isGenerating ? '⏳ Importing...' : '⬇️ Import Design Tokens'}
                    </button>
                    
                    <button
                      className="action-btn"
                      onClick={handleFigmaExport}
                      disabled={isGenerating}
                    >
                      {isGenerating ? '⏳ Exporting...' : '⬆️ Export to Figma'}
                    </button>
                  </div>
                  
                  <button
                    className="secondary-btn"
                    onClick={() => setFigmaConnected(false)}
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'testing' && (
            <div className="testing-integration">
              <h4>Automated Testing</h4>
              
              <p>Generate comprehensive tests for your component</p>
              
              <button
                className="primary-btn"
                onClick={handleGenerateTests}
                disabled={isGenerating}
              >
                {isGenerating ? '⏳ Generating Tests...' : '🧪 Generate Test Suite'}
              </button>
              
              {testResults && (
                <div className="test-results">
                  <h5>Test Results</h5>
                  
                  <div className="test-summary">
                    <div className="test-stat">
                      <span className="stat-label">Total</span>
                      <span className="stat-value">{testResults.suite.tests.length}</span>
                    </div>
                    <div className="test-stat success">
                      <span className="stat-label">Passed</span>
                      <span className="stat-value">{testResults.passed}</span>
                    </div>
                    <div className="test-stat error">
                      <span className="stat-label">Failed</span>
                      <span className="stat-value">{testResults.failed}</span>
                    </div>
                    <div className="test-stat">
                      <span className="stat-label">Duration</span>
                      <span className="stat-value">{(testResults.duration / 1000).toFixed(2)}s</span>
                    </div>
                  </div>
                  
                  {testResults.coverage && (
                    <div className="test-coverage">
                      <h6>Code Coverage</h6>
                      <div className="coverage-bars">
                        <div className="coverage-item">
                          <span>Statements</span>
                          <div className="coverage-bar">
                            <div 
                              className="coverage-fill"
                              style={{ width: `${testResults.coverage.statements}%` }}
                            />
                          </div>
                          <span>{testResults.coverage.statements.toFixed(1)}%</span>
                        </div>
                        <div className="coverage-item">
                          <span>Branches</span>
                          <div className="coverage-bar">
                            <div 
                              className="coverage-fill"
                              style={{ width: `${testResults.coverage.branches}%` }}
                            />
                          </div>
                          <span>{testResults.coverage.branches.toFixed(1)}%</span>
                        </div>
                        <div className="coverage-item">
                          <span>Functions</span>
                          <div className="coverage-bar">
                            <div 
                              className="coverage-fill"
                              style={{ width: `${testResults.coverage.functions}%` }}
                            />
                          </div>
                          <span>{testResults.coverage.functions.toFixed(1)}%</span>
                        </div>
                        <div className="coverage-item">
                          <span>Lines</span>
                          <div className="coverage-bar">
                            <div 
                              className="coverage-fill"
                              style={{ width: `${testResults.coverage.lines}%` }}
                            />
                          </div>
                          <span>{testResults.coverage.lines.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="test-list">
                    <h6>Test Cases</h6>
                    {testResults.suite.tests.map((test: any) => (
                      <div key={test.id} className={`test-item ${test.status}`}>
                        <span className="test-status">
                          {test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏭️'}
                        </span>
                        <span className="test-name">{test.name}</span>
                        <span className="test-duration">
                          {test.result?.duration ? `${test.result.duration.toFixed(0)}ms` : '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'docs' && (
            <div className="docs-integration">
              <h4>Documentation Generator</h4>
              
              <p>Generate comprehensive documentation for your component</p>
              
              <button
                className="primary-btn"
                onClick={handleGenerateDocumentation}
                disabled={isGenerating}
              >
                {isGenerating ? '⏳ Generating...' : '📚 Generate Documentation'}
              </button>
              
              {documentation && (
                <div className="documentation-preview">
                  <div className="doc-header">
                    <h5>Generated Documentation</h5>
                    <button 
                      className="copy-btn"
                      onClick={handleCopyDocumentation}
                    >
                      📋 Copy
                    </button>
                  </div>
                  
                  <pre className="doc-content">
                    {documentation}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPanel;