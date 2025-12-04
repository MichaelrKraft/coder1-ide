'use client';

import React from 'react';
import { Artifact } from './ArtifactsGallery';

interface ArtifactCardProps {
  artifact: Artifact;
  viewMode: 'grid' | 'list';
  onClick: () => void;
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

const getTypeBadgeColor = (type: Artifact['type']): string => {
  switch (type) {
    case 'video':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'screenshot':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'trace':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'document':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'code':
      return 'bg-coder1-cyan/20 text-coder1-cyan border-coder1-cyan/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
};

const formatDate = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const ArtifactCard: React.FC<ArtifactCardProps> = ({ artifact, viewMode, onClick }) => {
  const icon = getTypeIcon(artifact.type);
  const badgeColor = getTypeBadgeColor(artifact.type);

  if (viewMode === 'list') {
    return (
      <button
        onClick={onClick}
        className="w-full bg-bg-secondary hover:bg-bg-tertiary border border-border-subtle rounded-lg p-4 transition-all duration-200 hover:border-coder1-cyan/50 hover:shadow-lg hover:shadow-coder1-cyan/10"
        data-testid={`artifact-card-${artifact.id}`}
      >
        <div className="flex items-center gap-4">
          {/* Thumbnail/Icon */}
          <div className="flex-shrink-0 w-16 h-16 bg-bg-tertiary rounded-lg flex items-center justify-center text-3xl border border-border-subtle">
            {artifact.thumbnailUrl ? (
              <img src={artifact.thumbnailUrl} alt={artifact.name} className="w-full h-full object-cover rounded-lg" />
            ) : (
              icon
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-left min-w-0">
            <h3 className="text-text-primary font-semibold truncate mb-1">{artifact.name}</h3>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <span className={`px-2 py-0.5 rounded border text-xs font-medium ${badgeColor}`}>
                {artifact.type}
              </span>
              <span>•</span>
              <span>{formatFileSize(artifact.size)}</span>
              <span>•</span>
              <span>{formatDate(artifact.createdAt)}</span>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex-shrink-0 text-text-secondary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="bg-bg-secondary hover:bg-bg-tertiary border border-border-subtle rounded-lg overflow-hidden transition-all duration-200 hover:border-coder1-cyan/50 hover:shadow-lg hover:shadow-coder1-cyan/10 text-left"
      data-testid={`artifact-card-${artifact.id}`}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-bg-tertiary flex items-center justify-center text-5xl border-b border-border-subtle">
        {artifact.thumbnailUrl ? (
          <img src={artifact.thumbnailUrl} alt={artifact.name} className="w-full h-full object-cover" />
        ) : (
          icon
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-text-primary font-semibold truncate mb-2">{artifact.name}</h3>

        <div className="flex items-center justify-between gap-2 mb-2">
          <span className={`px-2 py-1 rounded border text-xs font-medium ${badgeColor}`}>
            {artifact.type}
          </span>
          <span className="text-xs text-text-secondary">{formatFileSize(artifact.size)}</span>
        </div>

        <div className="text-xs text-text-secondary">
          {formatDate(artifact.createdAt)}
        </div>
      </div>
    </button>
  );
};

export default ArtifactCard;
