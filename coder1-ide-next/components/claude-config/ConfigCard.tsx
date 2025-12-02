'use client';

import React, { useState } from 'react';
import { 
  Code, Server, Bug, FileText, Trash2, MapPin, Calendar,
  ChevronDown, ChevronUp 
} from 'lucide-react';
import { ClaudeConfig } from '@/lib/claude-config/types';
import { formatDistanceToNow } from 'date-fns';

interface ConfigCardProps {
  config: ClaudeConfig;
  onDelete: (configId: string) => void;
  onEdit?: (configId: string) => void;
}

export function ConfigCard({ config, onDelete, onEdit }: ConfigCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ComponentType<any>> = {
      'agent': Code,
      'hook': Bug,
      'skill': FileText,
      'command': Server
    };
    return icons[type] || Code;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'agent': 'from-blue-500 to-blue-600',
      'hook': 'from-green-500 to-green-600',
      'skill': 'from-purple-500 to-purple-600',
      'command': 'from-orange-500 to-orange-600'
    };
    return colors[type] || 'from-gray-500 to-gray-600';
  };

  const getLocationBadge = (location: string) => {
    return location === 'local' 
      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      : 'bg-purple-500/20 text-purple-300 border-purple-500/30';
  };

  const Icon = getTypeIcon(config.type);

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete(config.id);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  return (
    <div className="bg-black/40 backdrop-blur-sm border border-cyan-500/30 rounded-xl p-6 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/20 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg bg-gradient-to-br ${getTypeColor(config.type)}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>

        <div className="flex gap-2">
          <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getLocationBadge(config.location)}`}>
            <MapPin className="w-3 h-3 inline mr-1" />
            {config.location}
          </span>
        </div>
      </div>

      {/* Title & Description */}
      <h3 className="text-lg font-semibold text-white mb-2">
        {config.name}
      </h3>
      <p className="text-sm text-gray-400 mb-4 line-clamp-2">
        {config.description}
      </p>

      {/* Metadata */}
      <div className="space-y-2 mb-4 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3" />
          <span>
            Updated {formatDistanceToNow(new Date(config.updatedAt), { addSuffix: true })}
          </span>
        </div>

        {config.metadata?.permissions && config.metadata.permissions.length > 0 && (
          <div className="flex items-center gap-2">
            <span>Permissions:</span>
            <div className="flex gap-1">
              {config.metadata.permissions.slice(0, 3).map((perm, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-cyan-500/20 border border-cyan-500/30 rounded text-xs text-cyan-300">
                  {perm}
                </span>
              ))}
              {config.metadata.permissions.length > 3 && (
                <span className="px-1.5 py-0.5 text-xs">
                  +{config.metadata.permissions.length - 3}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="mb-4 p-3 bg-cyan-500/5 rounded-lg border border-cyan-500/20">
          <p className="text-xs text-gray-400 mb-2">File Path:</p>
          <code className="text-xs text-blue-400 break-all">{config.filePath}</code>
          
          {config.metadata?.capabilities && config.metadata.capabilities.length > 0 && (
            <>
              <p className="text-xs text-gray-400 mt-3 mb-2">Capabilities:</p>
              <ul className="space-y-1">
                {config.metadata.capabilities.map((cap, i) => (
                  <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>{cap}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show More
            </>
          )}
        </button>

        <button
          onClick={handleDelete}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            showDeleteConfirm
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400'
          }`}
        >
          {showDeleteConfirm ? (
            <>
              <Trash2 className="w-4 h-4 inline mr-1" />
              Confirm Delete?
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4 inline mr-1" />
              Delete
            </>
          )}
        </button>
      </div>
    </div>
  );
}
