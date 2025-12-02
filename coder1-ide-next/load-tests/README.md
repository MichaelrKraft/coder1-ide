# Load Testing Suite for Coder1 Multi-Agent System

This directory contains Artillery-based load tests for the Coder1 IDE multi-agent system.

## Overview

The load testing suite validates:
- **Session Stress Testing**: Terminal session creation, usage, and cleanup under load
- **Agent Spawn Testing**: Multi-agent team spawning and coordination
- **Memory Soak Testing**: Long-running tests to detect memory leaks

## Quick Start

### 1. Install Artillery
```bash
npm run load:install
# Or manually:
npm install --save-dev artillery artillery-engine-socketio-v3
```

### 2. Start the Server
```bash
npm run dev
```

### 3. Run Tests

#### Quick Health Check
```bash
npm run load:quick
```

#### Session Stress Test
```bash
npm run load:session
```

#### Agent Spawn Test
```bash
npm run load:agent
```

#### Memory Soak Test (15+ minutes)
```bash
npm run load:soak
```

#### All Tests
```bash
npm run load:all
```

#### Generate HTML Report
```bash
npm run load:report
```

## Test Descriptions

### Session Stress Test (`session-stress.yml`)
Tests the system's ability to handle multiple concurrent terminal sessions.

**Phases:**
1. Warm-up (15s, 2 users/sec)
2. Moderate Load (30s, 5 users/sec)
3. Peak Burst (15s, 15 users/sec)
4. Cool Down (15s, 3 users/sec)

**Scenarios:**
- Standard session lifecycle (create → use → destroy)
- Rapid session lifecycle (quick create/destroy)
- Long-running sessions with activity

### Agent Spawn Test (`agent-spawn.yml`)
Tests multi-agent team spawning and coordination.

**Phases:**
1. Light Load (20s, 1 user/sec)
2. Moderate Load (40s, 3 users/sec)
3. Stress Test (20s, 5 users/sec)

**Scenarios:**
- Full team spawn (3 agents: frontend, backend, architect)
- Single agent lifecycle
- Large team spawn (6 agents)

### Memory Soak Test (`memory-soak.yml`)
Long-running test to identify memory leaks.

**Duration:** 15 minutes total
**Phases:** 3 sustained load phases at increasing rates

**Scenarios:**
- Standard session lifecycle
- Agent creation/destruction cycles
- Rapid reconnection patterns
- Long-lived sessions
- Concurrent sessions

## Distributed Tracing Integration

All tests include trace context in their payloads:

```yaml
_trace:
  traceId: "trace_load_{{ $timestamp }}_{{ $randomString(6) }}"
  operation: "load:test:operation"
```

This enables correlation between load test requests and server-side logs.

## Performance Thresholds

| Test | P99 Latency | Median Latency | Max Error Rate |
|------|-------------|----------------|----------------|
| Session | 3000ms | 1000ms | 10% |
| Agent | 5000ms | 2000ms | 15% |
| Soak | 10000ms | N/A | 5% |

## CI/CD Integration

Load tests run automatically:
- **Weekly**: Sunday at 3am UTC (session + agent tests)
- **On Push**: When load-test files change
- **Manual**: Via GitHub Actions workflow dispatch

See `.github/workflows/load-test.yml` for details.

## Custom Processors

### `session-processor.js`
- `$randomString(length)`: Generate random alphanumeric strings
- `addTraceContext`: Add trace headers to requests
- `generateSessionId`: Create unique session IDs
- `trackSessionStart/End`: Measure session duration

### `agent-processor.js`
- `generateTraceId`: Create workflow trace IDs
- `$randomRole`: Get random agent role
- `trackTeamSpawnStart/End`: Measure team spawn duration

### `soak-processor.js`
- `takeMemorySnapshot`: Record memory usage
- `analyzeMemoryTrend`: Detect memory leaks
- `generateLargePayload`: Test memory handling

## Viewing Results

### Console Output
Artillery provides real-time metrics during test execution.

### JSON Reports
```bash
npx artillery run --output report.json load-tests/session-stress.yml
```

### HTML Reports
```bash
npx artillery report report.json
```

## Troubleshooting

### Connection Refused
Ensure the server is running on port 3001:
```bash
curl http://localhost:3001/api/health
```

### Socket.IO Errors
Check WebSocket connectivity:
```bash
wscat -c ws://localhost:3001/socket.io/?EIO=4&transport=websocket
```

### Memory Issues
Monitor server memory during soak tests:
```bash
watch -n 5 'curl -s localhost:3001/api/health | jq .memory'
```

## Best Practices

1. **Baseline First**: Run tests before changes to establish baseline
2. **Isolated Environment**: Run load tests on dedicated test environments
3. **Monitor Server**: Watch server logs and memory during tests
4. **Incremental Load**: Start with low load and gradually increase
5. **Repeat Tests**: Run multiple times to account for variance
