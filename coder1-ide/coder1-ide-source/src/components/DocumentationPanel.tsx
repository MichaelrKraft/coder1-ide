import React, { useState, useEffect, useCallback } from 'react';
import './DocumentationPanel.css';

interface DocumentationResult {
  doc: {
    id: string;
    title: string;
    url: string;
    domain: string;
    description: string;
    addedAt: string;
    type?: 'session' | 'external' | 'file';
    timestamp?: string;
    fileType?: string;
    originalFilename?: string;
    fileSize?: number;
  };
  score: number;
  content: string;
  estimatedTokens: number;
}

interface DocumentationSearchResponse {
  results: DocumentationResult[];
  totalResults: number;
  estimatedTokens: number;
  query: string;
  optimized?: boolean;
}

interface Documentation {
  id: string;
  title: string;
  url: string;
  domain: string;
  description: string;
  wordCount: number;
  addedAt: string;
  type?: 'session' | 'external' | 'file';
  timestamp?: string;
  fileType?: string;
  originalFilename?: string;
  fileSize?: number;
}

interface DocumentationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onInjectToContext?: (content: string, source: string) => void;
}

const DocumentationPanel: React.FC<DocumentationPanelProps> = ({ 
  isOpen, 
  onClose, 
  onInjectToContext 
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'add' | 'manage'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DocumentationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [documentation, setDocumentation] = useState<Documentation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filter for manage tab
  const [docFilter, setDocFilter] = useState<'all' | 'session' | 'external' | 'file'>('all');
  
  // File upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[filename: string]: number}>({});
  const [isUploading, setIsUploading] = useState(false);
  
  // Add documentation form
  const [newDocUrl, setNewDocUrl] = useState('');
  const [newDocName, setNewDocName] = useState('');
  const [newDocDescription, setNewDocDescription] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  // Error and success states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };
  
  const loadDocumentation = useCallback(async () => {
    try {
      setIsLoading(true);
      clearMessages();
      
      const response = await fetch('/api/docs/list');
      const data = await response.json();
      
      if (response.ok) {
        setDocumentation(data.docs || []);
      } else {
        setError('Failed to load documentation');
      }
    } catch (error) {
      console.error('Error loading documentation:', error);
      setError('Failed to load documentation');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Load documentation list on mount
  useEffect(() => {
    if (isOpen) {
      loadDocumentation();
    }
  }, [isOpen, loadDocumentation]);
  
  const searchDocumentation = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setIsSearching(true);
      clearMessages();
      
      const response = await fetch('/api/docs/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: searchQuery,
          maxResults: 5,
          maxTokens: 2000
        })
      });
      
      const data: DocumentationSearchResponse = await response.json();
      
      if (response.ok) {
        setSearchResults(data.results);
        if (data.results.length === 0) {
          setError('No matching documentation found');
        } else {
          setSuccess(`Found ${data.results.length} results (${data.estimatedTokens} tokens)`);
        }
      } else {
        setError((data as any).message || 'Search failed');
      }
    } catch (error) {
      console.error('Error searching documentation:', error);
      setError('Search failed');
    } finally {
      setIsSearching(false);
    }
  };
  
  const addDocumentation = async () => {
    if (!newDocUrl.trim()) {
      setError('URL is required');
      return;
    }
    
    try {
      setIsAdding(true);
      clearMessages();
      
      const response = await fetch('/api/docs/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: newDocUrl,
          name: newDocName.trim() || undefined,
          description: newDocDescription.trim() || undefined
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(`Added: ${data.doc.name} (${data.doc.wordCount} words)`);
        setNewDocUrl('');
        setNewDocName('');
        setNewDocDescription('');
        await loadDocumentation(); // Refresh the list
      } else {
        setError(data.error || 'Failed to add documentation');
      }
    } catch (error) {
      console.error('Error adding documentation:', error);
      setError('Failed to add documentation');
    } finally {
      setIsAdding(false);
    }
  };
  
  const deleteDocumentation = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    
    try {
      clearMessages();
      
      const response = await fetch(`/api/docs/${id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(`Deleted: ${data.deletedDoc.name}`);
        await loadDocumentation(); // Refresh the list
      } else {
        setError(data.error || 'Failed to delete documentation');
      }
    } catch (error) {
      console.error('Error deleting documentation:', error);
      setError('Failed to delete documentation');
    }
  };
  
  const injectToContext = (result: DocumentationResult) => {
    const contextContent = `
## Documentation Context from ${result.doc.domain}

**Source:** ${result.doc.title}
**URL:** ${result.doc.url}

${result.content}

*This documentation was automatically injected to help with your query.*
    `.trim();
    
    if (onInjectToContext) {
      onInjectToContext(contextContent, result.doc.title);
      setSuccess(`Injected "${result.doc.title}" into Claude context (${result.estimatedTokens} tokens)`);
    } else {
      // Copy to clipboard as fallback when no injection handler
      navigator.clipboard.writeText(contextContent).then(() => {
        setSuccess(`Copied "${result.doc.title}" to clipboard (${result.estimatedTokens} tokens) - paste it into your Claude conversation!`);
      }).catch(() => {
        setError('Failed to copy to clipboard');
      });
    }
  };
  
  const handleFileUpload = async (files: FileList) => {
    if (files.length === 0) return;
    
    try {
      setIsUploading(true);
      clearMessages();
      
      // Initialize progress tracking
      const progress: {[filename: string]: number} = {};
      Array.from(files).forEach(file => {
        progress[file.name] = 0;
      });
      setUploadProgress(progress);
      
      // Create FormData
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
      
      // Upload files with progress tracking
      const response = await fetch('/api/docs/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccess(`Uploaded ${data.summary.successful}/${data.summary.totalFiles} files (${data.summary.totalWords} total words)`);
        
        if (data.errors && data.errors.length > 0) {
          console.warn('Upload errors:', data.errors);
          const errorMsg = data.errors.map((err: any) => `${err.filename}: ${err.error}`).join(', ');
          setError(`Some files failed: ${errorMsg}`);
        }
        
        await loadDocumentation(); // Refresh the list
      } else {
        setError(data.message || 'File upload failed');
      }
      
    } catch (error) {
      console.error('File upload error:', error);
      setError('Failed to upload files');
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  };
  
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set isDragging to false if we're leaving the drop zone entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  const getFileIcon = (type?: string): string => {
    if (!type) return '📄';
    
    if (type === 'file') return '📄';
    if (type === 'session') return '📋';
    if (type === 'external') return '📖';
    
    // File type specific icons
    if (type.includes('pdf')) return '📕';
    if (type.includes('word') || type.includes('docx')) return '📘';
    if (type.includes('text') || type.includes('plain')) return '📝';
    if (type.includes('markdown')) return '📋';
    if (type.includes('javascript') || type.includes('typescript')) return '📜';
    if (type.includes('python')) return '🐍';
    if (type.includes('json')) return '⚙️';
    if (type.includes('html')) return '🌐';
    if (type.includes('css')) return '🎨';
    
    return '📄';
  };
  
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      if (activeTab === 'search') {
        searchDocumentation();
      } else if (activeTab === 'add') {
        addDocumentation();
      }
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="documentation-panel-overlay">
      <div className="documentation-panel">
        <div className="documentation-panel-header">
          <h3>📚 Documentation Intelligence</h3>
          <button 
            className="close-button"
            onClick={onClose}
            aria-label="Close Documentation Panel"
          >
            ×
          </button>
        </div>
        
        {/* Description Section */}
        <div className="documentation-description" style={{
          padding: '16px',
          background: 'rgba(0, 122, 204, 0.1)',
          borderRadius: '8px',
          margin: '16px 16px 0 16px',
          fontSize: '14px',
          lineHeight: '1.6',
          color: '#c0caf5'
        }}>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>🚀 Documentation Intelligence</strong> solves ClaudeCode's limitation of not being able to store and reference external documentation.
          </p>
          <p style={{ margin: '0 0 8px 0' }}>
            Add documentation from any URL, search through it with intelligent token optimization, and inject relevant context directly into your Claude conversations.
          </p>
          <p style={{ margin: '0' }}>
            <strong>💡 New:</strong> Session documentation is automatically integrated! Use <code>/session-doc</code> to save Claude sessions, then search and reference them like external docs. Perfect for building institutional memory across agent handoffs.
          </p>
        </div>
        
        <div className="documentation-panel-tabs">
          <button 
            className={`tab ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            🔍 Search
          </button>
          <button 
            className={`tab ${activeTab === 'add' ? 'active' : ''}`}
            onClick={() => setActiveTab('add')}
          >
            ➕ Add
          </button>
          <button 
            className={`tab ${activeTab === 'manage' ? 'active' : ''}`}
            onClick={() => setActiveTab('manage')}
          >
            📋 Manage
          </button>
        </div>
        
        <div className="documentation-panel-content">
          {/* Messages */}
          {error && (
            <div className="message error">
              ❌ {error}
            </div>
          )}
          {success && (
            <div className="message success">
              ✅ {success}
            </div>
          )}
          
          {/* Search Tab */}
          {activeTab === 'search' && (
            <div className="tab-content">
              <div className="search-section">
                <div className="input-group">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Search documentation... (e.g., 'React hooks', 'API authentication')"
                    className="search-input"
                  />
                  <button 
                    onClick={searchDocumentation}
                    disabled={isSearching || !searchQuery.trim()}
                    className="search-button"
                  >
                    {isSearching ? '⏳' : '🔍'}
                  </button>
                </div>
              </div>
              
              {searchResults.length > 0 && (
                <div className="search-results">
                  <h4>Search Results:</h4>
                  {searchResults.map((result, index) => (
                    <div key={index} className={`search-result ${
                      result.doc.type === 'session' ? 'session-result' : 
                      result.doc.type === 'file' ? 'file-result' : 'external-result'
                    }`}>
                      <div className="result-header">
                        <h5>
                          {getFileIcon(result.doc.type === 'file' ? result.doc.fileType : result.doc.type)} 
                          {result.doc.title}
                        </h5>
                        <div className="result-meta">
                          <span className={`doc-type ${
                            result.doc.type === 'session' ? 'session-type' : 
                            result.doc.type === 'file' ? 'file-type' : 'external-type'
                          }`}>
                            {result.doc.type === 'session' ? 'Claude Session' : 
                             result.doc.type === 'file' ? `File (${result.doc.originalFilename})` : 
                             result.doc.domain}
                          </span>
                          <span className="tokens">{result.estimatedTokens} tokens</span>
                          {result.doc.type === 'file' && result.doc.fileSize && (
                            <span className="file-size">{formatFileSize(result.doc.fileSize)}</span>
                          )}
                        </div>
                      </div>
                      <p className="result-description">{result.doc.description}</p>
                      <div className="result-preview">
                        {result.content.substring(0, 200)}...
                      </div>
                      <div className="result-actions">
                        <button 
                          onClick={() => injectToContext(result)}
                          className="inject-button"
                          title={onInjectToContext ? "Inject this documentation into Claude's context" : "Copy this documentation to clipboard"}
                        >
                          {onInjectToContext ? '💉 Inject to Claude' : '📋 Copy to Clipboard'}
                        </button>
                        {result.doc.type === 'session' ? (
                          <button 
                            onClick={() => window.alert(`Session from ${new Date(result.doc.timestamp || result.doc.addedAt).toLocaleDateString()}\\n\\n${result.doc.description}`)}
                            className="view-button session-view-button"
                          >
                            📋 View Session
                          </button>
                        ) : result.doc.type === 'file' ? (
                          <button 
                            onClick={() => window.alert(`File: ${result.doc.originalFilename}\\nType: ${result.doc.fileType}\\nAdded: ${new Date(result.doc.addedAt).toLocaleDateString()}\\n\\nContent Preview:\\n${result.content.substring(0, 500)}...`)}
                            className="view-button file-view-button"
                          >
                            📄 View File
                          </button>
                        ) : (
                          <a 
                            href={result.doc.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="view-button"
                          >
                            🔗 View Source
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Add Tab */}
          {activeTab === 'add' && (
            <div className="tab-content">
              <div className="add-section">
                <h4>Add New Documentation</h4>
                <div className="form-group">
                  <label htmlFor="doc-url">Documentation URL *</label>
                  <input
                    type="url"
                    id="doc-url"
                    value={newDocUrl}
                    onChange={(e) => setNewDocUrl(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="https://docs.react.dev/reference/react/useState"
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="doc-name">Name (optional)</label>
                  <input
                    type="text"
                    id="doc-name"
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="React useState Hook"
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="doc-description">Description (optional)</label>
                  <textarea
                    id="doc-description"
                    value={newDocDescription}
                    onChange={(e) => setNewDocDescription(e.target.value)}
                    placeholder="Official React documentation for the useState hook"
                    className="form-textarea"
                    rows={3}
                  />
                </div>
                
                <button 
                  onClick={addDocumentation}
                  disabled={isAdding || !newDocUrl.trim()}
                  className="add-button"
                >
                  {isAdding ? '⏳ Adding...' : '➕ Add Documentation'}
                </button>
              </div>

              {/* File Upload Section */}
              <div className="upload-section">
                <div className="section-divider">
                  <span>OR</span>
                </div>
                <h4>Upload Files</h4>
                
                <div 
                  className={`drag-drop-zone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <input
                    type="file"
                    id="file-input"
                    multiple
                    accept=".pdf,.docx,.txt,.md,.js,.jsx,.ts,.tsx,.py,.json,.html,.css,.xml"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  
                  <div className="drag-drop-content">
                    {isUploading ? (
                      <>
                        <div className="upload-spinner">⏳</div>
                        <p>Uploading and processing files...</p>
                        {Object.entries(uploadProgress).map(([filename, progress]) => (
                          <div key={filename} className="upload-progress-item">
                            <span className="filename">{filename}</span>
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : isDragging ? (
                      <>
                        <div className="drag-icon">📁</div>
                        <p><strong>Drop files here</strong></p>
                        <p>Release to upload</p>
                      </>
                    ) : (
                      <>
                        <div className="upload-icon">📤</div>
                        <p><strong>Drag & drop files here</strong></p>
                        <p>or click to select files</p>
                        <div className="supported-types">
                          <small>
                            Supported: PDF, Word (.docx), Text (.txt, .md), 
                            Code (.js, .jsx, .ts, .tsx, .py, .json, .html, .css)
                          </small>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="upload-info">
                  <small>
                    📋 <strong>Max:</strong> 10 files, 10MB each • 
                    📄 Content will be extracted and made searchable • 
                    🔍 Files appear in search alongside other docs
                  </small>
                </div>
              </div>
              
              <div className="help-section">
                <h5>💡 Tips:</h5>
                <ul>
                  <li>Works best with official documentation sites</li>
                  <li>Automatically extracts main content and removes navigation</li>
                  <li>Large pages are chunked intelligently for better search</li>
                  <li>Pages are cached to avoid re-fetching</li>
                </ul>
              </div>
            </div>
          )}
          
          {/* Manage Tab */}
          {activeTab === 'manage' && (
            <div className="tab-content">
              <div className="manage-section">
                <div className="manage-header">
                  <h4>Stored Documentation ({documentation.length})</h4>
                  <div className="manage-controls">
                    <select 
                      value={docFilter} 
                      onChange={(e) => setDocFilter(e.target.value as 'all' | 'session' | 'external' | 'file')}
                      className="doc-filter"
                    >
                      <option value="all">📚 All ({documentation.length})</option>
                      <option value="session">📋 Sessions ({documentation.filter(doc => doc.type === 'session').length})</option>
                      <option value="external">📖 External ({documentation.filter(doc => doc.type === 'external' || !doc.type).length})</option>
                      <option value="file">📄 Files ({documentation.filter(doc => doc.type === 'file').length})</option>
                    </select>
                    <button 
                      onClick={loadDocumentation}
                      disabled={isLoading}
                      className="refresh-button"
                    >
                      {isLoading ? '⏳' : '🔄'} Refresh
                    </button>
                  </div>
                </div>
                
                {isLoading && (
                  <div className="loading">Loading documentation...</div>
                )}
                
                {documentation.length === 0 && !isLoading && (
                  <div className="empty-state">
                    <p>No documentation stored yet.</p>
                    <p>Use the "Add" tab to add some documentation!</p>
                  </div>
                )}
                
                <div className="documentation-list">
                  {documentation
                    .filter(doc => {
                      if (docFilter === 'all') return true;
                      if (docFilter === 'session') return doc.type === 'session';
                      if (docFilter === 'external') return doc.type === 'external' || (!doc.type && doc.url);
                      if (docFilter === 'file') return doc.type === 'file';
                      return true;
                    })
                    .map((doc) => (
                    <div key={doc.id} className={`documentation-item ${
                        doc.type === 'session' ? 'session-item' : 
                        doc.type === 'file' ? 'file-item' : 'external-item'
                      }`}>
                      <div className="doc-header">
                        <h5>
                          {getFileIcon(doc.type)}
                          {doc.title}
                        </h5>
                        <div className="doc-meta">
                          <span className={`doc-type ${
                            doc.type === 'session' ? 'session-type' : 
                            doc.type === 'file' ? 'file-type' : 'external-type'
                          }`}>
                            {doc.type === 'session' ? 'Claude Session' : 
                             doc.type === 'file' ? `File (${doc.originalFilename})` : 
                             doc.domain}
                          </span>
                          <span className="word-count">{doc.wordCount} words</span>
                          {doc.type === 'file' && doc.fileSize && (
                            <span className="file-size">{formatFileSize(doc.fileSize)}</span>
                          )}
                        </div>
                      </div>
                      <p className="doc-description">{doc.description}</p>
                      <div className="doc-info">
                        <span className="added-date">
                          Added: {new Date(doc.addedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="doc-actions">
                        {doc.type === 'session' ? (
                          <button 
                            onClick={() => window.alert(`Session from ${new Date(doc.timestamp || doc.addedAt).toLocaleDateString()}\\n\\n${doc.description}`)}
                            className="view-button session-view-button"
                          >
                            📋 View Session
                          </button>
                        ) : doc.type === 'file' ? (
                          <button 
                            onClick={() => window.alert(`File: ${doc.originalFilename}\\nType: ${doc.fileType}\\nAdded: ${new Date(doc.addedAt).toLocaleDateString()}\\n\\nContent Preview:\\n${doc.description.substring(0, 500)}...`)}
                            className="view-button file-view-button"
                          >
                            📄 View File
                          </button>
                        ) : (
                          <a 
                            href={doc.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="view-button"
                          >
                            🔗 View Source
                          </a>
                        )}
                        <button 
                          onClick={() => deleteDocumentation(doc.id, doc.title)}
                          className="delete-button"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="documentation-panel-footer">
          <div className="stats">
            <span>📚 {documentation.length} docs</span>
            <span>📊 {documentation.reduce((sum, doc) => sum + doc.wordCount, 0).toLocaleString()} words</span>
          </div>
          <div className="powered-by">
            Powered by Documentation Intelligence
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentationPanel;