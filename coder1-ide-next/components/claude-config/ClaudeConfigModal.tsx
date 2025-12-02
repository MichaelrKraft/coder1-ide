'use client';

import React, { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useClaudeConfigStore, getFilteredTemplates } from '@/stores/useClaudeConfigStore';
import { NaturalLanguageBar } from './NaturalLanguageBar';
import { CategoryPills } from './CategoryPills';
import { TemplateCard } from './TemplateCard';
import { ConfigCard } from './ConfigCard';
import { ConfigPreviewModal } from './ConfigPreviewModal';

export function ClaudeConfigModal() {
  const {
    isModalOpen,
    closeModal,
    templates,
    userConfigs,
    activeTab,
    selectedCategory,
    searchQuery,
    previewConfig,
    isGenerating,
    setActiveTab,
    setSelectedCategory,
    setSearchQuery,
    loadTemplates,
    loadUserConfigs,
    previewTemplate,
    deleteConfig,
    generateConfig,
    setPreviewConfig,
    installConfig
  } = useClaudeConfigStore();

  const [categories, setCategories] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isModalOpen) {
      loadInitialData();
    }
  }, [isModalOpen]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadTemplates(),
        loadUserConfigs()
      ]);

      const uniqueCategories = Array.from(
        new Set(templates.map(t => t.category))
      ).map(cat => ({
        id: cat.toLowerCase().replace(/\s+/g, '-'),
        name: cat,
        color: getCategoryColor(cat)
      }));

      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'Development': '#3b82f6',
      'Quality Assurance': '#10b981',
      'Documentation': '#8b5cf6',
      'Git Workflow': '#f59e0b',
      'Error Handling': '#ef4444',
      'File Management': '#6366f1',
      'Code Quality': '#14b8a6',
      'Version Control': '#f97316',
      'Problem Solving': '#ec4899',
      'Utilities': '#06b6d4',
      'Learning': '#a855f7'
    };
    return colors[category] || '#6366f1';
  };

  const filteredTemplates = getFilteredTemplates(templates, searchQuery, selectedCategory);

  const handleTemplatePreview = async (templateId: string) => {
    try {
      await previewTemplate(templateId);
    } catch (error) {
      console.error('Failed to preview template:', error);
    }
  };

  const handleGenerate = async (prompt: string) => {
    try {
      await generateConfig(prompt);
    } catch (error) {
      console.error('Failed to generate config:', error);
    }
  };

  const handleInstall = async (location: 'local' | 'global') => {
    if (!previewConfig) return;

    try {
      const success = await installConfig({
        content: previewConfig.content,
        name: previewConfig.template.name,
        type: previewConfig.template.type,
        location,
        description: previewConfig.template.description
      });

      if (success) {
        setPreviewConfig(null);
        setActiveTab('my-configs');
      }
    } catch (error) {
      console.error('Failed to install config:', error);
    }
  };

  if (!isModalOpen) return null;

  return (
    <>
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: 200% center;
          }
          100% {
            background-position: -200% center;
          }
        }
      `}</style>
      
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="relative w-full h-full max-w-7xl max-h-[90vh] mx-4 my-8 bg-[#0a0a0a] rounded-2xl shadow-2xl overflow-hidden border border-cyan-500/30">
          {/* Dot Grid Background */}
          <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle, rgba(125, 211, 252, 0.4) 1px, transparent 1px), radial-gradient(circle, rgba(187, 154, 247, 0.3) 1px, transparent 1px)',
            backgroundSize: '32px 32px, 40px 40px',
            backgroundPosition: '0 0, 16px 16px'
          }} />
          
          {/* Header */}
          <div className="relative h-32 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-orange-500/10 overflow-hidden border-b border-cyan-500/20">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a0a]" />
            
            <div className="relative h-full flex items-center justify-between px-8">
              <div>
                <h1 className="text-4xl font-bold mb-2 flex items-center gap-3" style={{
                  background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.9) 0%, rgba(125, 211, 252, 1) 50%, rgba(255, 255, 255, 0.9) 100%)',
                  backgroundSize: '200% auto',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  animation: 'shimmer 3s linear infinite'
                }}>
                  <Sparkles className="w-8 h-8 text-cyan-400" />
                  Claude Configs
                </h1>
                <p className="text-cyan-100/80 text-lg font-medium">
                  AI-powered configurations for your development workflow
                </p>
              </div>
              
              <button
                onClick={closeModal}
                className="p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 transition-all border border-cyan-500/20 hover:border-cyan-500/40"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Natural Language Bar - THE KILLER FEATURE */}
          <div className="relative px-8 py-6 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-orange-500/5 border-b border-cyan-500/20">
            <NaturalLanguageBar 
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 px-8 pt-6 border-b border-cyan-500/20">
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-6 py-3 rounded-t-lg font-semibold transition-all ${
                activeTab === 'templates'
                  ? 'bg-cyan-500/10 text-cyan-300 border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/5'
              }`}
            >
              Templates ({templates.length})
            </button>
            <button
              onClick={() => setActiveTab('my-configs')}
              className={`px-6 py-3 rounded-t-lg font-semibold transition-all ${
                activeTab === 'my-configs'
                  ? 'bg-cyan-500/10 text-cyan-300 border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/5'
              }`}
            >
              My Configs ({userConfigs.length})
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8" style={{ maxHeight: 'calc(90vh - 320px)' }}>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
              </div>
            ) : (
              <>
                {activeTab === 'templates' ? (
                  <>
                    {/* Search and Filter */}
                    <div className="mb-6">
                      <input
                        type="text"
                        placeholder="Search templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-3 bg-black/40 border border-cyan-500/30 rounded-lg text-white placeholder-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                      />
                    </div>

                    {/* Category Pills */}
                    <CategoryPills
                      categories={categories}
                      selectedCategory={selectedCategory}
                      onSelect={setSelectedCategory}
                    />

                    {/* Templates Grid */}
                    {filteredTemplates.length === 0 ? (
                      <div className="text-center py-16 text-cyan-300/60">
                        <p className="text-lg mb-2">No templates found</p>
                        <p className="text-sm text-cyan-300/40">Try adjusting your search or filters</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                        {filteredTemplates.map(template => (
                          <TemplateCard
                            key={template.id}
                            template={template}
                            onSelect={handleTemplatePreview}
                            onPreview={handleTemplatePreview}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* My Configs */}
                    {userConfigs.length === 0 ? (
                      <div className="text-center py-16 text-cyan-300/60">
                        <p className="text-lg mb-2">No configs installed yet</p>
                        <p className="text-sm text-cyan-300/40">Install templates from the Templates tab to get started</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {userConfigs.map(config => (
                          <ConfigCard
                            key={config.id}
                            config={config}
                            onDelete={deleteConfig}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewConfig && (
        <ConfigPreviewModal
          preview={previewConfig}
          isOpen={!!previewConfig}
          onClose={() => setPreviewConfig(null)}
          onInstall={handleInstall}
        />
      )}
    </>
  );
}
