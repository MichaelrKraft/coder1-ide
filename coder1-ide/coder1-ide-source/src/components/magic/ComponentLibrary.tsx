import React, { useState, useEffect } from 'react';
import componentHistory, { ComponentHistoryItem, ComponentCollection } from '../../services/magic/ComponentHistory';
import './ComponentLibrary.css';

interface ComponentLibraryProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectComponent: (code: string) => void;
}

type ViewMode = 'grid' | 'list';
type TabMode = 'all' | 'favorites' | 'collections' | 'statistics';

const ComponentLibrary: React.FC<ComponentLibraryProps> = ({
  isVisible,
  onClose,
  onSelectComponent
}) => {
  const [components, setComponents] = useState<ComponentHistoryItem[]>([]);
  const [collections, setCollections] = useState<ComponentCollection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTab, setActiveTab] = useState<TabMode>('all');
  const [selectedComponent, setSelectedComponent] = useState<ComponentHistoryItem | null>(null);
  const [statistics, setStatistics] = useState<any>(null);

  useEffect(() => {
    if (isVisible) {
      loadData();
    }
  }, [isVisible]);

  const loadData = () => {
    setComponents(componentHistory.getAllComponents());
    setCollections(componentHistory.getAllCollections());
    setStatistics(componentHistory.getStatistics());
  };

  const getFilteredComponents = () => {
    let filtered = components;

    // Filter by tab
    if (activeTab === 'favorites') {
      filtered = componentHistory.getFavoriteComponents();
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(c => c.metadata.category === selectedCategory);
    }

    // Filter by search
    if (searchQuery) {
      filtered = componentHistory.searchComponents(searchQuery);
    }

    return filtered;
  };

  const handleToggleFavorite = (id: string) => {
    componentHistory.toggleFavorite(id);
    loadData();
  };

  const handleDeleteComponent = (id: string) => {
    if (window.confirm('Are you sure you want to delete this component?')) {
      componentHistory.deleteComponent(id);
      loadData();
    }
  };

  const handleExportComponent = (id: string) => {
    const exportData = componentHistory.exportComponent(id);
    if (exportData) {
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `component_${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleUseComponent = (component: ComponentHistoryItem) => {
    onSelectComponent(component.code);
    onClose();
  };

  const formatDate = (date: Date) => {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      'day'
    );
  };

  const getCategories = () => {
    const categories = new Set<string>();
    components.forEach(c => categories.add(c.metadata.category));
    return Array.from(categories);
  };

  if (!isVisible) return null;

  return (
    <div className="component-library-overlay">
      <div className="component-library-container">
        {/* Header */}
        <div className="library-header">
          <div className="header-content">
            <h2>📚 Component Library</h2>
            <p>Browse and manage your generated components</p>
          </div>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        {/* Tabs */}
        <div className="library-tabs">
          <button
            className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            📋 All Components ({components.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            ⭐ Favorites ({components.filter(c => c.stats.favorite).length})
          </button>
          <button
            className={`tab-button ${activeTab === 'collections' ? 'active' : ''}`}
            onClick={() => setActiveTab('collections')}
          >
            📁 Collections ({collections.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'statistics' ? 'active' : ''}`}
            onClick={() => setActiveTab('statistics')}
          >
            📊 Statistics
          </button>
        </div>

        {/* Toolbar */}
        {activeTab !== 'statistics' && (
          <div className="library-toolbar">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search components..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-filter"
            >
              <option value="all">All Categories</option>
              {getCategories().map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <div className="view-toggle">
              <button
                className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                ⊞
              </button>
              <button
                className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List view"
              >
                ☰
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="library-content">
          {activeTab === 'all' || activeTab === 'favorites' ? (
            <div className={`components-${viewMode}`}>
              {getFilteredComponents().length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📭</span>
                  <p>No components found</p>
                </div>
              ) : (
                getFilteredComponents().map(component => (
                  <div
                    key={component.id}
                    className={`component-item ${viewMode}`}
                    onClick={() => setSelectedComponent(component)}
                  >
                    <div className="component-preview">
                      <div className="preview-code">
                        {component.code.substring(0, 200)}...
                      </div>
                    </div>
                    <div className="component-info">
                      <h3>{component.name}</h3>
                      <p className="component-prompt">{component.prompt}</p>
                      <div className="component-meta">
                        <span className="meta-item">
                          🏷️ {component.metadata.category}
                        </span>
                        <span className="meta-item">
                          📅 {formatDate(component.timestamp)}
                        </span>
                        {component.stats.rating && (
                          <span className="meta-item">
                            ⭐ {component.stats.rating}
                          </span>
                        )}
                      </div>
                      <div className="component-tags">
                        {component.metadata.tags.map(tag => (
                          <span key={tag} className="tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className="component-actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(component.id);
                        }}
                        className={`action-btn ${component.stats.favorite ? 'favorite' : ''}`}
                        title="Toggle favorite"
                      >
                        {component.stats.favorite ? '⭐' : '☆'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUseComponent(component);
                        }}
                        className="action-btn"
                        title="Use this component"
                      >
                        ↗️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportComponent(component.id);
                        }}
                        className="action-btn"
                        title="Export component"
                      >
                        💾
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteComponent(component.id);
                        }}
                        className="action-btn delete"
                        title="Delete component"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'collections' ? (
            <div className="collections-view">
              {collections.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📁</span>
                  <p>No collections yet</p>
                  <button className="create-collection-btn">
                    + Create Collection
                  </button>
                </div>
              ) : (
                collections.map(collection => (
                  <div key={collection.id} className="collection-card">
                    <h3>{collection.name}</h3>
                    <p>{collection.description}</p>
                    <div className="collection-meta">
                      <span>📦 {collection.components.length} components</span>
                      <span>📅 {formatDate(collection.updatedAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'statistics' && statistics ? (
            <div className="statistics-view">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{statistics.totalComponents}</div>
                  <div className="stat-label">Total Components</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{statistics.favoriteCount}</div>
                  <div className="stat-label">Favorites</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{statistics.totalCollections}</div>
                  <div className="stat-label">Collections</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{statistics.averageRating || 'N/A'}</div>
                  <div className="stat-label">Avg Rating</div>
                </div>
              </div>

              <div className="categories-breakdown">
                <h3>Categories Breakdown</h3>
                <div className="category-bars">
                  {Object.entries(statistics.categoriesBreakdown || {}).map(([cat, count]) => (
                    <div key={cat} className="category-bar">
                      <span className="category-name">{cat}</span>
                      <div className="bar-container">
                        <div 
                          className="bar-fill" 
                          style={{ width: `${(count as number / statistics.totalComponents) * 100}%` }}
                        />
                      </div>
                      <span className="category-count">{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="popular-tags">
                <h3>Popular Tags</h3>
                <div className="tags-cloud">
                  {(statistics.popularTags || []).map((item: any) => (
                    <span 
                      key={item.tag} 
                      className="tag-item"
                      style={{ fontSize: `${Math.min(1.5, 0.8 + item.count * 0.1)}rem` }}
                    >
                      {item.tag} ({item.count})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Component Detail Modal */}
        {selectedComponent && (
          <div className="component-detail-overlay" onClick={() => setSelectedComponent(null)}>
            <div className="component-detail" onClick={(e) => e.stopPropagation()}>
              <div className="detail-header">
                <h3>{selectedComponent.name}</h3>
                <button onClick={() => setSelectedComponent(null)}>×</button>
              </div>
              <div className="detail-content">
                <div className="code-preview">
                  <pre>{selectedComponent.code}</pre>
                </div>
                <div className="detail-info">
                  <p><strong>Prompt:</strong> {selectedComponent.prompt}</p>
                  <p><strong>Created:</strong> {selectedComponent.timestamp.toLocaleString()}</p>
                  <p><strong>Version:</strong> {selectedComponent.version}</p>
                  <p><strong>Usage Count:</strong> {selectedComponent.stats.usageCount}</p>
                  {selectedComponent.metadata.accessibilityScore && (
                    <p><strong>Accessibility:</strong> {selectedComponent.metadata.accessibilityScore}/100</p>
                  )}
                  {selectedComponent.metadata.performanceScore && (
                    <p><strong>Performance:</strong> {selectedComponent.metadata.performanceScore}/100</p>
                  )}
                </div>
              </div>
              <div className="detail-actions">
                <button onClick={() => handleUseComponent(selectedComponent)} className="use-btn">
                  Use Component
                </button>
                <button onClick={() => handleExportComponent(selectedComponent.id)} className="export-btn">
                  Export
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComponentLibrary;