/**
 * Claude Config Library
 * Central export point for all Claude Config services and types
 */

// Export all types
export * from './types';

// Export template loader
export {
  templateLoader,
  getAllTemplates,
  getTemplateById,
  loadTemplate,
  searchTemplates,
  getCategories
} from './template-loader';

// Export file operations
export {
  fileOperations,
  createConfig,
  getAllConfigs,
  deleteConfig
} from './file-operations';

// Export config parser
export {
  configParser,
  parseConfig,
  extractCapabilities,
  validateConfig as validateConfigContent
} from './config-parser';

// Export permission analyzer
export {
  permissionAnalyzer,
  analyzePermissions,
  calculateRiskScore
} from './permission-analyzer';

// Export cost calculator
export {
  costCalculator,
  estimateGenerationCost,
  formatCost,
  estimateMonthlyCost
} from './cost-calculator';

// Export validation
export {
  validation,
  validateName,
  validateContent,
  validateCompleteConfig,
  sanitizeName
} from './validation';

// Export AI generator
export {
  aiGenerator,
  detectConfigType,
  generateConfig,
  parseResponse,
  validateGenerated
} from './ai-generator';

// Re-export commonly used utility functions
export { getFilteredTemplates, getConfigsByType, getConfigsByLocation } from '../../stores/useClaudeConfigStore';
