'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Bot, FolderKanban, CheckSquare, Target, Settings } from 'lucide-react';

const tabs = [
  { href: '/ide/agent-hub/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/ide/agent-hub/agents', label: 'Agents', icon: Bot },
  { href: '/ide/agent-hub/projects', label: 'Projects', icon: FolderKanban },
  { href: '/ide/agent-hub/tasks',  label: 'Tasks',  icon: CheckSquare },
  { href: '/ide/agent-hub/goals',  label: 'Goals',  icon: Target },
];

function AgentHubLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="h-full flex flex-col">
      <nav className="flex items-center px-2 py-2 border-b border-border-default shrink-0 gap-1">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md transition-all ${
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
        <Link
          href="/ide/agent-hub/settings"
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md transition-all ${
            pathname.startsWith('/ide/agent-hub/settings')
              ? 'text-coder1-cyan bg-coder1-cyan/10'
              : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
          }`}
        >
          <Settings className="w-3 h-3" />
          Settings
        </Link>
      </nav>

      <div className="flex-1 min-h-0 overflow-auto">{children}</div>
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
