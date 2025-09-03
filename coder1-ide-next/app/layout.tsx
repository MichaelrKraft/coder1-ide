import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ErrorBoundary from '@/components/ErrorBoundary'
import '@/lib/emergency-recovery' // Initialize emergency recovery

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Coder1 IDE - AI-Powered Development Environment',
  description: 'The IDE built for Claude Code and the new generation of vibe coders',
  keywords: 'IDE, AI, Claude Code, development, coding, programming',
  authors: [{ name: 'Coder1 Team' }],
  openGraph: {
    title: 'Coder1 IDE - AI-Powered Development',
    description: 'The first IDE built specifically for Claude Code and AI-powered development',
    type: 'website',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}