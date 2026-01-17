/**
 * Credit Service Exports
 *
 * Usage:
 * ```typescript
 * import {
 *   hasCredits,
 *   deductCredits,
 *   getBalance,
 *   validateCreditsForOperation,
 *   CREDIT_COSTS,
 * } from '@/lib/credits'
 * ```
 */

export {
  // Core functions
  hasCredits,
  deductCredits,
  getBalance,
  checkAndResetIfNeeded,
  validateCreditsForOperation,

  // Constants
  CREDIT_COSTS,

  // Types
  type CreditOperation,
  type CreditCheckResult,
  type DeductResult,
  type CreditBalance,
} from './credit-service'
