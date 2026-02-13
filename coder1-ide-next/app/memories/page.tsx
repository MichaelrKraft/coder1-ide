'use client';

import { useState, useEffect } from 'react';
import { MemoryCard } from '@/components/memories/MemoryCard';
import { MemoryFilters } from '@/components/memories/MemoryFilters';
import { AddMemoryButton } from '@/components/memories/AddMemoryButton';

interface Memory {
  id: number;
  content: string;
  category: string;
  tags: string[];
  importance: number;
  created_at: string;
  updated_at: string;
  accessed_count: number;
  last_accessed_at: string | null;
}

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMemories();
  }, [selectedCategory]);

  const fetchMemories = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      
      const response = await fetch(`/api/memories?${params}`);
      if (!response.ok) throw new Error('Failed to fetch memories');
      
      const data = await response.json();
      setMemories(data);
    } catch (error) {
      console.error('Error fetching memories:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMemories = memories.filter(memory =>
    searchQuery === '' || 
    memory.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    memory.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Johnny5's Second Brain
          </h1>
          <p className="text-gray-400">
            Persistent memory system for context across sessions
          </p>
        </div>

        {/* Filters & Search */}
        <MemoryFilters
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Add Memory Button */}
        <div className="mb-6">
          <AddMemoryButton onMemoryAdded={fetchMemories} />
        </div>

        {/* Memory Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-xl">No memories found</p>
            <p className="text-sm mt-2">Start by adding your first memory</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMemories.map(memory => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                onUpdate={fetchMemories}
                onDelete={fetchMemories}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
