'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  X, Eye, Code, CheckCircle, Upload, 
  ChevronDown, Loader, FileCode, Star, Package, AlertCircle
} from 'lucide-react';

const Editor = dynamic(
  () => import('@monaco-editor/react'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-bg-primary">
        <Loader className="w-6 h-6 text-coder1-cyan animate-spin" />
      </div>
    )
  }
);

interface FileData {
  path: string;
  content: string;
}

interface ExplorationResult {
  agentId: string;
  strategy: string;
  output: {
    files: FileData[];
    previewUrl?: string;
  };
  selfEvaluation: {
    quality: number;
    uniqueness: number;
    feasibility: number;
    bestPractices: number;
    totalScore: number;
  };
}

interface ExplorationResultsViewerProps {
  sessionId: string;
  results: ExplorationResult[];
  onClose: () => void;
  onAdopt?: (strategyId: string, files: string[]) => void;
}

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    'html': 'html',
    'css': 'css',
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'json': 'json',
    'md': 'markdown',
    'svg': 'xml',
  };
  return langMap[ext] || 'plaintext';
}

type ProjectType = 'static' | 'build-required' | 'code-only';

function detectProjectType(files: FileData[]): ProjectType {
  const hasPackageJson = files.some(f => f.path === 'package.json');
  const hasViteConfig = files.some(f => f.path.includes('vite.config'));
  const hasNextConfig = files.some(f => f.path.includes('next.config'));
  const hasTsxFiles = files.some(f => f.path.endsWith('.tsx') || f.path.endsWith('.jsx'));
  const hasHtmlWithScript = files.some(f => {
    if (!f.path.endsWith('.html')) return false;
    return f.content.includes('type="module"') || f.content.includes('src="/src/');
  });
  const hasStaticHtml = files.some(f => {
    if (!f.path.endsWith('.html')) return false;
    return !f.content.includes('type="module"') && !f.content.includes('src="/src/');
  });

  if (hasStaticHtml) return 'static';
  if (hasViteConfig || hasNextConfig || hasHtmlWithScript || (hasPackageJson && hasTsxFiles)) return 'build-required';
  if (files.length > 0) return 'code-only';
  return 'code-only';
}

interface BuildStatus {
  status: 'not-started' | 'pending' | 'building' | 'success' | 'error';
  progress?: string;
  error?: string;
  builtDir?: string;
}

function StrategyPanel({
  result,
  index,
  sessionId,
  onAdopt
}: {
  result: ExplorationResult;
  index: number;
  sessionId: string;
  onAdopt: (strategyId: string) => void;
}) {
  const files = result.output.files || [];
  const projectType = useMemo(() => detectProjectType(files), [files]);

  const [activeTab, setActiveTab] = useState<'preview' | 'code'>(projectType === 'static' ? 'preview' : 'code');
  const [selectedFile, setSelectedFile] = useState<FileData | null>(files[0] || null);
  const [isAdopting, setIsAdopting] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [buildStatus, setBuildStatus] = useState<BuildStatus>({ status: 'not-started' });
  const [builtPreviewPath, setBuiltPreviewPath] = useState<string | null>(null);

  useEffect(() => {
    if (projectType !== 'static' && buildStatus.status !== 'success') {
      setActiveTab('code');
    }
  }, [projectType, buildStatus.status]);

  const strategyId = `strategy_${index + 1}`;
  const basePreviewUrl = `/api/parallel-exploration/preview/${sessionId}/${strategyId}`;
  const previewUrl = builtPreviewPath
    ? `${basePreviewUrl}/${builtPreviewPath}/index.html`
    : basePreviewUrl;

  // Function to trigger build for React/Vite projects
  const triggerBuild = useCallback(async () => {
    if (buildStatus.status === 'building') return;

    setBuildStatus({ status: 'building', progress: 'Starting build...' });

    try {
      const response = await fetch(`/api/parallel-exploration/build/${sessionId}/${strategyId}`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setBuildStatus({
          status: 'success',
          progress: 'Build complete!',
          builtDir: data.previewPath
        });
        setBuiltPreviewPath(data.previewPath === '.' ? null : data.previewPath);
        setIframeError(false);
      } else {
        setBuildStatus({
          status: 'error',
          progress: 'Build failed',
          error: data.error || 'Unknown error'
        });
      }
    } catch (error) {
      setBuildStatus({
        status: 'error',
        progress: 'Build failed',
        error: error instanceof Error ? error.message : 'Network error'
      });
    }
  }, [sessionId, strategyId, buildStatus.status]);

  const handleAdopt = async () => {
    setIsAdopting(true);
    try {
      await onAdopt(strategyId);
    } finally {
      setIsAdopting(false);
    }
  };

  const scores = result.selfEvaluation;
  const avgScore = Math.round(scores.totalScore);

  return (
    <div className="flex flex-col h-full bg-bg-secondary border border-border-default rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-bg-tertiary">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-text-primary">
              {result.strategy}
            </span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded ${
            avgScore >= 80 ? 'bg-green-500/20 text-green-400' :
            avgScore >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            Score: {avgScore}
          </span>
        </div>
        <button
          onClick={handleAdopt}
          disabled={isAdopting}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-coder1-cyan text-bg-primary rounded hover:bg-coder1-cyan/90 transition-colors disabled:opacity-50"
        >
          {isAdopting ? (
            <Loader className="w-3 h-3 animate-spin" />
          ) : (
            <Upload className="w-3 h-3" />
          )}
          Adopt
        </button>
      </div>

      <div className="flex border-b border-border-default bg-bg-tertiary">
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
            activeTab === 'preview' 
              ? 'text-coder1-cyan border-b-2 border-coder1-cyan' 
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Eye className="w-4 h-4" />
          Preview
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
            activeTab === 'code' 
              ? 'text-coder1-cyan border-b-2 border-coder1-cyan' 
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Code className="w-4 h-4" />
          Code ({files.length})
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'preview' && (
          <div className="h-full bg-bg-primary">
            {/* Static projects - show iframe directly */}
            {projectType === 'static' && !iframeError ? (
              <iframe
                src={previewUrl}
                className="w-full h-full border-0 bg-white"
                sandbox="allow-scripts allow-same-origin"
                title={`Preview ${result.strategy}`}
                onError={() => setIframeError(true)}
              />
            ) : /* Build-required projects with successful build */
            projectType === 'build-required' && buildStatus.status === 'success' && !iframeError ? (
              <iframe
                src={previewUrl}
                className="w-full h-full border-0 bg-white"
                sandbox="allow-scripts allow-same-origin"
                title={`Preview ${result.strategy}`}
                onError={() => setIframeError(true)}
              />
            ) : /* Build-required projects - currently building */
            projectType === 'build-required' && buildStatus.status === 'building' ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-text-muted max-w-sm">
                  <Loader className="w-12 h-12 mx-auto mb-4 text-coder1-cyan animate-spin" />
                  <p className="font-medium text-text-secondary text-lg">Building Preview...</p>
                  <p className="text-sm mt-2 text-coder1-cyan">{buildStatus.progress || 'Please wait...'}</p>
                  <p className="text-xs mt-4 text-text-muted">
                    Your preview will load within one minute.
                  </p>
                  <div className="mt-4 w-full bg-bg-tertiary rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-coder1-cyan animate-pulse" style={{ width: '60%' }} />
                  </div>
                </div>
              </div>
            ) : /* Build-required projects - build failed */
            projectType === 'build-required' && buildStatus.status === 'error' ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-text-muted max-w-sm">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500 opacity-70" />
                  <p className="font-medium text-text-secondary">Build Failed</p>
                  <p className="text-xs mt-2 text-red-400 max-h-20 overflow-y-auto">
                    {buildStatus.error || 'Unknown error occurred'}
                  </p>
                  <div className="flex gap-2 justify-center mt-4">
                    <button
                      onClick={triggerBuild}
                      className="px-3 py-1.5 text-xs bg-coder1-cyan text-bg-primary rounded hover:bg-coder1-cyan/90 transition-colors"
                    >
                      Retry Build
                    </button>
                    <button
                      onClick={() => setActiveTab('code')}
                      className="px-3 py-1.5 text-xs bg-bg-tertiary text-text-secondary rounded hover:bg-bg-tertiary/80 transition-colors"
                    >
                      View Source Code
                    </button>
                  </div>
                </div>
              </div>
            ) : /* Build-required projects - not yet built */
            projectType === 'build-required' ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-text-muted max-w-xs">
                  <Package className="w-12 h-12 mx-auto mb-3 text-coder1-cyan opacity-70" />
                  <p className="font-medium text-text-secondary">React/Vite Project</p>
                  <p className="text-xs mt-2">This project needs to be built before preview.</p>
                  <button
                    onClick={triggerBuild}
                    className="mt-4 px-4 py-2 text-sm font-medium bg-coder1-cyan text-bg-primary rounded hover:bg-coder1-cyan/90 transition-colors"
                  >
                    Build Preview
                  </button>
                  <p className="text-xs mt-3 text-text-muted">
                    Takes ~30-60 seconds
                  </p>
                  <button
                    onClick={() => setActiveTab('code')}
                    className="mt-2 px-3 py-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
                  >
                    or view source code
                  </button>
                </div>
              </div>
            ) : iframeError ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-text-muted">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-yellow-500 opacity-70" />
                  <p>Preview failed to load</p>
                  <button
                    onClick={() => setActiveTab('code')}
                    className="mt-3 px-3 py-1.5 text-xs bg-coder1-cyan/20 text-coder1-cyan rounded hover:bg-coder1-cyan/30 transition-colors"
                  >
                    View Code Instead
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-text-muted">
                  <FileCode className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Code files generated</p>
                  <button
                    onClick={() => setActiveTab('code')}
                    className="mt-3 px-3 py-1.5 text-xs bg-coder1-cyan/20 text-coder1-cyan rounded hover:bg-coder1-cyan/30 transition-colors"
                  >
                    View Source Code
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'code' && (
          <div className="h-full flex flex-col">
            {files.length > 0 ? (
              <>
                <div className="px-3 py-2 border-b border-border-default bg-bg-tertiary">
                  <div className="relative">
                    <select
                      value={selectedFile?.path || ''}
                      onChange={(e) => {
                        const file = files.find(f => f.path === e.target.value);
                        setSelectedFile(file || null);
                      }}
                      className="w-full appearance-none bg-bg-primary border border-border-default rounded px-3 py-1.5 pr-8 text-sm text-text-primary focus:outline-none focus:border-coder1-cyan"
                    >
                      {files.map((file) => (
                        <option key={file.path} value={file.path}>
                          {file.path}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                  </div>
                </div>
                
                <div className="flex-1 overflow-hidden">
                  {selectedFile && (
                    <Editor
                      height="100%"
                      language={getLanguageFromPath(selectedFile.path)}
                      value={selectedFile.content}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 13,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        padding: { top: 10 },
                      }}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-text-muted">
                  <FileCode className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No files generated</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-2 border-t border-border-default bg-bg-tertiary">
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="text-center">
            <div className="text-text-muted">Quality</div>
            <div className="text-text-primary font-medium">{Math.round(scores.quality)}%</div>
          </div>
          <div className="text-center">
            <div className="text-text-muted">Unique</div>
            <div className="text-text-primary font-medium">{Math.round(scores.uniqueness)}%</div>
          </div>
          <div className="text-center">
            <div className="text-text-muted">Feasible</div>
            <div className="text-text-primary font-medium">{Math.round(scores.feasibility)}%</div>
          </div>
          <div className="text-center">
            <div className="text-text-muted">Best Practice</div>
            <div className="text-text-primary font-medium">{Math.round(scores.bestPractices)}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExplorationResultsViewer({
  sessionId,
  results,
  onClose,
  onAdopt
}: ExplorationResultsViewerProps) {
  const [adoptedStrategy, setAdoptedStrategy] = useState<string | null>(null);
  const [adoptedPreviewUrl, setAdoptedPreviewUrl] = useState<string | null>(null);
  const [adoptError, setAdoptError] = useState<string | null>(null);

  const handleAdopt = useCallback(async (strategyId: string) => {
    setAdoptError(null);
    
    try {
      const response = await fetch('/api/parallel-exploration/adopt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, strategyId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAdoptedStrategy(strategyId);
        setAdoptedPreviewUrl(data.previewUrl || null);
        onAdopt?.(strategyId, data.files);
      } else {
        setAdoptError(data.error || 'Failed to adopt strategy');
      }
    } catch (error) {
      setAdoptError('Network error while adopting strategy');
    }
  }, [sessionId, onAdopt]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-default bg-bg-secondary">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-text-primary">
            Exploration Results
          </h2>
          <span className="text-sm text-text-muted">
            Compare {results.length} strategies and adopt the best one
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {adoptedStrategy && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>Adopted {adoptedStrategy}</span>
            </div>
          )}
          {adoptedPreviewUrl && (
            <a
              href={adoptedPreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-coder1-cyan/20 text-coder1-cyan rounded hover:bg-coder1-cyan/30 transition-colors"
            >
              <Eye className="w-4 h-4" />
              View Preview
            </a>
          )}
          {adoptError && (
            <div className="text-red-400 text-sm">
              {adoptError}
            </div>
          )}
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-tertiary rounded transition-colors"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        <div className={`grid gap-4 h-full ${
          results.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
        }`}>
          {results.map((result, index) => (
            <StrategyPanel
              key={result.agentId}
              result={result}
              index={index}
              sessionId={sessionId}
              onAdopt={handleAdopt}
            />
          ))}
        </div>
      </div>

      <div className="px-6 py-3 border-t border-border-default bg-bg-secondary text-center">
        <p className="text-xs text-text-muted">
          Click &quot;Adopt&quot; to copy files to your workspace • Preview shows live-rendered HTML • Code tab shows all generated files
        </p>
      </div>
    </div>
  );
}
