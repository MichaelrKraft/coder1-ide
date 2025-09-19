import React, { useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import './ThreePanelLayout.css';

interface ThreePanelLayoutProps {
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  defaultLeftSize?: number;
  defaultRightSize?: number;
}

export const ThreePanelLayout: React.FC<ThreePanelLayoutProps> = ({
  leftPanel,
  centerPanel,
  rightPanel,
  defaultLeftSize = 10,
  defaultRightSize = 10
}) => {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  return (
    <PanelGroup direction="horizontal" className="three-panel-layout">
      {/* Left Panel - Explorer */}
      <Panel
        defaultSize={defaultLeftSize}
        minSize={5}
        maxSize={40}
        collapsible={true}
        onCollapse={() => setLeftCollapsed(true)}
        onExpand={() => setLeftCollapsed(false)}
        className="panel-left"
      >
        <div className="panel-content">
          <div className="panel-header">
            <h3>Explorer</h3>
            <button 
              className="panel-toggle"
              onClick={() => setLeftCollapsed(!leftCollapsed)}
              title="Toggle Explorer"
            >
              {leftCollapsed ? '→' : '←'}
            </button>
          </div>
          <div className="panel-body">
            {leftPanel}
          </div>
        </div>
      </Panel>

      <PanelResizeHandle className="resize-handle resize-handle-vertical">
        <div className="resize-handle-inner" />
      </PanelResizeHandle>

      {/* Center Panel - Editor/Terminal */}
      <Panel
        minSize={20}
        className="panel-center"
      >
        {centerPanel}
      </Panel>

      <PanelResizeHandle className="resize-handle resize-handle-vertical">
        <div className="resize-handle-inner" />
      </PanelResizeHandle>

      {/* Right Panel - Preview/ReactBits */}
      <Panel
        defaultSize={defaultRightSize}
        minSize={5}
        maxSize={60}
        collapsible={true}
        onCollapse={() => setRightCollapsed(true)}
        onExpand={() => setRightCollapsed(false)}
        className="panel-right"
      >
        <div className="panel-content">
          <div className="panel-header">
            <h3>Preview</h3>
            <button 
              className="panel-toggle"
              onClick={() => setRightCollapsed(!rightCollapsed)}
              title="Toggle Preview"
            >
              {rightCollapsed ? '←' : '→'}
            </button>
          </div>
          <div className="panel-body">
            {rightPanel}
          </div>
        </div>
      </Panel>
    </PanelGroup>
  );
};

export default ThreePanelLayout;