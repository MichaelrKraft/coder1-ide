import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

// =============================================
// Supabase Client Singleton
// =============================================

let supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) throw new Error('Supabase not configured: SUPABASE_URL and SUPABASE_SERVICE_KEY required');
    supabase = createClient(url, key);
  }
  return supabase;
}

// =============================================
// Types (copied from db.ts for compatibility)
// =============================================

export interface User {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  subscription_tier: 'free' | 'pro' | 'team';
  subscription_status: 'active' | 'cancelled' | 'past_due';
  stripe_customer_id?: string;
  email_verified: boolean;
  claude_subscription_tier: 'free' | 'pro' | 'max';
  coder1_pro_active: boolean;
  johnny5_message_count: number;
  message_count_reset_at: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface CreateUserInput {
  email: string;
  username: string;
  password_hash: string;
}

export interface AuthSession {
  id: string;
  user_id: string;
  token: string;
  refresh_token: string;
  expires_at: string;
  created_at: string;
  last_used: string;
  user_agent?: string;
  ip_address?: string;
}

export interface CreateSessionInput {
  user_id: string;
  token: string;
  refresh_token: string;
  expires_at: Date;
  user_agent?: string;
  ip_address?: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  files_data?: string;
  thumbnail?: string;
  is_public: boolean;
  last_opened?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectInput {
  user_id: string;
  name: string;
  description?: string;
  files_data?: string;
}

export interface UsageMetric {
  id: string;
  user_id: string;
  action_type: string;
  action_details?: string;
  timestamp: string;
}

export interface OAuthAccount {
  id: string;
  user_id: string;
  provider: string;
  provider_account_id: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  token_type?: string;
  scope?: string;
  id_token?: string;
  session_state?: string;
  created_at: string;
  updated_at: string;
}

export interface Johnny5Quota {
  messageCount: number;
  limit: number;
  tierType: 'gemini_trial' | 'claude_trial' | 'pro_unlimited';
  remaining: number;
  resetDate: string;
  isProSubscriber: boolean;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  invited_by: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  created_at: string;
}

// =============================================
// User Operations (5)
// =============================================

export async function createUser(input: CreateUserInput): Promise<User> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('users')
    .insert({
      email: input.email,
      username: input.username,
      password_hash: input.password_hash,
    })
    .select()
    .single();

  if (error) throw error;
  return data as User;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return (data as User) ?? undefined;
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as User) ?? undefined;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as User) ?? undefined;
}

export async function updateLastLogin(userId: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('users')
    .update({ last_login: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw error;
}

// =============================================
// Session Operations (5)
// =============================================

export async function createSession(input: CreateSessionInput): Promise<AuthSession> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('auth_sessions')
    .insert({
      user_id: input.user_id,
      token: input.token,
      refresh_token: input.refresh_token,
      expires_at: input.expires_at.toISOString(),
      user_agent: input.user_agent,
      ip_address: input.ip_address,
    })
    .select()
    .single();

  if (error) throw error;
  return data as AuthSession;
}

export async function getSessionByToken(token: string): Promise<AuthSession | undefined> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('auth_sessions')
    .select('*')
    .eq('token', token)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as AuthSession) ?? undefined;
}

export async function refreshSessionToken(
  refreshToken: string,
  newAccessToken: string,
  newExpiresAt: Date
): Promise<AuthSession | undefined> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('auth_sessions')
    .update({
      token: newAccessToken,
      expires_at: newExpiresAt.toISOString(),
    })
    .eq('refresh_token', refreshToken)
    .select()
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as AuthSession) ?? undefined;
}

export async function deleteSession(token: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('auth_sessions')
    .delete()
    .eq('token', token);

  if (error) throw error;
}

export async function deleteUserSessions(userId: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('auth_sessions')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}

// =============================================
// Project Operations (5)
// =============================================

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('projects')
    .insert({
      user_id: input.user_id,
      name: input.name,
      description: input.description,
      files_data: input.files_data,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Project;
}

export async function getUserProjects(userId: string): Promise<Project[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('last_opened', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as Project[]) ?? [];
}

export async function getProjectById(id: string, userId: string): Promise<Project | undefined> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as Project) ?? undefined;
}

export async function updateProject(id: string, userId: string, updates: Partial<Project>): Promise<void> {
  const allowedFields = Object.entries(updates)
    .filter(([key]) => key !== 'id' && key !== 'user_id')
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {} as Record<string, unknown>);

  if (Object.keys(allowedFields).length === 0) return;

  const client = getSupabaseClient();
  const { error } = await client
    .from('projects')
    .update(allowedFields)
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function deleteProject(id: string, userId: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

// =============================================
// OAuth Operations (2)
// =============================================

export async function findOrCreateOAuthUser(
  provider: string,
  providerId: string,
  email: string,
  _name: string
): Promise<User> {
  const client = getSupabaseClient();

  // Check if OAuth account already exists
  const { data: existingOAuth, error: oauthError } = await client
    .from('oauth_accounts')
    .select('user_id')
    .eq('provider', provider)
    .eq('provider_account_id', providerId)
    .single();

  if (oauthError && oauthError.code !== 'PGRST116') throw oauthError;

  if (existingOAuth) {
    const user = await getUserById(existingOAuth.user_id);
    if (user) {
      await updateLastLogin(user.id);
      return user;
    }
  }

  // Check if user exists with same email
  const existingUser = await getUserByEmail(email);

  if (existingUser) {
    await linkOAuthAccount({
      user_id: existingUser.id,
      provider,
      provider_account_id: providerId,
    });
    await updateLastLogin(existingUser.id);
    return existingUser;
  }

  // Create new user with OAuth
  const username = email.split('@')[0] + '_' + Math.random().toString(36).substr(2, 5);

  const { data: newUser, error: userError } = await client
    .from('users')
    .insert({
      email,
      username,
      password_hash: 'oauth_no_password_' + Math.random().toString(36),
      email_verified: true,
    })
    .select()
    .single();

  if (userError) throw userError;

  await linkOAuthAccount({
    user_id: newUser.id,
    provider,
    provider_account_id: providerId,
  });

  return newUser as User;
}

export async function linkOAuthAccount(account: {
  user_id: string;
  provider: string;
  provider_account_id: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: Date;
  scope?: string;
  id_token?: string;
}): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('oauth_accounts')
    .upsert(
      {
        user_id: account.user_id,
        provider: account.provider,
        provider_account_id: account.provider_account_id,
        access_token: account.access_token,
        refresh_token: account.refresh_token,
        expires_at: account.expires_at?.toISOString(),
        scope: account.scope,
        id_token: account.id_token,
      },
      { onConflict: 'provider,provider_account_id' }
    );

  if (error) throw error;
}

// =============================================
// Johnny5 Quota Operations (6)
// =============================================

const GEMINI_TRIAL_LIMIT = parseInt(process.env.JOHNNY5_GEMINI_LIMIT || '50', 10);
const CLAUDE_TRIAL_LIMIT = parseInt(process.env.JOHNNY5_CLAUDE_TRIAL_LIMIT || '100', 10);

export async function getJohnny5Quota(userId: string): Promise<Johnny5Quota | null> {
  // Developer bypass
  if (process.env.JOHNNY5_DEV_UNLIMITED === 'true') {
    return {
      messageCount: 0,
      limit: Infinity,
      remaining: Infinity,
      isProSubscriber: true,
      tierType: 'pro_unlimited',
      resetDate: new Date().toISOString(),
    };
  }

  const client = getSupabaseClient();
  const { data: user, error } = await client
    .from('users')
    .select('claude_subscription_tier, coder1_pro_active, johnny5_message_count, message_count_reset_at')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!user) return null;

  // Check if we need to reset the counter (monthly reset)
  const resetDate = new Date(user.message_count_reset_at);
  const now = new Date();
  const monthDiff = (now.getFullYear() - resetDate.getFullYear()) * 12 + (now.getMonth() - resetDate.getMonth());

  let messageCount = user.johnny5_message_count;
  if (monthDiff >= 1) {
    await resetJohnny5MessageCount(userId);
    messageCount = 0;
  }

  const isProSubscriber = user.coder1_pro_active === true;
  const hasClaudeSubscription = user.claude_subscription_tier === 'pro' || user.claude_subscription_tier === 'max';

  let tierType: 'gemini_trial' | 'claude_trial' | 'pro_unlimited';
  let limit: number;

  if (isProSubscriber) {
    tierType = 'pro_unlimited';
    limit = Infinity;
  } else if (hasClaudeSubscription) {
    tierType = 'claude_trial';
    limit = CLAUDE_TRIAL_LIMIT;
  } else {
    tierType = 'gemini_trial';
    limit = GEMINI_TRIAL_LIMIT;
  }

  const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    messageCount,
    limit,
    tierType,
    remaining: Math.max(0, limit - messageCount),
    resetDate: nextReset.toISOString(),
    isProSubscriber,
  };
}

export async function incrementJohnny5MessageCount(userId: string): Promise<number> {
  const client = getSupabaseClient();

  // Supabase doesn't support atomic increment+return in one call,
  // so we use an RPC or a read-then-write pattern.
  // Using rpc if available, otherwise fallback to read+write.
  const { data: user, error: readError } = await client
    .from('users')
    .select('johnny5_message_count')
    .eq('id', userId)
    .single();

  if (readError) throw readError;

  const newCount = (user?.johnny5_message_count ?? 0) + 1;

  const { error: updateError } = await client
    .from('users')
    .update({ johnny5_message_count: newCount })
    .eq('id', userId);

  if (updateError) throw updateError;
  return newCount;
}

export async function resetJohnny5MessageCount(userId: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('users')
    .update({
      johnny5_message_count: 0,
      message_count_reset_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw error;
}

export async function updateClaudeSubscriptionTier(userId: string, tier: 'free' | 'pro' | 'max'): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('users')
    .update({ claude_subscription_tier: tier })
    .eq('id', userId);

  if (error) throw error;
}

export async function activateCoder1Pro(userId: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('users')
    .update({ coder1_pro_active: true })
    .eq('id', userId);

  if (error) throw error;
}

export async function deactivateCoder1Pro(userId: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('users')
    .update({ coder1_pro_active: false })
    .eq('id', userId);

  if (error) throw error;
}

// =============================================
// Stripe Operations (1)
// =============================================

export async function getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('stripe_customer_id', stripeCustomerId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as User) ?? undefined;
}

export async function updateUserStripeCustomerId(userId: string, stripeCustomerId: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('users')
    .update({ stripe_customer_id: stripeCustomerId })
    .eq('id', userId);

  if (error) throw error;
}

// =============================================
// Team Operations (9 + 2 invitation = 11)
// =============================================

export async function createTeam(name: string, slug: string, ownerId: string): Promise<Team> {
  const client = getSupabaseClient();

  const { data: team, error: teamError } = await client
    .from('teams')
    .insert({ name, slug, owner_id: ownerId })
    .select()
    .single();

  if (teamError) throw teamError;

  // Add owner as team member with 'owner' role
  const { error: memberError } = await client
    .from('team_members')
    .insert({ team_id: team.id, user_id: ownerId, role: 'owner' });

  if (memberError) throw memberError;

  return team as Team;
}

export async function getTeamById(id: string): Promise<Team | undefined> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('teams')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as Team) ?? undefined;
}

export async function getTeamBySlug(slug: string): Promise<Team | undefined> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('teams')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as Team) ?? undefined;
}

export async function getUserTeams(userId: string): Promise<Team[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId);

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const teamIds = data.map((m) => m.team_id);
  const { data: teams, error: teamsError } = await client
    .from('teams')
    .select('*')
    .in('id', teamIds)
    .order('updated_at', { ascending: false });

  if (teamsError) throw teamsError;
  return (teams as Team[]) ?? [];
}

export async function addTeamMember(teamId: string, userId: string, role: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('team_members')
    .insert({ team_id: teamId, user_id: userId, role });

  if (error) throw error;
}

export async function removeTeamMember(teamId: string, userId: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function deleteTeam(teamId: string): Promise<void> {
  const client = getSupabaseClient();

  // Clean up knowledge facts (may not exist)
  await client
    .from('team_knowledge_facts')
    .delete()
    .eq('team_id', teamId);

  // Delete team (CASCADE should handle members and invitations)
  const { error } = await client
    .from('teams')
    .delete()
    .eq('id', teamId);

  if (error) throw error;
}

export async function getTeamMembers(teamId: string): Promise<(User & { role: string })[]> {
  const client = getSupabaseClient();

  // Get team members with their roles
  const { data: members, error: membersError } = await client
    .from('team_members')
    .select('user_id, role')
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true });

  if (membersError) throw membersError;
  if (!members || members.length === 0) return [];

  const userIds = members.map((m) => m.user_id);
  const { data: users, error: usersError } = await client
    .from('users')
    .select('*')
    .in('id', userIds);

  if (usersError) throw usersError;
  if (!users) return [];

  // Merge user data with role
  const roleMap = new Map(members.map((m) => [m.user_id, m.role]));
  return users.map((u) => ({
    ...(u as User),
    role: roleMap.get(u.id) ?? 'member',
  }));
}

export async function createTeamInvitation(teamId: string, email: string, invitedBy: string): Promise<TeamInvitation> {
  const client = getSupabaseClient();

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await client
    .from('team_invitations')
    .insert({
      team_id: teamId,
      email,
      invited_by: invitedBy,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data as TeamInvitation;
}

export async function getTeamInvitationByToken(token: string): Promise<TeamInvitation | undefined> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('team_invitations')
    .select('*')
    .eq('token', token)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as TeamInvitation) ?? undefined;
}

export async function acceptTeamInvitation(token: string, userId: string): Promise<void> {
  const client = getSupabaseClient();

  // Fetch the invitation
  const { data: invitation, error: fetchError } = await client
    .from('team_invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single();

  if (fetchError || !invitation) {
    throw new Error('Invalid or expired invitation');
  }

  // Mark as accepted
  const { error: updateError } = await client
    .from('team_invitations')
    .update({ status: 'accepted' })
    .eq('id', invitation.id);

  if (updateError) throw updateError;

  // Add user as team member
  await addTeamMember(invitation.team_id, userId, 'member');
}

// =============================================
// Usage Tracking (2)
// =============================================

export async function trackUsage(userId: string, actionType: string, details?: unknown): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('usage_metrics')
    .insert({
      user_id: userId,
      action_type: actionType,
      action_details: details ? JSON.stringify(details) : null,
    });

  if (error) throw error;
}

export async function getUserUsageCount(userId: string, actionType: string, since: Date): Promise<number> {
  const client = getSupabaseClient();
  const { count, error } = await client
    .from('usage_metrics')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action_type', actionType)
    .gte('timestamp', since.toISOString());

  if (error) throw error;
  return count ?? 0;
}

// =============================================
// Compatibility Alias
// =============================================

/**
 * Alias for getSupabaseClient - maintains compatibility with code
 * that imports getAuthDatabase from lib/auth
 */
export const getAuthDatabase = getSupabaseClient;
