/**
 * Johnny5 Security Components
 *
 * Security monitoring is the KEY DIFFERENTIATOR for Johnny5.
 * These components provide full visibility into AI operations and security.
 *
 * Components:
 * - SecurityTab: Main security dashboard view
 * - SecurityScore: Circular gauge showing security score (0-100)
 * - PermissionsList: Active AI permissions with status indicators
 * - AuditLog: Chronological log of AI actions with filtering
 * - PromptInjectionAlert: Alert cards for suspicious patterns
 */

export { default as SecurityTab } from './SecurityTab';
export { default as SecurityScore } from './SecurityScore';
export { default as PermissionsList } from './PermissionsList';
export { default as AuditLog } from './AuditLog';
export {
  default as PromptInjectionAlertsList,
  PromptInjectionAlertCard
} from './PromptInjectionAlert';
