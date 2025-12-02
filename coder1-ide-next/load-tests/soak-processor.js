/**
 * Artillery Processor for Memory Soak Tests
 * Provides utilities for long-running memory leak detection
 */

// Track memory stats across the test run
let memorySnapshots = [];
const MAX_SNAPSHOTS = 100;

module.exports = {
  /**
   * Take a memory snapshot at regular intervals
   */
  takeMemorySnapshot: function(userContext, events, done) {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      const snapshot = {
        timestamp: Date.now(),
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
        external: Math.round(usage.external / 1024 / 1024),
        rss: Math.round(usage.rss / 1024 / 1024)
      };

      memorySnapshots.push(snapshot);

      // Keep only last MAX_SNAPSHOTS to avoid memory growth in the test itself
      if (memorySnapshots.length > MAX_SNAPSHOTS) {
        memorySnapshots.shift();
      }

      // Emit custom metrics
      events.emit('customStat', { stat: 'heap_used_mb', value: snapshot.heapUsed });
      events.emit('customStat', { stat: 'rss_mb', value: snapshot.rss });
    }
    return done();
  },

  /**
   * Generate a random large-ish payload to test memory handling
   */
  generateLargePayload: function(userContext, events, done) {
    // Generate ~1KB of random data
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let payload = '';
    for (let i = 0; i < 1024; i++) {
      payload += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    userContext.vars.largePayload = payload;
    return done();
  },

  /**
   * Before scenario hook - generate unique IDs
   */
  beforeScenario: function(userContext, events, done) {
    userContext.vars.scenarioId = `${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
    userContext.vars.scenarioStartTime = Date.now();
    return done();
  },

  /**
   * After scenario hook - calculate metrics
   */
  afterScenario: function(userContext, events, done) {
    const duration = Date.now() - userContext.vars.scenarioStartTime;
    events.emit('customStat', {
      stat: 'soak_scenario_duration_ms',
      value: duration
    });
    return done();
  },

  /**
   * Generate analysis of memory trend
   * Call this at end of test to see if memory is growing
   */
  analyzeMemoryTrend: function() {
    if (memorySnapshots.length < 2) {
      return { trend: 'insufficient_data', snapshots: memorySnapshots.length };
    }

    const first = memorySnapshots[0];
    const last = memorySnapshots[memorySnapshots.length - 1];

    const heapGrowth = last.heapUsed - first.heapUsed;
    const rssGrowth = last.rss - first.rss;
    const duration = last.timestamp - first.timestamp;
    const durationMinutes = duration / 1000 / 60;

    // Calculate growth rate per minute
    const heapGrowthPerMinute = heapGrowth / durationMinutes;
    const rssGrowthPerMinute = rssGrowth / durationMinutes;

    return {
      trend: heapGrowthPerMinute > 5 ? 'MEMORY_LEAK_SUSPECTED' : 'STABLE',
      heapGrowthMB: heapGrowth,
      rssGrowthMB: rssGrowth,
      durationMinutes: Math.round(durationMinutes * 10) / 10,
      heapGrowthPerMinuteMB: Math.round(heapGrowthPerMinute * 100) / 100,
      rssGrowthPerMinuteMB: Math.round(rssGrowthPerMinute * 100) / 100,
      snapshotCount: memorySnapshots.length,
      firstSnapshot: first,
      lastSnapshot: last
    };
  },

  /**
   * Get all memory snapshots (for post-test analysis)
   */
  getMemorySnapshots: function() {
    return [...memorySnapshots];
  },

  /**
   * Reset memory tracking (for fresh test runs)
   */
  resetMemoryTracking: function(userContext, events, done) {
    memorySnapshots = [];
    return done();
  }
};
