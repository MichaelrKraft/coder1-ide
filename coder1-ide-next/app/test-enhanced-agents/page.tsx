'use client';

import React, { useState, useEffect } from 'react';
import { mockEnhancedAgentService, type MockAgentResponse } from '@/services/mock-enhanced-agent-service';
import AgentAssemblyVisualization from '@/components/agents/AgentAssemblyVisualization';

// Feature flags - same as Terminal component
const FEATURE_FLAGS = {
  ENHANCED_AGENTS: typeof window !== 'undefined' && (
    process.env.NODE_ENV === 'development' && 
    localStorage.getItem('coder1-enable-enhanced-agents') === 'true'
  ),
};

// Debug helper
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).enableEnhancedAgents = () => {
    localStorage.setItem('coder1-enable-enhanced-agents', 'true');
    localStorage.setItem('coder1-agent-visualization', 'true');
    localStorage.setItem('coder1-natural-handoffs', 'true');
    window.location.reload();
  };
  
  (window as any).disableEnhancedAgents = () => {
    localStorage.removeItem('coder1-enable-enhanced-agents');
    localStorage.removeItem('coder1-agent-visualization');
    localStorage.removeItem('coder1-natural-handoffs');
    window.location.reload();
  };
}

export default function TestEnhancedAgentsPage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const [isEnabled, setIsEnabled] = useState(false);
  
  // Agent assembly visualization state
  const [isAssembling, setIsAssembling] = useState(false);
  const [currentTeamSuggestion, setCurrentTeamSuggestion] = useState<any>(null);
  const [hasTestedFeatures, setHasTestedFeatures] = useState(false);
  const [testProgress, setTestProgress] = useState({
    enabledFeatures: false,
    triedSimpleCommand: false,
    triedComplexCommand: false,
    watchedAssembly: false
  });

  useEffect(() => {
    const enabled = FEATURE_FLAGS.ENHANCED_AGENTS;
    setIsEnabled(enabled);
    if (enabled) {
      setTestProgress(prev => ({ ...prev, enabledFeatures: true }));
    }
  }, []);
  
  // Check if user has completed testing
  useEffect(() => {
    const completedSteps = Object.values(testProgress).filter(Boolean).length;
    setHasTestedFeatures(completedSteps >= 3); // Need at least 3 out of 4 steps
  }, [testProgress]);

  const processCommand = async () => {
    if (!input.trim()) return;

    const newOutput = [...output, `$ ${input}`];
    
    if (FEATURE_FLAGS.ENHANCED_AGENTS) {
      try {
        if (input.toLowerCase().includes('step away') || input.toLowerCase().includes('summarize')) {
          // Test handoff functionality
          newOutput.push('🤖 Creating handoff summary...');
          const summary = mockEnhancedAgentService.generateHandoffSummary({});
          newOutput.push(summary);
          newOutput.push('✅ Handoff summary ready!');
        } else if (input.toLowerCase() === 'yes' && currentTeamSuggestion) {
          // Test team deployment
          newOutput.push('🚀 Deploying AI team...');
          newOutput.push('📡 Assembling agents and coordinating tasks...');
          newOutput.push('✅ Team deployed successfully!');
          newOutput.push('👥 3 agents now coordinating on your request.');
          newOutput.push('👀 Watch real-time progress below ↓');
          
          // Reset and start fresh assembly
          setIsAssembling(false);
          setTimeout(() => setIsAssembling(true), 500);
        } else if (input.toLowerCase().startsWith('claude ')) {
          // Test enhanced agent processing
          const userRequest = input.substring(6).trim();
          const response: MockAgentResponse = mockEnhancedAgentService.analyzeUserInput(userRequest);
          
          // Track testing progress
          if (response.isTeamSuggestion) {
            setTestProgress(prev => ({ ...prev, triedComplexCommand: true }));
          } else {
            setTestProgress(prev => ({ ...prev, triedSimpleCommand: true }));
          }
          
          if (response.memoryInsights.length > 0) {
            newOutput.push('💡 Context from your development patterns:');
            response.memoryInsights.forEach(insight => {
              const icon = insight.type === 'pattern' ? '🔄' : 
                          insight.type === 'success' ? '✅' : 
                          insight.type === 'warning' ? '⚠️' : '💡';
              newOutput.push(`   ${icon} ${insight.content}`);
            });
            newOutput.push('');
          }

          if (response.isTeamSuggestion && response.teamSuggestion) {
            const suggestion = response.teamSuggestion;
            
            newOutput.push(response.response);
            newOutput.push(`🎯 Recommended: ${suggestion.recommendedTeam.name}`);
            newOutput.push(`👥 Team: ${suggestion.recommendedTeam.agents.join(', ')}`);
            newOutput.push(`📊 Confidence: ${Math.round(suggestion.confidence * 100)}%`);
            newOutput.push('');
            newOutput.push('✨ Benefits:');
            
            suggestion.benefits.forEach(benefit => {
              newOutput.push(`   • ${benefit}`);
            });
            
            newOutput.push('💬 Type "yes" to deploy this team, or describe what you want differently.');
            newOutput.push('👀 WATCH AGENT ASSEMBLY BELOW ↓');
            
            // Trigger assembly visualization
            setCurrentTeamSuggestion(suggestion);
            setIsAssembling(false); // Reset first
            setTimeout(() => {
              setIsAssembling(true); // Then trigger
              setTestProgress(prev => ({ ...prev, watchedAssembly: true })); // Track that they've seen assembly
            }, 100);
          } else {
            newOutput.push(`🤖 ${response.response}`);
          }
        } else {
          // Regular command
          newOutput.push(`Enhanced processing not applicable for: ${input}`);
        }
      } catch (error) {
        newOutput.push(`❌ Enhanced processing error: ${error}`);
      }
    } else {
      newOutput.push('🔒 Enhanced agents disabled. Run enableEnhancedAgents() in console to enable.');
    }

    setOutput(newOutput);
    setInput('');
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-cyan-400">Enhanced Agents Test Environment</h1>
            <div className="flex items-center gap-3">
              <a
                href="/ide"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-coder1-purple hover:bg-coder1-purple/80 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                🚀 Try in Real IDE
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              
              {isEnabled && (
                <div className="px-3 py-1 bg-green-900/20 border border-green-500/30 rounded-lg text-green-400 text-xs font-medium">
                  ✅ Ready for Real IDE
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-4 mb-6">
            <h2 className="text-blue-400 font-semibold mb-2">🧪 What is this?</h2>
            <p className="text-blue-200 text-sm mb-2">
              This is a safe testing environment where you can experience the enhanced agent features before trying them in the real IDE.
            </p>
            <p className="text-blue-300 text-sm">
              <strong>Test here first</strong> → then click <strong>&quot;Try in Real IDE&quot;</strong> to see the full experience with agent assembly visualization!
            </p>
          </div>
          
          {/* Feature Flag Status */}
          <div className={`p-4 rounded-lg border mb-6 ${
            isEnabled 
              ? 'bg-green-900/20 border-green-500/50 text-green-400' 
              : 'bg-red-900/20 border-red-500/50 text-red-400'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{isEnabled ? '🚀' : '🔒'}</span>
              <strong>Enhanced Agents Status: {isEnabled ? 'ENABLED' : 'DISABLED'}</strong>
            </div>
            <p className="text-sm opacity-75">
              {isEnabled 
                ? 'Feature flags are active. Enhanced agent processing available.' 
                : 'Run enableEnhancedAgents() in browser console to enable features.'
              }
            </p>
          </div>

          {/* Console Commands */}
          <div className="bg-gray-900 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-semibold mb-2 text-yellow-400">Console Commands</h3>
            <div className="text-sm space-y-1 font-mono">
              <div><span className="text-green-400">enableEnhancedAgents()</span> - Enable all enhanced features</div>
              <div><span className="text-red-400">disableEnhancedAgents()</span> - Disable all enhanced features</div>
            </div>
          </div>

          {/* Test Commands */}
          <div className="bg-gray-900 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-semibold mb-2 text-blue-400">Test Commands</h3>
            <div className="text-sm space-y-1">
              <div><strong>Team Suggestion:</strong> &quot;claude build a dashboard&quot;</div>
              <div><strong>Single Agent:</strong> &quot;claude fix this bug&quot;</div>
              <div><strong>Handoff:</strong> &quot;I need to step away, summarize what we&apos;ve done&quot;</div>
              <div><strong>Quick Action:</strong> &quot;code review&quot;</div>
            </div>
          </div>
        </div>

        {/* Success Flow - Ready for Real IDE */}
        {hasTestedFeatures && (
          <div className="mb-8 bg-gradient-to-r from-green-900/30 to-cyan-900/30 border border-green-500/50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-green-400">🎉 Testing Complete - You&apos;re Ready!</h3>
              </div>
              <a
                href="/ide"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-gradient-to-r from-coder1-purple to-coder1-cyan text-white font-bold rounded-lg hover:from-coder1-purple/80 hover:to-coder1-cyan/80 transition-all duration-200 flex items-center gap-2 shadow-lg"
              >
                🚀 Launch Real IDE Experience
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
            </div>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="bg-black/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-3 h-3 rounded-full ${testProgress.enabledFeatures ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                  <span className="text-sm font-medium text-white">Enhanced Agents Enabled</span>
                </div>
                <p className="text-xs text-gray-400">Feature flags activated</p>
              </div>
              <div className="bg-black/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-3 h-3 rounded-full ${testProgress.triedSimpleCommand || testProgress.triedComplexCommand ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                  <span className="text-sm font-medium text-white">Tested Commands</span>
                </div>
                <p className="text-xs text-gray-400">Tried claude commands</p>
              </div>
              <div className="bg-black/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-3 h-3 rounded-full ${testProgress.watchedAssembly ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                  <span className="text-sm font-medium text-white">Saw Agent Assembly</span>
                </div>
                <p className="text-xs text-gray-400">Watched team coordination</p>
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-900/20 to-cyan-900/20 rounded-lg p-4">
              <h4 className="text-cyan-400 font-semibold mb-2">✨ What&apos;s Next in the Real IDE?</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Open <strong>Preview Panel</strong> (right sidebar) → <strong>Agent Dashboard</strong> tab</li>
                <li>• Type complex commands in terminal: <code className="bg-gray-800 px-1 rounded text-cyan-400">claude build a dashboard</code></li>
                <li>• Watch full-size agent assembly with live progress tracking</li>
                <li>• All the testing functionality + real file system integration</li>
              </ul>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Terminal Simulator */}
          <div className="bg-black border border-cyan-500/30 rounded-lg overflow-hidden">
            <div className="bg-cyan-900/20 p-3 border-b border-cyan-500/30">
              <h3 className="text-cyan-400 font-semibold">Enhanced Agents Terminal Simulator</h3>
            </div>
          
          <div className="p-4 font-mono text-sm">
            {/* Output */}
            <div className="mb-4 min-h-[300px] max-h-[500px] overflow-y-auto space-y-1">
              {output.length === 0 ? (
                <div className="text-gray-400 italic">
                  Welcome to Enhanced Agents Test Terminal
                  <br />
                  {isEnabled ? 'Enhanced processing ready!' : 'Run enableEnhancedAgents() to activate features'}
                </div>
              ) : (
                output.map((line, index) => (
                  <div key={index} className={
                    line.startsWith('$') ? 'text-cyan-400 font-bold' :
                    line.startsWith('🤖') || line.startsWith('💡') || line.startsWith('✅') ? 'text-green-400' :
                    line.startsWith('❌') ? 'text-red-400' :
                    line.startsWith('🎯') || line.startsWith('👥') || line.startsWith('📊') ? 'text-blue-400' :
                    line.startsWith('   •') || line.startsWith('   🔄') || line.startsWith('   ✅') || line.startsWith('   ⚠️') || line.startsWith('   💡') ? 'text-yellow-300 ml-4' :
                    'text-gray-300'
                  }>
                    {line}
                  </div>
                ))
              )}
            </div>
            
            {/* Input */}
            <div className="flex items-center gap-2 border-t border-gray-700 pt-3">
              <span className="text-cyan-400">$</span>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    processCommand();
                  }
                }}
                placeholder="Enter a command to test enhanced agents..."
                className="flex-1 bg-transparent text-white border-none outline-none"
              />
              <button
                onClick={processCommand}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-black rounded text-xs font-semibold transition-colors"
              >
                Execute
              </button>
            </div>
          </div>
          </div>
          
          {/* Agent Assembly Preview */}
          <div className="bg-gray-900 border border-purple-500/30 rounded-lg overflow-hidden">
            <div className="bg-purple-900/20 p-3 border-b border-purple-500/30">
              <h3 className="text-purple-400 font-semibold">Agent Assembly Preview</h3>
              <p className="text-purple-200 text-xs mt-1">Mini version of what you&apos;ll see in the real IDE Preview Panel</p>
            </div>
            
            <div className="p-4 min-h-[400px]">
              {isEnabled && currentTeamSuggestion ? (
                <AgentAssemblyVisualization
                  isAssembling={isAssembling}
                  teamSuggestion={currentTeamSuggestion}
                  onAssemblyComplete={() => {
                    setIsAssembling(false);
                  }}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="text-6xl mb-4">🤖</div>
                  <h4 className="text-lg font-semibold text-gray-300 mb-2">
                    {isEnabled ? 'Waiting for Team Suggestions' : 'Enhanced Agents Disabled'}
                  </h4>
                  <p className="text-gray-400 text-sm max-w-xs">
                    {isEnabled 
                      ? 'Try a complex command like "claude build a dashboard" to see agent assembly!'
                      : 'Enable enhanced agents first, then try team commands to see the magic happen.'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Instructions */}
        <div className="mt-8 space-y-6">
          <div className="bg-gradient-to-r from-purple-900/20 to-cyan-900/20 border border-purple-500/20 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">📋 Complete Testing Guide</h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold text-purple-400 mb-3">🧪 Phase 1: Test Environment</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                  <li>Open browser console (F12 or Cmd+Option+I)</li>
                  <li>Run: <code className="bg-gray-800 px-2 py-1 rounded text-green-400">enableEnhancedAgents()</code></li>
                  <li>Page reloads - you&apos;ll see green &quot;ENABLED&quot; status</li>
                  <li>Try test commands in the terminal simulator below</li>
                  <li>Observe different responses for simple vs complex commands</li>
                </ol>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-cyan-400 mb-3">🚀 Phase 2: Real IDE Experience</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                  <li>Click <strong>&quot;Try in Real IDE&quot;</strong> button above</li>
                  <li>Enhanced agents are already enabled from Phase 1</li>
                  <li>Open Preview Panel (right sidebar) → Agent Dashboard tab</li>
                  <li>Type complex commands in IDE terminal: <code className="bg-gray-800 px-1 rounded text-cyan-400">claude build a dashboard</code></li>
                  <li>Watch agents assemble with live visualization! 🎉</li>
                </ol>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-4">
            <h4 className="text-yellow-400 font-semibold mb-2">💡 Pro Tips</h4>
            <ul className="space-y-1 text-sm text-yellow-200">
              <li>• <strong>Simple commands</strong> (&quot;claude fix bug&quot;) → Single agent response</li>
              <li>• <strong>Complex commands</strong> (&quot;claude build full app&quot;) → Team suggestions + visualization</li>
              <li>• <strong>Handoffs</strong> (&quot;I need to step away&quot;) → Natural language summaries</li>
              <li>• <strong>Team deployment</strong> (&quot;yes&quot;) → Watch agents assemble in Preview Panel</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}