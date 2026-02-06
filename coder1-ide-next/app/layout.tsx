import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SessionProvider } from '@/contexts/SessionContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastProvider } from '@/contexts/ToastContext'
// import '@/lib/logger' // Initialize global logger - DISABLED: causing client-side errors

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Coder1 IDE - AI-Powered Development Environment',
  description: 'The IDE built for Claude Code and the new generation of vibe coders',
  icons: {
    icon: '/Coder1-Logo-Sharp.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Temporarily disabled Socket.IO CDN to fix hydration issues */}
        {/* 🔧 FIX (Nov 22, 2025): Disable companion health checks BEFORE React hydration */}
        <script dangerouslySetInnerHTML={{__html: `window.__DISABLE_COMPANION = true;`}} />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <SessionProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
            {/* 🛟 SESSION RESCUE: RecoveryModal moved to /app/ide/layout.tsx (IDE-only) */}
          </SessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}