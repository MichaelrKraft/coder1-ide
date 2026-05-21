// Module-level active meetings map — resets on server restart (acceptable for Phase 3)
// meetingId → { userId, pendingRunIds }
export const activeMeetings = new Map<string, { userId: string; pendingRunIds: Set<string> }>();

// runId → { meetingId, agentId, userId } for server.js agent:complete hook
export const runToMeeting = new Map<string, { meetingId: string; agentId: string; userId: string }>();

export function registerMeetingRun(meetingId: string, runId: string, agentId: string, userId: string): void {
  runToMeeting.set(runId, { meetingId, agentId, userId });
  const meeting = activeMeetings.get(meetingId);
  if (meeting) meeting.pendingRunIds.add(runId);
}

export function completeMeetingRun(runId: string): { meetingId: string; agentId: string; userId: string } | null {
  const entry = runToMeeting.get(runId);
  if (!entry) return null;
  runToMeeting.delete(runId);
  const meeting = activeMeetings.get(entry.meetingId);
  if (meeting) {
    meeting.pendingRunIds.delete(runId);
    if (meeting.pendingRunIds.size === 0) {
      activeMeetings.delete(entry.meetingId);
    }
  }
  return entry;
}

export function isMeetingActive(userId: string): boolean {
  for (const [, meeting] of activeMeetings) {
    if (meeting.userId === userId) return true;
  }
  return false;
}

export function getMeetingIdForUser(userId: string): string | null {
  for (const [meetingId, meeting] of activeMeetings) {
    if (meeting.userId === userId) return meetingId;
  }
  return null;
}
