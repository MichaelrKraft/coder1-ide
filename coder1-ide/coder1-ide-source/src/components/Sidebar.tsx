import React, { useState } from 'react';
import './Sidebar.css';

interface SidebarProps {
  activeView: 'explorer' | 'terminal' | 'preview' | 'discover' | 'codebase';
  setActiveView: (view: 'explorer' | 'terminal' | 'preview' | 'discover' | 'codebase') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  return (
    <div className="sidebar">
      <div className="sidebar-buttons">
        <div className="sidebar-button-wrapper">
          <button
            className={`sidebar-button ${activeView === 'explorer' ? 'active' : ''}`}
            onClick={() => setActiveView('explorer')}
            onMouseEnter={() => setHoveredButton('explorer')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            📁
          </button>
          {hoveredButton === 'explorer' && (
            <div className="tooltip">File Explorer</div>
          )}
        </div>

        <div className="sidebar-button-wrapper">
          <button
            className={`sidebar-button ${activeView === 'terminal' ? 'active' : ''}`}
            onClick={() => setActiveView('terminal')}
            onMouseEnter={() => setHoveredButton('terminal')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            ⌨️
          </button>
          {hoveredButton === 'terminal' && (
            <div className="tooltip">Terminal View</div>
          )}
        </div>

        <div className="sidebar-button-wrapper">
          <button
            className={`sidebar-button ${activeView === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveView('preview')}
            onMouseEnter={() => setHoveredButton('preview')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            👁️
          </button>
          {hoveredButton === 'preview' && (
            <div className="tooltip">Live Preview</div>
          )}
        </div>

        <div className="sidebar-button-wrapper">
          <button
            className={`sidebar-button ${activeView === 'discover' ? 'active' : ''}`}
            onClick={() => setActiveView('discover')}
            onMouseEnter={() => setHoveredButton('discover')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            🔍
          </button>
          {hoveredButton === 'discover' && (
            <div className="tooltip">Discover</div>
          )}
        </div>

        <div className="sidebar-button-wrapper">
          <button
            className={`sidebar-button ${activeView === 'codebase' ? 'active' : ''}`}
            onClick={() => setActiveView('codebase')}
            onMouseEnter={() => setHoveredButton('codebase')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            📚
          </button>
          {hoveredButton === 'codebase' && (
            <div className="tooltip">Codebase Wiki</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;