import React from 'react';
import { Terminal, Play, Settings, Shield } from 'lucide-react';

interface HeaderProps {
  onTerminalToggle: () => void;
  onInspectorToggle: (enabled: boolean) => void;
  isInspectorEnabled: boolean;
  currentPage: 'ide' | 'supervision';
  onPageChange: (page: 'ide' | 'supervision') => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onTerminalToggle, 
  onInspectorToggle, 
  isInspectorEnabled,
  currentPage,
  onPageChange
}) => {

  return (
    <>
      <header className="ide-header">
        <div className="header-left">
          <div className="logo">
            <h1>Coder1 IDE</h1>
            <span className="version">v0.1.0</span>
          </div>
        </div>

        <div className="header-center">
          <nav className="main-nav">
            <button className="nav-item">File</button>
            <button className="nav-item">Edit</button>
            <button className="nav-item">View</button>
            <button className="nav-item">Run</button>
            <button className="nav-item">Help</button>
          </nav>
        </div>

        <div className="header-right">
          <div className="header-actions">
            <button 
              className="action-btn"
              onClick={onTerminalToggle}
              title="Toggle Terminal"
            >
              <Terminal size={16} />
            </button>
            
            <button 
              className={`action-btn ${isInspectorEnabled ? 'active' : ''}`}
              onClick={() => onInspectorToggle(!isInspectorEnabled)}
              title="Toggle Inspector"
            >
              <Settings size={16} />
            </button>

            <button 
              className={`action-btn supervision-btn ${currentPage === 'supervision' ? 'active' : ''}`}
              onClick={() => onPageChange(currentPage === 'supervision' ? 'ide' : 'supervision')}
              title="Claude Agent Supervision"
            >
              <Shield size={16} />
              <span className="btn-label">{currentPage === 'supervision' ? 'IDE' : 'Supervision'}</span>
            </button>

            <button className="action-btn run-btn" title="Run Project">
              <Play size={16} />
              <span className="btn-label">Run</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
