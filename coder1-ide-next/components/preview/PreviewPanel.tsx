'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Eye, X, RefreshCw, ExternalLink, Sparkles, Search, Users } from '@/lib/icons';
import { Camera, Presentation } from 'lucide-react';
import ScreenshotToCode from '@/components/screenshot-to-code/ScreenshotToCode';
import MarpPreview from '@/components/preview/MarpPreview';
import { colors, glows } from '@/lib/design-tokens';
import ContextualMemoryPanel from '@/components/contextual-memory/ContextualMemoryPanel';
import { previewLoopPrevention, createDebouncedPreviewUpdate } from '@/lib/preview-loop-prevention';
import TeamPanel from '@/components/team/TeamPanel';
import { useTeamStore } from '@/stores/useTeamStore';
import { useVoiceCallStore } from '@/stores/useVoiceCallStore';
import { features } from '@/lib/feature-flags';

type PreviewMode = 'preview' | 'contextual-memory' | 'teams' | 'screenshot-to-code' | 'marp-preview';

interface PreviewPanelProps {
  fileOpen?: boolean;
  activeFile?: string | null;
  editorContent?: string;
  isPreviewable?: boolean;
  onOpenFile?: (path: string, line?: number) => void;
  recentTerminalInput?: string;
  terminalCommands?: string[];
  claudeActive?: boolean; // 🔧 FIX (Feb 1, 2025): Pass through to ContextualMemoryPanel
}

/**
 * Preview Panel with Multiple Modes
 * - Live Preview (when HTML/React files open)
 * - Contextual Memory (AI-powered session context)
 * - ParaThinker Dashboard (Beta feature)
 */
const PreviewPanel = React.memo(function PreviewPanel({
  fileOpen = false,
  activeFile = null,
  editorContent = '',
  isPreviewable = false,
  onOpenFile,
  recentTerminalInput = '',
  terminalCommands = [],
  claudeActive = false, // 🔧 FIX (Feb 1, 2025): Default to false
}: PreviewPanelProps) {
  const [mode, setMode] = useState<PreviewMode>('teams');

  // Team store reads for badge indicators on the Teams tab
  const { syncTeam, onlineMembers } = useTeamStore();
  const { teamCallActive } = useVoiceCallStore();

  // Live preview state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  const lastUpdateRef = useRef({ file: '', content: '', timestamp: 0 });

  // 🚀 LIVE DEV SERVER STATE (Dec 4, 2025): Emergent-style live preview
  const [devServerUrl, setDevServerUrl] = useState<string | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);

  // 🎯 AUTO-PREVIEW STATE (Dec 4, 2025): Auto-show files Claude creates
  const [autoPreviewFile, setAutoPreviewFile] = useState<string | null>(null);

  // Debounced preview update function with loop prevention
  const debouncedPreviewUpdate = useMemo(
    () => createDebouncedPreviewUpdate((file: string, content: string) => {
      if (!previewLoopPrevention.canUpdate('preview-panel')) {
        return;
      }

      // Check for duplicate updates
      if (previewLoopPrevention.isDuplicateUpdate(file, content, 'preview-panel')) {
        return;
      }

      // Update iframe source with version parameter for cache busting
      const timestamp = Date.now();
      const previewUrl = `/api/preview?file=${encodeURIComponent(file)}&v=${timestamp}`;
      
      if (iframeRef.current) {
        setPreviewLoading(true);
        setPreviewError(null);
        iframeRef.current.src = previewUrl;
      }
    }, 300),
    []
  );

  // Live preview update effect with loop prevention
  useEffect(() => {
    // Only update if we're in preview mode and have a previewable file
    if (mode !== 'preview' || !isPreviewable || !activeFile) {
      return;
    }

    // Clear any existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Check for rapid updates that might indicate a loop
    const now = Date.now();
    const lastUpdate = lastUpdateRef.current;
    
    if (lastUpdate.file === activeFile && 
        lastUpdate.content === editorContent && 
        now - lastUpdate.timestamp < 500) {
      return; // Skip duplicate update
    }

    // Update the preview with debouncing
    debouncedPreviewUpdate.update(activeFile, editorContent);
    lastUpdateRef.current = { file: activeFile, content: editorContent, timestamp: now };

    // Cleanup function
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      debouncedPreviewUpdate.cancel();
    };
  }, [activeFile, editorContent, mode, isPreviewable, debouncedPreviewUpdate]);

  // Auto-switch based on context
  useEffect(() => {
    // Marp files take priority — switch to Slides tab
    if (activeFile?.endsWith('.md') && /^---[\s\S]*?marp:\s*true[\s\S]*?---/m.test(editorContent)) {
      setMode('marp-preview');
    } else if (fileOpen && isPreviewable) {
      setMode('preview');
    }
  }, [fileOpen, isPreviewable, activeFile, editorContent]);

  // Listen for switchToTeamsTab events (from status bar click)
  useEffect(() => {
    const handleSwitchToTeams = () => setMode('teams');
    window.addEventListener('switchToTeamsTab', handleSwitchToTeams);
    return () => window.removeEventListener('switchToTeamsTab', handleSwitchToTeams);
  }, []);

  // Listen for openTeamPanel events (from toast "View" clicks, etc.)
  useEffect(() => {
    const handleOpenTeamPanel = () => {
      setMode('teams');
      window.dispatchEvent(new CustomEvent('expandRightPanel'));
    };
    window.addEventListener('openTeamPanel', handleOpenTeamPanel);
    return () => window.removeEventListener('openTeamPanel', handleOpenTeamPanel);
  }, []);

  // Listen for session refresh events
  useEffect(() => {
    const handleSessionRefreshed = () => {
      // Reset preview to clean default state on browser refresh
      console.log('🔄 PreviewPanel: Session refresh detected, resetting to default state');
      setMode('preview');
    };

    window.addEventListener('sessionRefreshed', handleSessionRefreshed as EventListener);

    return () => {
      window.removeEventListener('sessionRefreshed', handleSessionRefreshed as EventListener);
    };
  }, []);

  // 🚀 AUTO-PREVIEW (Dec 4, 2025): Automatically show files Claude creates
  // Listen for terminal output to detect file creation and dev servers
  useEffect(() => {
    // File creation patterns - detect when Claude creates HTML files
    // IMPORTANT: Patterns with full paths MUST come first
    const FILE_CREATION_PATTERNS = [
      // Claude Code Write tool - always outputs full absolute paths
      /Wrote\s+(?:to\s+)?[`"']?(\/[^\s`"'\n]+\.html)[`"']?/i,
      /Created\s+(?:file\s+)?[`"']?(\/[^\s`"'\n]+\.html)[`"']?/i,
      /Writing\s+(?:to\s+)?[`"']?(\/[^\s`"'\n]+\.html)[`"']?/i,
      /Saved\s+(?:to\s+)?[`"']?(\/[^\s`"'\n]+\.html)[`"']?/i,
      // Shell redirects with full path
      />\s*(\/[^\s\n]+\.html)/,
      /cat\s+>\s*(\/[^\s\n]+\.html)/i,
      /echo\s+.*>\s*(\/[^\s\n]+\.html)/i,
      // Git patterns with full path
      /new file:\s+(\/[^\s\n]+\.html)/i,
      // touch with full path
      /touch\s+(\/[^\s\n]+\.html)/,
      // Fallback: relative paths (less reliable, will search in project root)
      /Wrote\s+(?:to\s+)?[`"']?([^\s`"'\n\/][^\s`"'\n]*\.html)[`"']?/i,
      /Created\s+(?:file\s+)?[`"']?([^\s`"'\n\/][^\s`"'\n]*\.html)[`"']?/i,
    ];

    // Dev server detection patterns
    const DEV_SERVER_PATTERNS = [
      /Local:\s+http:\/\/localhost:(\d+)/,
      /ready\s+-\s+started\s+server\s+on\s+.*?localhost:(\d+)/i,
      /url:\s*http:\/\/localhost:(\d+)/i,
      /Local:\s+http:\/\/localhost:(\d+)\//,
      /VITE\s+v[\d.]+\s+ready.*localhost:(\d+)/i,
      /You can now view.*http:\/\/localhost:(\d+)/i,
      /listening\s+(?:on\s+)?(?:port\s+)?(\d+)/i,
      /server\s+(?:is\s+)?(?:running|started|listening)\s+(?:at\s+|on\s+)?(?:http:\/\/)?localhost:(\d+)/i,
    ];

    const handleTerminalOutput = (event: CustomEvent) => {
      const output = event.detail?.output || '';

      // 🎯 SIMPLE AUTO-PREVIEW: Detect HTML file creation
      for (const pattern of FILE_CREATION_PATTERNS) {
        const match = output.match(pattern);
        if (match) {
          const filePath = match[1];
          console.log('📄 PreviewPanel: HTML file created, auto-previewing:', filePath);
          setAutoPreviewFile(filePath);
          setMode('preview'); // Switch to preview mode
          break;
        }
      }

      // Check for dev server startup patterns
      for (const pattern of DEV_SERVER_PATTERNS) {
        const match = output.match(pattern);
        if (match) {
          const port = match[1];
          const url = `http://localhost:${port}`;
          console.log('🚀 PreviewPanel: Dev server detected at', url);
          setDevServerUrl(url);
          setIsLiveMode(true);
          setMode('preview');
          break;
        }
      }

      // Detect server shutdown
      if (output.includes('SIGINT') ||
          output.includes('Shutting down') ||
          output.includes('Killed') ||
          output.includes('exit code')) {
        if (isLiveMode) {
          console.log('🛑 PreviewPanel: Dev server stopped');
          setDevServerUrl(null);
          setIsLiveMode(false);
        }
      }
    };

    window.addEventListener('terminalOutput', handleTerminalOutput as EventListener);
    return () => window.removeEventListener('terminalOutput', handleTerminalOutput as EventListener);
  }, [isLiveMode]);

  // Handle iframe load events
  const handleIframeLoad = useCallback(() => {
    setPreviewLoading(false);
    setPreviewError(null);
  }, []);

  const handleIframeError = useCallback(() => {
    setPreviewLoading(false);
    setPreviewError('Failed to load preview');
  }, []);

  // Manual refresh function
  const handleRefreshPreview = useCallback(() => {
    if (activeFile && iframeRef.current) {
      const timestamp = Date.now();
      const previewUrl = `/api/preview?file=${encodeURIComponent(activeFile)}&v=${timestamp}`;
      setPreviewLoading(true);
      setPreviewError(null);
      iframeRef.current.src = previewUrl;
    }
  }, [activeFile]);

  // Open preview in new window
  const handleOpenExternal = useCallback(() => {
    if (activeFile) {
      const timestamp = Date.now();
      const previewUrl = `/api/preview?file=${encodeURIComponent(activeFile)}&v=${timestamp}`;
      window.open(previewUrl, '_blank');
    }
  }, [activeFile]);



  const renderTabButton = useCallback((
    tabMode: PreviewMode,
    icon: React.ReactNode,
    label: string,
    tooltip?: string
  ) => (
    <button
      onClick={() => setMode(tabMode)}
      className={`
        flex items-center gap-2 px-3 py-2 text-sm font-medium
        transition-all duration-200 border-b-2
        ${mode === tabMode 
          ? 'text-coder1-cyan border-coder1-cyan' 
          : 'text-text-secondary border-transparent hover:text-text-primary hover:border-border-hover'
        }
      `}
      title={tooltip}
    >
      {icon}
      <span>{label}</span>
    </button>
  ), [mode]);

  return (
    <div className="h-full flex flex-col bg-bg-secondary border-l-2 border-coder1-cyan/50" style={{
      boxShadow: '-2px 0 8px rgba(0, 217, 255, 0.3)'
    }}>
      {/* Tabs */}
      <div className="flex items-center justify-between px-4 h-12 shrink-0">
        <div className="flex items-center gap-1">
          {features().teamFeatures && (
            <button
              onClick={() => setMode('teams')}
              className={`
                flex items-center gap-1.5 px-3 py-2 text-sm font-medium
                transition-all duration-200 border-b-2
                ${mode === 'teams'
                  ? 'text-coder1-cyan border-coder1-cyan'
                  : 'text-text-secondary border-transparent hover:text-text-primary hover:border-border-hover'
                }
              `}
              title="Team collaboration — voice, chat, and coordination"
            >
              <Users className="w-4 h-4" />
              <span>Teams</span>
              {syncTeam && onlineMembers.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-green-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {onlineMembers.length}
                </span>
              )}
              {teamCallActive && (
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              )}
            </button>
          )}
          {renderTabButton(
            'screenshot-to-code',
            <Camera className="w-4 h-4" />,
            'Screenshot',
            'Drop a UI screenshot to generate React/Next.js component scaffolding'
          )}
          {renderTabButton(
            'preview',
            <Eye className="w-4 h-4" />,
            'Preview',
            'Live preview of your HTML, CSS, and JavaScript code'
          )}
          {renderTabButton(
            'marp-preview',
            <Presentation className="w-4 h-4" />,
            'Slides',
            'Marp markdown presentation preview'
          )}
        </div>
        
        {/* Close button */}
        <button
          className="p-1 hover:bg-bg-tertiary rounded transition-colors"
          onClick={() => {
            // Dispatch event to collapse the right panel
            window.dispatchEvent(new CustomEvent('collapseRightPanel'));
          }}
          title="Close preview panel"
        >
          <X className="w-4 h-4 text-text-muted" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">

            {/* 🎞️ Marp Slides Preview */}
            {mode === 'marp-preview' && (
              <div className="h-full overflow-hidden">
                <MarpPreview activeFile={activeFile} editorContent={editorContent} />
              </div>
            )}

            {/* 📸 Screenshot to Code */}
            {mode === 'screenshot-to-code' && (
              <div className="h-full overflow-y-auto">
                <ScreenshotToCode />
              </div>
            )}

            {/* Contextual Memory Panel (Legacy - kept for backwards compatibility) */}
            {mode === 'contextual-memory' && (
              <div className="h-full">
                <ContextualMemoryPanel 
                  userInput={recentTerminalInput}
                  currentFiles={activeFile ? [activeFile] : []}
                  recentCommands={terminalCommands.slice(-5)} // Last 5 commands for context
                  claudeActive={claudeActive} // 🔧 FIX (Feb 1, 2025): Pass through claudeActive to skip regex when Claude is responding
                  onUseMemory={(memory) => {
                    console.log('User wants to use memory:', memory);
                    // TODO: Implement memory usage
                  }}
                  onExpandMemory={(memory) => {
                    console.log('User expanded memory:', memory);
                  }}
                />
              </div>
            )}

            {/* Team Communication Panel — always mounted to preserve Socket.IO connections */}
            {features().teamFeatures && (
              <div className={`h-full overflow-y-auto ${mode === 'teams' ? '' : 'hidden'}`}>
                <TeamPanel />
              </div>
            )}

            {/* Live Preview */}
            {mode === 'preview' && (
              <div className="h-full bg-gradient-to-br from-bg-primary via-bg-secondary/50 to-bg-primary">
                {/* Professional Dark Theme Preview Container */}
                <div className="h-full flex flex-col">
                  {/* Preview Actions Bar */}
                  <div className="flex items-center justify-between px-4 py-2 bg-transparent">
                    <div className="flex items-center gap-3 text-xs">
                      {/* 🚀 LIVE MODE INDICATOR (Dec 4, 2025) */}
                      {isLiveMode && devServerUrl ? (
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/40 rounded-full">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-green-400 text-xs font-medium">LIVE</span>
                          <span className="text-green-400/70 text-xs font-mono">{devServerUrl}</span>
                          <button
                            onClick={() => { setIsLiveMode(false); setDevServerUrl(null); }}
                            className="ml-1 text-green-400 hover:text-white transition-colors"
                            title="Disconnect from dev server"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : autoPreviewFile ? (
                        <div className="flex items-center gap-2 px-3 py-1 bg-coder1-cyan/20 border border-coder1-cyan/40 rounded-full">
                          <span className="w-2 h-2 bg-coder1-cyan rounded-full animate-pulse" />
                          <span className="text-coder1-cyan text-xs font-medium">AUTO</span>
                          <span className="text-coder1-cyan/70 text-xs font-mono truncate max-w-[200px]">{autoPreviewFile}</span>
                          <button
                            onClick={() => setAutoPreviewFile(null)}
                            className="ml-1 text-coder1-cyan hover:text-white transition-colors"
                            title="Clear auto-preview"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-text-muted">
                          {activeFile ? `Preview: ${activeFile}` : 'No file selected'}
                        </span>
                      )}
                      {previewLoading && (
                        <span className="text-coder1-cyan flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-coder1-cyan rounded-full animate-pulse" />
                          Loading...
                        </span>
                      )}
                      {previewError && (
                        <span className="text-red-400 flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-red-400 rounded-full" />
                          Error
                        </span>
                      )}
                    </div>

                    {/* Preview Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        className="p-2 hover:bg-coder1-cyan/10 rounded-lg transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Refresh Preview"
                        onClick={() => {
                          if (isLiveMode && iframeRef.current) {
                            iframeRef.current.contentWindow?.location.reload();
                          } else {
                            handleRefreshPreview();
                          }
                        }}
                        disabled={(!activeFile && !isLiveMode) || previewLoading}
                      >
                        <RefreshCw className={`w-4 h-4 text-text-muted group-hover:text-coder1-cyan ${previewLoading ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        className="p-2 hover:bg-coder1-purple/10 rounded-lg transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Open in New Window"
                        onClick={() => {
                          if (isLiveMode && devServerUrl) {
                            window.open(devServerUrl, '_blank');
                          } else {
                            handleOpenExternal();
                          }
                        }}
                        disabled={!activeFile && !isLiveMode}
                      >
                        <ExternalLink className="w-4 h-4 text-text-muted group-hover:text-coder1-purple" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Main Preview Area */}
                  <div className="flex-1 relative overflow-hidden">
                    {/* Animated Background Gradient */}
                    <div className="absolute inset-0">
                      <div className="absolute inset-0 bg-gradient-to-br from-coder1-cyan/10 via-transparent to-coder1-purple/10 animate-pulse-slow" />
                      <div className="absolute top-20 left-20 w-96 h-96 bg-coder1-cyan/5 rounded-full blur-3xl" />
                      <div className="absolute bottom-20 right-20 w-96 h-96 bg-coder1-purple/5 rounded-full blur-3xl" />
                    </div>
                    
                    {/* Dark Browser Frame */}
                    <div className="relative h-full flex items-center justify-center p-6">
                      <div className="w-full max-w-5xl h-full bg-bg-secondary/95 backdrop-blur-xl rounded-xl border border-coder1-cyan/30 shadow-2xl shadow-coder1-cyan/10 overflow-hidden">
                        {/* Dark Browser Chrome */}
                        <div className="bg-bg-primary/80 border-b border-coder1-cyan/20 px-4 py-2.5 flex items-center gap-3">
                          <div className="flex gap-2">
                            <div className="w-3 h-3 bg-red-500/80 rounded-full hover:bg-red-500 transition-colors cursor-pointer" />
                            <div className="w-3 h-3 bg-yellow-500/80 rounded-full hover:bg-yellow-500 transition-colors cursor-pointer" />
                            <div className="w-3 h-3 bg-green-500/80 rounded-full hover:bg-green-500 transition-colors cursor-pointer" />
                          </div>
                          <div className="flex-1 bg-bg-primary/50 rounded-lg px-3 py-1 border border-border-default/50">
                            <span className="text-xs text-text-muted font-mono truncate">
                              {isLiveMode && devServerUrl ? devServerUrl : autoPreviewFile ? autoPreviewFile : 'Preview Window'}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button className="p-1 hover:bg-bg-primary/50 rounded transition-colors" title="Preview options menu">
                              <svg className="w-3.5 h-3.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        
                        {/* Live Preview Content */}
                        <div className="h-[calc(100%-44px)] bg-gradient-to-b from-bg-primary to-bg-secondary/95 overflow-hidden">
                          {/* 🚀 LIVE DEV SERVER MODE (Dec 4, 2025): Show running app */}
                          {isLiveMode && devServerUrl ? (
                            <iframe
                              ref={iframeRef}
                              src={devServerUrl}
                              className="w-full h-full border-0 bg-white"
                              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                              onLoad={handleIframeLoad}
                              onError={handleIframeError}
                              title={`Live App at ${devServerUrl}`}
                            />
                          ) : autoPreviewFile ? (
                            // 🎯 AUTO-PREVIEW: Show file Claude just created
                            <iframe
                              ref={iframeRef}
                              src={`/api/preview?file=${encodeURIComponent(autoPreviewFile)}&v=${Date.now()}`}
                              className="w-full h-full border-0 bg-white"
                              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                              onLoad={handleIframeLoad}
                              onError={handleIframeError}
                              title={`Auto-preview of ${autoPreviewFile}`}
                            />
                          ) : activeFile && isPreviewable ? (
                            // File-based preview iframe
                            <iframe
                              ref={iframeRef}
                              src={`/api/preview?file=${encodeURIComponent(activeFile)}&v=${Date.now()}`}
                              className="w-full h-full border-0 bg-white"
                              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                              onLoad={handleIframeLoad}
                              onError={handleIframeError}
                              title={`Preview of ${activeFile}`}
                            />
                          ) : !activeFile && !isLiveMode && !autoPreviewFile ? (
                            // Demo preview when no file is selected
                            <iframe
                              ref={iframeRef}
                              src="/api/preview"
                              className="w-full h-full border-0 bg-white"
                              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                              onLoad={handleIframeLoad}
                              onError={handleIframeError}
                              title="Demo Preview"
                            />
                          ) : (
                            // Empty State with Dark Theme (for non-previewable files)
                            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                              {/* Glowing Icon */}
                              <div className="mb-6 relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-coder1-cyan to-coder1-purple rounded-3xl blur-2xl opacity-50 animate-pulse-slow" />
                                <div className="relative w-24 h-24 bg-gradient-to-br from-coder1-cyan via-coder1-purple to-coder1-cyan rounded-3xl flex items-center justify-center shadow-lg shadow-coder1-cyan/30">
                                  <Eye className="w-12 h-12 text-white drop-shadow-lg" />
                                </div>
                              </div>
                              
                              <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-coder1-cyan to-coder1-purple mb-3">
                                Live Preview Ready
                              </h3>
                              
                              <p className="text-text-secondary mb-6 max-w-lg leading-relaxed">
                                {!activeFile ? (
                                  "Open a file to see live preview. Supports HTML, React, CSS, JavaScript, and more."
                                ) : !isPreviewable ? (
                                  `File type "${activeFile.split('.').pop()}" is not previewable. Try opening an HTML, React, or CSS file.`
                                ) : (
                                  "Loading preview..."
                                )}
                              </p>
                              
                              {/* Quick Start Guide */}
                              <div className="px-6 py-4 bg-gradient-to-r from-coder1-cyan/10 to-coder1-purple/10 rounded-xl border border-coder1-cyan/30 max-w-md">
                                <p className="text-sm text-text-primary">
                                  <span className="text-coder1-cyan font-semibold">Supported Files:</span>
                                  <span className="text-text-secondary ml-2">
                                    .html, .tsx, .jsx, .css, .js, .ts
                                  </span>
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status Bar */}
                  <div className="px-4 py-2 bg-bg-primary/50 backdrop-blur-sm border-t border-coder1-cyan/20 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-text-muted">Live Preview</span>
                      {isLiveMode && devServerUrl ? (
                        // 🚀 LIVE DEV SERVER MODE
                        <>
                          <span className="text-green-400 flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-glow-green" />
                            Live Server
                          </span>
                          <span className="text-green-400">{devServerUrl}</span>
                        </>
                      ) : autoPreviewFile ? (
                        // 🎯 AUTO-PREVIEW MODE
                        <>
                          <span className="text-coder1-cyan flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-coder1-cyan rounded-full animate-pulse" />
                            Auto-Preview
                          </span>
                          <span className="text-coder1-cyan">{autoPreviewFile.split('/').pop()}</span>
                        </>
                      ) : activeFile && isPreviewable ? (
                        // 📄 FILE-BASED PREVIEW MODE
                        <>
                          <span className="text-green-400 flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-glow-green" />
                            Active
                          </span>
                          <span className="text-coder1-cyan">Real-time Updates</span>
                        </>
                      ) : (
                        // ⏳ WAITING MODE
                        <>
                          <span className="text-text-muted flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-text-muted rounded-full" />
                            Waiting for file
                          </span>
                          <span className="text-text-muted">Ready</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-text-muted font-mono">
                      {(activeFile || autoPreviewFile) && (
                        <span className="text-coder1-cyan">{(activeFile || autoPreviewFile)?.split('.').pop()?.toUpperCase()}</span>
                      )}
                      <span>Auto-refresh: 300ms</span>
                      <span className="text-coder1-purple">Loop Protection: ON</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
      </div>
    </div>
  );
});

// Agent Status Card Component - REAL AI INTEGRATION
const AgentStatusCard = React.memo(function AgentStatusCard({
  name,
  status,
  task,
  progress,
  role,
}: {
  name: string;
  status: 'idle' | 'thinking' | 'working' | 'completed' | 'error';
  task: string;
  progress: number;
  role?: string;
}) {
  const statusColors = {
    idle: 'text-text-muted',
    thinking: 'text-warning',
    working: 'text-coder1-cyan',
    completed: 'text-green-400',
    error: 'text-error',
  };

  const statusIcons = {
    idle: '',
    thinking: '', 
    working: '',
    completed: '',
    error: '',
  };

  return (
    <div className="p-3 bg-bg-tertiary rounded-lg border border-border-default hover:border-coder1-cyan/50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-text-primary">{name}</h4>
              <span className="text-xs">{statusIcons[status]}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className={`text-xs capitalize ${statusColors[status]} font-medium`}>{status}</p>
              {role && (
                <span className="text-xs text-text-muted">• {role}</span>
              )}
            </div>
          </div>
        </div>
        <span className="text-xs text-text-secondary font-mono">{progress}%</span>
      </div>
      <p className="text-xs text-text-secondary mb-2 line-clamp-2">{task || 'No current task'}</p>
      {/* Progress bar */}
      <div className="w-full h-1.5 bg-bg-primary rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 rounded-full ${
            status === 'completed' 
              ? 'bg-green-400' 
              : status === 'error' 
                ? 'bg-error' 
                : 'bg-gradient-to-r from-coder1-purple to-coder1-cyan'
          }`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
});
export default PreviewPanel;
