'use client';

import { useState } from 'react';
import { Trash2, Edit2, Tag, Clock, TrendingUp } from 'lucide-react';

interface Memory {
  id: number;
  content: string;
  category: string;
  tags: string[];
  importance: number;
  created_at: string;
  accessed_count: number;
  last_accessed_at: string | null;
}

interface MemoryCardProps {
  memory: Memory;
  onUpdate: () => void;
  onDelete: () => void;
}

export function MemoryCard({ memory, onUpdate, onDelete }: MemoryCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Delete this memory?')) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/memories/${memory.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete');
      onDelete();
    } catch (error) {
      console.error('Error deleting memory:', error);
      alert('Failed to delete memory');
    } finally {
      setIsDeleting(false);
    }
  };

  const getImportanceColor = (importance: number) => {
    if (importance >= 8) return 'text-red-400';
    if (importance >= 5) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      technical: 'bg-blue-500/20 text-blue-400',
      project: 'bg-purple-500/20 text-purple-400',
      preference: 'bg-pink-500/20 text-pink-400',
      decision: 'bg-orange-500/20 text-orange-400',
      insight: 'bg-cyan-500/20 text-cyan-400',
      other: 'bg-gray-500/20 text-gray-400',
    };
    return colors[category] || colors.other;
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4 hover:border-cyan-500/50 transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(memory.category)}`}>
          {memory.category}
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${getImportanceColor(memory.importance)}`}>
            {memory.importance}/10
          </span>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <p className="text-gray-200 text-sm mb-3 line-clamp-3">
        {memory.content}
      </p>

      {/* Tags */}
      {memory.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {memory.tags.map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 bg-gray-700/50 text-gray-400 rounded text-xs flex items-center gap-1"
            >
              <Tag size={10} />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-700">
        <div className="flex items-center gap-1">
          <TrendingUp size={12} />
          <span>{memory.accessed_count} accesses</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock size={12} />
          <span>{new Date(memory.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
