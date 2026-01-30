'use client';

import React from 'react';
import {
  User,
  Briefcase,
  Globe,
  Target,
  Zap,
  Clock,
  Edit3,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import type { UserProfile } from '@/services/johnny5/capability-matcher';

interface UserProfileSummaryProps {
  profile: UserProfile;
  onEdit?: () => void;
  className?: string;
}

/**
 * UserProfileSummary - Shows what Johnny5 knows about the user
 *
 * Displays the user profile in a friendly, scannable format with:
 * - Roles (what they do)
 * - Platforms (where they create)
 * - Projects (what they're building)
 * - Goals (what they want to achieve)
 * - Preferences (how Johnny5 should behave)
 */
export default function UserProfileSummary({
  profile,
  onEdit,
  className = '',
}: UserProfileSummaryProps) {
  // Format role names for display
  const formatRole = (role: string) => {
    const roleLabels: Record<string, string> = {
      founder: 'Founder',
      developer: 'Developer',
      creator: 'Content Creator',
      marketer: 'Marketer',
      designer: 'Designer',
      product: 'Product Manager',
    };
    return roleLabels[role] || role;
  };

  // Format platform names for display
  const formatPlatform = (platform: string) => {
    const platformLabels: Record<string, string> = {
      youtube: 'YouTube',
      twitter: 'X / Twitter',
      newsletter: 'Newsletter',
      linkedin: 'LinkedIn',
      tiktok: 'TikTok',
      github: 'GitHub',
      substack: 'Substack',
    };
    return platformLabels[platform] || platform;
  };

  // Format proactivity level
  const formatProactivity = (level: 'low' | 'medium' | 'high') => {
    const labels: Record<string, { label: string; color: string }> = {
      low: { label: 'Conservative', color: 'text-blue-400' },
      medium: { label: 'Balanced', color: 'text-coder1-cyan' },
      high: { label: 'Autonomous', color: 'text-amber-400' },
    };
    return labels[level];
  };

  const proactivity = formatProactivity(profile.preferences.proactivityLevel);

  return (
    <div
      className={`
        bg-gradient-to-br from-bg-secondary to-bg-tertiary
        rounded-xl border border-border-default
        overflow-hidden
        ${className}
      `}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default bg-bg-secondary/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-coder1-cyan/20 flex items-center justify-center">
            <User className="w-4 h-4 text-coder1-cyan" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">
              Your Profile
            </h3>
            <p className="text-[10px] text-text-muted">
              What Johnny5 knows about you
            </p>
          </div>
        </div>

        {onEdit && (
          <button
            onClick={onEdit}
            className="
              flex items-center gap-1 px-2 py-1 rounded-md
              text-xs text-text-muted hover:text-coder1-cyan
              hover:bg-coder1-cyan/10 transition-all
            "
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Roles */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Briefcase className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-semibold text-text-secondary">
              You are a
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.roles.map((role) => (
              <span
                key={role}
                className="
                  px-2 py-1 rounded-md text-xs font-medium
                  bg-purple-500/20 text-purple-300 border border-purple-500/30
                "
              >
                {formatRole(role)}
              </span>
            ))}
          </div>
        </div>

        {/* Platforms */}
        {profile.platforms.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-semibold text-text-secondary">
                Active on
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.platforms.map((platform) => (
                <span
                  key={platform}
                  className="
                    px-2 py-1 rounded-md text-xs font-medium
                    bg-blue-500/20 text-blue-300 border border-blue-500/30
                  "
                >
                  {formatPlatform(platform)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        {profile.projects.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-text-secondary">
                Currently building
              </span>
            </div>
            <ul className="space-y-1">
              {profile.projects.map((project, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-2 text-xs text-text-primary"
                >
                  <CheckCircle className="w-3 h-3 text-amber-400" />
                  {project}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Goals */}
        {profile.goals.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Target className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs font-semibold text-text-secondary">
                Goals
              </span>
            </div>
            <ul className="space-y-1">
              {profile.goals.map((goal, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs text-text-primary"
                >
                  <span className="w-4 h-4 rounded-full bg-green-500/20 text-[9px] font-bold text-green-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  {goal}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Preferences */}
        <div className="pt-3 border-t border-border-default">
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className="w-3.5 h-3.5 text-coder1-cyan" />
            <span className="text-xs font-semibold text-text-secondary">
              Preferences
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {/* Proactivity */}
            <div className="p-2 rounded-lg bg-bg-tertiary">
              <p className="text-[10px] text-text-muted mb-0.5">Proactivity</p>
              <p className={`text-xs font-semibold ${proactivity.color}`}>
                {proactivity.label}
              </p>
            </div>

            {/* Working Hours */}
            {profile.preferences.workingHours && (
              <div className="p-2 rounded-lg bg-bg-tertiary">
                <p className="text-[10px] text-text-muted mb-0.5">Work Hours</p>
                <p className="text-xs font-semibold text-text-primary flex items-center gap-1">
                  <Clock className="w-3 h-3 text-text-muted" />
                  {profile.preferences.workingHours.start} -{' '}
                  {profile.preferences.workingHours.end}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Source indicator */}
        <div className="pt-2 text-[10px] text-text-muted text-center">
          Profile {profile.extractedFrom === 'conversation' ? 'learned from conversations' : profile.extractedFrom === 'manual' ? 'set manually' : 'imported from integrations'}
        </div>
      </div>
    </div>
  );
}
