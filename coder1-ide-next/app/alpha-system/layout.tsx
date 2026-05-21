import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Coder1 — Claude Code gives you a tool. Coder1 gives you a system.',
  description: 'Scheduled agents. Persistent memory. Approval gates. A team that compounds over time. The system layer for Claude Code users — Agent Hub, local architecture, and persistent memory that never resets.',
  alternates: {
    canonical: 'https://coder1.ai',
  },
  openGraph: {
    title: 'Coder1 — Claude Code gives you a tool. Coder1 gives you a system.',
    description: 'Scheduled agents. Persistent memory. Approval gates. Agent Hub runs your fleet while you sleep. Your code never leaves your machine.',
    url: 'https://coder1.ai',
    siteName: 'Coder1',
    images: [
      {
        url: 'https://coder1.ai/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Coder1 — The system layer for Claude Code users',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coder1 — Claude Code gives you a tool. Coder1 gives you a system.',
    description: 'Scheduled agents. Persistent memory. Approval gates. Agent Hub runs your fleet while you sleep.',
    images: ['https://coder1.ai/og-image.png'],
  },
}

export default function AlphaSystemLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
