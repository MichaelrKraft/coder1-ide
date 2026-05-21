import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Coder1 IDE - AI-Powered Development Environment',
  description: 'The IDE built for Claude Code and the new generation of vibe coders',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'Coder1 IDE - AI-Powered Development Environment',
    description: 'The IDE built for Claude Code and the new generation of vibe coders',
    siteName: 'Coder1 IDE',
    images: [{ url: 'https://coder1.ai/og-image.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coder1 IDE - AI-Powered Development Environment',
    description: 'The IDE built for Claude Code and the new generation of vibe coders',
    images: ['https://coder1.ai/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}