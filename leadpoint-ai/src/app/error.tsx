'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error)
  }, [error])

  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Error icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>

        {/* Error message */}
        <h1 className="text-2xl font-bold text-zinc-100 mb-2">
          Something went wrong
        </h1>
        <p className="text-zinc-400 mb-8">
          We apologize for the inconvenience. An unexpected error has occurred.
          Please try again or contact support if the problem persists.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <Button
            onClick={reset}
            className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
          <Button
            variant="ghost"
            onClick={() => (window.location.href = '/')}
            className="w-full sm:w-auto"
          >
            <Home className="h-4 w-4 mr-2" />
            Home
          </Button>
        </div>

        {/* Error details (development only) */}
        {isDevelopment && (
          <details className="text-left rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <summary className="cursor-pointer text-sm font-medium text-zinc-300 hover:text-zinc-100">
              Error Details
            </summary>
            <div className="mt-4 space-y-3">
              <div>
                <h4 className="text-xs font-medium text-zinc-500 uppercase mb-1">
                  Message
                </h4>
                <pre className="text-xs text-red-400 bg-zinc-950 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                  {error.message}
                </pre>
              </div>
              {error.digest && (
                <div>
                  <h4 className="text-xs font-medium text-zinc-500 uppercase mb-1">
                    Error Digest
                  </h4>
                  <pre className="text-xs text-zinc-400 bg-zinc-950 rounded p-2">
                    {error.digest}
                  </pre>
                </div>
              )}
              {error.stack && (
                <div>
                  <h4 className="text-xs font-medium text-zinc-500 uppercase mb-1">
                    Stack Trace
                  </h4>
                  <pre className="text-xs text-zinc-400 bg-zinc-950 rounded p-2 overflow-x-auto max-h-48 whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}

        {/* Support link */}
        <p className="mt-8 text-xs text-zinc-500">
          Need help?{' '}
          <a
            href="mailto:support@leadpoint.ai"
            className="text-violet-400 hover:text-violet-300 underline"
          >
            Contact Support
          </a>
        </p>
      </div>
    </div>
  )
}
