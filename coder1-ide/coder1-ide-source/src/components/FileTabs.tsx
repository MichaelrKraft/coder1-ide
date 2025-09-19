import React, { memo, useCallback, useMemo } from 'react';
import './FileTabs.css';

interface FileTab {
  path: string;
  name: string;
  isDirty?: boolean;
  language?: string;
}

interface FileTabsProps {
  tabs: FileTab[];
  activeTab: string | null;
  onTabClick: (path: string) => void;
  onTabClose: (path: string) => void;
}

const FileTabs = memo<FileTabsProps>(({
  tabs,
  activeTab,
  onTabClick,
  onTabClose
}) => {
  // Memoize icon map for performance
  const iconMap = useMemo(() => ({
    'js': '📄',
    'jsx': '⚛️',
    'ts': '📘',
    'tsx': '⚛️',
    'json': '📋',
    'html': '🌐',
    'css': '🎨',
    'scss': '🎨',
    'py': '🐍',
    'java': '☕',
    'cpp': '⚙️',
    'c': '⚙️',
    'cs': '🔷',
    'go': '🐹',
    'rs': '🦀',
    'md': '📝',
    'txt': '📄',
    'yml': '⚙️',
    'yaml': '⚙️',
    'xml': '📄',
    'sh': '🖥️',
    'env': '🔐',
  } as Record<string, string>), []);
  
  const getFileIcon = useCallback((fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return iconMap[ext || ''] || '📄';
  }, [iconMap]);

  if (tabs.length === 0) {
    return (
      <div className="file-tabs empty">
        <div className="empty-message">No files open</div>
      </div>
    );
  }

  return (
    <div className="file-tabs">
      <div className="tabs-container">
        {tabs.map((tab) => (
          <div
            key={tab.path}
            className={`file-tab ${activeTab === tab.path ? 'active' : ''} ${tab.isDirty ? 'dirty' : ''}`}
            onClick={() => onTabClick(tab.path)}
          >
            <span className="tab-icon">{getFileIcon(tab.name)}</span>
            <span className="tab-name">{tab.name}</span>
            {tab.isDirty && <span className="dirty-indicator">●</span>}
            <button
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.path);
              }}
              title="Close"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="tabs-actions">
        <button className="tab-action" title="New File">
          +
        </button>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for tabs
  if (prevProps.tabs.length !== nextProps.tabs.length) return false;
  if (prevProps.activeTab !== nextProps.activeTab) return false;
  
  // Check if any tab has changed
  for (let i = 0; i < prevProps.tabs.length; i++) {
    const prev = prevProps.tabs[i];
    const next = nextProps.tabs[i];
    if (prev.path !== next.path || prev.name !== next.name || prev.isDirty !== next.isDirty) {
      return false;
    }
  }
  
  return true;
});

export default FileTabs;