'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FolderTree, Search, BookOpen, Network, List, GitBranch, Cpu, Target } from 'lucide-react';
import dynamic from 'next/dynamic';
import SafeFileExplorer from './SafeFileExplorer';
import CodeSearch from './codebase/CodeSearch';
import { useVaultStore } from '@/stores/useVaultStore';
import DevLogButton from './notes/DevLogButton';
import SessionNoteIndicator from './notes/SessionNoteIndicator';
import { useFileEditsStore } from '@/stores/useFileEditsStore';

const NotesPanel = dynamic(() => import('@/components/notes/NotesPanel'), { ssr: false });
const NoteDetailView = dynamic(() => import('@/components/notes/NoteDetailView'), { ssr: false });
const KnowledgeGraph = dynamic(() => import('@/components/graph/KnowledgeGraph'), { ssr: false });
const FileEditsPanel = dynamic(() => import('@/components/file-edits/FileEditsPanel'), { ssr: false });
const GoalsPanel = dynamic(() => import('./goals/GoalsPanel'), { ssr: false });

const vaultEnabled = process.env.NEXT_PUBLIC_VAULT_ENABLED === 'true';
const agentHubEnabled = process.env.NEXT_PUBLIC_ENABLE_AGENT_HUB === 'true';

interface LeftPanelProps {
  onFileSelect: (path: string) => void;
  activeFile: string | null;
  refreshTrigger?: number;
  onRootChange?: (newRoot: string) => void;
}

export default function LeftPanel({ onFileSelect, activeFile, refreshTrigger, onRootChange }: LeftPanelProps) {
  const [activeTab, setActiveTab] = useState<'explorer' | 'search' | 'notes' | 'files' | 'goals'>('explorer');
  const [showGraph, setShowGraph] = useState(false);
  const router = useRouter();
  const { openNote, activeNotePath } = useVaultStore();
  const fileEditsCount = useFileEditsStore((s) => s.edits.length);
  const [goalsYourTurn, setGoalsYourTurn] = useState(0);

  useEffect(() => {
    if (!agentHubEnabled) return;
    const fetchCounts = () => {
      fetch('/api/agent-hub/goals/counts')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && typeof data.yourTurn === 'number') {
            setGoalsYourTurn(data.yourTurn);
          }
        })
        .catch(() => {});
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 30_000);
    return () => clearInterval(interval);
  }, []);

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
            activeTab === 'files'
              ? 'text-coder1-cyan border-b-2 border-coder1-cyan bg-bg-tertiary'
              : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
          }`}
          onClick={() => setActiveTab('files')}
          title="Changes - Files modified in this session"
        >
          <GitBranch className="w-3 h-3" />
          <span>Changes</span>
          {fileEditsCount > 0 && (
            <span className="px-1.5 py-0.5 bg-coder1-cyan/20 text-coder1-cyan text-[10px] rounded-full font-bold leading-none">
              {fileEditsCount}
            </span>
          )}
        </button>
      </div>
      
      {/* Notes graph/list toggle sub-header */}
      {activeTab === 'notes' && vaultEnabled && !activeNotePath && (
        <div className="flex items-center justify-between px-2 py-1 border-b border-border-default relative z-10 flex-shrink-0">
          <div className="flex items-center gap-1">
            <SessionNoteIndicator />
            <DevLogButton
              onNoteCreated={(path) => {
                setActiveTab('notes');
                openNote(path);
              }}
            />
          </div>
          <div className="flex items-center gap-1 bg-bg-tertiary rounded p-0.5">
            <button
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-all ${
                !showGraph ? 'bg-bg-secondary text-coder1-cyan' : 'text-text-muted hover:text-text-secondary'
              }`}
              onClick={() => setShowGraph(false)}
              title="List view"
            >
              <List className="w-3 h-3" />
            </button>
            <button
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-all ${
                showGraph ? 'bg-bg-secondary text-coder1-cyan' : 'text-text-muted hover:text-text-secondary'
              }`}
              onClick={() => setShowGraph(true)}
              title="Graph view"
            >
              <Network className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Tab Content - Takes remaining space but leaves room for Discover */}
      <div className="flex-1 min-h-0 relative z-10">
        {activeTab === 'explorer' && (
          <SafeFileExplorer onFileSelect={onFileSelect} activeFile={activeFile} refreshTrigger={refreshTrigger} onRootChange={onRootChange} />
        )}
        {activeTab === 'search' && (
          <CodeSearch onOpenFile={onFileSelect} />
        )}
        {activeTab === 'files' && (
          <FileEditsPanel />
        )}
        {activeTab === 'goals' && agentHubEnabled && (
          <GoalsPanel />
        )}
      </div>
      
    </div>
  );
}