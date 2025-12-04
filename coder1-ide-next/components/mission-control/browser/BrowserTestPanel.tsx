/**
 * Browser Test Panel Component
 * Main container for browser automation testing interface
 */

'use client';

import { useState, useEffect } from 'react';
import { useMissionControlStore } from '@/stores/useMissionControlStore';
import { BrowserCommand, CommandResult } from '@/types';
import TestInputArea from './TestInputArea';
import TestResultsPanel from './TestResultsPanel';
import TestHistoryList from './TestHistoryList';

export default function BrowserTestPanel() {
  const { browserSession, setBrowserSession } = useMissionControlStore();

  const [isRunning, setIsRunning] = useState(false);
  const [currentResult, setCurrentResult] = useState<CommandResult | null>(null);
  const [selectedTest, setSelectedTest] = useState<BrowserCommand | null>(null);
  const [executionTime, setExecutionTime] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string>('');

  // Timer for execution time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      const startTime = Date.now();
      interval = setInterval(() => {
        setExecutionTime(Date.now() - startTime);
      }, 100);
    } else {
      setExecutionTime(0);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Handle test execution
  const handleRunTest = async (input: string, mode: 'natural' | 'playwright') => {
    setIsRunning(true);
    setCurrentResult(null);
    setSelectedTest(null);
    setCurrentStep('Initializing browser...');

    // Create new command
    const command: BrowserCommand = {
      id: `cmd-${Date.now()}`,
      type: 'custom',
      input,
      timestamp: new Date()
    };

    try {
      // Simulate test execution (replace with actual API call)
      setCurrentStep(mode === 'natural' ? 'Parsing natural language...' : 'Executing Playwright code...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setCurrentStep('Running browser actions...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      setCurrentStep('Capturing results...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock successful result
      const result: CommandResult = {
        success: true,
        screenshot: '/api/placeholder/800/600', // Replace with actual screenshot
        playwrightCode: mode === 'natural'
          ? `// Generated from: "${input}"\nawait page.click('#example');\nawait page.fill('#input', 'value');`
          : input
      };

      command.result = result;
      setCurrentResult(result);

      // Update session history
      const updatedSession = {
        ...browserSession,
        id: browserSession?.id || `session-${Date.now()}`,
        status: 'completed' as const,
        lastScreenshot: result.screenshot,
        history: [...(browserSession?.history || []), command]
      };
      setBrowserSession(updatedSession);

    } catch (error) {
      // Mock error result
      const result: CommandResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Test execution failed'
      };

      command.result = result;
      setCurrentResult(result);

      // Update session history with failed command
      const updatedSession = {
        ...browserSession,
        id: browserSession?.id || `session-${Date.now()}`,
        status: 'error' as const,
        history: [...(browserSession?.history || []), command]
      };
      setBrowserSession(updatedSession);
    } finally {
      setIsRunning(false);
      setCurrentStep('');
    }
  };

  // Handle record action
  const handleRecord = () => {
    console.log('Recording browser actions...');
    // TODO: Implement recording functionality
    alert('Recording feature coming soon!');
  };

  // Handle test selection from history
  const handleSelectTest = (command: BrowserCommand) => {
    setSelectedTest(command);
    setCurrentResult(command.result || null);
  };

  // Handle clear history
  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all test history?')) {
      setBrowserSession({
        id: browserSession?.id || `session-${Date.now()}`,
        status: 'idle',
        history: []
      });
      setSelectedTest(null);
      setCurrentResult(null);
    }
  };

  // Determine current status
  const getStatus = (): 'idle' | 'running' | 'passed' | 'failed' => {
    if (isRunning) return 'running';
    if (!currentResult) return 'idle';
    return currentResult.success ? 'passed' : 'failed';
  };

  return (
    <div className="flex flex-col h-full" data-testid="browser-test-panel">
      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-hidden">

        {/* Left Column: Input & Results */}
        <div className="flex flex-col gap-6 overflow-y-auto">
          {/* Test Input Section */}
          <div className="bg-bg-secondary border border-border-subtle rounded-lg p-5">
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-coder1-cyan" />
              Test Input
            </h2>
            <TestInputArea
              onRunTest={handleRunTest}
              onRecord={handleRecord}
              isRunning={isRunning}
            />
          </div>

          {/* Test Results Section */}
          <div className="bg-bg-secondary border border-border-subtle rounded-lg p-5">
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-coder1-purple" />
              Test Results
            </h2>
            <TestResultsPanel
              status={getStatus()}
              result={currentResult}
              executionTime={isRunning ? executionTime : undefined}
              currentStep={currentStep}
            />
          </div>
        </div>

        {/* Right Column: History */}
        <div className="bg-bg-secondary border border-border-subtle rounded-lg p-5 overflow-hidden flex flex-col">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-coder1-cyan" />
            Test History
          </h2>
          <TestHistoryList
            history={browserSession?.history || []}
            onSelectTest={handleSelectTest}
            onClearHistory={handleClearHistory}
            selectedTestId={selectedTest?.id}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="border-t border-border-subtle bg-bg-tertiary px-6 py-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                browserSession?.status === 'running' ? 'bg-coder1-cyan animate-pulse' :
                browserSession?.status === 'completed' ? 'bg-green-500' :
                browserSession?.status === 'error' ? 'bg-red-500' :
                'bg-text-muted'
              }`} />
              <span className="text-text-secondary capitalize">
                {browserSession?.status || 'idle'}
              </span>
            </div>
            <div className="text-text-muted">
              Session: {browserSession?.id?.slice(-8) || 'None'}
            </div>
          </div>
          <div className="text-text-muted">
            {browserSession?.history?.length || 0} tests executed
          </div>
        </div>
      </div>
    </div>
  );
}
