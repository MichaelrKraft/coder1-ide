import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Coder1 IDE - AI-Powered Development Environment',
  description: 'The first Agentic IDE built for Claude Code users. Team collaboration, autonomous AI assistant, and local-first security for vibe coders and power users.',
  keywords: ['AI IDE', 'Claude Code', 'vibe coding', 'AI coding assistant', 'developer tools', 'code generation', 'programming AI', 'agentic IDE'],
  authors: [{ name: 'Mike Kraft', url: 'https://coder1.ai' }],
  creator: 'Coder1',
  publisher: 'Coder1',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/icon.png',
  },
  metadataBase: new URL('https://coder1.ai'),
  openGraph: {
    title: 'Coder1 IDE - AI-Powered Development Environment',
    description: 'The first Agentic IDE built for Claude Code users. Team collaboration, autonomous AI assistant, and local-first security.',
    url: 'https://coder1.ai',
    siteName: 'Coder1 IDE',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Coder1 IDE - AI-Powered Development Environment',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coder1 IDE - AI-Powered Development Environment',
    description: 'The first Agentic IDE built for Claude Code users.',
    images: ['/og-image.png'],
    creator: '@coder1ai',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Coder1 IDE',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'macOS, Windows, Linux',
  description: 'The first Agentic IDE built for Claude Code users. Features team collaboration, autonomous AI assistant, and local-first security.',
  url: 'https://coder1.ai',
  author: {
    '@type': 'Person',
    name: 'Mike Kraft',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Coder1',
    url: 'https://coder1.ai',
  },
  offers: {
    '@type': 'Offer',
    price: '29',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '150',
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}