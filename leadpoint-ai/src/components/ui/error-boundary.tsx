'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  showDetails?: boolean
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo })

    // Call optional error handler (for error tracking services like Sentry)
    this.props.onError?.(error, errorInfo)

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleReload = (): void => {
    window.location.reload()
  }

  handleGoHome = (): void => {
    window.location.href = '/'
  }

  handleReportError = (): void => {
    // Placeholder for error reporting functionality
    // Could open a modal, send to error tracking service, etc.
    const { error, errorInfo } = this.state
    const errorReport = {
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    }

    console.log('Error report:', errorReport)
    alert('Error report logged to console. In production, this would be sent to an error tracking service.')
  }

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state
    const { children, fallback, showDetails = process.env.NODE_ENV === 'development' } = this.props

    if (hasError) {
      if (fallback) {
        return fallback
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="rounded-full bg-red-500/10 p-4 mb-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-zinc-400 max-w-md mb-6">
            An unexpected error occurred. Please try refreshing the page or go back to the home page.
          </p>

          <div className="flex items-center gap-3 mb-6">
            <Button
              onClick={this.handleReset}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button variant="outline" onClick={this.handleGoHome}>
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
            <Button variant="ghost" onClick={this.handleReportError}>
              <Bug className="h-4 w-4 mr-2" />
              Report
            </Button>
          </div>

          {showDetails && error && (
            <div className="w-full max-w-2xl text-left">
              <details className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <summary className="cursor-pointer text-sm font-medium text-zinc-300 hover:text-zinc-100">
                  Error Details (Development Mode)
                </summary>
                <div className="mt-4 space-y-4">
                  <div>
                    <h4 className="text-xs font-medium text-zinc-500 uppercase mb-1">
                      Error Message
                    </h4>
                    <pre className="text-xs text-red-400 bg-zinc-950 rounded p-2 overflow-x-auto">
                      {error.message}
                    </pre>
                  </div>
                  {error.stack && (
                    <div>
                      <h4 className="text-xs font-medium text-zinc-500 uppercase mb-1">
                        Stack Trace
                      </h4>
                      <pre className="text-xs text-zinc-400 bg-zinc-950 rounded p-2 overflow-x-auto max-h-48">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                  {errorInfo?.componentStack && (
                    <div>
                      <h4 className="text-xs font-medium text-zinc-500 uppercase mb-1">
                        Component Stack
                      </h4>
                      <pre className="text-xs text-zinc-400 bg-zinc-950 rounded p-2 overflow-x-auto max-h-48">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}
        </div>
      )
    }

    return children
  }
}

// Functional wrapper for easier use with hooks
interface ErrorBoundaryWrapperProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  showDetails?: boolean
  className?: string
}

function ErrorBoundaryWrapper({
  children,
  className,
  ...props
}: ErrorBoundaryWrapperProps) {
  return (
    <div className={cn(className)}>
      <ErrorBoundary {...props}>{children}</ErrorBoundary>
    </div>
  )
}

export { ErrorBoundary, ErrorBoundaryWrapper }
