/**
 * Johnny5 Settings Components - Barrel Export
 *
 * Settings & Integrations for the Johnny5 AI Employee Dashboard.
 * Phase 7 implementation.
 *
 * Components:
 * - SettingsPanel: Main tabbed settings interface
 * - SetupWizard: First-time setup flow
 * - IntegrationCard: Connected service card
 * - PermissionBoundaries: Permission configuration
 */

export { default as SettingsPanel } from './SettingsPanel';
export { default as SetupWizard } from './SetupWizard';
export { default as IntegrationCard, MOCK_INTEGRATIONS } from './IntegrationCard';
export type { Integration } from './IntegrationCard';
export { default as PermissionBoundaries, MOCK_PERMISSION_BOUNDARIES } from './PermissionBoundaries';
export type { PermissionBoundary } from './PermissionBoundaries';
