import { redirect } from 'next/navigation';

/**
 * Landing Page Version Switcher
 *
 * Set LANDING_VERSION environment variable to switch:
 *   - "1" or "alpha"    → /alpha (Version 1: "The only IDE built for Claude Code users")
 *   - "2" or "alpha-v2" → /alpha-v2 (Version 2: "You've Heard Of J5")
 *   - "3" or "alpha-v3" → /alpha-v3 (Version 3: "Build Software While You Sleep")
 *
 * Default: Version 1
 *
 * To switch in production, update .env.local:
 *   LANDING_VERSION=3
 */
export default function HomePage() {
  const version = process.env.LANDING_VERSION || '1';

  const versionMap: Record<string, string> = {
    '1': '/alpha',
    'alpha': '/alpha',
    '2': '/alpha-v2',
    'alpha-v2': '/alpha-v2',
    '3': '/alpha-v3',
    'alpha-v3': '/alpha-v3',
    // Team-focused landing pages (Time Capsules included)
    'team-v1': '/landing-team-v1',
    'team-v2': '/landing-team-v2',
    'team-v3': '/landing-team-v3',
  };

  const landingPath = versionMap[version] || '/alpha';
  redirect(landingPath);
}