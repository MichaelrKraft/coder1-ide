'use client';

import React, { useEffect } from 'react';
import { Artifact } from './ArtifactsGallery';

interface ArtifactPreviewProps {
  artifact: Artifact;
  onClose: () => void;
}

const getTypeIcon = (type: Artifact['type']): string => {
  switch (type) {
    case 'video':
      return '🎬';
    case 'screenshot':
      return '📸';
    case 'trace':
      return '🔍';
    case 'document':
      return '📄';
    case 'code':
      return '💻';
    default:
      return '📦';
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
};

const ArtifactPreview: React.FC<ArtifactPreviewProps> = ({ artifact, onClose }) => {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = artifact.url;
    link.download = artifact.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderPreview = () => {
    switch (artifact.type) {
      case 'video':
        return (
          <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
            <video controls className="w-full h-full" src={artifact.url}>
              Your browser does not support video playback.
            </video>
          </div>
        );

      case 'screenshot':
        return (
          <div className="w-full bg-bg-tertiary rounded-lg overflow-hidden">
            <img
              src={artifact.url}
              alt={artifact.name}
              className="w-full h-auto max-h-[70vh] object-contain"
            />
          </div>
        );

      case 'trace':
        return (
          <div className="w-full bg-bg-tertiary rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">Playwright Trace</h3>
            <p className="text-text-secondary mb-6">
              View this trace in the Playwright Trace Viewer
            </p>
            <a
              href={`https://trace.playwright.dev/?trace=${encodeURIComponent(artifact.url)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-coder1-cyan text-black font-semibold rounded-lg hover:bg-coder1-cyan/90 transition-colors"
              data-testid="trace-viewer-link"
            >
              <span>Open in Trace Viewer</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        );

      case 'document':
        return (
          <div className="w-full bg-bg-tertiary rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">Document Preview</h3>
            <p className="text-text-secondary mb-6">
              Download to view this document
            </p>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-6 py-3 bg-coder1-cyan text-black font-semibold rounded-lg hover:bg-coder1-cyan/90 transition-colors"
              data-testid="document-download-button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download Document</span>
            </button>
          </div>
        );

      case 'code':
        return (
          <div className="w-full bg-bg-tertiary rounded-lg p-6 overflow-auto max-h-[70vh]">
            <pre className="text-sm text-text-primary font-mono">
              <code>{`// Code preview not yet implemented\n// Download to view this file`}</code>
            </pre>
            <button
              onClick={handleDownload}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-coder1-cyan text-black font-semibold rounded-lg hover:bg-coder1-cyan/90 transition-colors"
              data-testid="code-download-button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download Code</span>
            </button>
          </div>
        );

      default:
        return (
          <div className="w-full bg-bg-tertiary rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">{getTypeIcon(artifact.type)}</div>
            <p className="text-text-secondary">Preview not available for this file type</p>
          </div>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
      data-testid="artifact-preview-modal"
    >
      <div className="bg-bg-primary border border-border-subtle rounded-xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-subtle">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="text-3xl flex-shrink-0">{getTypeIcon(artifact.type)}</span>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-text-primary truncate">{artifact.name}</h2>
              <div className="flex items-center gap-3 text-sm text-text-secondary mt-1">
                <span className="capitalize">{artifact.type}</span>
                <span>•</span>
                <span>{formatFileSize(artifact.size)}</span>
                <span>•</span>
                <span>{artifact.createdAt.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-bg-secondary hover:bg-bg-tertiary border border-border-subtle rounded-lg transition-colors text-text-primary flex items-center gap-2"
              data-testid="artifact-download-button"
              aria-label="Download artifact"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-bg-secondary hover:bg-bg-tertiary border border-border-subtle rounded-lg transition-colors text-text-primary"
              data-testid="artifact-preview-close"
              aria-label="Close preview"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Preview content */}
        <div className="p-6 overflow-auto flex-1">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
};

export default ArtifactPreview;
