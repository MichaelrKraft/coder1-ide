/**
 * Johnny5 Builder Components - Barrel Export
 *
 * Proactive Builder system that allows Johnny5 to autonomously
 * build features and create PRs for human review.
 *
 * Key Safety Features:
 * - Never pushes to main/master
 * - Always creates feature branches
 * - Requires human approval before merge
 * - Enforces file and line limits
 *
 * Usage:
 *   import { BuilderTab, PRReviewCard } from '@/components/johnny5/builder';
 */

// Main Tab Component
export { default as BuilderTab } from './BuilderTab';

// PR Review Card Component
export { default as PRReviewCard } from './PRReviewCard';
