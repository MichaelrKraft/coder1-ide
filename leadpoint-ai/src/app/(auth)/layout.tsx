'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950" />

      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl" />

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block group">
            <Image
              src="/logo.png"
              alt="LeadPoint.ai"
              width={240}
              height={86}
              className="shadow-lg shadow-cyan-500/25 group-hover:shadow-cyan-500/40 transition-shadow"
            />
          </Link>
          <p className="mt-2 text-sm text-slate-400">
            AI-Powered Influencer Marketing
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/50 rounded-2xl shadow-2xl shadow-purple-900/20 p-8">
          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          By continuing, you agree to our{' '}
          <Link href="/terms" className="text-purple-400 hover:text-purple-300 transition-colors">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-purple-400 hover:text-purple-300 transition-colors">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
