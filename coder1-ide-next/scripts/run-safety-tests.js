#!/usr/bin/env node

/**
 * Safety Test Runner Script
 * Validates all safety mechanisms before feature activation
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🛡️ Safety Validation Test Suite');
console.log('================================\n');

async function runTests() {
  const startTime = Date.now();
  
  // Test categories
  const tests = [
    {
      name: 'Feature Flags',
      command: 'npm',
      args: ['test', '--', '--testNamePattern="Feature Flag Safety"', '--silent'],
      critical: true
    },
    {
      name: 'Activity Tracker',
      command: 'npm',
      args: ['test', '--', '--testNamePattern="Activity Tracker Safety"', '--silent'],
      critical: true
    },
    {
      name: 'Safeguard Monitor',
      command: 'npm',
      args: ['test', '--', '--testNamePattern="Safeguard Monitor Safety"', '--silent'],
      critical: true
    },
    {
      name: 'Baseline Metrics',
      command: 'npm',
      args: ['test', '--', '--testNamePattern="Baseline Metrics Safety"', '--silent'],
      critical: false
    },
    {
      name: 'Integration',
      command: 'npm',
      args: ['test', '--', '--testNamePattern="Integration Safety"', '--silent'],
      critical: true
    }
  ];
  
  let passed = 0;
  let failed = 0;
  const failures = [];
  
  // Run each test suite
  for (const test of tests) {
    process.stdout.write(`Testing ${test.name}... `);
    
    try {
      const result = await runCommand(test.command, test.args);
      
      if (result.success) {
        console.log('✅ PASSED');
        passed++;
      } else {
        console.log(`❌ FAILED${test.critical ? ' (CRITICAL)' : ''}`);
        failed++;
        failures.push({
          name: test.name,
          critical: test.critical,
          error: result.error
        });
      }
    } catch (error) {
      console.log(`❌ ERROR${test.critical ? ' (CRITICAL)' : ''}`);
      failed++;
      failures.push({
        name: test.name,
        critical: test.critical,
        error: error.message
      });
    }
  }
  
  // Calculate duration
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Print summary
  console.log('\n================================');
  console.log('📊 Test Summary\n');
  console.log(`Total Tests: ${passed + failed}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️ Duration: ${duration}s`);
  
  // Check for critical failures
  const criticalFailures = failures.filter(f => f.critical);
  
  if (criticalFailures.length > 0) {
    console.log('\n⚠️ CRITICAL FAILURES DETECTED:');
    criticalFailures.forEach(f => {
      console.log(`   - ${f.name}: ${f.error || 'Test failed'}`);
    });
    console.log('\n🚫 DO NOT ENABLE ENHANCED FEATURES');
    console.log('   Critical safety mechanisms have failed validation.');
    console.log('   Fix these issues before proceeding to Phase 1.');
    process.exit(1);
  } else if (failed > 0) {
    console.log('\n⚠️ Non-critical failures detected:');
    failures.forEach(f => {
      console.log(`   - ${f.name}: ${f.error || 'Test failed'}`);
    });
    console.log('\n⚡ Enhanced features can be enabled with caution.');
  } else {
    console.log('\n✅ ALL SAFETY TESTS PASSED');
    console.log('   System is ready for Phase 1 activation.');
    console.log('   All safety mechanisms validated successfully.');
  }
  
  // Recommendations
  console.log('\n📋 Recommendations:');
  if (passed === tests.length) {
    console.log('   1. Continue monitoring baseline metrics (Phase 0)');
    console.log('   2. After 48 hours, enable Activity Tracking at 5%');
    console.log('   3. Monitor health metrics closely');
    console.log('   4. Gradually increase rollout percentage');
  } else {
    console.log('   1. Fix failing tests before Phase 1');
    console.log('   2. Re-run safety validation');
    console.log('   3. Continue baseline monitoring');
  }
}

function runCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    child.on('close', (code) => {
      resolve({
        success: code === 0,
        output,
        error: errorOutput || undefined
      });
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      child.kill();
      resolve({
        success: false,
        error: 'Test timeout (30s)'
      });
    }, 30000);
  });
}

// Run the tests
runTests().catch(error => {
  console.error('\n❌ Test runner failed:', error);
  process.exit(1);
});