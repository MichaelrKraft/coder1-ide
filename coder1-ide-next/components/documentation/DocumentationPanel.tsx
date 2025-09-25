'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Trash2, ExternalLink, Clock, FileText, Brain, Loader2, Upload, FileImage, File } from 'lucide-react';
import { getCompanionClient } from '@/lib/companion-client';

interface DocumentationResult {
  docId: string;
  title: string;
  url: string;
  categories: string[];
  relevanceScore: number;
  claudeScore?: number;
  claudeReasoning?: string;
  excerpts?: Array<{
    text: string;
    heading?: string;
    hasCode: boolean;
  }>;
}

interface DocumentationDoc {
  docId: string;
  title: string;
  url: string;
  categories: string[];
  wordCount: number;
  chunkCount: number;
  processedAt: string;
  age: number;
}

const DocumentationPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [docs, setDocs] = useState<DocumentationDoc[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DocumentationResult[]>([]);
  const [addUrl, setAddUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const companionClient = React.useMemo(() => getCompanionClient(), []);

  // Listen for external open documentation panel events
  useEffect(() => {
    const handleOpenDocumentationPanel = () => {
      // Documentation panel disabled per user request - do not open
      console.log('Documentation panel open request ignored - panel disabled');
    };

    window.addEventListener('openDocumentationPanel', handleOpenDocumentationPanel);
    
    return () => {
      window.removeEventListener('openDocumentationPanel', handleOpenDocumentationPanel);
    };
  }, []);

  // Load documentation list on mount
  useEffect(() => {
    if (isOpen) {
      if (companionClient.isConnected()) {
        loadDocsList();
        loadStats();
      } else {
        // Load from local API if companion not connected
        loadLocalDocs();
      }
    }
  }, [isOpen]);

  const loadDocsList = async () => {
    if (!companionClient.isConnected()) {
      // Fall back to local API instead of showing error
      await loadLocalDocs();
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:57132/docs/list');
      if (response.ok) {
        const data = await response.json();
        setDocs(data.docs || []);
        setError(null);
      } else {
        throw new Error('Failed to load documentation');
      }
    } catch (error) {
      console.error('Failed to load docs:', error);
      setError('Failed to load documentation list');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    if (!companionClient.isConnected()) return;

    try {
      const response = await fetch('http://localhost:57132/docs/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);
    
    try {
      if (companionClient.isConnected()) {
        // Use companion service for advanced search
        const response = await fetch('http://localhost:57132/docs/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: searchQuery,
            options: {
              maxResults: 10,
              includeContent: true,
              useClaudeAnalysis: true,
              projectContext: 'Coder1 IDE development'
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.results || []);
        } else {
          throw new Error('Search failed');
        }
      } else {
        // Use local search for basic filtering
        const filteredDocs = docs.filter(doc => 
          doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.categories.some(cat => cat.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        
        // Convert to search results format
        const results = filteredDocs.map(doc => ({
          docId: doc.docId,
          title: doc.title,
          url: doc.url,
          categories: doc.categories,
          relevanceScore: 1.0,
          excerpts: [{
            text: `Document: ${doc.title} (${doc.wordCount} words)`,
            hasCode: false
          }]
        }));
        
        setSearchResults(results);
      }
    } catch (error) {
      console.error('Search error:', error);
      setError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddDocumentation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUrl.trim() || !companionClient.isConnected()) return;

    setIsAdding(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:57132/docs/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: addUrl,
          options: {
            timeout: 30000,
            retries: 3
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAddUrl('');
        await loadDocsList();
        await loadStats();
        
        // Show success message
        setError(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add documentation');
      }
    } catch (error) {
      console.error('Add documentation error:', error);
      setError(`Failed to add documentation: ${error.message}`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!companionClient.isConnected()) return;

    try {
      const response = await fetch(`http://localhost:57132/docs/${docId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadDocsList();
        await loadStats();
        setSearchResults(prev => prev.filter(result => result.docId !== docId));
      } else {
        throw new Error('Failed to delete documentation');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setError('Failed to delete documentation');
    }
  };

  const formatAge = (age: number) => {
    const hours = Math.floor(age / (1000 * 60 * 60));
    if (hours < 1) return 'Just added';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // File upload handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    
    // Check if files contain PDFs - these should go to File-to-Claude converter instead
    const hasPDFs = files.some(file => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    
    if (hasPDFs) {
      // Don't stop propagation - let PDFs fall through to global DragDropOverlay
      console.log('📄 PDF detected - routing to File-to-Claude converter instead of Documentation system');
      return;
    }
    
    // Only stop propagation for non-PDF files that we actually want to process
    e.stopPropagation();
    await handleFileUpload(files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    await handleFileUpload(files);
  };

  const handleFileUpload = async (files: File[]) => {
    // Note: PDFs are excluded - they're routed to File-to-Claude converter instead
    const supportedTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/svg+xml',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    const validFiles = files.filter(file => {
      const isSupported = supportedTypes.includes(file.type) || 
                         file.name.endsWith('.csv') ||
                         file.name.endsWith('.svg');
      if (!isSupported) {
        console.warn(`Unsupported file type: ${file.name} (${file.type})`);
      }
      return isSupported;
    });

    if (validFiles.length === 0) {
      setError('Please upload PNG, JPEG, SVG, or CSV files only (PDFs go to File-to-Claude converter)');
      return;
    }

    for (const file of validFiles) {
      try {
        setUploadingFiles(prev => [...prev, file.name]);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', file.type);
        formData.append('name', file.name);

        // First try our API endpoint
        const response = await fetch('/api/docs/upload', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const data = await response.json();
          console.log('File uploaded successfully:', data);
          
          // If companion service is connected, sync with it
          if (companionClient.isConnected()) {
            await loadDocsList();
            await loadStats();
          } else {
            // Reload the docs list from our API
            await loadLocalDocs();
          }
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to upload file');
        }
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        setError(`Failed to upload ${file.name}: ${error.message}`);
      } finally {
        setUploadingFiles(prev => prev.filter(name => name !== file.name));
      }
    }

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Load documents from local API
  const loadLocalDocs = async () => {
    try {
      const response = await fetch('/api/docs/upload');
      if (response.ok) {
        const data = await response.json();
        const formattedDocs = data.documents.map((doc: any) => ({
          docId: doc.docId,
          title: doc.title,
          url: doc.url,
          categories: doc.categories,
          wordCount: doc.wordCount,
          chunkCount: Math.ceil(doc.wordCount / 500), // Estimate chunks
          processedAt: doc.processedAt,
          age: Date.now() - new Date(doc.processedAt).getTime()
        }));
        setDocs(formattedDocs);
      }
    } catch (error) {
      console.error('Failed to load local docs:', error);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'svg'].includes(ext || '')) {
      return <FileImage className="w-4 h-4 text-blue-400" />;
    }
    if (ext === 'pdf') {
      return <File className="w-4 h-4 text-red-400" />;
    }
    if (ext === 'csv') {
      return <FileText className="w-4 h-4 text-green-400" />;
    }
    return <File className="w-4 h-4 text-text-muted" />;
  };

  if (!isOpen) {
    // Floating button permanently removed per user request
    return null;
  }

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-bg-secondary border-l border-border-default shadow-xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-default">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-text-primary">Documentation</h2>
          {companionClient.isConnected() && (
            <Brain className="w-4 h-4 text-green-400" title="AI-Enhanced Search Active" />
          )}
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-bg-tertiary rounded transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Connection Status - Updated to show local mode */}
      {!companionClient.isConnected() && (
        <div className="p-4 bg-blue-500/10 border-b border-blue-500/20">
          <p className="text-sm text-blue-400">
            📁 Running in local mode. Upload and search documents below.
          </p>
        </div>
      )}

      {/* Stats */}
      {stats && companionClient.isConnected() && (
        <div className="p-4 bg-bg-tertiary border-b border-border-default">
          <div className="grid grid-cols-3 gap-2 text-xs text-text-muted">
            <div>
              <div className="font-medium text-text-primary">{stats.documentsCount}</div>
              <div>Documents</div>
            </div>
            <div>
              <div className="font-medium text-text-primary">{stats.totalChunks}</div>
              <div>Chunks</div>
            </div>
            <div>
              <div className="font-medium text-text-primary">{Math.round(stats.totalWords / 1000)}K</div>
              <div>Words</div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-500/10 border-b border-red-500/20">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-border-default">
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documentation..."
                className="w-full pl-10 pr-4 py-2 bg-bg-primary border border-border-default rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!companionClient.isConnected()}
              />
            </div>
            <button
              type="submit"
              disabled={!searchQuery.trim() || isSearching || !companionClient.isConnected()}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-bg-tertiary text-white rounded-md transition-colors flex items-center justify-center gap-2"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching with AI...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Search
                </>
              )}
            </button>
          </form>
        </div>

        {/* Add Documentation */}
        <div className="p-4 border-b border-border-default">
          <form onSubmit={handleAddDocumentation} className="space-y-2">
            <input
              type="url"
              value={addUrl}
              onChange={(e) => setAddUrl(e.target.value)}
              placeholder="Add documentation URL..."
              className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={!companionClient.isConnected()}
            />
            <button
              type="submit"
              disabled={!addUrl.trim() || isAdding || !companionClient.isConnected()}
              className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:bg-bg-tertiary text-white rounded-md transition-colors flex items-center justify-center gap-2"
            >
              {isAdding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Documentation URL
                </>
              )}
            </button>
          </form>

          {/* File Upload Section */}
          <div className="mt-4 pt-4 border-t border-border-default">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-muted">Or upload files:</span>
              <button
                onClick={() => setShowFileUpload(!showFileUpload)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                {showFileUpload ? 'Hide' : 'Show'}
              </button>
            </div>

            {showFileUpload && (
              <div
                className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                  isDragActive 
                    ? 'border-blue-500 bg-blue-500/10' 
                    : 'border-border-default hover:border-blue-400'
                } ${uploadingFiles.length > 0 ? 'opacity-50 pointer-events-none' : ''}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".png,.jpg,.jpeg,.svg,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploadingFiles.length > 0}
                />

                <div className="text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-text-muted" />
                  <p className="text-sm text-text-primary mb-1">
                    Drop files here or{' '}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-400 hover:text-blue-300 underline"
                      disabled={uploadingFiles.length > 0}
                    >
                      browse
                    </button>
                  </p>
                  <p className="text-xs text-text-muted">
                    Supports: PDF, PNG, JPEG, SVG, CSV
                  </p>
                </div>

                {uploadingFiles.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {uploadingFiles.map(fileName => (
                      <div key={fileName} className="flex items-center gap-2 text-sm text-text-secondary">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Uploading {fileName}...</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto">
          {searchResults.length > 0 ? (
            // Search Results
            <div className="p-4 space-y-4">
              <h3 className="font-medium text-text-primary">Search Results</h3>
              {searchResults.map((result, index) => (
                <div key={result.docId} className="border border-border-default rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {result.url && !result.url.startsWith('http') && getFileIcon(result.title)}
                        <h4 className="font-medium text-text-primary line-clamp-2">{result.title}</h4>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {result.url && result.url.startsWith('http') && (
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View Original
                          </a>
                        )}
                        {result.claudeScore && (
                          <span className="text-xs text-green-400" title={result.claudeReasoning}>
                            AI Score: {result.claudeScore}/10
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteDoc(result.docId)}
                      className="p-1 hover:bg-bg-tertiary rounded transition-colors"
                      title="Delete Documentation"
                    >
                      <Trash2 className="w-4 h-4 text-text-muted hover:text-red-400" />
                    </button>
                  </div>
                  
                  {result.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {result.categories.map(cat => (
                        <span key={cat} className="px-2 py-1 bg-bg-tertiary text-xs text-text-muted rounded">
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}

                  {result.excerpts && result.excerpts.length > 0 && (
                    <div className="space-y-2">
                      {result.excerpts.slice(0, 2).map((excerpt, i) => (
                        <div key={i} className="text-xs text-text-secondary bg-bg-primary p-2 rounded">
                          {excerpt.heading && (
                            <div className="font-medium text-text-primary mb-1">{excerpt.heading}</div>
                          )}
                          <div className={excerpt.hasCode ? 'font-mono' : ''}>{excerpt.text}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {result.claudeReasoning && (
                    <div className="text-xs text-text-muted bg-blue-500/10 p-2 rounded">
                      <strong>AI Analysis:</strong> {result.claudeReasoning}
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={() => setSearchResults([])}
                className="w-full py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
              >
                Clear Results
              </button>
            </div>
          ) : (
            // Documentation List
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-text-primary">Cached Documentation</h3>
                {isLoading && <Loader2 className="w-4 h-4 animate-spin text-text-muted" />}
              </div>
              
              {docs.length === 0 ? (
                <div className="text-center text-text-muted py-8">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No documentation added yet.</p>
                  <p className="text-xs mt-1">Add a URL above to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {docs.map((doc) => (
                    <div key={doc.docId} className="border border-border-default rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {doc.url && !doc.url.startsWith('http') && getFileIcon(doc.title)}
                            <h4 className="font-medium text-text-primary line-clamp-2">{doc.title}</h4>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {doc.url && doc.url.startsWith('http') && (
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                View
                              </a>
                            )}
                            <span className="text-xs text-text-muted flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatAge(doc.age)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteDoc(doc.docId)}
                          className="p-1 hover:bg-bg-tertiary rounded transition-colors"
                          title="Delete Documentation"
                        >
                          <Trash2 className="w-4 h-4 text-text-muted hover:text-red-400" />
                        </button>
                      </div>
                      
                      {doc.categories && doc.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {doc.categories.map(cat => (
                            <span key={cat} className="px-2 py-1 bg-bg-tertiary text-xs text-text-muted rounded">
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="text-xs text-text-muted">
                        {doc.wordCount.toLocaleString()} words • {doc.chunkCount} chunks
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentationPanel;