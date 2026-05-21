export const FLAGS = {
  schedulerEnabled: process.env.SCHEDULER_ENABLED === 'true',
  warRoomEnabled: process.env.WARROOM_TEXT_ENABLED === 'true',
  autoAssignEnabled: process.env.MISSION_AUTO_ASSIGN_ENABLED === 'true',
  llmSpawnEnabled: process.env.LLM_SPAWN_ENABLED !== 'false',
  exfilGuardEnabled: process.env.EXFIL_GUARD_ENABLED !== 'false',
} as const;

export type FeatureFlags = typeof FLAGS;
