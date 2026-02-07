'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, Lightbulb, Loader2 } from 'lucide-react';
import { useContextActivation } from '@/lib/hooks/useContextActivation';
import { useModelStore } from '@/stores/useModelStore';

interface ErrorDoctorProps {
  lastError: string | null;
  isActive: boolean;
}

export default function ErrorDoctor({ lastError, isActive }: ErrorDoctorProps) {
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorType, setErrorType] = useState<'error' | 'warning' | 'info'>('error');
  
  // PHASE 3: Context activation for Error Doctor AI analysis
  const { activateContext } = useContextActivation();

  useEffect(() => {
    if (lastError && isActive) {
      analyzeError(lastError);
    }
  }, [lastError, isActive]);

  const analyzeError = async (error: string) => {
    setIsAnalyzing(true);
    
    // PHASE 3: Activate context when Error Doctor analyzes errors
    await activateContext('Error Doctor');
    
    try {
      const currentModel = useModelStore.getState().model;
      
      const response = await fetch('/api/error-doctor/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error, model: currentModel }),
      });
      
      if (!response.ok) {
        throw new Error('API request failed');
      }
      
      const data = await response.json();
      
      if (data.success && data.diagnosis) {
        if (error.includes('permission denied') || error.includes('failed') || error.includes('Error')) {
          setErrorType('error');
        } else if (error.includes('warning') || error.includes('deprecated')) {
          setErrorType('warning');
        } else {
          setErrorType('info');
        }
        
        const diagnosisText = data.usedAI 
          ? `${data.diagnosis}\n\n✨ Analyzed with ${getModelDisplayName(data.model)}`
          : data.diagnosis;
        
        setDiagnosis(diagnosisText);
      } else {
        setErrorType('info');
        setDiagnosis('Error analysis temporarily unavailable. Please check the error message manually.');
      }
    } catch (error) {
      console.error('Error Doctor analysis failed:', error);
      setErrorType('info');
      setDiagnosis('Error analysis temporarily unavailable. Please check the error message manually.');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const getModelDisplayName = (model?: string): string => {
    if (!model) return 'AI';
    if (model === 'glm-4.6') return 'GLM 4.6';
    if (model.includes('claude-sonnet')) return 'Claude Sonnet 4.5';
    if (model.includes('claude-opus')) return 'Claude Opus 4.6';
    if (model.includes('claude-haiku')) return 'Claude Haiku 3.5';
    if (model.includes('gemini')) return 'Gemini 2.5 Flash';
    return 'AI';
  };

  if (!isActive) {
    return null;
  }

  const getIcon = () => {
    if (isAnalyzing) return <Loader2 className="w-4 h-4 animate-spin" />;
    switch (errorType) {
      case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'info': return <Lightbulb className="w-4 h-4 text-blue-400" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getBorderColor = () => {
    switch (errorType) {
      case 'error': return 'border-red-500/50';
      case 'warning': return 'border-yellow-500/50';
      case 'info': return 'border-blue-500/50';
      default: return 'border-gray-500/50';
    }
  };

  const getBgColor = () => {
    switch (errorType) {
      case 'error': return 'bg-red-900/20';
      case 'warning': return 'bg-yellow-900/20';
      case 'info': return 'bg-blue-900/20';
      default: return 'bg-gray-900/20';
    }
  };

  return (
    <div className={`border-t ${getBorderColor()} ${getBgColor()} px-3 py-2`}>
      <div className="flex items-start gap-2">
        <div className="mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Error Doctor
            </span>
            {isAnalyzing && (
              <span className="text-xs text-text-secondary">Analyzing...</span>
            )}
          </div>
          {diagnosis && !isAnalyzing && (
            <div className="text-sm text-text-secondary">
              {diagnosis}
            </div>
          )}
          {!diagnosis && !isAnalyzing && !lastError && (
            <div className="text-sm text-text-muted">
              No errors detected. The Error Doctor is monitoring your terminal.
            </div>
          )}
        </div>
        {diagnosis && !isAnalyzing && (
          <button
            onClick={() => {
              // In production, this would open detailed help
              // REMOVED: // REMOVED: console.log('Opening detailed help for:', diagnosis);
            }}
            className="text-xs px-2 py-1 rounded bg-bg-tertiary hover:bg-bg-primary text-coder1-cyan hover:text-white transition-colors"
          >
            Help
          </button>
        )}
      </div>
    </div>
  );
}