'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught an error:', { error, errorInfo });
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Update state with error info
    this.setState({
      error,
      errorInfo
    });

    // In production, you could send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: send to error tracking service
      // errorTrackingService.captureException(error, { extra: errorInfo });
    }
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-bg-secondary border border-border-default rounded-lg p-6 text-center">
            <div className="mb-4">
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-2" />
              <h2 className="text-xl font-semibold text-text-primary mb-1">
                Something went wrong
              </h2>
              <p className="text-text-secondary text-sm">
                The IDE encountered an unexpected error and needs to recover.
              </p>
            </div>

            {/* Error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-4 p-3 bg-red-950 border border-red-800 rounded text-left">
                <p className="text-red-300 text-xs font-mono mb-2">
                  {this.state.error.message}
                </p>
                <details className="text-red-400 text-xs">
                  <summary className="cursor-pointer">Stack trace</summary>
                  <pre className="mt-2 text-xs overflow-auto max-h-32">
                    {this.state.error.stack}
                  </pre>
                </details>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2">
              <button
                onClick={this.handleRetry}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-coder1-cyan text-bg-primary rounded hover:bg-coder1-cyan-secondary transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={this.handleRefresh}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-bg-tertiary border border-border-default text-text-secondary rounded hover:bg-bg-primary transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Page
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-bg-tertiary border border-border-default text-text-secondary rounded hover:bg-bg-primary transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </button>
              </div>
            </div>

            {/* Helpful tips */}
            <div className="mt-4 p-3 bg-bg-tertiary rounded text-left">
              <p className="text-xs text-text-muted font-medium mb-1">
                If this keeps happening:
              </p>
              <ul className="text-xs text-text-muted space-y-1">
                <li>• Clear your browser cache and cookies</li>
                <li>• Try using an incognito/private window</li>
                <li>• Check your internet connection</li>
                <li>• Contact support if the issue persists</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Convenience wrapper for common use cases
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default ErrorBoundary;