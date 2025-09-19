/**
 * Page Builder Component - Phase 2.2 Enhancement
 * UI for multi-component page generation workflows
 */

import React, { useState, useEffect } from 'react';
import pageComposer, { PageTemplate, GeneratedPage, ThemeSpec } from '../../services/magic/PageComposer';
import './PageBuilder.css';

interface PageBuilderProps {
  isVisible: boolean;
  onClose: () => void;
  onAccept: (pageCode: string) => void;
}

const PageBuilder: React.FC<PageBuilderProps> = ({
  isVisible,
  onClose,
  onAccept
}) => {
  const [templates, setTemplates] = useState<PageTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPage, setGeneratedPage] = useState<GeneratedPage | null>(null);
  const [progress, setProgress] = useState({ message: '', value: 0 });
  const [activeTab, setActiveTab] = useState<'templates' | 'preview' | 'code'>('templates');
  
  // Theme customization
  const [theme, setTheme] = useState<ThemeSpec>({
    style: 'modern',
    primaryColor: '#3b82f6',
    secondaryColor: '#10b981'
  });

  useEffect(() => {
    if (isVisible) {
      loadTemplates();
    }
  }, [isVisible]);

  const loadTemplates = () => {
    const availableTemplates = pageComposer.getTemplates();
    setTemplates(availableTemplates);
    if (availableTemplates.length > 0 && !selectedTemplate) {
      setSelectedTemplate(availableTemplates[0].id);
    }
  };

  const handleGeneratePage = async () => {
    if (!selectedTemplate) return;

    setIsGenerating(true);
    setProgress({ message: 'Initializing...', value: 0 });
    
    try {
      const page = await pageComposer.generatePage(
        selectedTemplate,
        { theme },
        (message, value) => {
          setProgress({ message, value });
        }
      );
      
      setGeneratedPage(page);
      setActiveTab('preview');
    } catch (error) {
      console.error('Page generation failed:', error);
      setProgress({ message: 'Generation failed', value: 0 });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptPage = () => {
    if (generatedPage) {
      onAccept(generatedPage.fullPageCode);
      onClose();
    }
  };

  const getTemplateIcon = (category: string) => {
    const icons: Record<string, string> = {
      landing: '🚀',
      dashboard: '📊',
      ecommerce: '🛍️',
      portfolio: '🎨',
      blog: '📝'
    };
    return icons[category] || '📄';
  };

  const getThemeStyles = () => {
    const styles: Record<string, string> = {
      modern: 'bg-gradient-to-br from-blue-50 to-purple-50',
      minimal: 'bg-gray-50',
      corporate: 'bg-slate-100',
      creative: 'bg-gradient-to-br from-pink-50 to-orange-50'
    };
    return styles[theme.style || 'modern'] || '';
  };

  if (!isVisible) return null;

  return (
    <div className="page-builder-overlay">
      <div className="page-builder-container">
        {/* Header */}
        <div className="page-builder-header">
          <div className="header-content">
            <h2 className="text-2xl font-bold text-gray-900">
              🏗️ Page Builder
            </h2>
            <p className="text-gray-600">
              Generate complete page sections with multiple components
            </p>
          </div>
          <button
            onClick={onClose}
            className="close-button"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            onClick={() => setActiveTab('templates')}
            className={`tab-button ${activeTab === 'templates' ? 'active' : ''}`}
          >
            📋 Templates
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`tab-button ${activeTab === 'preview' ? 'active' : ''}`}
            disabled={!generatedPage}
          >
            👁️ Preview
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`tab-button ${activeTab === 'code' ? 'active' : ''}`}
            disabled={!generatedPage}
          >
            🔧 Code
          </button>
        </div>

        {/* Content Area */}
        <div className="page-builder-content">
          {activeTab === 'templates' && (
            <div className="templates-view">
              {/* Template Selection */}
              <div className="template-grid">
                {templates.map(template => (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`template-card ${selectedTemplate === template.id ? 'selected' : ''}`}
                  >
                    <div className="template-icon">
                      {getTemplateIcon(template.category)}
                    </div>
                    <h3 className="template-name">{template.name}</h3>
                    <p className="template-description">{template.description}</p>
                    <div className="template-sections">
                      {template.sections.map(section => (
                        <span key={section.id} className="section-badge">
                          {section.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Theme Customization */}
              <div className="theme-customization">
                <h3 className="text-lg font-semibold mb-4">🎨 Theme Settings</h3>
                <div className="theme-controls">
                  <div className="control-group">
                    <label className="control-label">Style</label>
                    <select
                      value={theme.style}
                      onChange={(e) => setTheme({ ...theme, style: e.target.value as any })}
                      className="theme-select"
                    >
                      <option value="modern">Modern</option>
                      <option value="minimal">Minimal</option>
                      <option value="corporate">Corporate</option>
                      <option value="creative">Creative</option>
                    </select>
                  </div>
                  <div className="control-group">
                    <label className="control-label">Primary Color</label>
                    <div className="color-input-group">
                      <input
                        type="color"
                        value={theme.primaryColor}
                        onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                        className="color-picker"
                      />
                      <input
                        type="text"
                        value={theme.primaryColor}
                        onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                        className="color-text"
                      />
                    </div>
                  </div>
                  <div className="control-group">
                    <label className="control-label">Secondary Color</label>
                    <div className="color-input-group">
                      <input
                        type="color"
                        value={theme.secondaryColor}
                        onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                        className="color-picker"
                      />
                      <input
                        type="text"
                        value={theme.secondaryColor}
                        onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                        className="color-text"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preview' && generatedPage && (
            <div className="preview-view">
              <div className={`preview-container ${getThemeStyles()}`}>
                <div className="preview-sections">
                  {generatedPage.sections.map(section => (
                    <div key={section.sectionId} className="preview-section">
                      <div className="section-header">
                        <h4 className="section-title">{section.name}</h4>
                        <span className="component-count">
                          {section.components.length} components
                        </span>
                      </div>
                      <div className="section-preview">
                        {/* Preview would render actual components here */}
                        <div className="preview-placeholder">
                          <p>Section: {section.name}</p>
                          <p>Components: {section.components.map(c => c.name).join(', ')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="preview-metadata">
                  <div className="metadata-item">
                    <span className="metadata-label">Template:</span>
                    <span className="metadata-value">{generatedPage.metadata.template}</span>
                  </div>
                  <div className="metadata-item">
                    <span className="metadata-label">Components:</span>
                    <span className="metadata-value">{generatedPage.metadata.componentCount}</span>
                  </div>
                  <div className="metadata-item">
                    <span className="metadata-label">Theme:</span>
                    <span className="metadata-value">{generatedPage.metadata.appliedTheme || 'Default'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'code' && generatedPage && (
            <div className="code-view">
              <div className="code-header">
                <span className="code-filename">Page.tsx</span>
                <button
                  onClick={() => navigator.clipboard.writeText(generatedPage.fullPageCode)}
                  className="copy-button"
                >
                  📋 Copy
                </button>
              </div>
              <pre className="code-content">
                <code>{generatedPage.fullPageCode}</code>
              </pre>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {isGenerating && (
          <div className="progress-bar">
            <div className="progress-message">{progress.message}</div>
            <div className="progress-track">
              <div 
                className="progress-fill"
                style={{ width: `${progress.value}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="page-builder-actions">
          <button
            onClick={handleGeneratePage}
            disabled={!selectedTemplate || isGenerating}
            className="action-button primary"
          >
            {isGenerating ? '⟳ Generating...' : '🎨 Generate Page'}
          </button>
          <div className="action-group">
            <button
              onClick={onClose}
              className="action-button outline"
            >
              Cancel
            </button>
            <button
              onClick={handleAcceptPage}
              disabled={!generatedPage}
              className="action-button primary"
            >
              ✅ Accept & Insert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageBuilder;