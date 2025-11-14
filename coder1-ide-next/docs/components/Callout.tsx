import React from 'react';
import { Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface CalloutProps {
  type?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  children: React.ReactNode;
}

export function Callout({ type = 'info', title, children }: CalloutProps) {
  const styles = {
    info: {
      bg: 'bg-blue-900/20',
      border: 'border-blue-500/50',
      icon: Info,
      iconColor: 'text-blue-400'
    },
    success: {
      bg: 'bg-green-900/20',
      border: 'border-green-500/50',
      icon: CheckCircle,
      iconColor: 'text-green-400'
    },
    warning: {
      bg: 'bg-yellow-900/20',
      border: 'border-yellow-500/50',
      icon: AlertTriangle,
      iconColor: 'text-yellow-400'
    },
    danger: {
      bg: 'bg-red-900/20',
      border: 'border-red-500/50',
      icon: XCircle,
      iconColor: 'text-red-400'
    }
  };

  const config = styles[type];
  const Icon = config.icon;

  return (
    <div className={`${config.bg} border ${config.border} rounded-lg p-4 my-6`}>
      <div className="flex gap-3">
        <Icon className={`${config.iconColor} w-5 h-5 flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          {title && (
            <div className="font-semibold mb-1 text-slate-100">{title}</div>
          )}
          <div className="text-sm text-slate-300 [&>p]:my-2">{children}</div>
        </div>
      </div>
    </div>
  );
}
