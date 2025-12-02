'use client';

import React from 'react';
import { 
  Code, Server, Bug, CheckCircle, Book, Beaker, 
  GitBranch, AlertCircle, FileText, Edit, Wrench, 
  MessageCircle, Zap, Sparkles 
} from 'lucide-react';
import { ConfigTemplate } from '@/lib/claude-config/types';

interface TemplateCardProps {
  template: ConfigTemplate;
  onSelect: (templateId: string) => void;
  onPreview: (templateId: string) => void;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  'code': Code,
  'server': Server,
  'bug': Bug,
  'check-circle': CheckCircle,
  'book': Book,
  'flask': Beaker,
  'git-commit': GitBranch,
  'alert-circle': AlertCircle,
  'file-text': FileText,
  'edit': Edit,
  'tool': Wrench,
  'message-circle': MessageCircle,
  'zap': Zap,
  'sparkles': Sparkles,
  'git-branch': GitBranch,
  'shield': CheckCircle
};

export function TemplateCard({ template, onSelect, onPreview }: TemplateCardProps) {
  const Icon = iconMap[template.icon] || Code;

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'agent': 'from-cyan-500 to-cyan-600',
      'hook': 'from-purple-500 to-purple-600',
      'skill': 'from-orange-500 to-orange-600',
      'command': 'from-cyan-400 to-purple-500'
    };
    return colors[type] || 'from-gray-500 to-gray-600';
  };

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      'agent': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      'hook': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      'skill': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      'command': 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border-cyan-500/30'
    };
    return colors[type] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  };

  const getCostBadge = (cost: number) => {
    if (cost === 0) return { text: 'Free', color: 'bg-green-500/20 text-green-300' };
    if (cost < 0.05) return { text: 'Low', color: 'bg-blue-500/20 text-blue-300' };
    if (cost < 0.15) return { text: 'Medium', color: 'bg-yellow-500/20 text-yellow-300' };
    return { text: 'High', color: 'bg-red-500/20 text-red-300' };
  };

  const costBadge = getCostBadge(template.estimatedCost);

  return (
    <div
      onClick={() => onPreview(template.id)}
      className="group relative bg-black/40 backdrop-blur-sm border border-cyan-500/30 rounded-xl p-6 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/20 transition-all duration-300 cursor-pointer overflow-hidden"
    >
      {/* Gradient Overlay on Hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getTypeColor(template.type)} opacity-0 group-hover:opacity-5 transition-opacity`} />

      {/* Content */}
      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-lg bg-gradient-to-br ${getTypeColor(template.type)}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>

          <div className="flex gap-2">
            <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getTypeBadgeColor(template.type)}`}>
              {template.type}
            </span>
            <span className={`px-2 py-1 rounded-md text-xs font-medium ${costBadge.color}`}>
              {costBadge.text}
            </span>
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
          {template.name}
        </h3>
        <p className="text-sm text-gray-400 mb-4 line-clamp-2">
          {template.description}
        </p>

        {/* Capabilities */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Key Capabilities:</p>
          <ul className="space-y-1">
            {template.capabilities.slice(0, 3).map((capability, i) => (
              <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span className="line-clamp-1">{capability}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-4">
          {template.tags.slice(0, 4).map((tag, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-gray-700/50 rounded text-xs text-gray-400"
            >
              {tag}
            </span>
          ))}
          {template.tags.length > 4 && (
            <span className="px-2 py-0.5 text-xs text-gray-500">
              +{template.tags.length - 4} more
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{template.permissions.length} permissions</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(template.id);
            }}
            className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm font-medium rounded-lg transition-all group-hover:border-blue-500/50"
          >
            Install
          </button>
        </div>
      </div>

      {/* Shine Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>
    </div>
  );
}
