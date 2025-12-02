/**
 * Claude Config Zustand Store
 * Centralized state management for Claude Config feature
 */

import { create } from 'zustand';
import {
  ClaudeConfig,
  ConfigTemplate,
  ConfigPreview,
  ClaudeConfigState,
  ConfigInstallRequest,
  GenerationContext
} from '../lib/claude-config/types';
import { templateLoader } from '../lib/claude-config/template-loader';
import { permissionAnalyzer } from '../lib/claude-config/permission-analyzer';
import { costCalculator } from '../lib/claude-config/cost-calculator';

export const useClaudeConfigStore = create<ClaudeConfigState>((set, get) => ({
  templates: [],
  userConfigs: [],
  selectedTemplate: null,
  previewConfig: null,
  isModalOpen: false,
  isGenerating: false,
  activeTab: 'templates',
  selectedCategory: null,
  searchQuery: '',

  setTemplates: (templates) => set({ templates }),
  
  setUserConfigs: (userConfigs) => set({ userConfigs }),
  
  setSelectedTemplate: (selectedTemplate) => set({ selectedTemplate }),
  
  setPreviewConfig: (previewConfig) => set({ previewConfig }),
  
  openModal: () => set({ isModalOpen: true }),
  
  closeModal: () => set({ 
    isModalOpen: false,
    previewConfig: null,
    selectedTemplate: null
  }),
  
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  
  setActiveTab: (activeTab) => set({ activeTab }),
  
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  loadTemplates: async () => {
    try {
      const templates = await templateLoader.getTemplates();
      set({ templates });
    } catch (error) {
      console.error('Failed to load templates:', error);
      throw error;
    }
  },

  loadUserConfigs: async () => {
    try {
      const response = await fetch('/api/claude-config/list');
      
      if (!response.ok) {
        throw new Error('Failed to load configs');
      }
      
      const result = await response.json();
      
      if (result.success && result.configs) {
        set({ userConfigs: result.configs });
      }
    } catch (error) {
      console.error('Failed to load user configs:', error);
      throw error;
    }
  },

  generateConfig: async (prompt, context) => {
    set({ isGenerating: true });
    
    try {
      const response = await fetch('/api/claude-config/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          type: context?.type
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const result = await response.json();

      if (result.success && result.config) {
        const extractName = (content: string, type: string): string => {
          if (type === 'command') {
            const match = content.match(/"name":\s*"([^"]+)"/);
            return match ? match[1] : 'Generated Command';
          }
          const match = content.match(/name:\s*(.+)/i);
          return match ? match[1].trim() : 'Generated Config';
        };

        const extractDescription = (content: string, type: string): string => {
          if (type === 'command') {
            const match = content.match(/"description":\s*"([^"]+)"/);
            return match ? match[1] : 'AI-generated command';
          }
          const match = content.match(/description:\s*(.+)/i);
          return match ? match[1].trim() : 'AI-generated configuration';
        };

        const name = extractName(result.config, result.type);
        const description = extractDescription(result.config, result.type);
        
        const template: ConfigTemplate = {
          id: `generated-${Date.now()}`,
          type: result.type,
          category: 'AI Generated',
          name,
          description,
          file: '',
          tags: ['ai-generated', result.type],
          estimatedCost: result.metadata?.tokens 
            ? { tokensPerUse: result.metadata.tokens, costPerUse: 0.015 }
            : undefined,
          permissions: [],
          capabilities: [],
          icon: 'sparkles'
        };

        const preview: ConfigPreview = {
          template,
          content: result.config,
          capabilities: [],
          permissions: [],
          estimatedCost: template.estimatedCost,
          installLocation: 'local'
        };

        set({ previewConfig: preview, selectedTemplate: template });
      } else {
        throw new Error('No config generated');
      }
    } catch (error) {
      console.error('Failed to generate config:', error);
      throw error;
    } finally {
      set({ isGenerating: false });
    }
  },

  installConfig: async (request) => {
    try {
      const response = await fetch('/api/claude-config/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error('Installation failed');
      }

      const result = await response.json();

      if (result.success) {
        await get().loadUserConfigs();
        
        set({ 
          previewConfig: null,
          selectedTemplate: null
        });
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to install config:', error);
      return false;
    }
  },

  deleteConfig: async (configId) => {
    try {
      const config = get().userConfigs.find(c => c.id === configId);
      
      if (!config) {
        return false;
      }

      const response = await fetch(`/api/claude-config/delete?path=${encodeURIComponent(config.filePath)}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Deletion failed');
      }

      const result = await response.json();

      if (result.success) {
        await get().loadUserConfigs();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to delete config:', error);
      return false;
    }
  },

  previewTemplate: async (templateId) => {
    try {
      const template = get().templates.find(t => t.id === templateId);
      
      if (!template) {
        throw new Error('Template not found');
      }

      const { content } = await templateLoader.loadTemplate(templateId);

      const analysis = permissionAnalyzer.analyzePermissions(template.permissions);

      const preview: ConfigPreview = {
        template,
        content,
        capabilities: template.capabilities,
        permissions: template.permissions,
        estimatedCost: template.estimatedCost,
        installLocation: 'local'
      };

      set({ 
        previewConfig: preview,
        selectedTemplate: template
      });
    } catch (error) {
      console.error('Failed to preview template:', error);
      throw error;
    }
  }
}));

export function getFilteredTemplates(
  templates: ConfigTemplate[],
  searchQuery: string,
  selectedCategory: string | null
): ConfigTemplate[] {
  let filtered = templates;

  if (selectedCategory) {
    filtered = filtered.filter(t => t.category === selectedCategory);
  }

  if (searchQuery) {
    const lowerQuery = searchQuery.toLowerCase();
    filtered = filtered.filter(t =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  return filtered;
}

export function getConfigsByType(configs: ClaudeConfig[]) {
  return {
    agents: configs.filter(c => c.type === 'agent'),
    hooks: configs.filter(c => c.type === 'hook'),
    skills: configs.filter(c => c.type === 'skill'),
    commands: configs.filter(c => c.type === 'command')
  };
}

export function getConfigsByLocation(configs: ClaudeConfig[]) {
  return {
    local: configs.filter(c => c.location === 'local'),
    global: configs.filter(c => c.location === 'global')
  };
}
