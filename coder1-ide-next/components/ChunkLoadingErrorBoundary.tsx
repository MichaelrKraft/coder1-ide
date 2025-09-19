'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

class ChunkLoadingErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  public state: State = {
    hasError: false,
    retryCount: 0,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Check if it's a chunk loading error
    const isChunkError = 
      error.message.includes('Loading chunk') ||
      error.message.includes('Cannot find module') ||
      error.message.includes('Loading CSS chunk');

    return {
      hasError: true,
      error,
      retryCount: 0,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ChunkLoadingErrorBoundary caught an error:', error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Auto-retry for chunk loading errors
    if (this.isChunkLoadingError(error) && this.state.retryCount < 3) {
      this.scheduleRetry();
    }
  }

  private isChunkLoadingError = (error: Error): boolean => {
    const message = error.message.toLowerCase();
    return (
      message.includes('loading chunk') ||
      message.includes('cannot find module') ||
      message.includes('loading css chunk') ||
      message.includes('dynamically imported module')
    );
  };

  private scheduleRetry = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    this.retryTimeoutId = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        retryCount: prevState.retryCount + 1,
      }));
    }, 1000 * (this.state.retryCount + 1)); // Progressive delay
  };

  private handleManualRetry = () => {
    // Clear cache and reload page for persistent errors
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    window.location.reload();
  };

  public componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  public render() {
    if (this.state.hasError) {
      const isChunkError = this.state.error && this.isChunkLoadingError(this.state.error);
      
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-bg-secondary border border-border-default rounded-lg">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              {isChunkError ? 'Loading Component...' : 'Something went wrong'}
            </h3>
            
            {isChunkError ? (
              <div className="space-y-2">
                <p className="text-text-secondary text-sm">
                  Retrying automatically... ({this.state.retryCount}/3)
                </p>
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-coder1-cyan"></div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-text-secondary text-sm">
                  {this.state.error?.message || 'An unexpected error occurred'}
                </p>
                <button
                  onClick={this.handleManualRetry}
                  className="px-4 py-2 bg-coder1-cyan text-black rounded hover:bg-coder1-cyan/80 transition-colors"
                >
                  Reload Page
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChunkLoadingErrorBoundary;