import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface CardProps {
  icon?: string;
  title: string;
  href?: string;
  children: React.ReactNode;
}

export function Card({ icon, title, href, children }: CardProps) {
  const content = (
    <div className="h-full bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-blue-500/50 hover:bg-slate-800 transition-all cursor-pointer group">
      <div className="flex items-start gap-3 mb-3">
        {icon && <span className="text-3xl">{icon}</span>}
        <h3 className="text-lg font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">
          {title}
        </h3>
      </div>
      <div className="text-sm text-slate-400 mb-3">{children}</div>
      {href && (
        <div className="flex items-center text-blue-400 text-sm font-medium group-hover:gap-2 transition-all">
          Learn more <ArrowRight className="w-4 h-4 ml-1" />
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

interface CardsProps {
  children: React.ReactNode;
}

export function Cards({ children }: CardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
      {children}
    </div>
  );
}
