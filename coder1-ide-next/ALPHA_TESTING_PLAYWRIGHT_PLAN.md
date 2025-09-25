# 🎭 Coder1 Alpha Testing - Comprehensive Playwright Test Plan

## 🎯 Executive Summary

This comprehensive testing plan validates the complete end-user experience for Coder1 IDE alpha launch, focusing on:
- Bridge CLI installation and pairing process
- IDE functionality and user workflows
- End-to-end Claude Code integration
- Cross-platform compatibility testing

## 📋 Test Coverage Overview

### 1. End-User Installation Testing
- ✅ Bridge CLI installation from npm
- ✅ Local IDE startup and accessibility 
- ✅ Bridge pairing code generation and connection
- ✅ Claude CLI detection and validation

### 2. Core IDE Functionality
- ✅ Monaco Editor integration and file operations
- ✅ Terminal PTY functionality with session management
- ✅ File explorer and project navigation
- ✅ WebSocket stability and real-time updates

### 3. Claude Code Bridge Integration
- ✅ Command execution through bridge
- ✅ Response streaming and output capture
- ✅ Session persistence and reconnection
- ✅ Error handling and fallback scenarios

### 4. Advanced Features Testing
- ✅ Session summaries and exports
- ✅ AI Team functionality (if available)
- ✅ Multi-session management
- ✅ Checkpoint system validation

## 🔧 Test Environment Setup

### Prerequisites
```bash
# Install test dependencies
npm install --save-dev @playwright/test
npm install --save-dev playwright-core

# Install browsers
npx playwright install

# Set up test environment
cp .env.local.example .env.local
# Add required API keys for testing
```

### Test Configuration
```javascript
// playwright.config.js
module.exports = {
  testDir: './tests/alpha',
  timeout: 60000,  // Extended for bridge connections
  retries: 2,
  use: {
    headless: false,  // Visual testing for alpha
    viewport: { width: 1920, height: 1080 },
    baseURL: 'http://localhost:3001',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ]
};
```

## 🧪 Test Scenarios

### Scenario 1: Fresh Installation Experience
**Goal**: Validate complete new user setup process

```javascript
// tests/alpha/01-fresh-installation.spec.js
test('Complete fresh installation workflow', async ({ page }) => {
  // 1. Verify IDE accessibility
  await page.goto('/ide');
  await expect(page.locator('[data-testid="monaco-editor"]')).toBeVisible();
  
  // 2. Check for bridge connection prompt
  await expect(page.locator('text="Connect Bridge"')).toBeVisible();
  
  // 3. Validate terminal availability
  await page.click('[data-testid="terminal-tab"]');
  await expect(page.locator('[data-testid="terminal-container"]')).toBeVisible();
  
  // 4. Test file operations without bridge
  await page.click('[data-testid="new-file"]');
  await page.fill('[data-testid="filename-input"]', 'test.js');
  await page.click('[data-testid="create-file"]');
  
  // 5. Verify file appears in explorer
  await expect(page.locator('text="test.js"')).toBeVisible();
});
```

### Scenario 2: Bridge CLI Installation & Connection
**Goal**: Test complete bridge setup and pairing process

```javascript
// tests/alpha/02-bridge-connection.spec.js
test('Bridge CLI installation and pairing', async ({ page }) => {
  // 1. Start bridge CLI in background process
  const bridgeProcess = spawn('npm', ['install', '-g', 'coder1-bridge'], {
    stdio: 'pipe'
  });
  
  // Wait for installation
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // 2. Start bridge service
  const bridgeService = spawn('coder1-bridge', ['start', '--dev'], {
    stdio: 'pipe'
  });
  
  // 3. Navigate to IDE and initiate connection
  await page.goto('/ide');
  await page.click('text="Connect Bridge"');
  
  // 4. Extract pairing code from UI
  const pairingCode = await page.locator('[data-testid="pairing-code"]').textContent();
  expect(pairingCode).toMatch(/^\d{6}$/);
  
  // 5. Send pairing code to bridge CLI
  bridgeService.stdin.write(pairingCode + '\n');
  
  // 6. Verify successful connection
  await expect(page.locator('text="Bridge Connected"')).toBeVisible({ timeout: 15000 });
  
  // 7. Test Claude command execution
  await page.click('[data-testid="terminal-container"]');
  await page.keyboard.type('claude help');
  await page.keyboard.press('Enter');
  
  // 8. Verify command response
  await expect(page.locator('text="Claude Code"')).toBeVisible({ timeout: 10000 });
  
  // Cleanup
  bridgeService.kill();
});
```

### Scenario 3: Core IDE Functionality
**Goal**: Validate all primary IDE features work correctly

```javascript
// tests/alpha/03-ide-functionality.spec.js
test('Core IDE features validation', async ({ page }) => {
  await page.goto('/ide');
  
  // Test Monaco Editor
  await page.click('[data-testid="monaco-editor"]');
  await page.keyboard.type('console.log("Hello Coder1");');
  
  // Test file saving
  await page.keyboard.press('Control+S');
  await page.fill('[data-testid="save-filename"]', 'hello.js');
  await page.click('[data-testid="save-confirm"]');
  
  // Test terminal functionality
  await page.click('[data-testid="terminal-tab"]');
  await page.keyboard.type('echo "Terminal test"');
  await page.keyboard.press('Enter');
  
  await expect(page.locator('text="Terminal test"')).toBeVisible();
  
  // Test file explorer
  await expect(page.locator('text="hello.js"')).toBeVisible();
  await page.click('text="hello.js"');
  
  // Verify file loads in editor
  await expect(page.locator('text="Hello Coder1"')).toBeVisible();
  
  // Test session creation
  await page.click('[data-testid="new-session"]');
  await page.fill('[data-testid="session-name"]', 'Alpha Test Session');
  await page.click('[data-testid="create-session"]');
  
  await expect(page.locator('text="Alpha Test Session"')).toBeVisible();
});
```

### Scenario 4: Claude Code Integration Testing
**Goal**: Comprehensive bridge functionality testing

```javascript
// tests/alpha/04-claude-integration.spec.js
test('Claude Code bridge integration', async ({ page, context }) => {
  // Assume bridge is already connected from previous test
  await page.goto('/ide');
  
  // Wait for bridge connection indicator
  await expect(page.locator('[data-testid="bridge-status-connected"]')).toBeVisible();
  
  // Test basic Claude commands
  const commands = [
    'claude --version',
    'claude help',
    'claude analyze test.js',
    'claude explain "what is JavaScript"'
  ];
  
  for (const command of commands) {
    await page.click('[data-testid="terminal-container"]');
    await page.keyboard.type(command);
    await page.keyboard.press('Enter');
    
    // Wait for response (Claude can take time)
    await page.waitForSelector('text=/Claude|claude/', { timeout: 15000 });
  }
  
  // Test file analysis
  await page.click('[data-testid="monaco-editor"]');
  await page.keyboard.type(`
    function add(a, b) {
      return a + b;
    }
  `);
  
  await page.keyboard.press('Control+S');
  await page.fill('[data-testid="save-filename"]', 'math.js');
  await page.click('[data-testid="save-confirm"]');
  
  // Ask Claude to analyze the file
  await page.click('[data-testid="terminal-container"]');
  await page.keyboard.type('claude analyze math.js');
  await page.keyboard.press('Enter');
  
  // Verify Claude provides analysis
  await expect(page.locator('text=/function|analysis|code/')).toBeVisible({ timeout: 20000 });
});
```

### Scenario 5: Session Management & Exports
**Goal**: Test session summaries and export functionality

```javascript
// tests/alpha/05-session-management.spec.js
test('Session management and exports', async ({ page }) => {
  await page.goto('/ide');
  
  // Create a substantial work session
  await page.click('[data-testid="new-session"]');
  await page.fill('[data-testid="session-name"]', 'Export Test Session');
  await page.click('[data-testid="create-session"]');
  
  // Do some work to generate session content
  await page.click('[data-testid="monaco-editor"]');
  await page.keyboard.type(`
    // Test file for session export
    const greeting = "Hello from Coder1 Alpha!";
    console.log(greeting);
    
    function testFunction() {
      return "This is a test";
    }
  `);
  
  await page.keyboard.press('Control+S');
  await page.fill('[data-testid="save-filename"]', 'session-test.js');
  await page.click('[data-testid="save-confirm"]');
  
  // Run some terminal commands
  await page.click('[data-testid="terminal-container"]');
  await page.keyboard.type('ls -la');
  await page.keyboard.press('Enter');
  await page.keyboard.type('cat session-test.js');
  await page.keyboard.press('Enter');
  
  // Generate session summary
  await page.click('[data-testid="session-summary"]');
  await expect(page.locator('text="Generating summary"')).toBeVisible();
  
  // Wait for summary generation (AI operation)
  await expect(page.locator('[data-testid="summary-content"]')).toBeVisible({ timeout: 30000 });
  
  // Test export functionality
  await page.click('[data-testid="export-session"]');
  await page.selectOption('[data-testid="export-format"]', 'markdown');
  await page.click('[data-testid="confirm-export"]');
  
  // Verify export success
  await expect(page.locator('text="Export successful"')).toBeVisible();
});
```

### Scenario 6: Error Handling & Recovery
**Goal**: Test system resilience and error recovery

```javascript
// tests/alpha/06-error-handling.spec.js
test('Error handling and recovery scenarios', async ({ page }) => {
  await page.goto('/ide');
  
  // Test invalid file operations
  await page.click('[data-testid="new-file"]');
  await page.fill('[data-testid="filename-input"]', 'invalid/path/file.js');
  await page.click('[data-testid="create-file"]');
  
  await expect(page.locator('text=/error|invalid/i')).toBeVisible();
  
  // Test terminal error handling
  await page.click('[data-testid="terminal-container"]');
  await page.keyboard.type('nonexistent-command');
  await page.keyboard.press('Enter');
  
  await expect(page.locator('text=/command not found|not recognized/i')).toBeVisible();
  
  // Test network disconnection recovery
  await page.route('**/*', route => route.abort());
  await page.reload({ waitUntil: 'networkidle' });
  
  // Remove network blockage
  await page.unroute('**/*');
  await page.reload();
  
  // Verify IDE recovers
  await expect(page.locator('[data-testid="monaco-editor"]')).toBeVisible({ timeout: 10000 });
  
  // Test WebSocket reconnection
  await page.evaluate(() => {
    if (window.socket) {
      window.socket.disconnect();
    }
  });
  
  await page.waitForTimeout(2000);
  
  // Verify automatic reconnection
  await expect(page.locator('[data-testid="websocket-status-connected"]')).toBeVisible({ timeout: 10000 });
});
```

## 🚀 Performance Testing

### Scenario 7: Performance & Load Testing
```javascript
// tests/alpha/07-performance.spec.js
test('IDE performance benchmarks', async ({ page }) => {
  await page.goto('/ide');
  
  // Measure initial load time
  const startTime = Date.now();
  await expect(page.locator('[data-testid="monaco-editor"]')).toBeVisible();
  const loadTime = Date.now() - startTime;
  
  expect(loadTime).toBeLessThan(5000); // IDE should load in under 5 seconds
  
  // Test file loading performance
  const fileStartTime = Date.now();
  await page.click('[data-testid="new-file"]');
  await page.fill('[data-testid="filename-input"]', 'perf-test.js');
  await page.click('[data-testid="create-file"]');
  const fileLoadTime = Date.now() - fileStartTime;
  
  expect(fileLoadTime).toBeLessThan(1000); // File operations under 1 second
  
  // Test terminal responsiveness
  const terminalStartTime = Date.now();
  await page.click('[data-testid="terminal-container"]');
  await page.keyboard.type('echo "performance test"');
  await page.keyboard.press('Enter');
  await expect(page.locator('text="performance test"')).toBeVisible();
  const terminalTime = Date.now() - terminalStartTime;
  
  expect(terminalTime).toBeLessThan(2000); // Terminal response under 2 seconds
});
```

## 🎯 Cross-Platform Testing

### Browser Compatibility Matrix
- ✅ Chrome (latest + 2 previous versions)
- ✅ Firefox (latest + 2 previous versions)  
- ✅ Safari (latest + 1 previous version)
- ✅ Edge (latest + 1 previous version)

### Operating System Testing
- ✅ macOS (primary development platform)
- ✅ Windows 10/11 (via GitHub Actions)
- ✅ Ubuntu Linux (via GitHub Actions)

## 📊 Test Execution Plan

### Phase 1: Local Validation (Day 1)
```bash
# Run all tests locally
npm run test:alpha

# Generate test report
npm run test:report

# Record demo videos for key scenarios  
npm run test:record
```

### Phase 2: CI/CD Integration (Day 2)
```yaml
# .github/workflows/alpha-testing.yml
name: Coder1 Alpha Testing
on: [push, pull_request]
jobs:
  alpha-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Install Playwright browsers
        run: npx playwright install
      
      - name: Run Alpha Tests
        run: npm run test:alpha:${{ matrix.browser }}
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        with:
          name: alpha-test-results-${{ matrix.browser }}
          path: test-results/
```

### Phase 3: User Acceptance Testing (Day 3)
- **Alpha Testers**: 10-15 selected users
- **Test Duration**: 2-3 hours per tester
- **Feedback Collection**: Structured form + screen recordings
- **Success Criteria**: 80% completion rate on core workflows

## 📈 Success Metrics

### Technical Metrics
- ✅ **Test Pass Rate**: >95% across all scenarios
- ✅ **Performance**: IDE loads <5s, file ops <1s
- ✅ **Browser Coverage**: 100% on target browsers
- ✅ **Error Recovery**: <30s recovery time from failures

### User Experience Metrics
- ✅ **Installation Success**: >90% complete bridge setup
- ✅ **Feature Discovery**: >80% find core features within 5 minutes
- ✅ **Task Completion**: >85% complete basic coding workflow
- ✅ **Satisfaction**: >8/10 average rating

## 🔧 Test Data & Fixtures

### Sample Project Structure
```
test-fixtures/
├── sample-projects/
│   ├── hello-world/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js
│   ├── react-component/
│   │   ├── Component.jsx
│   │   ├── Component.test.js
│   │   └── package.json
│   └── node-api/
│       ├── server.js
│       ├── routes/
│       └── package.json
├── bridge-configurations/
│   ├── default-bridge.config.js
│   ├── test-bridge.config.js
│   └── mock-claude-responses.json
└── user-scenarios/
    ├── beginner-workflow.json
    ├── expert-workflow.json
    └── debug-session.json
```

## 🚨 Risk Assessment & Mitigation

### High Risk Areas
1. **Bridge Connection Stability**
   - Risk: Intermittent pairing failures
   - Mitigation: Retry logic, fallback modes, detailed logging

2. **Claude CLI Dependencies** 
   - Risk: CLI version compatibility issues
   - Mitigation: Version checking, compatibility matrix, graceful degradation

3. **WebSocket Reliability**
   - Risk: Connection drops during long sessions
   - Mitigation: Auto-reconnection, session persistence, offline modes

### Medium Risk Areas
1. **Performance on Lower-End Hardware**
   - Risk: Slow load times, memory issues
   - Mitigation: Progressive loading, memory optimization, performance monitoring

2. **Browser Compatibility Edge Cases**
   - Risk: Feature differences across browsers
   - Mitigation: Polyfills, feature detection, graceful degradation

## 📋 Test Execution Checklist

### Pre-Launch Validation
- [ ] All test scenarios pass locally
- [ ] CI/CD pipeline green across all browsers
- [ ] Performance benchmarks meet targets
- [ ] Error handling validated
- [ ] Bridge installation process tested end-to-end
- [ ] Documentation updated and accurate
- [ ] User feedback incorporated
- [ ] Alpha testing guide finalized

### Launch Day
- [ ] Final test run on production environment
- [ ] Monitor real user sessions
- [ ] Support team briefed on common issues
- [ ] Rollback plan ready if needed
- [ ] Analytics and monitoring active

## 🎯 Next Steps

1. **Immediate**: Set up Playwright test environment
2. **Week 1**: Implement and validate core test scenarios
3. **Week 2**: Add performance and cross-platform testing
4. **Week 3**: User acceptance testing with alpha group
5. **Week 4**: Final validations and launch preparation

## 📞 Support During Testing

- **Issues**: Report via GitHub Issues with `alpha-testing` label
- **Urgent**: Direct message for blocking issues
- **Documentation**: All scenarios documented in `/tests/alpha/README.md`
- **Recordings**: Video recordings available for complex scenarios

---

**This plan ensures Coder1 IDE alpha launch delivers a polished, reliable experience that validates the bridge installation process and core IDE functionality across all target platforms.**

*Created: September 24, 2025*  
*Status: Ready for Implementation*  
*Owner: Alpha Testing Team*