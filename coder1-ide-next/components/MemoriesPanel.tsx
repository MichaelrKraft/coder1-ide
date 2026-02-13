'use client';

import { useState, useEffect } from 'react';
import { X, Search, Plus, Tag, Calendar, Trash2, Edit2 } from 'lucide-react';

interface Memory {
  id: string;
  content: string;
  tags: string[];
  context?: string;
  createdAt: string;
  updatedAt: string;
}

interface MemoriesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MemoriesPanel({ isOpen, onClose }: MemoriesPanelProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [newMemoryTags, setNewMemoryTags] = useState('');
  const [newMemoryContext, setNewMemoryContext] = useState('');

  // Fetch memories on mount
  useEffect(() => {
    if (isOpen) {
      fetchMemories();
    }
  }, [isOpen]);

  const fetchMemories = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/memories');
      if (response.ok) {
        const data = await response.json();
        setMemories(data);
      }
    } catch (error) {
      console.error('Failed to fetch memories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addMemory = async () => {
    if (!newMemoryContent.trim()) return;

    try {
      const response = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newMemoryContent,
          tags: newMemoryTags.split(',').map(t => t.trim()).filter(Boolean),
          context: newMemoryContext || undefined,
        }),
      });

      if (response.ok) {
        const newMemory = await response.json();
        setMemories([newMemory, ...memories]);
        setNewMemoryContent('');
        setNewMemoryTags('');
        setNewMemoryContext('');
        setIsAddingMemory(false);
      }
    } catch (error) {
      console.error('Failed to add memory:', error);
    }
  };

  const deleteMemory = async (id: string) => {
    try {
      const response = await fetch(`/api/memories?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMemories(memories.filter(m => m.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete memory:', error);
    }
  };

  // Get all unique tags
  const allTags = Array.from(
    new Set(memories.flatMap(m => m.tags))
  ).sort();

  // Filter memories
  const filteredMemories = memories.filter(memory => {
    const matchesSearch = searchQuery
      ? memory.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        memory.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
    
    const matchesTag = selectedTag ? memory.tags.includes(selectedTag) : true;
    
    return matchesSearch && matchesTag;
  });

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-96 bg-gray-900 border-l border-gray-700 shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            🧠 Second Brain
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search and Filter */}
        <div className="p-4 space-y-3 border-b border-gray-700">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  !selectedTag
                    ? 'bg-cyan-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                All
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    selectedTag === tag
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Add Memory Button */}
        <div className="p-4">
          <button
            onClick={() => setIsAddingMemory(!isAddingMemory)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Memory
          </button>
        </div>

        {/* Add Memory Form */}
        {isAddingMemory && (
          <div className="px-4 pb-4 space-y-3 border-b border-gray-700">
            <textarea
              placeholder="Memory content..."
              value={newMemoryContent}
              onChange={(e) => setNewMemoryContent(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
              rows={3}
            />
            <input
              type="text"
              placeholder="Tags (comma-separated)"
              value={newMemoryTags}
              onChange={(e) => setNewMemoryTags(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <input
              type="text"
              placeholder="Context (optional)"
              value={newMemoryContext}
              onChange={(e) => setNewMemoryContext(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <div className="flex gap-2">
              <button
                onClick={addMemory}
                className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsAddingMemory(false);
                  setNewMemoryContent('');
                  setNewMemoryTags('');
                  setNewMemoryContext('');
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Memories List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="text-center text-gray-400 py-8">Loading memories...</div>
          ) : filteredMemories.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              {searchQuery || selectedTag ? 'No matching memories' : 'No memories yet'}
            </div>
          ) : (
            filteredMemories.map(memory => (
              <div
                key={memory.id}
                className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-2 hover:border-cyan-500 transition-colors"
              >
                <p className="text-white text-sm">{memory.content}</p>
                
                {memory.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {memory.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {memory.context && (
                  <p className="text-gray-400 text-xs italic">{memory.context}</p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                  <span className="text-gray-500 text-xs flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(memory.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => deleteMemory(memory.id)}
                    className="p-1 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
