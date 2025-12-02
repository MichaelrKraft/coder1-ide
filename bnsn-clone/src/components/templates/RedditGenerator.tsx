'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, MessageCircle, Award, HelpCircle, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CopyEditor } from '@/components/editor';
import { cn } from '@/lib/utils';

const redditTypes = [
  {
    id: 'reddit_story',
    name: 'Personal Story',
    description: 'Authentic testimonial-style post that builds trust',
    icon: BookOpen,
    color: 'from-orange-500 to-red-600'
  },
  {
    id: 'reddit_question',
    name: 'Discussion Question',
    description: 'Spark engagement with a thoughtful question',
    icon: HelpCircle,
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'reddit_value_post',
    name: 'Value Post',
    description: 'Educational content that provides real value first',
    icon: Award,
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'reddit_ama_style',
    name: 'AMA Style',
    description: 'Ask Me Anything format for authority building',
    icon: MessageCircle,
    color: 'from-purple-500 to-pink-600'
  },
];

interface RedditGeneratorProps {
  blueprintId: string;
  projectId?: string;
  onSavePost?: (postType: string, content: string, wordsUsed: number) => void;
}

export function RedditGenerator({ blueprintId, projectId, onSavePost }: RedditGeneratorProps) {
  const [selectedType, setSelectedType] = useState<string>('reddit_story');
  const [completedPosts, setCompletedPosts] = useState<Set<string>>(new Set());

  const handleSave = (content: string, wordsUsed: number) => {
    setCompletedPosts((prev) => new Set([...prev, selectedType]));
    if (onSavePost) {
      onSavePost(selectedType, content, wordsUsed);
    }
  };

  const selectedPost = redditTypes.find(r => r.id === selectedType);
  const SelectedIcon = selectedPost?.icon || BookOpen;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Reddit Post Generator</h2>
          <p className="text-sm text-muted-foreground">
            Create authentic Reddit posts that drive organic engagement
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-1">
          {completedPosts.size} Posts Created
        </Badge>
      </div>

      {/* Post Type Selection */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-lg bg-gradient-to-r flex items-center justify-center',
              selectedPost?.color || 'from-orange-500 to-red-600'
            )}>
              <SelectedIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Post Types</CardTitle>
              <CardDescription>Choose the style of Reddit post you want to create</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {redditTypes.map((post) => {
              const isCompleted = completedPosts.has(post.id);
              const Icon = post.icon;
              return (
                <button
                  key={post.id}
                  onClick={() => setSelectedType(post.id)}
                  className={cn(
                    'p-4 rounded-lg border text-left transition-all relative',
                    selectedType === post.id
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-border/50 hover:border-border'
                  )}
                >
                  {isCompleted && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">{post.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">{post.description}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Reddit-specific tip */}
      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
        <p className="text-sm text-orange-200">
          <strong>Pro Tip:</strong> Reddit users can spot promotional content instantly.
          These posts are designed to provide genuine value first, with soft CTAs that don't trigger spam filters.
        </p>
      </div>

      {/* Editor */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedType}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <CopyEditor
            blueprintId={blueprintId}
            templateType="reddit"
            templateName={selectedType}
            onSave={handleSave}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
