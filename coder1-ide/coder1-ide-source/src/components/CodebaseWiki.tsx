import React, { useState, useEffect, useCallback, useRef } from 'react';
import './CodebaseWiki.css';

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

const CodebaseWiki: React.FC = () => {
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
            const response = await fetch('/api/codebase/stats');
            const data = await response.json();
            
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
            const response = await fetch(`/api/codebase/suggest?q=${encodeURIComponent(query)}&limit=8`);
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
            const response = await fetch(`/api/codebase/search?q=${encodeURIComponent(searchTerm)}&limit=20`);
            const data = await response.json();
            
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
            const response = await fetch('/api/codebase/index', { method: 'POST' });
            const data = await response.json();
            
            if (data.success) {
                // Poll for indexing completion
                const pollInterval = setInterval(async () => {
                    const statusResponse = await fetch('/api/codebase/status');
                    const statusData = await statusResponse.json();
                    
                    if (statusData.success) {
                        setIndexing(statusData.indexing?.isIndexing || false);
                        
                        if (!statusData.indexing?.isIndexing) {
                            clearInterval(pollInterval);
                            loadStats(); // Reload stats after indexing
                        }
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
        // This would integrate with the parent IDE to open files
        console.log('Opening file:', filePath, 'at line:', line);
        // TODO: Integrate with IDE file opening mechanism
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
        <div className="codebase-wiki">
            <div className="wiki-header">
                <div className="header-top">
                    <h2>
                        <span className="icon">📚</span>
                        Codebase Wiki
                    </h2>
                    
                    {stats && (
                        <div className="stats-summary">
                            <span className="stat">{stats.functions} functions</span>
                            <span className="stat">{stats.classes} classes</span>
                            <span className="stat">{stats.files} files</span>
                        </div>
                    )}
                </div>

                <div className="search-container">
                    <div className="search-input-wrapper">
                        <input
                            ref={searchInputRef}
                            type="text"
                            className="search-input"
                            placeholder="Search functions, classes, variables, files..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            onFocus={() => setShowSuggestions(suggestions.length > 0)}
                        />
                        <button 
                            className="search-button" 
                            onClick={() => handleSearch()}
                            disabled={loading}
                        >
                            {loading ? '⏳' : '🔍'}
                        </button>
                    </div>

                    {showSuggestions && suggestions.length > 0 && (
                        <div className="suggestions-dropdown" ref={suggestionsRef}>
                            {suggestions.map((suggestion, index) => (
                                <div
                                    key={index}
                                    className="suggestion-item"
                                    onClick={() => selectSuggestion(suggestion)}
                                >
                                    <span className={`suggestion-icon ${suggestion.type}`}>
                                        {suggestion.type === 'function' ? '⚡' : 
                                         suggestion.type === 'class' ? '📦' : '📝'}
                                    </span>
                                    <div className="suggestion-content">
                                        <div className="suggestion-name">{suggestion.name}</div>
                                        <div className="suggestion-meta">
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

                <div className="wiki-actions">
                    <button 
                        className="index-button"
                        onClick={triggerIndexing}
                        disabled={indexing}
                    >
                        {indexing ? '🔄 Indexing...' : '🔄 Reindex'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    <span className="error-icon">⚠️</span>
                    {error}
                </div>
            )}

            {!stats?.lastIndexed && !indexing && (
                <div className="welcome-message">
                    <div className="welcome-content">
                        <h3>Welcome to Codebase Wiki! 📚</h3>
                        <p>Your code hasn't been indexed yet. Click "Reindex" to start exploring your codebase with AI-powered search.</p>
                        <div className="benefits">
                            <div className="benefit">🔍 <strong>Search Everything:</strong> Find functions, classes, variables across your entire codebase</div>
                            <div className="benefit">📊 <strong>Understand Dependencies:</strong> See how your code connects together</div>
                            <div className="benefit">🧠 <strong>AI Insights:</strong> Get intelligent explanations of your code</div>
                        </div>
                    </div>
                </div>
            )}

            {stats && stats.lastIndexed && !searchResults && !loading && (
                <div className="codebase-overview">
                    <h3>Codebase Overview</h3>
                    
                    <div className="overview-cards">
                        <div className="overview-card">
                            <div className="card-header">
                                <span className="card-icon">📄</span>
                                <h4>Files</h4>
                            </div>
                            <div className="card-value">{stats.files}</div>
                            <div className="card-detail">{formatFileSize(stats.metrics?.totalSize || 0)}</div>
                        </div>

                        <div className="overview-card">
                            <div className="card-header">
                                <span className="card-icon">⚡</span>
                                <h4>Functions</h4>
                            </div>
                            <div className="card-value">{stats.functions}</div>
                            <div className="card-detail">
                                Avg complexity: {stats.metrics?.avgComplexity?.toFixed(1) || 0}
                            </div>
                        </div>

                        <div className="overview-card">
                            <div className="card-header">
                                <span className="card-icon">📦</span>
                                <h4>Classes</h4>
                            </div>
                            <div className="card-value">{stats.classes}</div>
                            <div className="card-detail">{stats.variables} variables</div>
                        </div>

                        <div className="overview-card">
                            <div className="card-header">
                                <span className="card-icon">🔗</span>
                                <h4>Dependencies</h4>
                            </div>
                            <div className="card-value">{stats.dependencies}</div>
                            <div className="card-detail">Import relationships</div>
                        </div>
                    </div>

                    {stats.metrics?.complexityDistribution && (
                        <div className="complexity-chart">
                            <h4>Function Complexity Distribution</h4>
                            <div className="complexity-bars">
                                <div className="complexity-bar">
                                    <div className="bar-label">Low (1-5)</div>
                                    <div className="bar-container">
                                        <div 
                                            className="bar low" 
                                            style={{ 
                                                width: `${(stats.metrics.complexityDistribution.low / stats.functions) * 100}%` 
                                            }}
                                        />
                                    </div>
                                    <div className="bar-value">{stats.metrics.complexityDistribution.low}</div>
                                </div>
                                <div className="complexity-bar">
                                    <div className="bar-label">Medium (6-10)</div>
                                    <div className="bar-container">
                                        <div 
                                            className="bar medium" 
                                            style={{ 
                                                width: `${(stats.metrics.complexityDistribution.medium / stats.functions) * 100}%` 
                                            }}
                                        />
                                    </div>
                                    <div className="bar-value">{stats.metrics.complexityDistribution.medium}</div>
                                </div>
                                <div className="complexity-bar">
                                    <div className="bar-label">High (11+)</div>
                                    <div className="bar-container">
                                        <div 
                                            className="bar high" 
                                            style={{ 
                                                width: `${(stats.metrics.complexityDistribution.high / stats.functions) * 100}%` 
                                            }}
                                        />
                                    </div>
                                    <div className="bar-value">{stats.metrics.complexityDistribution.high}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="last-indexed">
                        Last indexed: {new Date(stats.lastIndexed).toLocaleString()}
                    </div>
                </div>
            )}

            {searchResults && (
                <div className="search-results">
                    <h3>Search Results for "{searchQuery}"</h3>
                    
                    {searchResults.functions.length > 0 && (
                        <div className="result-section">
                            <h4>⚡ Functions ({searchResults.functions.length})</h4>
                            <div className="result-list">
                                {searchResults.functions.map((func) => (
                                    <div key={func.id} className="result-item function-item">
                                        <div className="result-header">
                                            <span className="result-name">{func.name}</span>
                                            <div className="result-badges">
                                                <span 
                                                    className="complexity-badge"
                                                    style={{ 
                                                        backgroundColor: getComplexityColor(func.complexity),
                                                        color: 'white'
                                                    }}
                                                >
                                                    C: {func.complexity}
                                                </span>
                                                {func.async && <span className="badge async">async</span>}
                                                {func.params.length > 0 && (
                                                    <span className="badge params">
                                                        {func.params.length} params
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="result-location">
                                            <span 
                                                className="file-link"
                                                onClick={() => openInEditor(func.file, func.line)}
                                            >
                                                📄 {func.file}:{func.line}
                                            </span>
                                        </div>
                                        {func.params.length > 0 && (
                                            <div className="function-params">
                                                Parameters: {func.params.map(p => p.name).join(', ')}
                                            </div>
                                        )}
                                        {func.sourceCode && (
                                            <div className="code-preview">
                                                <pre><code>{func.sourceCode}</code></pre>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {searchResults.classes.length > 0 && (
                        <div className="result-section">
                            <h4>📦 Classes ({searchResults.classes.length})</h4>
                            <div className="result-list">
                                {searchResults.classes.map((cls) => (
                                    <div key={cls.id} className="result-item class-item">
                                        <div className="result-header">
                                            <span className="result-name">{cls.name}</span>
                                            <div className="result-badges">
                                                <span className="badge methods">
                                                    {cls.methods.length} methods
                                                </span>
                                            </div>
                                        </div>
                                        <div className="result-location">
                                            <span 
                                                className="file-link"
                                                onClick={() => openInEditor(cls.file, cls.line)}
                                            >
                                                📄 {cls.file}:{cls.line}
                                            </span>
                                        </div>
                                        {cls.methods.length > 0 && (
                                            <div className="class-methods">
                                                Methods: {cls.methods.map(m => m.name).join(', ')}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {searchResults.files.length > 0 && (
                        <div className="result-section">
                            <h4>📄 Files ({searchResults.files.length})</h4>
                            <div className="result-list">
                                {searchResults.files.map((file, index) => (
                                    <div key={index} className="result-item file-item">
                                        <div className="result-header">
                                            <span 
                                                className="result-name file-link"
                                                onClick={() => openInEditor(file.path)}
                                            >
                                                {file.path}
                                            </span>
                                            <div className="result-badges">
                                                <span className="badge size">
                                                    {formatFileSize(file.size)}
                                                </span>
                                                <span className="badge lines">
                                                    {file.lines} lines
                                                </span>
                                            </div>
                                        </div>
                                        <div className="file-contents">
                                            {file.functions.length > 0 && (
                                                <span className="content-summary">
                                                    {file.functions.length} functions
                                                </span>
                                            )}
                                            {file.classes.length > 0 && (
                                                <span className="content-summary">
                                                    {file.classes.length} classes
                                                </span>
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
    );
};

export default CodebaseWiki;