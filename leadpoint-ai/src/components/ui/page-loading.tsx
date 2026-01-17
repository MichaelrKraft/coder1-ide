'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface PageLoadingProps {
  message?: string
  showLogo?: boolean
  fullScreen?: boolean
  className?: string
}

export function PageLoading({
  message = 'Loading...',
  showLogo = true,
  fullScreen = true,
  className,
}: PageLoadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        fullScreen && 'min-h-screen bg-zinc-950',
        !fullScreen && 'py-20',
        className
      )}
    >
      {showLogo && (
        <div className="mb-6 relative">
          {/* Logo with glow effect */}
          <div className="relative">
            <Image
              src="/logo.png"
              alt="LeadPoint.ai"
              width={180}
              height={65}
              className=""
            />
            {/* Animated glow ring */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 animate-ping opacity-20" />
          </div>
        </div>
      )}

      {/* Spinner */}
      <Loader2 className="h-8 w-8 text-violet-500 animate-spin mb-4" />

      {/* Loading message */}
      {message && (
        <p className="text-sm text-zinc-400 animate-pulse">{message}</p>
      )}
    </div>
  )
}

// Inline loading spinner for buttons or small areas
export function LoadingSpinner({
  size = 'default',
  className,
}: {
  size?: 'sm' | 'default' | 'lg'
  className?: string
}) {
  const sizes = {
    sm: 'h-4 w-4',
    default: 'h-5 w-5',
    lg: 'h-6 w-6',
  }

  return (
    <Loader2
      className={cn('animate-spin text-current', sizes[size], className)}
    />
  )
}

// Loading overlay for sections
export function LoadingOverlay({
  message,
  className,
}: {
  message?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-50',
        className
      )}
    >
      <Loader2 className="h-8 w-8 text-violet-500 animate-spin mb-3" />
      {message && <p className="text-sm text-zinc-400">{message}</p>}
    </div>
  )
}

// Loading dots animation
export function LoadingDots({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
    </span>
  )
}
