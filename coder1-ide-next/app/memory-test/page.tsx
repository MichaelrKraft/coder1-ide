'use client';

import React, { useState, useEffect } from 'react';
import { memoryDetectionService } from '@/lib/memory-detection-client';
import type { MemoryDetectionResult } from '@/lib/memory-detection-client';

export default function MemoryTestPage() {
  const [detectionResult, setDetectionResult] = useState<MemoryDetectionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [testScenario, setTestScenario] = useState('bug-fix');

  // Mock data for different scenarios
  const mockScenarios = {
    'bug-fix': {
      openFiles: [
        { path: '/src/api/auth.ts', name: 'auth.ts', content: 'auth code', isDirty: true },
        { path: '/src/api/user.ts', name: 'user.ts', content: 'user code', isDirty: true }
      ],
      activeFile: '/src/api/auth.ts',
      terminalHistory: `bash-3.2$ npm test
      ERROR: Authentication failed
      bash-3.2$ git diff
      bash-3.2$ npm test
      SUCCESS: All tests passing
      bash-3.2$ git commit -m "Fixed authentication bug"`,
      terminalCommands: ['npm test', 'git diff', 'npm test', 'git commit -m "Fixed authentication bug"']
    },
    'feature-dev': {
      openFiles: [
        { path: '/src/components/Memory.tsx', name: 'Memory.tsx', content: 'memory component', isDirty: true },
        { path: '/src/services/memory.ts', name: 'memory.ts', content: 'memory service', isDirty: true },
        { path: '/src/api/memory.ts', name: 'memory.ts', content: 'memory api', isDirty: true },
        { path: '/src/types/memory.d.ts', name: 'memory.d.ts', content: 'memory types', isDirty: true }
      ],
      activeFile: '/src/components/Memory.tsx',
      terminalHistory: `bash-3.2$ npm run dev
      Starting development server...
      bash-3.2$ npm test memory
      All memory tests passing
      bash-3.2$ git add .
      bash-3.2$ git commit -m "Implemented memory detection system"`,
      terminalCommands: ['npm run dev', 'npm test memory', 'git add .', 'git commit -m "Implemented memory detection system"']
    },
    'learning': {
      openFiles: [
        { path: '/docs/architecture.md', name: 'architecture.md', content: 'architecture docs', isDirty: false }
      ],
      activeFile: '/docs/architecture.md',
      terminalHistory: `bash-3.2$ man git
      bash-3.2$ npm docs react
      bash-3.2$ help typescript
      bash-3.2$ explore node_modules`,
      terminalCommands: ['man git', 'npm docs react', 'help typescript', 'explore node_modules']
    },
    'minimal': {
      openFiles: [],
      activeFile: null,
      terminalHistory: 'bash-3.2$ ls',
      terminalCommands: ['ls']
    }
  };

  const runDetection = () => {
    setIsAnalyzing(true);
    console.log('🧪 [TEST] Running detection with scenario:', testScenario);
    
    const scenario = mockScenarios[testScenario as keyof typeof mockScenarios];
    
    try {
      const result = memoryDetectionService.analyzeSession(
        scenario.openFiles,
        scenario.activeFile,
        scenario.terminalHistory,
        scenario.terminalCommands
      );
      
      console.log('🧪 [TEST] Detection complete:', result);
      setDetectionResult(result);
    } catch (error) {
      console.error('🧪 [TEST] Detection error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    // Auto-run detection on mount
    runDetection();
  }, [testScenario]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Memory Detection Test Page</h1>
        
        {/* Scenario Selector */}
        <div className="mb-8">
          <label className="block mb-2 text-sm font-medium">Test Scenario:</label>
          <select
            value={testScenario}
            onChange={(e) => setTestScenario(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
          >
            <option value="bug-fix">Bug Fix (High Confidence)</option>
            <option value="feature-dev">Feature Development (High Confidence)</option>
            <option value="learning">Learning Session (Medium Confidence)</option>
            <option value="minimal">Minimal Activity (Low/No Confidence)</option>
          </select>
        </div>

        {/* Run Detection Button */}
        <button
          onClick={runDetection}
          disabled={isAnalyzing}
          className="mb-8 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 text-white rounded font-medium"
        >
          {isAnalyzing ? 'Analyzing...' : 'Run Detection'}
        </button>

        {/* Results Display */}
        {detectionResult && (
          <div className="space-y-6">
            {/* Overall Status */}
            <div className={`p-6 rounded-lg border-2 ${
              detectionResult.isMemoryWorthy 
                ? 'bg-green-900/20 border-green-500' 
                : 'bg-gray-800 border-gray-600'
            }`}>
              <h2 className="text-xl font-bold mb-2">Detection Result</h2>
              <p className="text-lg">
                Memory Worthy: {detectionResult.isMemoryWorthy ? '✅ YES' : '❌ NO'}
              </p>
              <p className="text-lg">
                Confidence: {(detectionResult.confidence * 100).toFixed(0)}%
              </p>
              <p className="text-lg">
                Auto-Generation: {detectionResult.autoGenerationRecommended ? '✅ Recommended' : '⚪ Manual'}
              </p>
            </div>

            {/* Suggested Memory */}
            <div className="p-6 bg-gray-800 rounded-lg">
              <h3 className="text-lg font-bold mb-2">Suggested Memory</h3>
              <p className="font-medium mb-1">Title: {detectionResult.suggestedMemoryTitle}</p>
              <p className="text-sm text-gray-400">Description: {detectionResult.suggestedMemoryDescription}</p>
            </div>

            {/* Detected Events */}
            <div className="p-6 bg-gray-800 rounded-lg">
              <h3 className="text-lg font-bold mb-4">Detected Events ({detectionResult.events.length})</h3>
              <div className="space-y-3">
                {detectionResult.events.map((event, index) => (
                  <div key={index} className="p-4 bg-gray-700 rounded">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="inline-block px-2 py-1 bg-cyan-600/20 text-cyan-300 text-xs rounded mb-2">
                          {event.type}
                        </span>
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-gray-400 mt-1">{event.description}</p>
                        <div className="mt-2 flex gap-2">
                          {event.suggestedTags.map((tag, i) => (
                            <span key={i} className="px-2 py-1 bg-gray-600 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-cyan-400">
                        {(event.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Raw JSON (Debug) */}
            <details className="p-6 bg-gray-800 rounded-lg">
              <summary className="cursor-pointer font-bold mb-2">Raw Detection Data (Debug)</summary>
              <pre className="mt-4 text-xs overflow-auto">
                {JSON.stringify(detectionResult, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}