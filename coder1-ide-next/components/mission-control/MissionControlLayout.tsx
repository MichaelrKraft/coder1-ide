'use client';

import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import MCHeader from './MCHeader';
import MCNavigationSidebar from './MCNavigationSidebar';
import MCMainContent from './MCMainContent';
import MCDetailsPanel from './MCDetailsPanel';

interface MissionControlLayoutProps {
  onClose: () => void;
}

/**
 * Mission Control Layout Component
 *
 * Main container with 3-panel layout:
 * - Left: Navigation Sidebar (15%)
 * - Center: Main Content (60%)
 * - Right: Details Panel (25%)
 * - Top: Header
 */
export default function MissionControlLayout({ onClose }: MissionControlLayoutProps) {
  return (
    <div className="h-screen w-full bg-bg-primary flex flex-col overflow-hidden">
      {/* Header */}
      <MCHeader onClose={onClose} />

      {/* Three Panel Layout */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Navigation Sidebar */}
          <Panel
            defaultSize={15}
            minSize={10}
            maxSize={25}
            collapsible={true}
            collapsedSize={0}
            className="h-full bg-bg-secondary"
          >
            <div className="h-full border-r-2 border-coder1-cyan/50 overflow-hidden"
                 style={{ boxShadow: '2px 0 8px rgba(0, 217, 255, 0.3)' }}>
              <MCNavigationSidebar />
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
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(251, 146, 60, 0.8), inset 0 0 10px rgba(251, 146, 60, 0.4)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 0 rgba(251, 146, 60, 0)';
            }}
          >
            <div className="w-full h-full flex items-center justify-center">
              <div
                className="w-0.5 h-8 bg-orange-400/50 group-hover:bg-orange-400 rounded-full transition-all duration-200"
                style={{ boxShadow: '0 0 10px rgba(251, 146, 60, 0.6)' }}
              />
            </div>
          </PanelResizeHandle>

          {/* Center Panel - Main Content */}
          <Panel
            defaultSize={60}
            minSize={40}
            className="bg-bg-primary"
          >
            <div className="h-full overflow-hidden">
              <MCMainContent />
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
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(251, 146, 60, 0.8), inset 0 0 10px rgba(251, 146, 60, 0.4)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 0 rgba(251, 146, 60, 0)';
            }}
          >
            <div className="w-full h-full flex items-center justify-center">
              <div
                className="w-0.5 h-8 bg-orange-400/50 group-hover:bg-orange-400 rounded-full transition-all duration-200"
                style={{ boxShadow: '0 0 10px rgba(251, 146, 60, 0.6)' }}
              />
            </div>
          </PanelResizeHandle>

          {/* Right Panel - Details Panel */}
          <Panel
            defaultSize={25}
            minSize={15}
            maxSize={35}
            collapsible={true}
            collapsedSize={0}
            className="bg-bg-secondary"
          >
            <div className="h-full">
              <MCDetailsPanel />
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
