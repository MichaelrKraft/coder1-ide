'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Bot, FolderKanban, CheckSquare, Target, Settings, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import AgentHubTour from './AgentHubTour';

const tabs = [
  { href: '/ide/agent-hub/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/ide/agent-hub/agents', label: 'Agents', icon: Bot },
  { href: '/ide/agent-hub/projects', label: 'Projects', icon: FolderKanban },
  { href: '/ide/agent-hub/tasks',  label: 'Tasks',  icon: CheckSquare },
  { href: '/ide/agent-hub/goals',  label: 'Goals',  icon: Target },
];

function AgentHubLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('agent-hub-tour-completed')) {
      setShowTour(true);
    }
  }, []);

  return (
    <div data-tour="agent-hub-welcome" className="h-screen flex flex-col" style={{ '--border-default': 'rgba(0, 217, 255, 0.3)' } as React.CSSProperties}>
      {/* Header bar with centered logo */}
      <header className="flex items-center justify-center px-4 py-2 shrink-0 border-b border-border-default bg-bg-secondary">
        <Image src="/coder1-logo.png" alt="Coder1" height={42} width={156} className="object-contain" />
      </header>

      {/* Body: sidebar + content */}
      <div className="flex flex-row flex-1 min-h-0">
      {/* Left sidebar nav */}
      <nav data-tour="agent-hub-sidebar" className="flex flex-col w-40 shrink-0 border-r border-border-default px-2 py-3 gap-1">
        <Link
          href="/ide"
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-all text-text-muted hover:text-text-secondary hover:bg-bg-tertiary mb-2"
          title="Back to IDE"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to IDE
        </Link>
        <div className="h-px bg-border-default mb-2" />
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-all ${
                active
                  ? 'text-coder1-cyan bg-coder1-cyan/10'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </Link>
          );
        })}
        <div className="flex-1" />
        <div className="h-px bg-border-default mb-2" />
        <Link
          href="/ide/agent-hub/settings"
          className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-all ${
            pathname.startsWith('/ide/agent-hub/settings')
              ? 'text-coder1-cyan bg-coder1-cyan/10'
              : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
          }`}
        >
          <Settings className="w-3 h-3" />
          Settings
        </Link>
      </nav>

      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
      </div>{/* end body */}
      {showTour && (
        <AgentHubTour
          onClose={() => setShowTour(false)}
          onComplete={() => setShowTour(false)}
        />
      )}
    </div>
  );
}

export default function AgentHubLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center text-text-muted text-xs">Loading...</div>}>
      <AgentHubLayoutInner>{children}</AgentHubLayoutInner>
    </Suspense>
  );
}
