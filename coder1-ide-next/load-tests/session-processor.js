/**
 * Artillery Processor for Session Stress Tests
 * Provides custom functions and hooks for load testing scenarios
 */

module.exports = {
  /**
   * Generate a random alphanumeric string
   */
  $randomString: function(length = 8) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Before request hook - adds trace context
   */
  addTraceContext: function(requestParams, context, ee, next) {
    if (requestParams.data) {
      requestParams.data._trace = {
        traceId: `trace_load_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        operation: 'load-test',
        startTime: Date.now()
      };
    }
    return next();
  },

  /**
   * After response hook - logs response metrics
   */
  logResponse: function(requestParams, response, context, ee, next) {
    if (context.vars.debug) {
      console.log(`[LOAD-TEST] Response from ${requestParams.channel}:`,
        JSON.stringify(response).substring(0, 200));
    }
    return next();
  },

  /**
   * Generate unique session ID with prefix
   */
  generateSessionId: function(userContext, events, done) {
    const prefix = userContext.vars.sessionPrefix || 'load';
    userContext.vars.sessionId = `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
    return done();
  },

  /**
   * Track session creation time
   */
  trackSessionStart: function(userContext, events, done) {
    userContext.vars.sessionStartTime = Date.now();
    return done();
  },

  /**
   * Calculate session duration
   */
  trackSessionEnd: function(userContext, events, done) {
    if (userContext.vars.sessionStartTime) {
      const duration = Date.now() - userContext.vars.sessionStartTime;
      events.emit('customStat', { stat: 'session_duration_ms', value: duration });
    }
    return done();
  }
};
