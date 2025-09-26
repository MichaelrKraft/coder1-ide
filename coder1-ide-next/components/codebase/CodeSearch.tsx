'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

interface SearchResult {
    functions: Array<{
        id: string;
        name: string;
        file: string;
        line: number;
        params: Array<{ name: string; type: string }>;
        complexity: number;
        sourceCode: string;
        relevance: number;
        async?: boolean;
    }>;
    classes: Array<{
        id: string;
        name: string;
        file: string;
        line: number;
        methods: Array<{ name: string; type: string }>;
        relevance: number;
    }>;
    variables: Array<{
        id: string;
        name: string;
        file: string;
        kind: string;
        relevance: number;
    }>;
    files: Array<{
        path: string;
        size: number;
        lines: number;
        functions: string[];
        classes: string[];
        relevance: number;
    }>;
}

interface CodebaseStats {
    files: number;
    functions: number;
    classes: number;
    variables: number;
    dependencies: number;
    lastIndexed: string | null;
    isIndexing: boolean;
    metrics: {
        totalLines: number;
        totalSize: number;
        fileTypes: Record<string, number>;
        complexityDistribution: {
            low: number;
            medium: number;
            high: number;
        };
        avgComplexity?: number;
    };
}

interface Suggestion {
    type: 'function' | 'class' | 'variable';
    name: string;
    file: string;
    params?: string;
    methods?: number;
}

interface CodeSearchProps {
    onOpenFile?: (path: string, line?: number) => void;
}

const CodeSearch: React.FC<CodeSearchProps> = ({ onOpenFile }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [stats, setStats] = useState<CodebaseStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [indexing, setIndexing] = useState(false);
    const [selectedEntity, setSelectedEntity] = useState<any>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const searchInputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // API base URL for unified server
    const API_BASE = '/api/codebase';

    // Load stats on component mount
    useEffect(() => {
        loadStats();
    }, []);

    // Auto-suggest as user types
    useEffect(() => {
        if (searchQuery.length >= 2) {
            const delayedSearch = setTimeout(() => {
                fetchSuggestions(searchQuery);
            }, 300);
            return () => clearTimeout(delayedSearch);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    }, [searchQuery]);

    // Handle clicks outside suggestions
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
                searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const loadStats = async () => {
        try {
            const response = await fetch(`${API_BASE}/stats`);
            
            if (!response.ok) {
                console.warn('Stats API returned error:', response.status);
                return;
            }
            
            const text = await response.text();
            if (!text) {
                console.warn('Stats API returned empty response');
                return;
            }
            
            const data = JSON.parse(text);
            
            if (data.success) {
                setStats(data);
                setIndexing(data.indexing?.isIndexing || false);
            } else {
                setError(data.error || 'Failed to load stats');
            }
        } catch (err) {
            console.error('Failed to load codebase stats:', err);
            setError('Failed to connect to codebase service');
        }
    };

    const fetchSuggestions = async (query: string) => {
        try {
            const response = await fetch(`${API_BASE}/suggest?q=${encodeURIComponent(query)}&limit=8`);
            const data = await response.json();
            
            if (data.success) {
                setSuggestions(data.suggestions);
                setShowSuggestions(data.suggestions.length > 0);
            }
        } catch (err) {
            console.error('Failed to fetch suggestions:', err);
        }
    };

    const handleSearch = async (query?: string) => {
        const searchTerm = query || searchQuery;
        if (!searchTerm.trim()) return;

        setLoading(true);
        setError(null);
        setShowSuggestions(false);

        try {
            const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(searchTerm)}&limit=20`);
            
            if (!response.ok) {
                console.warn('Search API returned error:', response.status);
                setSearchResults(null);
                setLoading(false);
                return;
            }
            
            const text = await response.text();
            if (!text) {
                console.warn('Search API returned empty response');
                setSearchResults(null);
                setLoading(false);
                return;
            }
            
            const data = JSON.parse(text);
            
            if (data.success) {
                setSearchResults(data.results);
                if (data.totalResults === 0) {
                    setError('No results found. Try a different search term.');
                }
            } else {
                setError(data.error || 'Search failed');
            }
        } catch (err) {
            console.error('Search failed:', err);
            setError('Failed to search codebase');
        } finally {
            setLoading(false);
        }
    };

    const triggerIndexing = async () => {
        setIndexing(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/index`, { method: 'POST' });
            const data = await response.json();
            
            if (data.success) {
                // Poll for indexing completion
                const pollInterval = setInterval(async () => {
                    try {
                        const statusResponse = await fetch(`${API_BASE}/status`);
                        
                        // Check if response is ok and has content
                        if (!statusResponse.ok) {
                            console.warn('Status API returned error:', statusResponse.status);
                            clearInterval(pollInterval);
                            setIndexing(false);
                            return;
                        }
                        
                        const text = await statusResponse.text();
                        if (!text) {
                            console.warn('Status API returned empty response');
                            clearInterval(pollInterval);
                            setIndexing(false);
                            return;
                        }
                        
                        const statusData = JSON.parse(text);
                        
                        if (statusData.success) {
                            setIndexing(statusData.indexing?.isIndexing || false);
                            
                            if (!statusData.indexing?.isIndexing) {
                                clearInterval(pollInterval);
                                loadStats(); // Reload stats after indexing
                            }
                        }
                    } catch (err) {
                        console.error('Error polling status:', err);
                        clearInterval(pollInterval);
                        setIndexing(false);
                    }
                }, 2000);

                // Clear interval after 5 minutes max
                setTimeout(() => clearInterval(pollInterval), 300000);
            } else {
                setError(data.error || 'Failed to start indexing');
                setIndexing(false);
            }
        } catch (err) {
            console.error('Failed to trigger indexing:', err);
            setError('Failed to start codebase indexing');
            setIndexing(false);
        }
    };

    const selectSuggestion = (suggestion: Suggestion) => {
        setSearchQuery(suggestion.name);
        setShowSuggestions(false);
        handleSearch(suggestion.name);
    };

    const openInEditor = (filePath: string, line?: number) => {
        if (onOpenFile) {
            onOpenFile(filePath, line);
        }
    };

    const formatFileSize = (bytes: number) => {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    const getComplexityColor = (complexity: number) => {
        if (complexity <= 5) return '#10b981'; // green
        if (complexity <= 10) return '#f59e0b'; // yellow
        return '#ef4444'; // red
    };

    return (
        <div className="h-full flex flex-col bg-bg-secondary text-text-primary overflow-hidden border border-coder1-cyan/50 shadow-glow-cyan">
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b border-border-default">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-coder1-cyan">
                        Codebase Wiki
                    </h2>
                    
                    {stats && (
                        <div className="flex items-center gap-4 text-sm text-text-muted">
                            <span className="bg-bg-tertiary px-2 py-1 rounded">{stats.functions} functions</span>
                            <span className="bg-bg-tertiary px-2 py-1 rounded">{stats.classes} classes</span>
                            <span className="bg-bg-tertiary px-2 py-1 rounded">{stats.files} files</span>
                        </div>
                    )}
                </div>

                {/* Search Container */}
                <div className="relative">
                    <div className="flex gap-2">
                        <input
                            ref={searchInputRef}
                            type="text"
                            className="flex-1 px-3 py-2 bg-bg-tertiary border border-border-default rounded-lg 
                                     text-text-primary placeholder-text-muted focus:outline-none focus:border-coder1-cyan"
                            placeholder="Search functions, classes, variables, files..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            onFocus={() => setShowSuggestions(suggestions.length > 0)}
                        />
                        <button 
                            className="px-4 py-2 border border-coder1-cyan hover:bg-coder1-cyan/10 text-coder1-cyan font-medium rounded-lg 
                                     transition-all duration-200 disabled:opacity-50 hover:shadow-glow-cyan"
                            onClick={() => handleSearch()}
                            disabled={loading}
                        >
                            {loading ? 'Loading' : 'Search'}
                        </button>
                    </div>

                    {/* Suggestions Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div 
                            ref={suggestionsRef}
                            className="absolute top-full left-0 right-0 mt-1 bg-bg-tertiary border border-border-default 
                                     rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
                        >
                            {suggestions.map((suggestion, index) => (
                                <div
                                    key={index}
                                    className="flex items-start gap-3 p-3 hover:bg-bg-primary cursor-pointer 
                                             border-b border-border-default last:border-b-0"
                                    onClick={() => selectSuggestion(suggestion)}
                                >
                                    <span className="text-lg">
                                        {suggestion.type === 'function' ? 'f' : 
                                         suggestion.type === 'class' ? 'C' : 'v'}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-text-primary">{suggestion.name}</div>
                                        <div className="text-sm text-text-muted truncate">
                                            {suggestion.file}
                                            {suggestion.params && ` (${suggestion.params})`}
                                            {suggestion.methods && ` • ${suggestion.methods} methods`}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3">
                    <button 
                        className="px-3 py-1.5 bg-bg-tertiary hover:bg-bg-primary border border-border-default rounded 
                                 text-text-primary transition-colors disabled:opacity-50"
                        onClick={triggerIndexing}
                        disabled={indexing}
                    >
                        {indexing ? 'Indexing...' : 'Reindex'}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4">
                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error flex items-center gap-2">
                        <span>Warning:</span>
                        {error}
                    </div>
                )}

                {/* Welcome Message */}
                {!stats?.lastIndexed && !indexing && (
                    <div className="text-center py-8">
                        <h3 className="text-lg font-semibold text-coder1-cyan mb-4">Welcome to Codebase Wiki!</h3>
                        <p className="text-text-muted mb-6 max-w-md mx-auto">
                            Your code hasn&apos;t been indexed yet. Click &quot;Reindex&quot; to start exploring your codebase with AI-powered search.
                        </p>
                        <div className="space-y-2 text-left max-w-lg mx-auto text-sm">
                            <div className="flex items-start gap-2">
                                <span>•</span>
                                <div>
                                    <strong className="text-text-primary">Search Everything:</strong>
                                    <span className="text-text-muted"> Find functions, classes, variables across your entire codebase</span>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <span>•</span>
                                <div>
                                    <strong className="text-text-primary">Understand Dependencies:</strong>
                                    <span className="text-text-muted"> See how your code connects together</span>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <span>•</span>
                                <div>
                                    <strong className="text-text-primary">AI Insights:</strong>
                                    <span className="text-text-muted"> Get intelligent explanations of your code</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Codebase Overview */}
                {stats && stats.lastIndexed && !searchResults && !loading && (
                    <div>
                        <h3 className="text-lg font-semibold text-coder1-cyan mb-4">Codebase Overview</h3>
                        
                        {/* Overview Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="bg-bg-tertiary border border-border-default rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">Files</span>
                                    <h4 className="font-medium text-text-primary">Files</h4>
                                </div>
                                <div className="text-2xl font-bold text-coder1-cyan">{stats.files}</div>
                                <div className="text-sm text-text-muted">{formatFileSize(stats.metrics?.totalSize || 0)}</div>
                            </div>

                            <div className="bg-bg-tertiary border border-border-default rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">Func</span>
                                    <h4 className="font-medium text-text-primary">Functions</h4>
                                </div>
                                <div className="text-2xl font-bold text-coder1-cyan">{stats.functions}</div>
                                <div className="text-sm text-text-muted">
                                    Avg complexity: {stats.metrics?.avgComplexity?.toFixed(1) || 0}
                                </div>
                            </div>

                            <div className="bg-bg-tertiary border border-border-default rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">Class</span>
                                    <h4 className="font-medium text-text-primary">Classes</h4>
                                </div>
                                <div className="text-2xl font-bold text-coder1-cyan">{stats.classes}</div>
                                <div className="text-sm text-text-muted">{stats.variables} variables</div>
                            </div>

                            <div className="bg-bg-tertiary border border-border-default rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">Deps</span>
                                    <h4 className="font-medium text-text-primary">Dependencies</h4>
                                </div>
                                <div className="text-2xl font-bold text-coder1-cyan">{stats.dependencies}</div>
                                <div className="text-sm text-text-muted">Import relationships</div>
                            </div>
                        </div>

                        {/* Complexity Distribution */}
                        {stats.metrics?.complexityDistribution && (
                            <div className="bg-bg-tertiary border border-border-default rounded-lg p-4 mb-4">
                                <h4 className="font-medium text-text-primary mb-3">Function Complexity Distribution</h4>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-20 text-sm text-text-muted">Low (1-5)</div>
                                        <div className="flex-1 bg-bg-primary rounded-full h-4 overflow-hidden">
                                            <div 
                                                className="h-full bg-green-500"
                                                style={{ 
                                                    width: `${(stats.metrics.complexityDistribution.low / stats.functions) * 100}%` 
                                                }}
                                            />
                                        </div>
                                        <div className="w-8 text-sm text-text-primary">{stats.metrics.complexityDistribution.low}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-20 text-sm text-text-muted">Med (6-10)</div>
                                        <div className="flex-1 bg-bg-primary rounded-full h-4 overflow-hidden">
                                            <div 
                                                className="h-full bg-yellow-500"
                                                style={{ 
                                                    width: `${(stats.metrics.complexityDistribution.medium / stats.functions) * 100}%` 
                                                }}
                                            />
                                        </div>
                                        <div className="w-8 text-sm text-text-primary">{stats.metrics.complexityDistribution.medium}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-20 text-sm text-text-muted">High (11+)</div>
                                        <div className="flex-1 bg-bg-primary rounded-full h-4 overflow-hidden">
                                            <div 
                                                className="h-full bg-red-500"
                                                style={{ 
                                                    width: `${(stats.metrics.complexityDistribution.high / stats.functions) * 100}%` 
                                                }}
                                            />
                                        </div>
                                        <div className="w-8 text-sm text-text-primary">{stats.metrics.complexityDistribution.high}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="text-sm text-text-muted">
                            Last indexed: {new Date(stats.lastIndexed).toLocaleString()}
                        </div>
                    </div>
                )}

                {/* Search Results */}
                {searchResults && (
                    <div>
                        <h3 className="text-lg font-semibold text-coder1-cyan mb-4">
                            Search Results for &quot;{searchQuery}&quot;
                        </h3>
                        
                        {/* Functions Results */}
                        {searchResults.functions.length > 0 && (
                            <div className="mb-6">
                                <h4 className="font-medium text-text-primary mb-3">
                                    Functions ({searchResults.functions.length})
                                </h4>
                                <div className="space-y-3">
                                    {searchResults.functions.map((func) => (
                                        <div key={func.id} className="bg-bg-tertiary border border-border-default rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium text-text-primary">{func.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span 
                                                        className="px-2 py-1 rounded text-xs text-white font-medium"
                                                        style={{ 
                                                            backgroundColor: getComplexityColor(func.complexity)
                                                        }}
                                                    >
                                                        C: {func.complexity}
                                                    </span>
                                                    {func.async && (
                                                        <span className="px-2 py-1 bg-coder1-purple text-black rounded text-xs font-medium">
                                                            async
                                                        </span>
                                                    )}
                                                    {func.params.length > 0 && (
                                                        <span className="px-2 py-1 bg-bg-primary text-text-muted rounded text-xs">
                                                            {func.params.length} params
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mb-2">
                                                <span 
                                                    className="text-coder1-cyan hover:underline cursor-pointer text-sm"
                                                    onClick={() => openInEditor(func.file, func.line)}
                                                >
                                                    {func.file}:{func.line}
                                                </span>
                                            </div>
                                            {func.params.length > 0 && (
                                                <div className="text-sm text-text-muted mb-2">
                                                    Parameters: {func.params.map(p => p.name).join(', ')}
                                                </div>
                                            )}
                                            {func.sourceCode && (
                                                <div className="bg-bg-primary border border-border-default rounded p-2 mt-2">
                                                    <pre className="text-xs text-text-primary overflow-x-auto">
                                                        <code>{func.sourceCode}</code>
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Classes Results */}
                        {searchResults.classes.length > 0 && (
                            <div className="mb-6">
                                <h4 className="font-medium text-text-primary mb-3">
                                    Classes ({searchResults.classes.length})
                                </h4>
                                <div className="space-y-3">
                                    {searchResults.classes.map((cls) => (
                                        <div key={cls.id} className="bg-bg-tertiary border border-border-default rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium text-text-primary">{cls.name}</span>
                                                <span className="px-2 py-1 bg-bg-primary text-text-muted rounded text-xs">
                                                    {cls.methods.length} methods
                                                </span>
                                            </div>
                                            <div className="mb-2">
                                                <span 
                                                    className="text-coder1-cyan hover:underline cursor-pointer text-sm"
                                                    onClick={() => openInEditor(cls.file, cls.line)}
                                                >
                                                    {cls.file}:{cls.line}
                                                </span>
                                            </div>
                                            {cls.methods.length > 0 && (
                                                <div className="text-sm text-text-muted">
                                                    Methods: {cls.methods.map(m => m.name).join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Files Results */}
                        {searchResults.files.length > 0 && (
                            <div className="mb-6">
                                <h4 className="font-medium text-text-primary mb-3">
                                    Files ({searchResults.files.length})
                                </h4>
                                <div className="space-y-3">
                                    {searchResults.files.map((file, index) => (
                                        <div key={index} className="bg-bg-tertiary border border-border-default rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span 
                                                    className="font-medium text-coder1-cyan hover:underline cursor-pointer"
                                                    onClick={() => openInEditor(file.path)}
                                                >
                                                    {file.path}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-1 bg-bg-primary text-text-muted rounded text-xs">
                                                        {formatFileSize(file.size)}
                                                    </span>
                                                    <span className="px-2 py-1 bg-bg-primary text-text-muted rounded text-xs">
                                                        {file.lines} lines
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-text-muted">
                                                {file.functions.length > 0 && (
                                                    <span>{file.functions.length} functions</span>
                                                )}
                                                {file.classes.length > 0 && (
                                                    <span>{file.classes.length} classes</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CodeSearch;