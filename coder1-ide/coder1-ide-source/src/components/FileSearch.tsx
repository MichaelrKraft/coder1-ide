import React, { useState, useEffect, useRef, useCallback } from 'react';
import './FileSearch.css';
import { API_ENDPOINTS, buildUrl, apiRequest } from '../config/api';

interface FileSearchProps {
  onFileSelect: (filePath: string) => void;
  onClose: () => void;
  triggerPosition?: { x: number; y: number };
}

interface FileItem {
  path: string;
  name: string;
  type: 'file' | 'directory';
  preview?: string;
}

const FileSearch: React.FC<FileSearchProps> = ({ onFileSelect, onClose, triggerPosition }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch file list on mount
  useEffect(() => {
    fetchFileList();
    searchInputRef.current?.focus();
  }, []);

  // Filter files based on search query
  useEffect(() => {
    if (!searchQuery) {
      setFilteredFiles(files);
    } else {
      const filtered = fuzzySearch(files, searchQuery);
      setFilteredFiles(filtered);
      setSelectedIndex(0);
    }
  }, [searchQuery, files]);

  // Load preview for selected file
  useEffect(() => {
    const selectedFile = filteredFiles[selectedIndex];
    if (selectedFile?.type === 'file' && selectedFile.path) {
      loadFilePreview(selectedFile.path);
    } else {
      setPreview('');
    }
  }, [selectedIndex, filteredFiles]);

  const fetchFileList = async (retry = false) => {
    try {
      setError(null);
      if (!retry) {
        setLoading(true);
      }
      
      const data = await apiRequest(API_ENDPOINTS.FILES.LIST);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch files');
      }
      
      setFiles(data.files || []);
      setLoading(false);
      setRetryCount(0);
      
    } catch (error) {
      console.error('Failed to fetch file list:', error);
      setLoading(false);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        setError('Unable to connect to server. Please check your connection.');
      } else if (errorMessage.includes('HTTP 404')) {
        setError('File API not found. Please ensure the server is running.');
      } else if (errorMessage.includes('HTTP 500')) {
        setError('Server error occurred. Please try again.');
      } else {
        setError(`Error: ${errorMessage}`);
      }
      
      setFiles([]);
    }
  };

  const loadFilePreview = async (filePath: string) => {
    try {
      const url = buildUrl(API_ENDPOINTS.FILES.PREVIEW, { path: filePath });
      const data = await apiRequest(url);
      
      if (!data.success) {
        setPreview(data.error || '[Preview unavailable]');
        return;
      }
      
      setPreview(data.preview || '[Empty file]');
      
    } catch (error) {
      console.error('Failed to load file preview:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('HTTP 404')) {
        setPreview('[File not found]');
      } else if (errorMessage.includes('Failed to fetch')) {
        setPreview('[Preview unavailable - server error]');
      } else {
        setPreview(`[Error: ${errorMessage}]`);
      }
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchFileList(true);
  };

  const fuzzySearch = (files: FileItem[], query: string): FileItem[] => {
    const queryLower = query.toLowerCase();
    return files
      .map(file => {
        const nameLower = file.name.toLowerCase();
        const pathLower = file.path.toLowerCase();
        
        // Calculate match score
        let score = 0;
        if (nameLower.includes(queryLower)) score += 10;
        if (nameLower.startsWith(queryLower)) score += 5;
        if (pathLower.includes(queryLower)) score += 3;
        
        // Character-by-character matching for fuzzy search
        let queryIndex = 0;
        for (let i = 0; i < file.name.length && queryIndex < query.length; i++) {
          if (nameLower[i] === queryLower[queryIndex]) {
            score += 1;
            queryIndex++;
          }
        }
        
        return { file, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.file);
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!filteredFiles || filteredFiles.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredFiles.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        const selectedFile = filteredFiles[selectedIndex];
        if (selectedFile && selectedFile.path) {
          handleFileSelect(selectedFile);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose?.();
        break;
    }
  }, [filteredFiles, selectedIndex, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleFileSelect = (file: FileItem) => {
    if (!file?.path) return;
    
    onFileSelect?.(file.path);
    onClose?.();
  };

  const highlightMatch = (text: string, query: string) => {
    if (!text || !query) return text;
    
    try {
      // Escape special regex characters
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
      
      return (
        <>
          {parts.map((part, i) => 
            part.toLowerCase() === query.toLowerCase() ? 
              <span key={i} className="highlight">{part}</span> : 
              part
          )}
        </>
      );
    } catch (error) {
      // Fallback if regex fails
      return text;
    }
  };

  const position = triggerPosition || { x: window.innerWidth / 2 - 300, y: 100 };

  return (
    <div className="file-search-overlay">
      <div 
        ref={containerRef}
        className="file-search-container"
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          maxHeight: `${window.innerHeight - position.y - 50}px`
        }}
      >
        <div className="file-search-header">
          <span className="file-search-icon">@</span>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="file-search-input"
          />
        </div>
        
        <div className="file-search-content">
          {loading ? (
            <div className="file-search-loading">
              <div className="loading-spinner"></div>
              <div>Loading files...</div>
            </div>
          ) : error ? (
            <div className="file-search-error">
              <div className="error-icon">⚠️</div>
              <div className="error-message">{error}</div>
              <button 
                className="retry-button"
                onClick={handleRetry}
                disabled={loading}
              >
                {retryCount > 0 ? `Retry (${retryCount})` : 'Retry'}
              </button>
            </div>
          ) : (
            <div className="file-search-split">
              <div className="file-search-list">
                {filteredFiles.length === 0 ? (
                  <div className="file-search-empty">
                    {files.length === 0 ? (
                      <div>
                        <div>No files available</div>
                        <div className="empty-subtitle">The project might be empty or the server might be down.</div>
                      </div>
                    ) : (
                      <div>
                        <div>No files match "{searchQuery}"</div>
                        <div className="empty-subtitle">Try a different search term</div>
                      </div>
                    )}
                  </div>
                ) : (
                  filteredFiles.map((file, index) => (
                    <div
                      key={file.path}
                      className={`file-search-item ${index === selectedIndex ? 'selected' : ''}`}
                      onClick={() => handleFileSelect(file)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <span className="file-icon">
                        {file.type === 'directory' ? '📁' : '📄'}
                      </span>
                      <div className="file-info">
                        <div className="file-name">
                          {highlightMatch(file.name, searchQuery)}
                        </div>
                        <div className="file-path">{file.path}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {preview && (
                <div className="file-search-preview">
                  <div className="preview-header">Preview</div>
                  <pre className="preview-content">{preview}</pre>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="file-search-footer">
          <span className="shortcut">↑↓ Navigate</span>
          <span className="shortcut">↵ Select</span>
          <span className="shortcut">ESC Close</span>
        </div>
      </div>
    </div>
  );
};

export default FileSearch;