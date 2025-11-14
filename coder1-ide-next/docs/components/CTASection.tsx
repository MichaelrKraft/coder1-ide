import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface CTASectionProps {
  children: React.ReactNode;
}

export function CTASection({ children }: CTASectionProps) {
  return (
    <div className="my-12 p-8 rounded-lg bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30">
      <div className="flex flex-col items-center gap-4 text-center">
        {children}
      </div>
    </div>
  );
}

interface ButtonProps {
  href: string;
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

export function PrimaryButton({ href, children }: ButtonProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all hover:scale-105 shadow-lg hover:shadow-blue-500/50"
    >
      {children}
      <ArrowRight className="w-4 h-4" />
    </Link>
  );
}

export function SecondaryButton({ href, children }: ButtonProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition-all border border-slate-700 hover:border-slate-600"
    >
      {children}
    </Link>
  );
}
