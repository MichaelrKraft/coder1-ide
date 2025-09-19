'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Search, RefreshCw, Trash2, ExternalLink, Book, Star, Clock, FolderOpen, Brain, FileText, Globe, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import DocumentViewer from '@/components/DocumentViewer';

interface Documentation {
  id: string;
  title: string;
  url: string;
  category: string;
  addedAt: string;
  wordCount: number;
  chunks: number;
  type?: 'external' | 'project' | 'context' | 'session' | 'uploaded';
}

interface SearchResult {
  id: string;
  title: string;
  url: string;
  category: string;
  relevanceScore: number;
  snippet: string;
  headings: string[];
}

interface ProjectDoc {
  name: string;
  path: string;
  size: number;
  modified: string;
  content?: string;
}

interface SessionSummary {
  id: string;
  timestamp: string;
  title: string;
  preview: string;
}

interface ContextData {
  sessions: number;
  memories: number;
  patterns: number;
  insights: number;
}

type TabType = 'all' | 'external' | 'project' | 'context' | 'sessions';

export default function DocumentationManagerPage() {
  const [docs, setDocs] = useState<Documentation[]>([]);
  const [projectDocs, setProjectDocs] = useState<ProjectDoc[]>([]);
  const [sessionSummaries, setSessionSummaries] = useState<SessionSummary[]>([]);
  const [contextData, setContextData] = useState<ContextData | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [docUrl, setDocUrl] = useState('');
  const [docCategory, setDocCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentDocs, setRecentDocs] = useState<Documentation[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Document viewer state
  const [viewingDoc, setViewingDoc] = useState<{
    isOpen: boolean;
    type: 'session' | 'project' | 'context' | 'external';
    documentId?: string;
    documentName?: string;
  }>({
    isOpen: false,
    type: 'external'
  });

  // Load data on mount
  useEffect(() => {
    loadAllData();
    loadFavorites();
    loadRecentDocs();
  }, []);

  // Global search hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadDocumentationList(),
        loadProjectDocs(),
        loadSessionSummaries(),
        loadContextData()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadDocumentationList = async () => {
    try {
      const response = await fetch('/api/docs/list', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await response.json();
      
      if (data.success) {
        const docsWithType = data.docs.map((doc: Documentation) => ({
          ...doc,
          type: doc.url.startsWith('content://') ? 'uploaded' : 'external'
        }));
        setDocs(docsWithType);
      }
    } catch (error) {
      // logger?.error('Error loading documentation:', error);
    }
  };

  const loadProjectDocs = async () => {
    try {
      const response = await fetch('/api/docs/project');
      const data = await response.json();
      if (data.success) {
        setProjectDocs(data.docs);
      }
    } catch (error) {
      // logger?.error('Error loading project docs:', error);
    }
  };

  const loadSessionSummaries = async () => {
    try {
      const response = await fetch('/api/docs/sessions');
      const data = await response.json();
      if (data.success) {
        setSessionSummaries(data.summaries);
      }
    } catch (error) {
      // logger?.error('Error loading session summaries:', error);
    }
  };

  const loadContextData = async () => {
    try {
      const response = await fetch('/api/context/stats');
      const data = await response.json();
      setContextData({
        sessions: data.totalSessions || 0,
        memories: data.totalConversations || 0,
        patterns: data.totalPatterns || 0,
        insights: data.totalInsights || 0
      });
    } catch (error) {
      // logger?.error('Error loading context data:', error);
    }
  };

  const loadFavorites = () => {
    const stored = localStorage.getItem('docFavorites');
    if (stored) setFavorites(JSON.parse(stored));
  };

  const loadRecentDocs = () => {
    const stored = localStorage.getItem('recentDocs');
    if (stored) setRecentDocs(JSON.parse(stored).slice(0, 5));
  };

  const toggleFavorite = (docId: string) => {
    const newFavorites = favorites.includes(docId)
      ? favorites.filter(id => id !== docId)
      : [...favorites, docId];
    setFavorites(newFavorites);
    localStorage.setItem('docFavorites', JSON.stringify(newFavorites));
  };

  const addToRecent = (doc: Documentation) => {
    const newRecent = [doc, ...recentDocs.filter(d => d.id !== doc.id)].slice(0, 5);
    setRecentDocs(newRecent);
    localStorage.setItem('recentDocs', JSON.stringify(newRecent));
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const addDocumentation = async () => {
    if (!docUrl.trim()) {
      alert('Please enter a URL');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/docs/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: docUrl.trim(),
          category: docCategory.trim() || 'General'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Documentation added successfully!');
        setDocUrl('');
        setDocCategory('');
        setShowAddForm(false);
        loadDocumentationList();
      } else {
        alert(data.message || 'Failed to add documentation');
      }
    } catch (error: any) {
      alert('Error adding documentation: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const removeDoc = async (id: string) => {
    if (!confirm('Remove this documentation?')) return;

    try {
      const response = await fetch(`/api/docs/${id}`, { method: 'DELETE' });
      const data = await response.json();
      
      if (data.success) {
        loadDocumentationList();
      } else {
        alert('Failed to remove documentation');
      }
    } catch (error) {
      alert('Failed to remove documentation');
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      const response = await fetch('/api/docs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim() })
      });

      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.results);
      } else {
        alert('Search failed: ' + data.message);
      }
    } catch (error) {
      alert('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const textFiles = files.filter(file => 
      file.type === 'text/plain' || 
      file.name.endsWith('.md') || 
      file.name.endsWith('.txt') ||
      file.name.endsWith('.json')
    );

    if (textFiles.length === 0) {
      alert('Please drop text files (.txt, .md, .json)');
      return;
    }

    for (const file of textFiles) {
      await uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    try {
      setUploadingFiles(prev => [...prev, file.name]);
      
      const content = await file.text();
      const response = await fetch('/api/docs/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: file.name.replace(/\.[^/.]+$/, ""),
          content: content,
          category: docCategory.trim() || 'Uploaded Files'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        loadDocumentationList();
      } else {
        alert(`Failed to upload ${file.name}: ${data.message}`);
      }
    } catch (error: any) {
      alert(`Error uploading ${file.name}: ${error.message}`);
    } finally {
      setUploadingFiles(prev => prev.filter(name => name !== file.name));
    }
  };

  const getDocIcon = (type?: string) => {
    switch (type) {
      case 'external': return <Globe className="w-4 h-4 text-blue-400" />;
      case 'project': return <FileText className="w-4 h-4 text-green-400" />;
      case 'context': return <Brain className="w-4 h-4 text-purple-400" />;
      case 'session': return <Clock className="w-4 h-4 text-orange-400" />;
      case 'uploaded': return <FolderOpen className="w-4 h-4 text-gray-400" />;
      default: return <Book className="w-4 h-4 text-gray-400" />;
    }
  };

  const filteredDocs = activeTab === 'all' 
    ? docs 
    : docs.filter(doc => doc.type === activeTab);

  const favoriteDocs = docs.filter(doc => favorites.includes(doc.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/ide" 
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to IDE
          </Link>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
              <Book className="w-10 h-10 text-blue-400" />
              Documentation Hub
              <span className="text-sm text-gray-400 ml-4">(Press ⌘K to search)</span>
            </h1>
            <p className="text-gray-400">Unified access to all documentation sources</p>
          </div>
        </div>

        {/* Quick Access Section */}
        {(favoriteDocs.length > 0 || recentDocs.length > 0) && (
          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 mb-6">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Favorites */}
              {favoriteDocs.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400" />
                    Favorites
                  </h3>
                  <div className="space-y-1">
                    {favoriteDocs.slice(0, 3).map(doc => (
                      <div key={doc.id} className="flex items-center gap-2 text-sm hover:bg-gray-700/50 p-1 rounded cursor-pointer">
                        {getDocIcon(doc.type)}
                        <span className="text-gray-300">{doc.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent */}
              {recentDocs.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    Recently Viewed
                  </h3>
                  <div className="space-y-1">
                    {recentDocs.slice(0, 3).map(doc => (
                      <div key={doc.id} className="flex items-center gap-2 text-sm hover:bg-gray-700/50 p-1 rounded cursor-pointer">
                        {getDocIcon(doc.type)}
                        <span className="text-gray-300">{doc.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 mb-6">
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All Documents
            </button>
            <button
              onClick={() => setActiveTab('external')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                activeTab === 'external' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Globe className="w-4 h-4" />
              External ({docs.filter(d => d.type === 'external').length})
            </button>
            <button
              onClick={() => setActiveTab('project')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                activeTab === 'project' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <FileText className="w-4 h-4" />
              Project ({projectDocs.length})
            </button>
            <button
              onClick={() => setActiveTab('context')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                activeTab === 'context' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Brain className="w-4 h-4" />
              Context ({contextData?.memories || 0})
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                activeTab === 'sessions' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Clock className="w-4 h-4" />
              Sessions ({sessionSummaries.length})
            </button>
          </div>

          {/* Context Stats Banner */}
          {activeTab === 'context' && contextData && (
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-purple-400">{contextData.sessions}</div>
                  <div className="text-xs text-gray-400">Sessions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400">{contextData.memories}</div>
                  <div className="text-xs text-gray-400">Memories</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400">{contextData.patterns}</div>
                  <div className="text-xs text-gray-400">Patterns</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400">{contextData.insights}</div>
                  <div className="text-xs text-gray-400">Insights</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Documentation
            </button>
            <button
              onClick={loadAllData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh All
            </button>
            <button
              onClick={clearSearch}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Clear Search
            </button>
          </div>

          {/* Add Documentation Form */}
          {showAddForm && (
            <div className="mt-6 p-4 bg-gray-900/50 rounded-lg">
              <h3 className="text-lg font-medium mb-4">Add Documentation from URL</h3>
              <div className="space-y-4">
                <input
                  type="url"
                  placeholder="Enter documentation URL..."
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Category (optional)"
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addDocumentation}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add Documentation'}
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drag and Drop Zone */}
        {activeTab === 'all' || activeTab === 'external' ? (
          <div 
            className={`bg-gray-800/50 backdrop-blur rounded-lg p-6 mb-8 border-2 border-dashed transition-all duration-300 ${
              isDragOver 
                ? 'border-blue-400 bg-blue-900/20' 
                : 'border-gray-600 hover:border-gray-500'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="text-center">
              <div className="mb-4">
                <svg 
                  className={`w-12 h-12 mx-auto mb-2 transition-colors duration-300 ${
                    isDragOver ? 'text-blue-400' : 'text-gray-400'
                  }`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
                  />
                </svg>
              </div>
              <h3 className={`text-lg font-semibold mb-2 transition-colors duration-300 ${
                isDragOver ? 'text-blue-400' : 'text-white'
              }`}>
                {isDragOver ? 'Drop files to upload' : 'Drag & Drop Files'}
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Drop .txt, .md, or .json files here to automatically add them to your documentation
              </p>
              
              {/* Upload Progress */}
              {uploadingFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-blue-400 font-medium">Uploading files...</p>
                  {uploadingFiles.map((fileName, index) => (
                    <div key={index} className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm text-gray-300">{fileName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Search Documentation */}
        <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Search Documentation</h2>
          <div className="flex gap-2">
            <input
              id="global-search"
              type="text"
              placeholder="Search all documentation... (⌘K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && performSearch()}
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={performSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Search className={`w-4 h-4 ${isSearching ? 'animate-pulse' : ''}`} />
              Search
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Search Results ({searchResults.length})</h3>
              <div className="space-y-3">
                {searchResults.map((result) => (
                  <div key={result.id} className="bg-gray-900/50 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-blue-400">{result.title}</h4>
                        <p className="text-gray-300 text-sm mt-1">{result.snippet}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>Relevance: {result.relevanceScore.toFixed(1)}</span>
                          <span>Category: {result.category}</span>
                        </div>
                      </div>
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-4 text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Documentation List */}
        <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            {activeTab === 'all' && `All Documentation (${docs.length})`}
            {activeTab === 'external' && `External Documentation (${filteredDocs.length})`}
            {activeTab === 'project' && `Project Documentation (${projectDocs.length})`}
            {activeTab === 'context' && `Context Memories (${contextData?.memories || 0})`}
            {activeTab === 'sessions' && `Session Summaries (${sessionSummaries.length})`}
          </h2>
          
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-gray-400">Loading documentation...</p>
            </div>
          ) : (
            <>
              {/* External/All Docs View */}
              {(activeTab === 'all' || activeTab === 'external') && (
                filteredDocs.length === 0 ? (
                  <div className="text-center py-8">
                    <Book className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p className="text-gray-400">No documentation found. Add some documentation to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredDocs.map((doc) => (
                      <div key={doc.id} className="bg-gray-900/50 rounded-lg p-4 flex items-center justify-between hover:bg-gray-900/70 transition-colors">
                        <div className="flex items-center gap-3 flex-1">
                          {getDocIcon(doc.type)}
                          <div className="flex-1">
                            <h3 className="font-medium text-blue-400">{doc.title}</h3>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                              <span>Category: {doc.category}</span>
                              <span>Words: {doc.wordCount.toLocaleString()}</span>
                              <span>Chunks: {doc.chunks}</span>
                              <span>Added: {new Date(doc.addedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => toggleFavorite(doc.id)}
                            className={`p-2 transition-colors ${
                              favorites.includes(doc.id) 
                                ? 'text-yellow-400 hover:text-yellow-300' 
                                : 'text-gray-400 hover:text-gray-300'
                            }`}
                            title={favorites.includes(doc.id) ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Star className="w-4 h-4" fill={favorites.includes(doc.id) ? 'currentColor' : 'none'} />
                          </button>
                          <button
                            onClick={() => {
                              setViewingDoc({
                                isOpen: true,
                                type: 'external',
                                documentId: doc.id
                              });
                              addToRecent(doc);
                            }}
                            className="p-2 text-green-400 hover:text-green-300 transition-colors"
                            title="View documentation"
                          >
                            <Book className="w-4 h-4" />
                          </button>
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                            title="Open original URL"
                            onClick={() => addToRecent(doc)}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => removeDoc(doc.id)}
                            className="p-2 text-red-400 hover:text-red-300 transition-colors"
                            title="Remove documentation"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* Project Docs View */}
              {activeTab === 'project' && (
                projectDocs.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p className="text-gray-400">Loading project documentation...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projectDocs.map((doc) => (
                      <div key={doc.path} className="bg-gray-900/50 rounded-lg p-4 hover:bg-gray-900/70 transition-colors">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-green-400" />
                          <div className="flex-1">
                            <h3 className="font-medium text-green-400">{doc.name}</h3>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                              <span>Size: {(doc.size / 1024).toFixed(1)} KB</span>
                              <span>Modified: {new Date(doc.modified).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => setViewingDoc({
                              isOpen: true,
                              type: 'project',
                              documentName: doc.name
                            })}
                            className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                            title="View documentation"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* Context View */}
              {activeTab === 'context' && contextData && (
                <div className="text-center py-8">
                  <Brain className="w-12 h-12 mx-auto mb-2 text-purple-400" />
                  <p className="text-gray-400 mb-4">Context Folders integration coming soon!</p>
                  <p className="text-sm text-gray-500">
                    {contextData.sessions} sessions • {contextData.memories} memories • {contextData.patterns} patterns
                  </p>
                </div>
              )}

              {/* Sessions View */}
              {activeTab === 'sessions' && (
                sessionSummaries.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p className="text-gray-400">No session summaries found.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessionSummaries.map((summary) => (
                      <div key={summary.id} className="bg-gray-900/50 rounded-lg p-4 hover:bg-gray-900/70 transition-colors">
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-orange-400" />
                          <div className="flex-1">
                            <h3 className="font-medium text-orange-400">{summary.title}</h3>
                            <p className="text-sm text-gray-400 mt-1">{summary.preview}</p>
                            <div className="text-xs text-gray-500 mt-2">
                              {new Date(summary.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <button
                            onClick={() => setViewingDoc({
                              isOpen: true,
                              type: 'session',
                              documentId: summary.id
                            })}
                            className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                            title="View session summary"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Document Viewer Modal */}
      <DocumentViewer
        isOpen={viewingDoc.isOpen}
        onClose={() => setViewingDoc({ ...viewingDoc, isOpen: false })}
        type={viewingDoc.type}
        documentId={viewingDoc.documentId}
        documentName={viewingDoc.documentName}
      />
    </div>
  );
}