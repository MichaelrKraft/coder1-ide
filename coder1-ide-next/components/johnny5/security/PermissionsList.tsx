'use client';

import React, { useState } from 'react';
import {
  FileText,
  Pencil,
  Terminal,
  Globe,
  Cpu,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  ChevronDown,
  ChevronUp,
  Clock,
  Lock,
  Unlock,
} from 'lucide-react';
import { Johnny5Permission } from '@/types/johnny5';

interface PermissionsListProps {
  permissions: Johnny5Permission[];
  onUpdatePermission?: (id: string, status: 'allowed' | 'blocked' | 'risky') => void;
  className?: string;
}

/**
 * PermissionsList Component
 *
 * Displays active AI permissions with status indicators.
 * Allows toggling permissions between allowed/blocked/risky states.
 */
export default function PermissionsList({
  permissions,
  onUpdatePermission,
  className
}: PermissionsListProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Get icon for permission type
  const getPermissionIcon = (type: Johnny5Permission['type']) => {
    switch (type) {
      case 'file_read':
        return <FileText className="w-4 h-4" />;
      case 'file_write':
        return <Pencil className="w-4 h-4" />;
      case 'terminal_exec':
        return <Terminal className="w-4 h-4" />;
      case 'network':
        return <Globe className="w-4 h-4" />;
      case 'system':
        return <Cpu className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  // Get status styling
  const getStatusStyle = (status: Johnny5Permission['status']) => {
    switch (status) {
      case 'allowed':
        return {
          icon: <ShieldCheck className="w-4 h-4" />,
          bg: 'bg-green-500/20',
          text: 'text-green-400',
          border: 'border-green-500/30',
          glow: 'shadow-[0_0_10px_rgba(34,197,94,0.3)]',
          label: 'Allowed',
        };
      case 'risky':
        return {
          icon: <ShieldAlert className="w-4 h-4" />,
          bg: 'bg-yellow-500/20',
          text: 'text-yellow-400',
          border: 'border-yellow-500/30',
          glow: 'shadow-[0_0_10px_rgba(234,179,8,0.3)]',
          label: 'Risky',
        };
      case 'blocked':
        return {
          icon: <ShieldOff className="w-4 h-4" />,
          bg: 'bg-red-500/20',
          text: 'text-red-400',
          border: 'border-red-500/30',
          glow: '',
          label: 'Blocked',
        };
    }
  };

  // Format date
  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Count by status
  const statusCounts = permissions.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className={`bg-bg-tertiary rounded-xl overflow-hidden ${className || ''}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-coder1-cyan" />
          <h3 className="text-sm font-semibold text-text-primary">AI Permissions</h3>
          <span className="text-xs text-text-muted">({permissions.length})</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Status summary badges */}
          <div className="flex items-center gap-2">
            {statusCounts.allowed && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-500/20 text-green-400 rounded">
                {statusCounts.allowed} allowed
              </span>
            )}
            {statusCounts.risky && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-yellow-500/20 text-yellow-400 rounded">
                {statusCounts.risky} risky
              </span>
            )}
            {statusCounts.blocked && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-500/20 text-red-400 rounded">
                {statusCounts.blocked} blocked
              </span>
            )}
          </div>

          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-text-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-muted" />
          )}
        </div>
      </button>

      {/* Permission list */}
      {isExpanded && (
        <div className="border-t border-border-default">
          {permissions.length === 0 ? (
            <div className="p-4 text-center text-text-muted text-sm">
              No permissions configured
            </div>
          ) : (
            <div className="divide-y divide-border-default">
              {permissions.map((permission) => {
                const statusStyle = getStatusStyle(permission.status);
                const isEditing = editingId === permission.id;

                return (
                  <div
                    key={permission.id}
                    className={`p-3 transition-all ${
                      isEditing ? 'bg-bg-secondary' : 'hover:bg-bg-secondary/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Permission info */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Icon with status glow */}
                        <div
                          className={`
                            p-2 rounded-lg ${statusStyle.bg} ${statusStyle.text} ${statusStyle.glow}
                            transition-all duration-300
                          `}
                        >
                          {getPermissionIcon(permission.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium text-text-primary truncate">
                              {permission.name}
                            </h4>
                            <span
                              className={`
                                px-1.5 py-0.5 text-[10px] font-medium rounded
                                ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} border
                              `}
                            >
                              {statusStyle.label}
                            </span>
                          </div>

                          <p className="text-xs text-text-muted mt-0.5 font-mono truncate">
                            {permission.scope}
                          </p>

                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Clock className="w-3 h-3 text-text-muted" />
                            <span className="text-[10px] text-text-muted">
                              Granted {formatDate(permission.grantedAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status toggle */}
                      {onUpdatePermission && (
                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              {(['allowed', 'risky', 'blocked'] as const).map((status) => {
                                const style = getStatusStyle(status);
                                return (
                                  <button
                                    key={status}
                                    onClick={() => {
                                      onUpdatePermission(permission.id, status);
                                      setEditingId(null);
                                    }}
                                    className={`
                                      p-1.5 rounded-md transition-all
                                      ${permission.status === status
                                        ? `${style.bg} ${style.text} ${style.border} border`
                                        : 'bg-bg-tertiary hover:bg-bg-secondary text-text-muted hover:text-text-secondary'
                                      }
                                    `}
                                    title={style.label}
                                  >
                                    {style.icon}
                                  </button>
                                );
                              })}
                            </>
                          ) : (
                            <button
                              onClick={() => setEditingId(permission.id)}
                              className={`
                                p-1.5 rounded-md transition-all
                                ${statusStyle.bg} ${statusStyle.text} hover:opacity-80
                              `}
                              title="Change permission"
                            >
                              {permission.status === 'blocked' ? (
                                <Lock className="w-4 h-4" />
                              ) : (
                                <Unlock className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
