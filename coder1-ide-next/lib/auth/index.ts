/**
 * Auth Module Feature Flag Router
 *
 * Switches between SQLite (db.ts) and Supabase (supabase-db.ts) backends
 * based on the AUTH_BACKEND environment variable.
 *
 * Usage:
 *   import { getUserByEmail, createSession } from '@/lib/auth';
 *
 * Environment:
 *   AUTH_BACKEND=sqlite    (default) - Use SQLite
 *   AUTH_BACKEND=supabase  - Use Supabase PostgreSQL
 */

// Determine which backend to use
const AUTH_BACKEND = process.env.AUTH_BACKEND || 'sqlite';

// Validate backend value
if (!['sqlite', 'supabase'].includes(AUTH_BACKEND)) {
  console.error(`[Auth] Invalid AUTH_BACKEND="${AUTH_BACKEND}", defaulting to sqlite`);
}

// Dynamic import based on backend
// Note: We use require() for synchronous module loading at startup
const backend = AUTH_BACKEND === 'supabase'
  ? require('./supabase-db')
  : require('./db');

// Re-export all types (these are the same in both backends)
export type {
  User,
  CreateUserInput,
  AuthSession,
  CreateSessionInput,
  Project,
  CreateProjectInput,
  UsageMetric,
  OAuthAccount,
  Johnny5Quota,
  Team,
  TeamMember,
  TeamInvitation,
} from './db';

// Re-export all functions from the selected backend
// User functions
export const getAuthDatabase = backend.getAuthDatabase;
export const createUser = backend.createUser;
export const getUserByEmail = backend.getUserByEmail;
export const getUserByUsername = backend.getUserByUsername;
export const getUserById = backend.getUserById;
export const updateLastLogin = backend.updateLastLogin;

// Session functions
export const createSession = backend.createSession;
export const getSessionByToken = backend.getSessionByToken;
export const refreshSessionToken = backend.refreshSessionToken;
export const deleteSession = backend.deleteSession;
export const deleteUserSessions = backend.deleteUserSessions;

// Project functions
export const createProject = backend.createProject;
export const getUserProjects = backend.getUserProjects;
export const getProjectById = backend.getProjectById;
export const updateProject = backend.updateProject;
export const deleteProject = backend.deleteProject;

// Usage tracking
export const trackUsage = backend.trackUsage;
export const getUserUsageCount = backend.getUserUsageCount;

// OAuth functions
export const findOrCreateOAuthUser = backend.findOrCreateOAuthUser;
export const linkOAuthAccount = backend.linkOAuthAccount;

// Johnny5 quota functions
export const getJohnny5Quota = backend.getJohnny5Quota;
export const incrementJohnny5MessageCount = backend.incrementJohnny5MessageCount;
export const resetJohnny5MessageCount = backend.resetJohnny5MessageCount;
export const updateClaudeSubscriptionTier = backend.updateClaudeSubscriptionTier;
export const activateCoder1Pro = backend.activateCoder1Pro;
export const deactivateCoder1Pro = backend.deactivateCoder1Pro;

// Stripe functions
export const getUserByStripeCustomerId = backend.getUserByStripeCustomerId;
export const updateUserStripeCustomerId = backend.updateUserStripeCustomerId;

// Team functions
export const createTeam = backend.createTeam;
export const getTeamById = backend.getTeamById;
export const getTeamBySlug = backend.getTeamBySlug;
export const getUserTeams = backend.getUserTeams;
export const addTeamMember = backend.addTeamMember;
export const removeTeamMember = backend.removeTeamMember;
export const deleteTeam = backend.deleteTeam;
export const getTeamMembers = backend.getTeamMembers;
export const createTeamInvitation = backend.createTeamInvitation;
export const getPendingInvitations = backend.getPendingInvitations;
export const getTeamInvitationByToken = backend.getTeamInvitationByToken;
export const acceptTeamInvitation = backend.acceptTeamInvitation;

// Log which backend is active (only once at startup)
if (typeof window === 'undefined') {
  console.log(`[Auth] Using ${AUTH_BACKEND.toUpperCase()} backend`);
}
