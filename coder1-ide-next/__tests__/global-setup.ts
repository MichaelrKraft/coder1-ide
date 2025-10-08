/**
 * Jest Global Setup
 * Runs once before all tests start
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export default async function globalSetup() {
  console.log('🚀 Setting up test environment...\n');

  // Ensure test databases and directories exist
  const testDataDir = path.join(__dirname, '../test-data');
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }

  // Create test coverage directory
  const coverageDir = path.join(__dirname, '../coverage');
  if (!fs.existsSync(coverageDir)) {
    fs.mkdirSync(coverageDir, { recursive: true });
  }

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.TEST_MODE = 'true';
  process.env.DISABLE_ANALYTICS = 'true';
  process.env.DISABLE_TELEMETRY = 'true';
  
  // Mock API endpoints for testing
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';
  process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:3001';

  // Create test session data
  const testSessions = [
    {
      id: 'test-session-1',
      name: 'Test Session 1',
      status: 'active',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    },
    {
      id: 'test-session-2',
      name: 'Test Session 2', 
      status: 'inactive',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      lastActivity: new Date(Date.now() - 3600000).toISOString()
    }
  ];

  fs.writeFileSync(
    path.join(testDataDir, 'test-sessions.json'),
    JSON.stringify(testSessions, null, 2)
  );

  // Create test terminal history
  const testTerminalHistory = [
    'npm start',
    'git status',
    'ls -la',
    'npm test',
    'git commit -m "test commit"'
  ];

  fs.writeFileSync(
    path.join(testDataDir, 'test-terminal-history.json'),
    JSON.stringify(testTerminalHistory, null, 2)
  );

  // Check if required test dependencies are available
  try {
    require('@testing-library/react');
    require('@testing-library/jest-dom');
    require('@testing-library/user-event');
  } catch (error) {
    console.error('❌ Missing required test dependencies. Please run: npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event');
    process.exit(1);
  }

  // Verify Next.js configuration
  try {
    const nextConfigPath = path.join(__dirname, '../next.config.js');
    if (fs.existsSync(nextConfigPath)) {
      console.log('✅ Next.js configuration found');
    }
  } catch (error) {
    console.warn('⚠️  Next.js configuration not found or invalid');
  }

  // Clear any existing test artifacts
  const artifactsDir = path.join(__dirname, '../test-artifacts');
  if (fs.existsSync(artifactsDir)) {
    fs.rmSync(artifactsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(artifactsDir, { recursive: true });

  // Setup test performance baseline
  const performanceBaseline = {
    componentRenderTime: 50, // ms
    apiResponseTime: 200, // ms
    terminalInitTime: 100, // ms
    sessionSummaryTime: 3000, // ms
    codeLoadingTime: 150 // ms
  };

  fs.writeFileSync(
    path.join(testDataDir, 'performance-baseline.json'),
    JSON.stringify(performanceBaseline, null, 2)
  );

  console.log('✅ Test environment setup complete!\n');
  console.log('📁 Test data directory:', testDataDir);
  console.log('📊 Coverage directory:', coverageDir);
  console.log('🎯 Performance baselines loaded');
  console.log('🔧 Mock data created\n');
}