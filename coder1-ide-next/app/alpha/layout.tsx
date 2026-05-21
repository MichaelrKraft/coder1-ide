import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Coder1 IDE — The Only IDE Built for Claude Code Users',
  description: 'Stop babysitting Claude Code sessions. Johnny5 works autonomously overnight, creates PRs, and briefs you every morning. Free alpha — built for vibe coders and Claude Code power users.',
  alternates: {
    canonical: 'https://coder1.ai/alpha',
  },
  openGraph: {
    title: 'Coder1 IDE — Built for Claude Code',
    description: 'Stop babysitting sessions. Johnny5 works overnight, creates PRs, and briefs you every morning. 8,000+ MCP integrations. Free alpha.',
    url: 'https://coder1.ai/alpha',
    siteName: 'Coder1 IDE',
    images: [
      {
        url: 'https://coder1.ai/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Coder1 IDE — The Only IDE Built for Claude Code Users',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coder1 IDE — Built for Claude Code',
    description: 'Stop babysitting sessions. Johnny5 works overnight, creates PRs, and briefs you every morning.',
    images: ['https://coder1.ai/og-image.png'],
  },
}

export default function AlphaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
