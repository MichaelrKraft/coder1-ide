'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, ListTodo, Play, Target } from 'lucide-react';

const tabs = [
  { href: '/ide/agent-hub/agents', label: 'Agents', icon: Bot },
  { href: '/ide/agent-hub/tasks',  label: 'Tasks',  icon: ListTodo },
  { href: '/ide/agent-hub/runs',   label: 'Runs',   icon: Play },
  { href: '/ide/agent-hub/goals',  label: 'Goals',  icon: Target },
];

export default function AgentHubLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="h-full flex flex-col">
      <nav className="flex border-b border-border-default shrink-0">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                active
                  ? 'text-coder1-cyan border-b-2 border-coder1-cyan bg-bg-tertiary'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="flex-1 min-h-0 overflow-auto">{children}</div>
    </div>
  );
}
