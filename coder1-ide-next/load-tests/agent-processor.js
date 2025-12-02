/**
 * Artillery Processor for Agent Spawn Load Tests
 * Provides custom functions for multi-agent system testing
 */

const roles = ['frontend', 'backend', 'architect', 'devops', 'qa', 'security'];

module.exports = {
  /**
   * Generate a trace ID for the entire workflow
   */
  generateTraceId: function(userContext, events, done) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    userContext.vars.traceId = `trace_load_${timestamp}_${random}`;
    return done();
  },

  /**
   * Get a random agent role
   */
  $randomRole: function() {
    return roles[Math.floor(Math.random() * roles.length)];
  },

  /**
   * Track team spawn start time
   */
  trackTeamSpawnStart: function(userContext, events, done) {
    userContext.vars.teamSpawnStart = Date.now();
    return done();
  },

  /**
   * Calculate and emit team spawn duration
   */
  trackTeamSpawnEnd: function(userContext, events, done) {
    if (userContext.vars.teamSpawnStart) {
      const duration = Date.now() - userContext.vars.teamSpawnStart;
      events.emit('customStat', { stat: 'team_spawn_duration_ms', value: duration });
    }
    return done();
  },

  /**
   * Generate unique team ID
   */
  generateTeamId: function(userContext, events, done) {
    userContext.vars.teamId = `team-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
    return done();
  },

  /**
   * Before scenario hook - setup common variables
   */
  beforeScenario: function(userContext, events, done) {
    userContext.vars.scenarioStartTime = Date.now();
    userContext.vars.agentCount = 0;
    return done();
  },

  /**
   * After scenario hook - cleanup and metrics
   */
  afterScenario: function(userContext, events, done) {
    const duration = Date.now() - userContext.vars.scenarioStartTime;
    events.emit('customStat', { stat: 'scenario_duration_ms', value: duration });

    if (userContext.vars.agentCount > 0) {
      events.emit('customStat', {
        stat: 'avg_time_per_agent_ms',
        value: Math.round(duration / userContext.vars.agentCount)
      });
    }

    return done();
  },

  /**
   * Increment agent count
   */
  incrementAgentCount: function(userContext, events, done) {
    userContext.vars.agentCount = (userContext.vars.agentCount || 0) + 1;
    return done();
  }
};
