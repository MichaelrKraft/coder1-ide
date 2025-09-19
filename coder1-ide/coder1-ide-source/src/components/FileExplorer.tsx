import React, { useState, useEffect } from 'react';
import { fileSystemService, FileNode } from '../services/fileSystem';
import ClaudeActivityIndicator from './ClaudeActivityIndicator';
import AgentsFileWizard from './AgentsFileWizard';
import './FileExplorer.css';

interface FileExplorerProps {
  onFileSelect: (filePath: string, fileName: string) => void;
  onSearchClick?: () => void;
}

interface FileTreeItemProps {
  node: FileNode;
  level: number;
  onFileSelect: (filePath: string, fileName: string) => void;
  onShowWizard?: (directory: string) => void;
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({ node, level, onFileSelect, onShowWizard }) => {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels
  const [showContextMenu, setShowContextMenu] = useState(false);
  const isAgentsFile = fileSystemService.isAgentsFile(node.name);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowContextMenu(false);
    };

    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (node.type === 'directory') {
      setIsExpanded(!isExpanded);
    } else {
      onFileSelect(node.path, node.name);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (node.type === 'directory') {
      setShowContextMenu(true);
    }
  };

  const handleCreateAgentsFile = () => {
    setShowContextMenu(false);
    onShowWizard?.(node.path);
  };

  return (
    <div className="file-tree-item">
      <div 
        className={`file-item ${node.type} ${isAgentsFile ? 'agents-file' : ''}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleRightClick}
        role="button"
        tabIndex={0}
        title={isAgentsFile ? 'AI Agent Instructions File' : undefined}
      >
        {node.type === 'directory' && (
          <span 
            className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
            onClick={handleToggle}
          >
            ▶
          </span>
        )}
        <span className="file-icon">
          {fileSystemService.getFileIcon(node.name, node.type === 'directory')}
        </span>
        <span className={`file-name ${isAgentsFile ? 'agents-file-name' : ''}`}>
          {node.name}
        </span>
        {isAgentsFile && (
          <span className="agents-badge" title="AI Agent Instructions">AI</span>
        )}
      </div>
      
      {/* Context menu for directories */}
      {showContextMenu && node.type === 'directory' && (
        <div 
          className="context-menu"
          style={{
            position: 'absolute',
            zIndex: 1000,
            background: 'var(--tokyo-bg-dark)',
            border: '1px solid var(--tokyo-fg-gutter)',
            borderRadius: '4px',
            padding: '8px 0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            left: `${level * 16 + 100}px`,
            minWidth: '180px'
          }}
        >
          <button
            className="context-menu-item"
            onClick={handleCreateAgentsFile}
            style={{
              width: '100%',
              padding: '8px 16px',
              border: 'none',
              background: 'transparent',
              color: 'var(--tokyo-fg)',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '13px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--tokyo-bg-highlight)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            🤖 Create AGENTS.md
          </button>
        </div>
      )}
      
      {node.type === 'directory' && isExpanded && node.children && (
        <div className="file-children">
          {node.children.map((child, index) => (
            <FileTreeItem
              key={`${child.path}-${index}`}
              node={child}
              level={level + 1}
              onFileSelect={onFileSelect}
              onShowWizard={onShowWizard}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileExplorer: React.FC<FileExplorerProps> = ({ onFileSelect, onSearchClick }) => {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardTargetDirectory, setWizardTargetDirectory] = useState('/');

  const loadFiles = async () => {
    try {
      const files = await fileSystemService.getProjectFiles();
      setFileTree(files);
    } catch (error) {
      console.error('Failed to load project files:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  if (loading) {
    return (
      <div className="file-explorer loading">
        <div className="loading-message">Loading project files...</div>
      </div>
    );
  }

  return (
    <div className="file-explorer" style={{ pointerEvents: 'auto' }}>
      <div className="file-explorer-header">
        <span className="explorer-title">Search</span>
        {onSearchClick && (
          <button 
            className="search-button"
            onClick={onSearchClick}
            title="Search files (Cmd+Shift+F)"
          >
            🔍
          </button>
        )}
      </div>
      
      {/* Claude Activity Indicator - Dynamic real-time version */}
      <ClaudeActivityIndicator />
      
      <div className="file-tree" style={{ pointerEvents: 'auto' }}>
        {fileTree.map((node, index) => (
          <FileTreeItem
            key={`${node.path}-${index}`}
            node={node}
            level={0}
            onFileSelect={onFileSelect}
            onShowWizard={(directory) => {
              setWizardTargetDirectory(directory);
              setShowWizard(true);
            }}
          />
        ))}
      </div>

      {/* AGENTS.md Creation Wizard */}
      <AgentsFileWizard
        isVisible={showWizard}
        onClose={() => setShowWizard(false)}
        targetDirectory={wizardTargetDirectory}
        onFileCreated={(filePath) => {
          // Refresh the file tree to show the new file
          loadFiles();
          // Also open the created file
          const fileName = filePath.split('/').pop() || 'AGENTS.md';
          onFileSelect(filePath, fileName);
        }}
      />
    </div>
  );
};

export default FileExplorer;