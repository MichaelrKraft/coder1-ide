'use client';

import React, { useState } from 'react';
import {
  Shield,
  FolderOpen,
  Globe,
  Cpu,
  Database,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
} from 'lucide-react';

// Permission boundary interface
interface PermissionBoundary {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: 'file' | 'network' | 'system' | 'data';
  riskLevel: 'low' | 'medium' | 'high';
}

interface PermissionBoundariesProps {
  permissions: PermissionBoundary[];
  onTogglePermission?: (id: string, enabled: boolean) => void;
  className?: string;
}

/**
 * PermissionBoundaries Component
 *
 * Configures what Johnny5 can and cannot do.
 * Permissions are grouped by category and show risk levels.
 */
export default function PermissionBoundaries({
  permissions,
  onTogglePermission,
  className,
}: PermissionBoundariesProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['file', 'network', 'system', 'data'])
  );

  // Get category icon
  const getCategoryIcon = (category: PermissionBoundary['category']) => {
    const iconClass = 'w-5 h-5';
    switch (category) {
      case 'file':
        return <FolderOpen className={iconClass} />;
      case 'network':
        return <Globe className={iconClass} />;
      case 'system':
        return <Cpu className={iconClass} />;
      case 'data':
        return <Database className={iconClass} />;
      default:
        return <Shield className={iconClass} />;
    }
  };

  // Get category label
  const getCategoryLabel = (category: PermissionBoundary['category']) => {
    switch (category) {
      case 'file':
        return 'File Access';
      case 'network':
        return 'Network & APIs';
      case 'system':
        return 'System Operations';
      case 'data':
        return 'Data & Storage';
      default:
        return category;
    }
  };

  // Get risk level styling
  const getRiskStyles = (riskLevel: PermissionBoundary['riskLevel']) => {
    switch (riskLevel) {
      case 'high':
        return {
          bg: 'bg-red-500/10',
          text: 'text-red-400',
          border: 'border-red-500/30',
          icon: <AlertTriangle className="w-3 h-3" />,
          label: 'High Risk',
        };
      case 'medium':
        return {
          bg: 'bg-yellow-500/10',
          text: 'text-yellow-400',
          border: 'border-yellow-500/30',
          icon: <Info className="w-3 h-3" />,
          label: 'Medium Risk',
        };
      case 'low':
      default:
        return {
          bg: 'bg-green-500/10',
          text: 'text-green-400',
          border: 'border-green-500/30',
          icon: <CheckCircle className="w-3 h-3" />,
          label: 'Low Risk',
        };
    }
  };

  // Group permissions by category
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, PermissionBoundary[]>);

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Calculate stats for a category
  const getCategoryStats = (perms: PermissionBoundary[]) => {
    const enabled = perms.filter((p) => p.enabled).length;
    const highRisk = perms.filter((p) => p.riskLevel === 'high' && p.enabled).length;
    return { enabled, total: perms.length, highRisk };
  };

  // Category order
  const categoryOrder: PermissionBoundary['category'][] = ['file', 'network', 'system', 'data'];

  return (
    <div className={`space-y-3 ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-coder1-cyan" />
        <h3 className="text-sm font-semibold text-text-primary">Permission Boundaries</h3>
      </div>

      {/* Description */}
      <p className="text-xs text-text-muted mb-4">
        Configure what Johnny5 is allowed to do. Disable permissions to restrict access to specific features.
      </p>

      {/* Categories */}
      {categoryOrder.map((category) => {
        const perms = groupedPermissions[category];
        if (!perms || perms.length === 0) return null;

        const isExpanded = expandedCategories.has(category);
        const stats = getCategoryStats(perms);

        return (
          <div
            key={category}
            className="bg-bg-tertiary rounded-xl overflow-hidden border border-border-default"
          >
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between p-4 hover:bg-bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-coder1-cyan">{getCategoryIcon(category)}</div>
                <div className="text-left">
                  <h4 className="text-sm font-medium text-text-primary">
                    {getCategoryLabel(category)}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-text-muted">
                      {stats.enabled}/{stats.total} enabled
                    </span>
                    {stats.highRisk > 0 && (
                      <span className="text-[10px] text-red-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {stats.highRisk} high risk
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-text-muted" />
              ) : (
                <ChevronDown className="w-4 h-4 text-text-muted" />
              )}
            </button>

            {/* Permission Items */}
            {isExpanded && (
              <div className="px-4 pb-4 space-y-2">
                {perms.map((perm) => {
                  const risk = getRiskStyles(perm.riskLevel);

                  return (
                    <div
                      key={perm.id}
                      className={`
                        p-3 rounded-lg border transition-all
                        ${perm.enabled
                          ? 'bg-bg-secondary border-border-default'
                          : 'bg-bg-secondary/50 border-border-default/50'
                        }
                      `}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Permission Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-medium ${
                                perm.enabled ? 'text-text-primary' : 'text-text-muted'
                              }`}
                            >
                              {perm.name}
                            </span>

                            {/* Risk Badge */}
                            <div
                              className={`
                                flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium
                                ${risk.bg} ${risk.text} border ${risk.border}
                              `}
                            >
                              {risk.icon}
                              <span>{risk.label}</span>
                            </div>
                          </div>

                          <p className="text-xs text-text-muted mt-1">{perm.description}</p>
                        </div>

                        {/* Toggle Switch */}
                        <button
                          onClick={() => onTogglePermission?.(perm.id, !perm.enabled)}
                          className={`
                            relative w-12 h-6 rounded-full transition-all duration-200
                            ${perm.enabled
                              ? 'bg-coder1-cyan'
                              : 'bg-bg-tertiary border border-border-default'
                            }
                          `}
                          title={perm.enabled ? 'Disable permission' : 'Enable permission'}
                        >
                          <div
                            className={`
                              absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200 flex items-center justify-center
                              ${perm.enabled
                                ? 'left-[26px] bg-white'
                                : 'left-0.5 bg-bg-secondary'
                              }
                            `}
                          >
                            {perm.enabled ? (
                              <Unlock className="w-3 h-3 text-coder1-cyan" />
                            ) : (
                              <Lock className="w-3 h-3 text-text-muted" />
                            )}
                          </div>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Security Notice */}
      <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-yellow-400">
          <p className="font-medium">Security Notice</p>
          <p className="text-yellow-400/80 mt-1">
            Enabling high-risk permissions allows Johnny5 to perform powerful operations.
            Review each permission carefully before enabling.
          </p>
        </div>
      </div>
    </div>
  );
}

// Export mock data for permissions
export const MOCK_PERMISSION_BOUNDARIES: PermissionBoundary[] = [
  // File Permissions
  {
    id: 'file-read',
    name: 'Read Files',
    description: 'Allow reading files from your project directory',
    enabled: true,
    category: 'file',
    riskLevel: 'low',
  },
  {
    id: 'file-write',
    name: 'Write Files',
    description: 'Allow creating and modifying files in your project',
    enabled: true,
    category: 'file',
    riskLevel: 'medium',
  },
  {
    id: 'file-delete',
    name: 'Delete Files',
    description: 'Allow deleting files from your project directory',
    enabled: false,
    category: 'file',
    riskLevel: 'high',
  },
  {
    id: 'file-system-wide',
    name: 'System-Wide File Access',
    description: 'Allow access to files outside the project directory',
    enabled: false,
    category: 'file',
    riskLevel: 'high',
  },

  // Network Permissions
  {
    id: 'api-read',
    name: 'API Read Access',
    description: 'Allow reading data from connected APIs',
    enabled: true,
    category: 'network',
    riskLevel: 'low',
  },
  {
    id: 'api-write',
    name: 'API Write Access',
    description: 'Allow creating and modifying data via APIs',
    enabled: true,
    category: 'network',
    riskLevel: 'medium',
  },
  {
    id: 'external-requests',
    name: 'External HTTP Requests',
    description: 'Allow making requests to external websites and services',
    enabled: false,
    category: 'network',
    riskLevel: 'high',
  },

  // System Permissions
  {
    id: 'terminal-exec',
    name: 'Terminal Commands',
    description: 'Allow executing commands in the terminal',
    enabled: true,
    category: 'system',
    riskLevel: 'medium',
  },
  {
    id: 'process-management',
    name: 'Process Management',
    description: 'Allow starting and stopping background processes',
    enabled: false,
    category: 'system',
    riskLevel: 'high',
  },
  {
    id: 'env-access',
    name: 'Environment Variables',
    description: 'Allow reading environment variables and secrets',
    enabled: false,
    category: 'system',
    riskLevel: 'high',
  },

  // Data Permissions
  {
    id: 'session-history',
    name: 'Session History',
    description: 'Allow accessing past session data and conversations',
    enabled: true,
    category: 'data',
    riskLevel: 'low',
  },
  {
    id: 'analytics-data',
    name: 'Analytics Data',
    description: 'Allow collecting and analyzing usage metrics',
    enabled: true,
    category: 'data',
    riskLevel: 'low',
  },
  {
    id: 'export-data',
    name: 'Export Data',
    description: 'Allow exporting project data and reports',
    enabled: true,
    category: 'data',
    riskLevel: 'medium',
  },
];

export type { PermissionBoundary };
