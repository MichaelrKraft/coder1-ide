'use client';

import React, { useState, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { spacing } from '@/lib/design-tokens';

interface ThreePanelLayoutProps {
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  leftPanelMinSize?: number;
  rightPanelMinSize?: number;
  centerPanelMinSize?: number;
}

/**
 * Three Panel Layout Component
 * 
 * PRESERVED FROM ORIGINAL:
 * - Left panel: 15% (reduced from 20% for more center space)
 * - Right panel: 20% (increased for better preview visibility)
 * - Center panel: 65% (adjusted for new right panel size)
 * - Exact resize handle styling
 * 
 * DO NOT MODIFY panel sizes without checking original
 */
export default function ThreePanelLayout({
  leftPanel,
  centerPanel,
  rightPanel,
  leftPanelMinSize = 10,
  rightPanelMinSize = 10,
  centerPanelMinSize = 30,
}: ThreePanelLayoutProps) {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  const handleLeftCollapse = useCallback(() => {
    setLeftCollapsed(!leftCollapsed);
  }, [leftCollapsed]);

  const handleRightCollapse = useCallback(() => {
    setRightCollapsed(!rightCollapsed);
  }, [rightCollapsed]);

  return (
    <div className="h-screen w-full bg-bg-primary overflow-hidden">
      <PanelGroup direction="horizontal" className="h-full">
        {/* Left Panel - Explorer */}
        <Panel
          defaultSize={15} // Your exact 15% from improvements
          minSize={leftPanelMinSize}
          collapsible={true}
          collapsedSize={3}
          onCollapse={handleLeftCollapse}
          className="h-full bg-bg-secondary"
        >
          <div className="h-full border-r-2 border-coder1-cyan/50 overflow-hidden" style={{
            boxShadow: '2px 0 8px rgba(0, 217, 255, 0.3)'
          }}>
            {leftPanel}
          </div>
        </Panel>

        {/* Left Resize Handle */}
        <PanelResizeHandle 
          className="group w-1 bg-bg-secondary hover:bg-orange-400/20 transition-all duration-200 cursor-col-resize relative"
          style={{
            boxShadow: '0 0 0 0 rgba(251, 146, 60, 0)',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as unknown as HTMLElement).style.boxShadow = '0 0 20px rgba(251, 146, 60, 0.8), inset 0 0 10px rgba(251, 146, 60, 0.4)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as unknown as HTMLElement).style.boxShadow = '0 0 0 0 rgba(251, 146, 60, 0)';
          }}
        >
          <div className="w-full h-full flex items-center justify-center">
            <div 
              className="w-0.5 h-8 bg-orange-400/50 group-hover:bg-orange-400 rounded-full transition-all duration-200"
              style={{
                boxShadow: '0 0 10px rgba(251, 146, 60, 0.6)',
              }}
            />
          </div>
        </PanelResizeHandle>

        {/* Center Panel - Editor/Terminal */}
        <Panel
          defaultSize={65} // Adjusted for new right panel size
          minSize={centerPanelMinSize}
          className="bg-bg-primary"
        >
          <div className="h-full overflow-hidden">
            {centerPanel}
          </div>
        </Panel>

        {/* Right Resize Handle */}
        <PanelResizeHandle 
          className="group w-1 bg-bg-secondary hover:bg-orange-400/20 transition-all duration-200 cursor-col-resize relative"
          style={{
            boxShadow: '0 0 0 0 rgba(251, 146, 60, 0)',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as unknown as HTMLElement).style.boxShadow = '0 0 20px rgba(251, 146, 60, 0.8), inset 0 0 10px rgba(251, 146, 60, 0.4)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as unknown as HTMLElement).style.boxShadow = '0 0 0 0 rgba(251, 146, 60, 0)';
          }}
        >
          <div className="w-full h-full flex items-center justify-center">
            <div 
              className="w-0.5 h-8 bg-orange-400/50 group-hover:bg-orange-400 rounded-full transition-all duration-200"
              style={{
                boxShadow: '0 0 10px rgba(251, 146, 60, 0.6)',
              }}
            />
          </div>
        </PanelResizeHandle>

        {/* Right Panel - Preview/Agent Dashboard/Codebase Wiki */}
        <Panel
          defaultSize={20} // Increased by 25% more space as requested
          minSize={rightPanelMinSize}
          collapsible={true}
          collapsedSize={3}
          onCollapse={handleRightCollapse}
          className="bg-bg-secondary"
        >
          <div className="h-full">
            {rightPanel}
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}