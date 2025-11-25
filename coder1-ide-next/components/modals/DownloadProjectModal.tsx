'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, FileArchive, FileJson } from 'lucide-react';

interface DownloadProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportFormat = 'zip' | 'json';

export default function DownloadProjectModal({ isOpen, onClose }: DownloadProjectModalProps) {
  const [format, setFormat] = useState<ExportFormat>('zip');
  const [includeNodeModules, setIncludeNodeModules] = useState(false);
  const [includeGitHistory, setIncludeGitHistory] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setFormat('zip');
      setIncludeNodeModules(false);
      setIncludeGitHistory(false);
      setIsDownloading(false);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape' && !isDownloading) {
        onClose();
      } else if (e.key === 'Enter' && !isDownloading) {
        e.preventDefault();
        handleDownload();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDownloading, format, includeNodeModules, includeGitHistory]);

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        format,
        includeNodeModules: includeNodeModules.toString(),
        includeGitHistory: includeGitHistory.toString(),
      });

      const response = await fetch(`/api/export?${params}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Export failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const timestamp = new Date().toISOString().split('T')[0];
      a.download = `coder1-project-${timestamp}.${format}`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setTimeout(() => {
        onClose();
      }, 500);

    } catch (err) {
      console.error('Download error:', err);
      setError(err instanceof Error ? err.message : 'Failed to download project');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
        onClick={!isDownloading ? onClose : undefined}
      />

      <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
        <div className="bg-bg-secondary border border-border-primary rounded-lg shadow-2xl w-full max-w-md">
          
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
            <h2 className="text-lg font-semibold text-text-primary">
              Download Project
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-bg-tertiary rounded transition-colors"
              disabled={isDownloading}
            >
              <X className="w-4 h-4 text-text-secondary" />
            </button>
          </div>

          <div className="p-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-primary mb-3">
                Export Format
              </label>
              
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 border border-border-primary rounded-lg cursor-pointer hover:bg-bg-tertiary/50 transition-colors">
                  <input
                    type="radio"
                    name="format"
                    value="zip"
                    checked={format === 'zip'}
                    onChange={(e) => setFormat(e.target.value as ExportFormat)}
                    className="mt-1 w-4 h-4 text-cyan-600 bg-bg-tertiary border-border-primary focus:ring-cyan-500"
                    disabled={isDownloading}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <FileArchive className="w-4 h-4 text-cyan-400" />
                      <span className="font-medium text-text-primary">ZIP Archive</span>
                      <span className="px-2 py-0.5 bg-cyan-600/20 text-cyan-300 text-xs rounded-full">
                        Recommended
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      Complete project archive ready to extract and run
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border border-border-primary rounded-lg cursor-pointer hover:bg-bg-tertiary/50 transition-colors">
                  <input
                    type="radio"
                    name="format"
                    value="json"
                    checked={format === 'json'}
                    onChange={(e) => setFormat(e.target.value as ExportFormat)}
                    className="mt-1 w-4 h-4 text-cyan-600 bg-bg-tertiary border-border-primary focus:ring-cyan-500"
                    disabled={isDownloading}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <FileJson className="w-4 h-4 text-amber-400" />
                      <span className="font-medium text-text-primary">JSON Export</span>
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      Structured data format for programmatic processing
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="mb-4 space-y-3 pt-3 border-t border-border-primary">
              <label className="block text-sm font-medium text-text-primary mb-2">
                Export Options
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeNodeModules}
                  onChange={(e) => setIncludeNodeModules(e.target.checked)}
                  className="mt-1 w-4 h-4 text-cyan-600 bg-bg-tertiary border-border-primary rounded focus:ring-cyan-500"
                  disabled={isDownloading}
                />
                <div className="flex-1">
                  <span className="text-sm text-text-primary">Include node_modules</span>
                  <p className="text-xs text-text-muted mt-0.5">
                    May significantly increase file size
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeGitHistory}
                  onChange={(e) => setIncludeGitHistory(e.target.checked)}
                  className="mt-1 w-4 h-4 text-cyan-600 bg-bg-tertiary border-border-primary rounded focus:ring-cyan-500"
                  disabled={isDownloading}
                />
                <div className="flex-1">
                  <span className="text-sm text-text-primary">Include .git history</span>
                  <p className="text-xs text-text-muted mt-0.5">
                    Include complete git repository history
                  </p>
                </div>
              </label>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-border-primary bg-bg-primary/30">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              disabled={isDownloading}
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
            >
              {isDownloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download {format.toUpperCase()}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
