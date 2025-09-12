'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, Lightbulb, Loader2 } from 'lucide-react';
import { useContextActivation } from '@/lib/hooks/useContextActivation';

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
    
    // Simulate error analysis (in production, this would call an AI service)
    setTimeout(() => {
      if (error.includes('command not found')) {
        setErrorType('error');
        setDiagnosis('Command not recognized. Try: ls, pwd, cd, clear, or type "claude" to enter AI conversation mode.');
      } else if (error.includes('permission denied')) {
        setErrorType('error');
        setDiagnosis('Permission denied. Try running with sudo or check file permissions with "ls -la".');
      } else if (error.includes('cannot find module')) {
        setErrorType('error');
        setDiagnosis('Module not found. Run "npm install" to install dependencies or check the import path.');
      } else if (error.includes('syntax error')) {
        setErrorType('error');
        setDiagnosis('Syntax error detected. Check for missing semicolons, brackets, or typos in your code.');
      } else if (error.includes('deprecated')) {
        setErrorType('warning');
        setDiagnosis('This feature is deprecated. Consider updating to the latest recommended approach.');
      } else if (error.includes('404')) {
        setErrorType('error');
        setDiagnosis('Resource not found (404). Check the URL or file path and ensure the resource exists.');
      } else if (error.includes('timeout')) {
        setErrorType('warning');
        setDiagnosis('Operation timed out. Check your network connection or try increasing the timeout limit.');
      } else {
        setErrorType('info');
        setDiagnosis('Analyzing error patterns... Consider checking logs for more details.');
      }
      setIsAnalyzing(false);
    }, 1000);
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