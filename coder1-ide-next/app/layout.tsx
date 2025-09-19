import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SessionProvider } from '@/contexts/SessionContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
// import '@/lib/logger' // Initialize global logger - DISABLED: causing client-side errors

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Coder1 IDE - AI-Powered Development Environment',
  description: 'The IDE built for Claude Code and the new generation of vibe coders',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Socket.IO CDN fallback for production - ensures Socket.IO loads even if bundling fails */}
        {process.env.NODE_ENV === 'production' && (
          <>
            <script 
              src="https://cdn.socket.io/4.5.4/socket.io.min.js" 
              integrity="sha384-/KNQL8Nu5gCHLqwqfQjA689Hhoqgi2S84SNUxC3roTe4EhIlhBwgD/G6aAGNj1N"
              crossOrigin="anonymous"
            />
            <script dangerouslySetInnerHTML={{ __html: `
              // Make Socket.IO available globally as a fallback
              if (typeof window !== 'undefined' && window.io) {
                window.socketIOFallback = window.io;
                console.log('✅ Socket.IO CDN loaded successfully');
              }
            `}} />
          </>
        )}
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <SessionProvider>
            {children}
          </SessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}