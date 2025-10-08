import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Coder1 PRD Generator - AI-Powered Product Requirements',
  description: 'Transform your product idea into a comprehensive PRD through 5 strategic questions. Free, open source, powered by Claude AI.',
  keywords: ['PRD', 'Product Requirements Document', 'AI', 'Claude', 'Product Management', 'Free Tool'],
  authors: [{ name: 'Coder1 Team' }],
  openGraph: {
    title: 'Coder1 PRD Generator',
    description: 'AI-Powered Product Requirements Documents in Minutes',
    url: 'https://coder1-prd-generator.vercel.app',
    siteName: 'Coder1 PRD Generator',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coder1 PRD Generator',
    description: 'Generate comprehensive PRDs with AI in minutes',
    creator: '@Coder1Dev',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
