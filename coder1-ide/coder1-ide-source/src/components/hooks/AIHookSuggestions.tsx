/**
 * AI Hook Suggestions Component
 * Displays intelligent hook recommendations with implementation preview
 */

import React, { useState, useEffect } from 'react';
import { Lightbulb, Zap, Shield, BarChart3, GitBranch, Code, CheckCircle, AlertCircle, Clock, Loader2 } from 'lucide-react';

interface HookOptimization {
  type: string;
  impact: 'low' | 'medium' | 'high' | 'very-high';
  reason: string;
  hooks: string[];
  estimatedSavings?: string;
}

interface AIRecommendation {
  id: string;
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  hooks: string[];
  reason: string;
  estimatedImpact: 'low' | 'medium' | 'high';
  aiGenerated: boolean;
  confidence: number;
  implementation?: {
    steps: Array<{
      order: number;
      action: string;
      hookId: string;
      priority: string;
    }>;
    estimatedTime: string;
    prerequisites: string[];
  };
}

interface ProjectAnalysis {
  healthScore: number;
  projectType: string;
  confidence: number;
}

interface SmartGenerationResult {
  config: any;
  selectedHooks: string[];
  optimizations: HookOptimization[];
  implementation: {
    phases: Array<{
      name: string;
      order: number;
      hooks: string[];
      description: string;
      estimatedTime: string;
      priority: string;
    }>;
    estimatedTime: number;
  };
  analysis: ProjectAnalysis;
  estimatedBenefits: {
    timeSavings: number;
    qualityImprovement: number;
    errorReduction: number;
    performanceGain: number;
  };
}

const AIHookSuggestions: React.FC = () => {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRecommendations, setSelectedRecommendations] = useState<Set<string>>(new Set());
  const [generationResult, setGenerationResult] = useState<SmartGenerationResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [implementationStatus, setImplementationStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadAIRecommendations();
  }, []);

  const loadAIRecommendations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/hooks/ai-recommendations');
      const data = await response.json();
      
      if (data.success) {
        setRecommendations(data.recommendations);
        setAnalysis({
          healthScore: data.healthScore,
          projectType: data.projectType,
          confidence: 0.8 // Default confidence
        });
      }
    } catch (error) {
      console.error('Failed to load AI recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSmartConfiguration = async () => {
    setImplementationStatus('generating');
    try {
      const response = await fetch('/api/hooks/smart-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          includePerformance: true,
          includeSecurity: true,
          includeQuality: true,
          includeWorkflow: true,
          aggressiveOptimization: false
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setGenerationResult(data);
        setImplementationStatus('success');
        setShowPreview(true);
      } else {
        setImplementationStatus('error');
      }
    } catch (error) {
      console.error('Smart generation failed:', error);
      setImplementationStatus('error');
    }
  };

  const previewConfiguration = async () => {
    try {
      const response = await fetch('/api/hooks/ai-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowPreview(true);
        // Could show preview in modal or expand section
      }
    } catch (error) {
      console.error('Preview failed:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getImpactIcon = (type: string) => {
    switch (type) {
      case 'security': return <Shield className="w-4 h-4" />;
      case 'performance': return <Zap className="w-4 h-4" />;
      case 'quality': return <Code className="w-4 h-4" />;
      case 'workflow': return <GitBranch className="w-4 h-4" />;
      case 'testing': return <CheckCircle className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm text-gray-600">Analyzing your project with AI...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with project health */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Lightbulb className="w-5 h-5 mr-2 text-blue-600" />
              AI Hook Recommendations
            </h3>
            {analysis && (
              <p className="text-sm text-gray-600 mt-1">
                Project Health: <span className={`font-medium ${analysis.healthScore >= 80 ? 'text-green-600' : analysis.healthScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {analysis.healthScore}/100
                </span> • Type: <span className="font-medium">{analysis.projectType}</span>
              </p>
            )}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={previewConfiguration}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Preview
            </button>
            <button
              onClick={generateSmartConfiguration}
              disabled={implementationStatus === 'generating'}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center"
            >
              {implementationStatus === 'generating' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Generate Smart Config
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {recommendations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Lightbulb className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No AI recommendations available. Try refreshing or check your project structure.</p>
          </div>
        ) : (
          recommendations.map((rec) => (
            <div
              key={rec.id}
              className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                selectedRecommendations.has(rec.id) ? 'ring-2 ring-blue-200 bg-blue-50' : 'bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    {getImpactIcon(rec.id.split('-')[1] || 'general')}
                    <h4 className="font-medium text-gray-900">{rec.name}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(rec.priority)}`}>
                      {rec.priority}
                    </span>
                    {rec.aiGenerated && (
                      <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                        AI Generated
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-xs text-gray-500">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      <span>{rec.reason}</span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs">
                      <span className="flex items-center">
                        <BarChart3 className="w-3 h-3 mr-1" />
                        Impact: {rec.estimatedImpact}
                      </span>
                      <span className={`flex items-center ${getConfidenceColor(rec.confidence)}`}>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Confidence: {Math.round(rec.confidence * 100)}%
                      </span>
                      {rec.implementation && (
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          Time: {rec.implementation.estimatedTime}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mt-2">
                      {rec.hooks.map((hook) => (
                        <span
                          key={hook}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded border"
                        >
                          {hook}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    const newSelection = new Set(selectedRecommendations);
                    if (newSelection.has(rec.id)) {
                      newSelection.delete(rec.id);
                    } else {
                      newSelection.add(rec.id);
                    }
                    setSelectedRecommendations(newSelection);
                  }}
                  className={`ml-4 px-3 py-1 text-sm rounded transition-colors ${
                    selectedRecommendations.has(rec.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {selectedRecommendations.has(rec.id) ? 'Selected' : 'Select'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Generation Result Preview */}
      {generationResult && showPreview && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-green-900 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              Smart Configuration Generated
            </h4>
            <button
              onClick={() => setShowPreview(false)}
              className="text-green-600 hover:text-green-800"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Selected Hooks:</span> {generationResult.selectedHooks.length}
              </div>
              <div>
                <span className="font-medium">Estimated Setup:</span> {generationResult.implementation.estimatedTime} minutes
              </div>
              <div>
                <span className="font-medium">Health Score:</span> {generationResult.analysis.healthScore}/100
              </div>
              <div>
                <span className="font-medium">Weekly Time Savings:</span> {generationResult.estimatedBenefits.timeSavings} minutes
              </div>
            </div>
            
            <div>
              <span className="font-medium">Implementation Phases:</span>
              <ul className="mt-1 space-y-1 ml-4">
                {generationResult.implementation.phases.map((phase) => (
                  <li key={phase.order} className="text-xs">
                    {phase.order}. {phase.name} - {phase.estimatedTime}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="mt-4 flex space-x-2">
            <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors">
              Apply Configuration
            </button>
            <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors">
              Download Config
            </button>
          </div>
        </div>
      )}

      {/* Selected Actions */}
      {selectedRecommendations.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">
            {selectedRecommendations.size} recommendation(s) selected
          </h4>
          <div className="flex space-x-2">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors">
              Generate Configuration
            </button>
            <button
              onClick={() => setSelectedRecommendations(new Set())}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIHookSuggestions;