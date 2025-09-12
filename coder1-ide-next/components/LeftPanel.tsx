'use client';

import React, { useState } from 'react';
import { FolderTree, Clock, Brain } from 'lucide-react';
import SafeFileExplorer from './SafeFileExplorer';
import SessionsPanel from './SessionsPanel';
import ContextMemoryPanel from './ContextMemoryPanel';

interface LeftPanelProps {
  onFileSelect: (path: string) => void;
  activeFile: string | null;
}

export default function LeftPanel({ onFileSelect, activeFile }: LeftPanelProps) {
  const [activeTab, setActiveTab] = useState<'explorer' | 'sessions' | 'memory'>('explorer');
  
  // REMOVED: // REMOVED: console.log('🔄 LeftPanel rendered with activeTab:', activeTab);
  
  // Listen for event from footer to open Memory tab
  React.useEffect(() => {
    const handleOpenMemoryTab = () => {
      setActiveTab('memory');
    };
    
    window.addEventListener('openExplorerMemoryTab', handleOpenMemoryTab);
    
    return () => {
      window.removeEventListener('openExplorerMemoryTab', handleOpenMemoryTab);
    };
  }, []);
  
  return (
    <div className="h-full flex flex-col bg-bg-secondary relative">
      {/* Animated Background Gradient Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Gradient Orb 1 - Cyan */}
        <div 
          className="absolute w-64 h-64 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(0, 217, 255, 0.3), transparent)',
            top: '-100px',
            left: '-100px',
            filter: 'blur(60px)',
            animation: 'float 20s ease-in-out infinite',
          }}
        />
        
        {/* Gradient Orb 2 - Purple */}
        <div 
          className="absolute w-48 h-48 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3), transparent)',
            bottom: '50px',
            right: '-50px',
            filter: 'blur(40px)',
            animation: 'float 15s ease-in-out infinite reverse',
          }}
        />
        
        {/* Gradient Orb 3 - Orange */}
        <div 
          className="absolute w-32 h-32 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(251, 146, 60, 0.3), transparent)',
            top: '50%',
            left: '30%',
            filter: 'blur(30px)',
            animation: 'pulse 10s ease-in-out infinite',
          }}
        />
      </div>

      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(10px) translateX(-10px); }
          75% { transform: translateY(-10px) translateX(5px); }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.1; }
          50% { transform: scale(1.2); opacity: 0.15; }
        }
      `}</style>
      
      {/* Tab Buttons */}
      <div className="flex border-b border-border-default relative z-10">
        <button
          className={`flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'explorer'
              ? 'text-coder1-cyan border-b-2 border-coder1-cyan bg-bg-tertiary'
              : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
          }`}
          onClick={() => setActiveTab('explorer')}
          title="File Explorer - Browse project files and folders"
        >
          <FolderTree className="w-3 h-3" />
          <span>Explorer</span>
        </button>
        <button
          className={`flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'sessions'
              ? 'text-coder1-cyan border-b-2 border-coder1-cyan bg-bg-tertiary'
              : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            // REMOVED: // REMOVED: console.log('🎯 Sessions tab clicked in LeftPanel');
            setActiveTab('sessions');
            
            // Auto-close ContextManagerPanel if it's open
            window.dispatchEvent(new CustomEvent('ideSessionsTabClicked'));
          }}
          title="Sessions - View development sessions, checkpoints, and timeline history"
        >
          <Clock className="w-3 h-3" />
          <span>Sessions</span>
        </button>
        <button
          className={`flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'memory'
              ? 'text-coder1-cyan border-b-2 border-coder1-cyan bg-bg-tertiary'
              : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
          }`}
          onClick={() => setActiveTab('memory')}
          title="Memory - AI context folders with conversation history and patterns"
        >
          <Brain className="w-3 h-3" />
          <span>Memory</span>
        </button>
      </div>
      
      {/* Tab Content - Takes remaining space but leaves room for Discover */}
      <div className="flex-1 min-h-0 overflow-auto relative z-10">
        {activeTab === 'explorer' ? (
          <SafeFileExplorer onFileSelect={onFileSelect} activeFile={activeFile} />
        ) : activeTab === 'sessions' ? (
          <SessionsPanel isVisible={true} />
        ) : (
          <ContextMemoryPanel />
        )}
      </div>
      
    </div>
  );
}