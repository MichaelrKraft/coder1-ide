'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ListOrdered, BookOpen, BarChart3, GitCompare, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CopyEditor } from '@/components/editor';
import { cn } from '@/lib/utils';

const articleTypes = [
  {
    id: 'article_how_to',
    name: 'How-To Guide',
    description: 'Step-by-step actionable guide (1000-1500 words)',
    icon: FileText,
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'article_listicle',
    name: 'Listicle',
    description: "Numbered list format that's easy to scan",
    icon: ListOrdered,
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'article_ultimate_guide',
    name: 'Ultimate Guide',
    description: 'Comprehensive resource (1500-2000 words)',
    icon: BookOpen,
    color: 'from-purple-500 to-pink-600'
  },
  {
    id: 'article_case_study',
    name: 'Case Study',
    description: 'Results-focused story with specific metrics',
    icon: BarChart3,
    color: 'from-orange-500 to-red-600'
  },
  {
    id: 'article_comparison',
    name: 'Comparison',
    description: 'A vs B analysis with clear recommendation',
    icon: GitCompare,
    color: 'from-cyan-500 to-blue-600'
  },
];

interface ArticleGeneratorProps {
  blueprintId: string;
  projectId?: string;
  onSaveArticle?: (articleType: string, content: string, wordsUsed: number) => void;
}

export function ArticleGenerator({ blueprintId, projectId, onSaveArticle }: ArticleGeneratorProps) {
  const [selectedType, setSelectedType] = useState<string>('article_how_to');
  const [completedArticles, setCompletedArticles] = useState<Set<string>>(new Set());

  const handleSave = (content: string, wordsUsed: number) => {
    setCompletedArticles((prev) => new Set([...prev, selectedType]));
    if (onSaveArticle) {
      onSaveArticle(selectedType, content, wordsUsed);
    }
  };

  const selectedArticle = articleTypes.find(a => a.id === selectedType);
  const SelectedIcon = selectedArticle?.icon || FileText;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Article Generator</h2>
          <p className="text-sm text-muted-foreground">
            Create SEO-optimized content marketing articles
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-1">
          {completedArticles.size} Articles Created
        </Badge>
      </div>

      {/* Article Type Selection */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-lg bg-gradient-to-r flex items-center justify-center',
              selectedArticle?.color || 'from-emerald-500 to-teal-600'
            )}>
              <SelectedIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Article Types</CardTitle>
              <CardDescription>Choose the format for your content marketing article</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {articleTypes.map((article) => {
              const isCompleted = completedArticles.has(article.id);
              const Icon = article.icon;
              return (
                <button
                  key={article.id}
                  onClick={() => setSelectedType(article.id)}
                  className={cn(
                    'p-4 rounded-lg border text-left transition-all relative',
                    selectedType === article.id
                      ? 'border-emerald-500 bg-emerald-500/10'
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
                    <h4 className="font-medium text-sm">{article.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">{article.description}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* SEO info */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
        <p className="text-sm text-emerald-200">
          <strong>SEO Optimized:</strong> All articles include meta descriptions, proper H2/H3 structure,
          keyword placement, and are formatted for featured snippets and FAQ schema markup.
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
            templateType="articles"
            templateName={selectedType}
            onSave={handleSave}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
