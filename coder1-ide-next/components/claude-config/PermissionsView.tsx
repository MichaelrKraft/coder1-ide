'use client';

import React from 'react';
import { Shield, AlertTriangle, Eye, Edit, Play, Wifi, FolderOpen } from 'lucide-react';
import { Permission, PermissionAnalysis } from '@/lib/claude-config/types';
import { permissionAnalyzer } from '@/lib/claude-config';

interface PermissionsViewProps {
  permissions: Permission[];
  analysis?: PermissionAnalysis;
}

const permissionIcons: Record<Permission, React.ComponentType<any>> = {
  read: Eye,
  write: Edit,
  execute: Play,
  network: Wifi,
  filesystem: FolderOpen
};

const permissionColors: Record<Permission, string> = {
  read: 'text-green-400 bg-green-500/10 border-green-500/30',
  write: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  execute: 'text-red-400 bg-red-500/10 border-red-500/30',
  network: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  filesystem: 'text-purple-400 bg-purple-500/10 border-purple-500/30'
};

export function PermissionsView({ permissions, analysis }: PermissionsViewProps) {
  const descriptions = permissionAnalyzer.getPermissionDescriptions(permissions);
  const riskScore = permissionAnalyzer.calculateRiskScore(permissions);
  const riskLevel = permissionAnalyzer.getRiskLevel(riskScore);

  const riskColors = {
    low: 'text-green-400 bg-green-500/20 border-green-500/30',
    medium: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
    high: 'text-red-400 bg-red-500/20 border-red-500/30'
  };

  return (
    <div className="space-y-4">
      {/* Risk Score */}
      <div className={`p-4 rounded-lg border ${riskColors[riskLevel]}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <span className="font-semibold">Risk Level: {riskLevel.toUpperCase()}</span>
          </div>
          <span className="text-sm">Score: {riskScore}/100</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              riskLevel === 'low' ? 'bg-green-500' :
              riskLevel === 'medium' ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${riskScore}%` }}
          />
        </div>
      </div>

      {/* Permissions List */}
      <div>
        <h4 className="text-sm font-semibold text-white mb-3">Required Permissions:</h4>
        <div className="space-y-2">
          {permissions.map((permission) => {
            const Icon = permissionIcons[permission];
            return (
              <div
                key={permission}
                className={`flex items-center gap-3 p-3 rounded-lg border ${permissionColors[permission]}`}
              >
                <Icon className="w-5 h-5" />
                <div className="flex-1">
                  <p className="font-medium capitalize">{permission}</p>
                  <p className="text-xs opacity-80">{descriptions[permission]}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Security Risks */}
      {analysis && analysis.risks.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            Security Considerations:
          </h4>
          <div className="space-y-2">
            {analysis.risks.map((risk, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border text-sm ${
                  risk.level === 'high' ? 'bg-red-900/20 border-red-700/30 text-red-300' :
                  risk.level === 'medium' ? 'bg-yellow-900/20 border-yellow-700/30 text-yellow-300' :
                  'bg-blue-900/20 border-blue-700/30 text-blue-300'
                }`}
              >
                <span className="font-medium">{risk.level.toUpperCase()}:</span> {risk.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {analysis && analysis.recommendations.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Recommendations:</h4>
          <ul className="space-y-2">
            {analysis.recommendations.map((rec, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-gray-400"
              >
                <span className="text-blue-400 mt-1">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
