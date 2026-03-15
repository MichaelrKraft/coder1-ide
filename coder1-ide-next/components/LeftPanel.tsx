'use client';

import React, { useState } from 'react';
import { FolderTree, Clock, Search, Terminal, BookOpen } from 'lucide-react';
import dynamic from 'next/dynamic';
import SafeFileExplorer from './SafeFileExplorer';
import SessionsPanel from './SessionsPanel';
import CodeSearch from './codebase/CodeSearch';
import { CommandsPanel } from './commands/CommandsPanel';
import { useVaultStore } from '@/stores/useVaultStore';

const NotesPanel = dynamic(() => import('@/components/notes/NotesPanel'), { ssr: false });

const vaultEnabled = process.env.NEXT_PUBLIC_VAULT_ENABLED === 'true';

interface LeftPanelProps {
  onFileSelect: (path: string) => void;
  activeFile: string | null;
  refreshTrigger?: number;
  onRootChange?: (newRoot: string) => void;
}

export default function LeftPanel({ onFileSelect, activeFile, refreshTrigger, onRootChange }: LeftPanelProps) {
  const [activeTab, setActiveTab] = useState<'explorer' | 'sessions' | 'search' | 'commands' | 'notes'>('explorer');
  const { openNote, activeNotePath } = useVaultStore();
  
  // REMOVED: // REMOVED: console.log('🔄 LeftPanel rendered with activeTab:', activeTab);
  
  return (
    <div className="h-full flex flex-col bg-bg-secondary relative" data-tour="file-explorer">
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
      <div className="flex border-b border-border-default relative z-10 overflow-x-auto scrollbar-none">
        <button
          className={`flex-shrink-0 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
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
          className={`flex-shrink-0 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'search'
              ? 'text-coder1-cyan border-b-2 border-coder1-cyan bg-bg-tertiary'
              : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
          }`}
          onClick={() => setActiveTab('search')}
          title="Code Search - Intelligent search through functions, classes, and code structure"
        >
          <Search className="w-3 h-3" />
          <span>Search</span>
        </button>
        <button
          className={`flex-shrink-0 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
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
          className={`flex-shrink-0 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'commands'
              ? 'text-coder1-cyan border-b-2 border-coder1-cyan bg-bg-tertiary'
              : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
          }`}
          onClick={() => setActiveTab('commands')}
          title="Commands - Browse and install shared slash commands for Claude Code"
        >
          <Terminal className="w-3 h-3" />
          <span>Commands</span>
        </button>
        {vaultEnabled && (
          <button
            className={`flex-shrink-0 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'notes'
                ? 'text-coder1-cyan border-b-2 border-coder1-cyan bg-bg-tertiary'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
            }`}
            onClick={() => setActiveTab('notes')}
            title="Notes - Knowledge base and graph"
          >
            <BookOpen className="w-3 h-3" />
            <span>Notes</span>
          </button>
        )}
      </div>
      
      {/* Tab Content - Takes remaining space but leaves room for Discover */}
      <div className="flex-1 min-h-0 relative z-10">
        {activeTab === 'explorer' && (
          <SafeFileExplorer onFileSelect={onFileSelect} activeFile={activeFile} refreshTrigger={refreshTrigger} onRootChange={onRootChange} />
        )}
        {activeTab === 'sessions' && (
          <SessionsPanel isVisible={true} />
        )}
        {activeTab === 'search' && (
          <CodeSearch onOpenFile={onFileSelect} />
        )}
        {activeTab === 'commands' && (
          <CommandsPanel teamId={null} />
        )}
        {activeTab === 'notes' && vaultEnabled && (
          <NotesPanel onNoteSelect={openNote} activeNotePath={activeNotePath ?? undefined} />
        )}
      </div>
      
    </div>
  );
}