/**
 * Integration Panel Component
 * Provides UI for inserting generated components into existing codebase
 */

import React, { useState, useEffect } from 'react';
import CodeIntegrationService from '../services/integration/CodeIntegrationService';
import ProjectAnalyzer from '../services/integration/ProjectAnalyzer';
import ImportManager from '../services/integration/ImportManager';

interface IntegrationPanelProps {
  generatedCode: string;
  onIntegrate: (options: IntegrationOptions) => void;
  isVisible: boolean;
}

interface IntegrationOptions {
  location: 'cursor' | 'replace' | 'newFile' | 'append';
  autoImports: boolean;
  formatCode: boolean;
  fileName?: string;
}

interface ProjectInfo {
  framework: string;
  styling: string;
  currentFile: string;
  hasSelection: boolean;
  cursorPosition: { line: number; column: number } | null;
}

const IntegrationPanel: React.FC<IntegrationPanelProps> = ({ 
  generatedCode, 
  onIntegrate, 
  isVisible 
}) => {
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<'cursor' | 'replace' | 'newFile' | 'append'>('cursor');
  const [autoImports, setAutoImports] = useState(true);
  const [formatCode, setFormatCode] = useState(true);
  const [newFileName, setNewFileName] = useState('');
  const [isIntegrating, setIsIntegrating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      analyzeCurrentProject();
    }
  }, [isVisible]);

  const analyzeCurrentProject = () => {
    const integrationService = CodeIntegrationService.getInstance();
    const projectAnalyzer = ProjectAnalyzer.getInstance();

    const currentFile = integrationService.getCurrentFile();
    if (currentFile) {
      const context = projectAnalyzer.analyzeProject(
        currentFile.content,
        currentFile.path,
        undefined
      );

      setProjectInfo({
        framework: context.framework,
        styling: context.styling,
        currentFile: currentFile.path,
        hasSelection: integrationService.hasSelection(),
        cursorPosition: integrationService.getCursorPosition()
      });

      // Auto-select replace if there's a selection
      if (integrationService.hasSelection()) {
        setSelectedLocation('replace');
      }
    }
  };

  const handleIntegrate = async () => {
    setIsIntegrating(true);

    const options: IntegrationOptions = {
      location: selectedLocation,
      autoImports,
      formatCode,
      fileName: selectedLocation === 'newFile' ? newFileName : undefined
    };

    try {
      await performIntegration(options);
      onIntegrate(options);
    } catch (error) {
      console.error('Integration failed:', error);
    } finally {
      setIsIntegrating(false);
    }
  };

  const performIntegration = async (options: IntegrationOptions) => {
    const integrationService = CodeIntegrationService.getInstance();
    const importManager = ImportManager.getInstance();
    const projectAnalyzer = ProjectAnalyzer.getInstance();

    // Extract imports from generated code
    const requiredImports = importManager.parseComponentImports(generatedCode);
    
    // Get existing imports
    const existingImports = integrationService.extractImports();
    
    // Merge imports intelligently
    const mergedImports = importManager.mergeImports(existingImports, requiredImports);
    
    // Remove imports from generated code (they'll be added separately)
    const codeWithoutImports = generatedCode
      .split('\n')
      .filter(line => !line.trim().startsWith('import '))
      .join('\n')
      .trim();

    // Perform the integration based on location
    switch (options.location) {
      case 'cursor':
        if (options.autoImports) {
          integrationService.addImports(mergedImports);
        }
        integrationService.insertAtCursor('\n' + codeWithoutImports + '\n');
        break;

      case 'replace':
        if (options.autoImports) {
          integrationService.addImports(mergedImports);
        }
        integrationService.replaceSelection(codeWithoutImports);
        break;

      case 'append':
        if (options.autoImports) {
          integrationService.addImports(mergedImports);
        }
        integrationService.appendToFile('\n' + codeWithoutImports);
        break;

      case 'newFile':
        if (options.fileName) {
          const fullCode = importManager.generateImportCode(mergedImports) + '\n\n' + codeWithoutImports;
          await integrationService.createNewFile(options.fileName, fullCode);
        }
        break;
    }

    // Format code if requested
    if (options.formatCode) {
      await integrationService.formatCode();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="integration-panel" style={styles.panel}>
      <h3 style={styles.title}>🎯 Code Integration</h3>
      
      {projectInfo && (
        <div style={styles.info}>
          <div style={styles.infoRow}>
            <span style={styles.label}>Framework:</span>
            <span style={styles.value}>{projectInfo.framework}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.label}>Styling:</span>
            <span style={styles.value}>{projectInfo.styling}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.label}>Current File:</span>
            <span style={styles.value}>{projectInfo.currentFile.split('/').pop()}</span>
          </div>
          {projectInfo.cursorPosition && (
            <div style={styles.infoRow}>
              <span style={styles.label}>Cursor:</span>
              <span style={styles.value}>
                Line {projectInfo.cursorPosition.line}, Col {projectInfo.cursorPosition.column}
              </span>
            </div>
          )}
        </div>
      )}

      <div style={styles.options}>
        <h4 style={styles.subtitle}>Integration Location</h4>
        
        <label style={styles.radioLabel}>
          <input
            type="radio"
            value="cursor"
            checked={selectedLocation === 'cursor'}
            onChange={(e) => setSelectedLocation('cursor')}
            style={styles.radio}
          />
          <span>Insert at cursor position</span>
        </label>

        {projectInfo?.hasSelection && (
          <label style={styles.radioLabel}>
            <input
              type="radio"
              value="replace"
              checked={selectedLocation === 'replace'}
              onChange={(e) => setSelectedLocation('replace')}
              style={styles.radio}
            />
            <span>Replace selected text</span>
          </label>
        )}

        <label style={styles.radioLabel}>
          <input
            type="radio"
            value="append"
            checked={selectedLocation === 'append'}
            onChange={(e) => setSelectedLocation('append')}
            style={styles.radio}
          />
          <span>Append to end of file</span>
        </label>

        <label style={styles.radioLabel}>
          <input
            type="radio"
            value="newFile"
            checked={selectedLocation === 'newFile'}
            onChange={(e) => setSelectedLocation('newFile')}
            style={styles.radio}
          />
          <span>Create new file</span>
        </label>

        {selectedLocation === 'newFile' && (
          <input
            type="text"
            placeholder="Enter file name (e.g., Button.tsx)"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            style={styles.fileInput}
          />
        )}
      </div>

      <div style={styles.checkboxes}>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={autoImports}
            onChange={(e) => setAutoImports(e.target.checked)}
            style={styles.checkbox}
          />
          <span>Auto-manage imports</span>
        </label>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formatCode}
            onChange={(e) => setFormatCode(e.target.checked)}
            style={styles.checkbox}
          />
          <span>Format code after insertion</span>
        </label>
      </div>

      <div style={styles.actions}>
        <button
          onClick={handleIntegrate}
          disabled={isIntegrating || (selectedLocation === 'newFile' && !newFileName)}
          style={{
            ...styles.button,
            ...(isIntegrating ? styles.buttonDisabled : styles.buttonPrimary)
          }}
        >
          {isIntegrating ? 'Integrating...' : '🚀 Integrate Code'}
        </button>
      </div>
    </div>
  );
};

const styles = {
  panel: {
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '20px',
    margin: '20px 0',
    color: '#e0e0e0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#fff',
  },
  subtitle: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#e0e0e0',
  },
  info: {
    backgroundColor: '#0d0d0d',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '13px',
  },
  label: {
    color: '#888',
    fontWeight: '500',
  },
  value: {
    color: '#4fc3f7',
    fontFamily: 'Monaco, Consolas, monospace',
    fontSize: '12px',
  },
  options: {
    marginBottom: '16px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '10px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  radio: {
    marginRight: '8px',
    cursor: 'pointer',
  },
  checkboxes: {
    marginBottom: '20px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '10px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  checkbox: {
    marginRight: '8px',
    cursor: 'pointer',
  },
  fileInput: {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: '#0d0d0d',
    border: '1px solid #333',
    borderRadius: '4px',
    color: '#e0e0e0',
    fontSize: '14px',
    marginTop: '8px',
    marginLeft: '24px',
    maxWidth: 'calc(100% - 24px)',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  button: {
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  buttonPrimary: {
    backgroundColor: '#4fc3f7',
    color: '#000',
  },
  buttonDisabled: {
    backgroundColor: '#333',
    color: '#666',
    cursor: 'not-allowed',
  },
};

export default IntegrationPanel;