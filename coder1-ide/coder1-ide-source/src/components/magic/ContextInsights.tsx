/**
 * Context Insights Component - Phase 2.1 Enhancement
 * Displays project context analysis and smart suggestions
 */

import React, { useState, useEffect } from 'react';
import magicUIService from '../../services/magic/MagicUIService';
import type { ContextInsights } from '../../services/magic/ContextAnalyzer';

interface ContextInsightsProps {
  isVisible: boolean;
  onClose: () => void;
  currentPrompt?: string;
}

const ContextInsights: React.FC<ContextInsightsProps> = ({
  isVisible,
  onClose,
  currentPrompt = ''
}) => {
  const [insights, setInsights] = useState<ContextInsights | null>(null);
  const [suggestions, setSuggestions] = useState<{
    styling: string[];
    patterns: string[];
    compatibility: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'suggestions' | 'components'>('overview');

  useEffect(() => {
    if (isVisible) {
      loadContextData();
    }
  }, [isVisible, currentPrompt]);

  const loadContextData = async () => {
    setLoading(true);
    try {
      // Load context insights
      const contextData = await magicUIService.getContextInsights();
      setInsights(contextData);

      // Load suggestions for current prompt
      if (currentPrompt) {
        const promptSuggestions = await magicUIService.getContextSuggestions(currentPrompt);
        setSuggestions(promptSuggestions);
      }
    } catch (error) {
      console.error('Failed to load context data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshContext = async () => {
    setLoading(true);
    try {
      await magicUIService.refreshContext();
      await loadContextData();
    } catch (error) {
      console.error('Failed to refresh context:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-11/12 max-w-4xl max-h-5/6 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                🧠 Project Context Analysis
              </h2>
              <p className="text-blue-100 mt-1">
                Smart insights for better component generation
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefreshContext}
                disabled={loading}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2"
                title="Refresh Analysis"
              >
                <span className={loading ? 'animate-spin' : ''}>🔄</span>
                Refresh
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="flex">
            {[
              { key: 'overview', label: '📊 Overview', icon: '📊' },
              { key: 'suggestions', label: '💡 Suggestions', icon: '💡' },
              { key: 'components', label: '🧩 Components', icon: '🧩' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg mr-2">{tab.icon}</span>
                {tab.label.split(' ')[1]}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Analyzing project context...</p>
              </div>
            </div>
          ) : !insights ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Context Data</h3>
              <p className="text-gray-600 mb-4">Unable to analyze project context</p>
              <button
                onClick={loadContextData}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Framework Usage */}
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      ⚡ Framework Stack
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(insights.frameworkUsage).map(([key, value]) => (
                        <div key={key} className="text-center">
                          <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center ${
                            value ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {value ? '✅' : '❌'}
                          </div>
                          <div className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Design System */}
                  <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      🎨 Design System
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-800 mb-2">Color Palette</h4>
                        <div className="flex flex-wrap gap-2">
                          {insights.designSystem.colorPalette.slice(0, 8).map((color, index) => (
                            <div
                              key={index}
                              className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                              style={{ backgroundColor: `var(--tw-color-${color.replace('-', '-')})` }}
                              title={color}
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800 mb-2">Typography</h4>
                        <div className="space-y-1">
                          {insights.designSystem.typography.slice(0, 4).map((typo, index) => (
                            <div key={index} className="text-sm bg-white px-3 py-1 rounded-full inline-block mr-2">
                              {typo}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Compatibility Score */}
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      📈 Compatibility Score
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div
                            className="bg-gradient-to-r from-green-500 to-blue-500 h-4 rounded-full transition-all duration-500"
                            style={{ width: `${insights.recommendations.compatibilityScore * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {Math.round(insights.recommendations.compatibilityScore * 100)}%
                      </div>
                    </div>
                    <p className="text-gray-600 mt-2 text-sm">
                      How well generated components will match your project structure
                    </p>
                  </div>
                </div>
              )}

              {/* Suggestions Tab */}
              {activeTab === 'suggestions' && (
                <div className="space-y-6">
                  {currentPrompt && (
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-2">Current Prompt</h4>
                      <p className="text-blue-800 italic">"{currentPrompt}"</p>
                    </div>
                  )}

                  {suggestions ? (
                    <div className="grid gap-6">
                      {/* Styling Suggestions */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          🎨 Styling Recommendations
                        </h3>
                        <div className="space-y-2">
                          {suggestions.styling.map((suggestion, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <span className="text-green-600">✓</span>
                              <span className="text-gray-800">{suggestion}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Pattern Suggestions */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          🔧 Pattern Recommendations
                        </h3>
                        <div className="space-y-2">
                          {suggestions.patterns.map((pattern, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <span className="text-blue-600">⚡</span>
                              <span className="text-gray-800">{pattern}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Compatibility Info */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          🔗 Compatibility Notes
                        </h3>
                        <div className="space-y-2">
                          {suggestions.compatibility.map((note, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <span className="text-purple-600">🔗</span>
                              <span className="text-gray-800">{note}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-4">💡</div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No Specific Suggestions</h3>
                      <p className="text-gray-600">Enter a component prompt to see tailored suggestions</p>
                    </div>
                  )}
                </div>
              )}

              {/* Components Tab */}
              {activeTab === 'components' && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Existing Components</h3>
                    <p className="text-gray-600">Components detected in your project</p>
                  </div>

                  <div className="grid gap-6">
                    {Object.entries(insights.existingComponents).map(([category, components]) => (
                      <div key={category} className="bg-white rounded-xl border border-gray-200 p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 capitalize flex items-center gap-2">
                          {category === 'buttons' && '🔘'}
                          {category === 'cards' && '🃏'}
                          {category === 'forms' && '📝'}
                          {category === 'layouts' && '📐'}
                          {category === 'navigation' && '🧭'}
                          {category.replace(/s$/, '')} Components
                        </h4>
                        {components.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {components.map((component, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                              >
                                {component}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 italic">No {category} detected</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {insights && (
                <>
                  Compatibility: {Math.round(insights.recommendations.compatibilityScore * 100)}% • 
                  Framework: {insights.frameworkUsage.react ? 'React' : 'Unknown'} • 
                  Styling: {insights.commonPatterns.stylingApproach}
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContextInsights;