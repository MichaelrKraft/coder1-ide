'use client';

interface TeamFact {
  fact_key: string;
  fact_value: string;
  fact_type: string;
  contributed_by_name: string;
  contributor_count: number;
}

/**
 * Generate a welcome briefing for a new team member.
 * Called after first successful team sync pull.
 * Gated by hasReceivedBriefing-{teamId} in localStorage.
 */
export function generateWelcomeBriefing(teamId: string, facts: TeamFact[]): string | null {
  // Check if already received (keyed by teamId)
  const key = `hasReceivedBriefing-${teamId}`;
  if (typeof window !== 'undefined' && localStorage.getItem(key)) {
    return null;
  }

  // Only fire if there are facts
  if (facts.length === 0) {
    // Still mark as received to prevent retries
    if (typeof window !== 'undefined') localStorage.setItem(key, 'true');
    return null;
  }

  // Group facts by type
  const architecture = facts.filter(f => f.fact_type === 'technical' || f.fact_type === 'project');
  const patterns = facts.filter(f => f.fact_type === 'preference');
  const confirmedFacts = facts.filter(f => f.contributor_count >= 3);

  // Get unique contributors
  const contributors = new Set(facts.map(f => f.contributed_by_name).filter(Boolean));

  let briefing = `Welcome to the team! Based on your team's collective knowledge:\n\n`;

  if (architecture.length > 0) {
    briefing += `**Architecture & Technical:**\n`;
    for (const fact of architecture.slice(0, 5)) {
      briefing += `- ${fact.fact_key}: ${fact.fact_value}\n`;
    }
    briefing += '\n';
  }

  if (patterns.length > 0) {
    briefing += `**Key patterns your team has documented:**\n`;
    for (const fact of patterns.slice(0, 5)) {
      briefing += `- ${fact.fact_key}: ${fact.fact_value}\n`;
    }
    briefing += '\n';
  }

  if (confirmedFacts.length > 0) {
    briefing += `**Team-confirmed facts:**\n`;
    for (const fact of confirmedFacts.slice(0, 3)) {
      briefing += `- ${fact.fact_key}: ${fact.fact_value} (confirmed by ${fact.contributor_count} members)\n`;
    }
    briefing += '\n';
  }

  briefing += `${contributors.size} team members have contributed ${facts.length} insights. Ask me anything about this codebase.`;

  // Mark as received
  if (typeof window !== 'undefined') localStorage.setItem(key, 'true');

  // Emit event for Johnny5 chat panel to display
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('johnny5:teamWelcome', { detail: { briefing } }));
  }

  return briefing;
}

export function resetWelcomeBriefing(teamId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(`hasReceivedBriefing-${teamId}`);
  }
}
