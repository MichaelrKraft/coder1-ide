'use client';

import React, { useState, useEffect } from 'react';
import ArtifactCard from './ArtifactCard';
import ArtifactFilters from './ArtifactFilters';
import ArtifactPreview from './ArtifactPreview';

export interface Artifact {
  id: string;
  name: string;
  type: 'video' | 'screenshot' | 'trace' | 'document' | 'code';
  size: number;
  createdAt: Date;
  path: string;
  url?: string;
  thumbnailUrl?: string;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'newest' | 'oldest' | 'largest' | 'name';

const ArtifactsGallery: React.FC = () => {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);

  // Fetch artifacts from API on mount
  useEffect(() => {
    const fetchArtifacts = async () => {
      try {
        const response = await fetch('/api/artifacts');
        const data = await response.json();
        if (data.success && data.artifacts) {
          // Transform API data to match our Artifact interface
          const transformed = data.artifacts.map((a: any) => ({
            ...a,
            createdAt: new Date(a.createdAt),
            url: a.path
          }));
          setArtifacts(transformed);
        }
      } catch (error) {
        console.error('Failed to fetch artifacts:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchArtifacts();
  }, []);

  // Filter artifacts by type
  const filteredArtifacts = artifacts.filter(artifact =>
    selectedType === 'all' || artifact.type === selectedType
  );

  // Sort artifacts
  const sortedArtifacts = [...filteredArtifacts].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return b.createdAt.getTime() - a.createdAt.getTime();
      case 'oldest':
        return a.createdAt.getTime() - b.createdAt.getTime();
      case 'largest':
        return b.size - a.size;
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  const handleArtifactClick = (artifact: Artifact) => {
    setSelectedArtifact(artifact);
  };

  const handleClosePreview = () => {
    setSelectedArtifact(null);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="h-full bg-bg-primary p-6" data-testid="artifacts-gallery-loading">
        <div className="mb-6 h-12 bg-bg-secondary animate-pulse rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-48 bg-bg-secondary animate-pulse rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (sortedArtifacts.length === 0 && !isLoading) {
    return (
      <div className="h-full bg-bg-primary p-6" data-testid="artifacts-gallery-empty">
        <ArtifactFilters
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
        <div className="flex flex-col items-center justify-center h-96 text-text-secondary">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold mb-2">No artifacts found</h3>
          <p className="text-sm">
            {selectedType === 'all'
              ? 'Generated artifacts will appear here'
              : `No ${selectedType} artifacts found`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-bg-primary overflow-hidden flex flex-col" data-testid="artifacts-gallery">
      {/* Header with filters and view toggle */}
      <div className="p-6 border-b border-border-subtle flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-text-primary">Artifacts Gallery</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-coder1-cyan text-black'
                  : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
              }`}
              data-testid="view-mode-grid"
              aria-label="Grid view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-coder1-cyan text-black'
                  : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
              }`}
              data-testid="view-mode-list"
              aria-label="List view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        <ArtifactFilters
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      </div>

      {/* Artifacts grid/list */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'flex flex-col gap-3'
        }>
          {sortedArtifacts.map(artifact => (
            <ArtifactCard
              key={artifact.id}
              artifact={artifact}
              viewMode={viewMode}
              onClick={() => handleArtifactClick(artifact)}
            />
          ))}
        </div>
      </div>

      {/* Preview modal */}
      {selectedArtifact && (
        <ArtifactPreview
          artifact={selectedArtifact}
          onClose={handleClosePreview}
        />
      )}
    </div>
  );
};

export default ArtifactsGallery;
